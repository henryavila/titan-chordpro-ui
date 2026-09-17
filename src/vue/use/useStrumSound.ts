import { ref } from 'vue'
import type { StrumPattern, StrumSlot } from '@henryavila/titan-chordpro-ui'
import { STRUM_ATTACK_MS, STRUM_SAMPLE_IDS, type StrumSampleId } from './strum-kit'

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

/** Map a hit slot to a one-shot; ghost/rest stay silent. */
export function sampleIdForSlot(slot: StrumSlot): StrumSampleId | null {
  if (slot.contact !== 'hit') return null
  if (slot.essence === 'mute') return 'palm'
  if (slot.essence === 'muted') return 'mute'
  const up = slot.dir === 'up'
  if (slot.essence === 'accent') return up ? 'upAccent' : 'downAccent'
  return up ? 'up' : 'down'
}

/** Same formula as StrumStrip / BatidaSheet highlight — one source of truth. */
export function slotIndexAtClock(
  clock: number,
  slotCount: number,
  grid: number,
  barBeats: number,
): number {
  if (clock < 0 || slotCount <= 0) return -1
  const beats = Math.max(1, barBeats || 4)
  const spb = Math.max(1, Math.round((grid || slotCount) / beats))
  return Math.floor(clock * spb) % slotCount
}

export function slotsPerBeatOf(grid: number, slotCount: number, barBeats: number): number {
  const beats = Math.max(1, barBeats || 4)
  return Math.max(1, Math.round((grid || slotCount) / beats))
}

type Voice = { src: AudioBufferSourceNode; gain: GainNode }

/**
 * Acoustic-guitar one-shots for the batida grid.
 * - Preload eager; playback opt-in.
 * - Lookahead so the sample attack lands on the visual slot boundary.
 * - Voices stack: a new hit never stops a ringing previous strum.
 */
export function useStrumSound() {
  const enabled = ref(false)
  const ready = ref(false)
  const previewRunning = ref(false)
  const previewClock = ref(-1)

  let actx: AudioContext | null = null
  let buffers: Partial<Record<StrumSampleId, AudioBuffer>> | null = null
  let loading: Promise<void> | null = null
  /** Absolute slot index last armed (lookahead), not modulo. */
  let lastArmedAbs = -1
  let master: GainNode | null = null
  /** Live overlapping voices — never stopped early for a new hit. */
  const voices = new Set<Voice>()

  let previewRaf = 0
  let previewLive = false
  let previewPattern: StrumPattern | null = null
  let previewBpm = 100
  let previewBar = 4
  let previewT0 = 0

  function ensureCtx() {
    try {
      const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AC && !actx) {
        actx = new AC()
        master = actx.createGain()
        // Headroom so stacked strums don't clip.
        master.gain.value = 0.72
        master.connect(actx.destination)
      }
    } catch {
      actx = null
      master = null
    }
  }

  /**
   * Decode kit (may run without a gesture). Does not await AudioContext.resume —
   * that needs `unlock()` on a user click (Som / Ouvir / pick).
   */
  async function preload(): Promise<void> {
    if (buffers && ready.value) return
    if (loading) return loading
    ensureCtx()
    const c = actx
    if (!c) return
    loading = (async () => {
      const { STRUM_SAMPLE_B64 } = await import('./strum-sample-data')
      const next: Partial<Record<StrumSampleId, AudioBuffer>> = {}
      await Promise.all(
        STRUM_SAMPLE_IDS.map(async (id) => {
          try {
            const raw = b64ToArrayBuffer(STRUM_SAMPLE_B64[id])
            next[id] = await c.decodeAudioData(raw.slice(0))
          } catch {
            /* one missing sample must not kill the kit */
          }
        }),
      )
      buffers = next
      ready.value = Object.keys(next).length > 0
      loading = null
    })()
    return loading
  }

  async function loadBuffers() {
    return preload()
  }

  /**
   * Must run inside a user-gesture turn (or after one). Preload alone leaves the
   * context suspended — the first Ouvir used to start the visual clock while
   * resume() was still pending, so audio lagged a full beat.
   */
  async function unlock(): Promise<boolean> {
    ensureCtx()
    const c = actx
    if (!c) return false
    if (c.state === 'suspended') {
      try {
        await c.resume()
      } catch {
        return false
      }
    }
    return c.state === 'running'
  }

  /** Decode + resume. Call from Som/Ouvir/pick so the next start is cold-start free. */
  async function arm(): Promise<boolean> {
    await preload()
    return unlock()
  }

  /** Start a voice; previous voices keep ringing (true polyphony). */
  function playId(id: StrumSampleId) {
    const c = actx
    const buf = buffers?.[id]
    const out = master
    if (!c || !buf || !out) return
    // Never start while suspended — caller must unlock() first.
    if (c.state !== 'running') return
    try {
      const src = c.createBufferSource()
      const g = c.createGain()
      src.buffer = buf
      const peak = id === 'downAccent' || id === 'upAccent' ? 1 : id === 'mute' || id === 'palm' ? 0.75 : 0.92
      const t0 = c.currentTime
      g.gain.setValueAtTime(peak, t0)
      src.connect(g)
      g.connect(out)
      const voice: Voice = { src, gain: g }
      voices.add(voice)
      src.onended = () => {
        voices.delete(voice)
        try {
          src.disconnect()
          g.disconnect()
        } catch {
          /* already torn down */
        }
      }
      // Stack: do not stop() any other voice.
      src.start(t0)
    } catch {
      /* audio blocked — visual highlight still runs */
    }
  }

  function playSlot(slot: StrumSlot) {
    const id = sampleIdForSlot(slot)
    if (!id) return
    playId(id)
  }

  function playHitStacked(slot: StrumSlot, absIndex: number) {
    if (!enabled.value || slot.contact !== 'hit') return
    if (buffers && ready.value && actx?.state === 'running') {
      playSlot(slot)
      return
    }
    const want = absIndex
    void arm().then((ok) => {
      if (!ok || !enabled.value || lastArmedAbs !== want) return
      playSlot(slot)
    })
  }

  function audition(slot: StrumSlot) {
    if (!enabled.value) return
    void arm().then((ok) => {
      if (!ok || !enabled.value) return
      playSlot(slot)
    })
  }

  /**
   * Arm hits early by each sample's attack so the peak lands when the UI
   * highlights the slot. `clock` is absolute beats (metronome beatClock).
   */
  function armFromPhase(
    phase: number,
    pattern: StrumPattern,
    spb: number,
    bpm: number,
  ) {
    const n = pattern.slots.length
    if (!n) return
    const slotSec = 60 / Math.max(30, Math.min(300, bpm || 100)) / spb
    const upTo = Math.floor(phase) + 1
    for (let abs = Math.max(0, lastArmedAbs + 1); abs <= upTo; abs++) {
      const slot = pattern.slots[((abs % n) + n) % n]
      if (!slot) {
        lastArmedAbs = abs
        continue
      }
      const id = sampleIdForSlot(slot)
      const attackSlots = id ? STRUM_ATTACK_MS[id] / 1000 / slotSec : 0
      if (phase < abs - attackSlots) break
      lastArmedAbs = abs
      if (slot.contact === 'hit') playHitStacked(slot, abs)
    }
  }

  function sync(
    clock: number,
    pattern: StrumPattern | null | undefined,
    barBeats: number,
    bpm: number,
  ) {
    if (previewLive) return
    if (!enabled.value || !pattern?.slots.length || clock < 0) {
      lastArmedAbs = -1
      return
    }
    const spb = slotsPerBeatOf(pattern.grid || pattern.slots.length, pattern.slots.length, barBeats)
    const phase = clock * spb
    // After a silent stretch (count-in), lastArmedAbs is -1 while the met clock
    // already advanced a bar. Seeding skips catch-up of every missed slot.
    if (lastArmedAbs < 0 && phase > 0) {
      lastArmedAbs = Math.floor(phase) - 1
    }
    armFromPhase(phase, pattern, spb, bpm)
  }

  function previewTick(now: number) {
    const pattern = previewPattern
    if (!pattern?.slots.length) return
    const spb = slotsPerBeatOf(pattern.grid || pattern.slots.length, pattern.slots.length, previewBar)
    const slotMs = 60000 / previewBpm / spb
    const elapsed = Math.max(0, now - previewT0)
    const absSlotFloat = elapsed / slotMs
    // Visual clock stays honest to wall time (highlight = floor(clock * spb)).
    previewClock.value = absSlotFloat / spb
    // Audio arms early so attack meets that highlight.
    armFromPhase(absSlotFloat, pattern, spb, previewBpm)
  }

  const previewLoop = () => {
    if (!previewLive) {
      previewRaf = 0
      return
    }
    previewTick(performance.now())
    previewRaf = requestAnimationFrame(previewLoop)
  }

  /**
   * Loop the draft pattern in the create/edit sheet.
   * Arms audio (preload + resume) BEFORE starting the visual clock — otherwise
   * the first Ouvir races a suspended AudioContext and sounds a beat late.
   */
  function startPreview(pattern: StrumPattern, bpm: number, barBeats: number) {
    stopPreview()
    if (!pattern.slots.length) return
    if (!enabled.value) enabled.value = true
    previewPattern = {
      ...pattern,
      slots: pattern.slots.map((s) => ({ ...s })),
    }
    previewBpm = Math.max(30, Math.min(300, bpm || pattern.bpm || 100))
    previewBar = Math.max(1, barBeats || 4)
    // Button flips to Parar immediately; clock stays off until unlock finishes
    // so the highlight does not race ahead of the first strum.
    previewRunning.value = true
    previewLive = false
    previewClock.value = -1
    lastArmedAbs = -1
    void arm().then((ok) => {
      if (!previewRunning.value) return
      if (!ok) {
        previewRunning.value = false
        previewPattern = null
        return
      }
      previewLive = true
      previewT0 = performance.now()
      previewClock.value = 0
      previewTick(previewT0)
      if (!previewRaf) previewRaf = requestAnimationFrame(previewLoop)
    })
  }

  function stopPreview() {
    previewLive = false
    previewRunning.value = false
    previewClock.value = -1
    previewPattern = null
    if (previewRaf) cancelAnimationFrame(previewRaf)
    previewRaf = 0
    lastArmedAbs = -1
  }

  function togglePreview(pattern: StrumPattern, bpm: number, barBeats: number) {
    if (previewRunning.value) stopPreview()
    else startPreview(pattern, bpm, barBeats)
  }

  function updatePreviewPattern(pattern: StrumPattern) {
    if (!previewLive) return
    previewPattern = {
      ...pattern,
      slots: pattern.slots.map((s) => ({ ...s })),
    }
  }

  function stopAllVoices() {
    for (const v of voices) {
      try {
        v.src.onended = null
        v.src.stop()
      } catch {
        /* already stopped */
      }
      try {
        v.src.disconnect()
        v.gain.disconnect()
      } catch {
        /* already disconnected */
      }
    }
    voices.clear()
  }

  function toggle() {
    enabled.value = !enabled.value
    if (enabled.value) void arm()
    else {
      lastArmedAbs = -1
      stopPreview()
      stopAllVoices()
    }
  }

  function setEnabled(on: boolean) {
    enabled.value = on
    if (on) void arm()
    else {
      lastArmedAbs = -1
      stopPreview()
      stopAllVoices()
    }
  }

  function reset() {
    lastArmedAbs = -1
  }

  function dispose() {
    stopPreview()
    stopAllVoices()
    lastArmedAbs = -1
    buffers = null
    loading = null
    ready.value = false
    master = null
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
    enabled,
    ready,
    previewRunning,
    previewClock,
    toggle,
    setEnabled,
    preload,
    loadBuffers,
    unlock,
    arm,
    sync,
    audition,
    startPreview,
    stopPreview,
    togglePreview,
    updatePreviewPattern,
    reset,
    dispose,
    playSlot,
    sampleIdForSlot,
  }
}
