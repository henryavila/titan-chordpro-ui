import { computed, ref, type Ref } from 'vue'
import { beatsPerBar, sheetBpm, STORE_KEYS, readStoredJson as readJson, writeStoredJson as writeJson } from 'titan-chordpro-ui'
import type { ChartStore } from 'titan-chordpro-ui'

export type MetronomeOpts = {
  /** Identity of the song, so a tempo edit does not leak into the next one. */
  songKey: Ref<string>
  /** `{tempo:}` of the chart. */
  tempo: Ref<string | number | undefined>
  /** `{time:}` of the chart. */
  time: Ref<string | undefined>
  /** Where the per-song tempo is kept — the host's call, not ours. */
  store: ChartStore
  /** Called when the click starts and the scroll should follow it. */
  onFollowStart: () => void
  /** True while the chart is already auto-scrolling. */
  scrolling: Ref<boolean>
  /** Phone: the panel covers half the chart, so it steps aside on start. */
  compact: Ref<boolean>
  onPanelClose: () => void
}

/**
 * The click is a rehearsal playing along: the tempo comes from the chart's
 * `{tempo:}`, a manual change is kept per song, and the beat clock schedules
 * each pulse from the instant it was due — so it never drifts a frame at a time.
 */
export function useMetronome(opts: MetronomeOpts) {
  const running = ref(false)
  const beat = ref(0)
  const sound = ref(true)
  /** Starting the click also starts the scroll, and stopping one stops both. */
  const follow = ref(true)
  const userBpm = ref<number | null>(null)

  let raf = 0
  let idx = 0
  let nextAt = 0
  let actx: AudioContext | null = null
  // The guard is an instance flag: reactive state lands too late and would
  // kill the loop between two frames.
  let live = false

  const chartBpm = computed(() => sheetBpm(opts.tempo.value))
  const bpm = computed(() => userBpm.value || chartBpm.value || 100)
  const bar = computed(() => beatsPerBar(opts.time.value))

  function readStore(): Record<string, number> {
    return readJson<Record<string, number>>(opts.store, STORE_KEYS.bpm, {})
  }

  /** The stored BPM belongs to the song, not to the session. */
  function loadBpm() {
    const v = Number(readStore()[opts.songKey.value])
    userBpm.value = v >= 30 && v <= 300 ? Math.round(v) : null
  }

  function saveBpm(v: number | null) {
    const all = readStore()
    if (v) all[opts.songKey.value] = v
    else delete all[opts.songKey.value]
    writeJson(opts.store, STORE_KEYS.bpm, all)
  }

  function ensureAudio() {
    try {
      const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AC && !actx) actx = new AC()
      if (actx && actx.state === 'suspended') void actx.resume()
    } catch {
      actx = null
    }
  }

  function click(accent: boolean) {
    const c = actx
    if (!c) return
    try {
      const t = c.currentTime
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(accent ? 1568 : 988, t)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, t + 0.004)
      g.gain.exponentialRampToValueAtTime(0.0001, t + (accent ? 0.07 : 0.05))
      o.connect(g)
      g.connect(c.destination)
      o.start(t)
      o.stop(t + 0.09)
    } catch {
      /* audio blocked — the visual pulse still runs */
    }
  }

  const loop = () => {
    if (!live) {
      raf = 0
      return
    }
    const now = performance.now()
    const spb = 60000 / bpm.value
    if (now >= nextAt) {
      const b = idx % bar.value
      if (sound.value) click(b === 0)
      idx++
      // Schedule from the instant the beat was due, unless we fell a whole
      // beat behind (a background tab): then resync to now.
      nextAt = (now - nextAt > spb ? now : nextAt) + spb
      beat.value = b
    }
    raf = requestAnimationFrame(loop)
  }

  function start() {
    if (live) return
    live = true
    idx = 0
    nextAt = performance.now()
    if (sound.value) ensureAudio()
    running.value = true
    beat.value = 0
    if (!raf) raf = requestAnimationFrame(loop)
    if (follow.value && !opts.scrolling.value) {
      opts.onFollowStart()
      if (opts.compact.value) opts.onPanelClose()
    }
  }

  function stop() {
    live = false
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    running.value = false
    beat.value = 0
  }

  function toggle() {
    if (live) stop()
    else start()
  }

  function nudgeBpm(delta: number) {
    const v = Math.max(30, Math.min(300, bpm.value + delta))
    userBpm.value = v
    saveBpm(v)
  }

  function resetBpm() {
    userBpm.value = null
    saveBpm(null)
  }

  function toggleSound() {
    sound.value = !sound.value
    if (sound.value && running.value) ensureAudio()
  }

  function dispose() {
    stop()
    if (actx) {
      try {
        void actx.close()
      } catch {
        /* already closed */
      }
      actx = null
    }
  }

  return {
    running,
    beat,
    sound,
    follow,
    userBpm,
    bpm,
    bar,
    chartBpm,
    loadBpm,
    start,
    stop,
    toggle,
    nudgeBpm,
    resetBpm,
    toggleSound,
    dispose,
  }
}
