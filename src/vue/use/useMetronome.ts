import { computed, ref, type Ref } from 'vue'
import { beatsPerBar, sheetBpm, STORE_KEYS, readStoredJson as readJson, writeStoredJson as writeJson } from '@henryavila/titan-chordpro-ui'
import type { ChartStore } from '@henryavila/titan-chordpro-ui'

/** A pause this long ends the current tap measurement and starts a new one. */
const TAP_GAP_MS = 2400
/** Closer than this between two taps is a hand that slipped, not a tempo. */
const TAP_MIN_MS = 200
/** Taps kept in the running average: enough to settle, short enough to follow. */
const TAP_WINDOW = 5

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
  /** Called when the click stops and the scroll was following it. */
  onFollowStop: () => void
  /** True while the chart is already auto-scrolling. */
  scrolling: Ref<boolean>
  /** False when the chart fits the frame: there is no scroll to link to. */
  scrollable: Ref<boolean>
  /** The panel covers the chart, so it steps aside on start. */
  onPanelClose: () => void
}

/**
 * The click is a rehearsal playing along: the tempo comes from the chart's
 * `{tempo:}`, a manual change is kept per song, and the beat clock schedules
 * each pulse from the instant it was due — so it never drifts a frame at a time.
 *
 * With the scroll linked, the two are one control: starting the click starts
 * the chart moving, and stopping either one stops both. A click over a chart
 * standing still is of no use, and neither is a chart walking away from a
 * click that has been silenced.
 */
export function useMetronome(opts: MetronomeOpts) {
  const running = ref(false)
  const beat = ref(0)
  /** Off until the panel arms it. Rolar still starts the pulse and the count-in. */
  const sound = ref(false)
  /**
   * The title strip paints the beat. Off until the metronome panel turns it
   * on — Rolar only brings the left count and the chord pulse.
   */
  const pulseHead = ref(false)
  /** Starting the click also starts the scroll, and stopping one stops both. */
  const follow = ref(true)
  /** One bar of click before the chart starts moving, so the musician enters with it. */
  const countInOn = ref(true)
  /** Beats left before the chart starts moving; 0 whenever no count-in is running. */
  const countIn = ref(0)
  const userBpm = ref<number | null>(null)
  /** Taps registered in the current measurement, for the panel to show back. */
  const tapCount = ref(0)

  let raf = 0
  let idx = 0
  let nextAt = 0
  /** Beat index at which the scroll joins in; -1 when nothing is pending. */
  let followAt = -1
  let taps: number[] = []
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
      // The chart joins on a downbeat, in the same tick as the accent that
      // announces it — not a beat early, at the end of the last count-in beat.
      if (followAt >= 0 && idx >= followAt) {
        followAt = -1
        countIn.value = 0
        opts.onFollowStart()
      }
      const b = idx % bar.value
      if (sound.value) click(b === 0)
      if (followAt >= 0) countIn.value = followAt - idx
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
    // Only a chart standing still can be counted in: joining one already
    // rolling means playing along from here, and there is nothing to wait for.
    // A chart that fits the frame has no scroll to lead into either.
    const willFollow = follow.value && opts.scrollable.value && !opts.scrolling.value
    followAt = willFollow && countInOn.value ? bar.value : -1
    countIn.value = followAt > 0 ? followAt : 0
    if (willFollow && followAt < 0) opts.onFollowStart()
    if (!raf) raf = requestAnimationFrame(loop)
    // The panel covers the chart it is about to set in motion. The badge keeps
    // the beat readable, and the panel is one tap away when the tempo is wrong.
    opts.onPanelClose()
  }

  function stop() {
    const wasLive = live
    live = false
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    followAt = -1
    countIn.value = 0
    running.value = false
    beat.value = 0
    // Guarded on `wasLive`: the scroll stops the click in turn, and without
    // this the two would call each other for as long as the stack allowed.
    if (wasLive && follow.value) opts.onFollowStop()
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
    taps = []
    tapCount.value = 0
  }

  /**
   * Beating the tempo out is how a musician who has the song in their hands
   * says it — a chart without `{tempo:}` otherwise lands on an arbitrary 100,
   * and nudging by ones from there is not finding a tempo, it is guessing.
   */
  function tap() {
    const now = performance.now()
    const last = taps[taps.length - 1]
    if (last !== undefined) {
      const gap = now - last
      // Dropped before the window, not clamped after it: a double hit sits
      // inside any playable range once averaged with the taps around it, and
      // would quietly pull the tempo up with nothing to show it happened.
      if (gap < TAP_MIN_MS) return
      if (gap > TAP_GAP_MS) taps = []
    }
    taps.push(now)
    if (taps.length > TAP_WINDOW) taps.shift()
    tapCount.value = taps.length
    // One tap only marks the start: it takes two to describe an interval.
    const first = taps[0]
    if (first === undefined || taps.length < 2) return
    // The window is consecutive, so the span from the first tap to this one
    // divided by the gaps between them is the running average of the beat.
    const v = Math.round((60000 * (taps.length - 1)) / (now - first))
    // Out of range is a slip of the hand, not a tempo: keep what we had.
    if (v < 30 || v > 300) return
    userBpm.value = v
    saveBpm(v)
  }

  function toggleSound() {
    sound.value = !sound.value
    if (sound.value && running.value) ensureAudio()
  }

  function toggleCountIn() {
    countInOn.value = !countInOn.value
  }

  function togglePulseHead() {
    pulseHead.value = !pulseHead.value
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
    pulseHead,
    follow,
    countInOn,
    countIn,
    userBpm,
    tapCount,
    bpm,
    bar,
    chartBpm,
    loadBpm,
    start,
    stop,
    toggle,
    nudgeBpm,
    resetBpm,
    tap,
    toggleSound,
    togglePulseHead,
    toggleCountIn,
    dispose,
  }
}
