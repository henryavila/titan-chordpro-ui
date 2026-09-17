import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import type { StrumPattern, StrumSlot } from '../../src/core'
import MetronomeSheet from '../../src/vue/sheets/MetronomeSheet.vue'
import { sampleIdForSlot, slotIndexAtClock, useStrumSound } from '../../src/vue/use/useStrumSound'

function hit(dir: 'down' | 'up', essence: StrumSlot['essence'] = 'normal'): StrumSlot {
  return { dir, contact: 'hit', essence }
}

function ghost(dir: 'down' | 'up'): StrumSlot {
  return { dir, contact: 'ghost', essence: null }
}

const PATTERN: StrumPattern = {
  bpm: 120,
  meter: '4/4',
  grid: 8,
  label: 'Test',
  slots: [
    hit('down'),
    ghost('up'),
    hit('up', 'accent'),
    hit('down', 'mute'),
    hit('up', 'muted'),
    hit('down'),
    ghost('up'),
    hit('up'),
  ],
}

describe('sampleIdForSlot', () => {
  it('maps hit essences to kit ids and silences ghost/rest', () => {
    expect(sampleIdForSlot(hit('down'))).toBe('down')
    expect(sampleIdForSlot(hit('up'))).toBe('up')
    expect(sampleIdForSlot(hit('down', 'accent'))).toBe('downAccent')
    expect(sampleIdForSlot(hit('up', 'accent'))).toBe('upAccent')
    expect(sampleIdForSlot(hit('down', 'mute'))).toBe('palm')
    expect(sampleIdForSlot(hit('up', 'muted'))).toBe('mute')
    expect(sampleIdForSlot(ghost('down'))).toBeNull()
    expect(sampleIdForSlot({ dir: null, contact: 'rest', essence: null })).toBeNull()
  })
})

describe('slotIndexAtClock', () => {
  it('matches the visual highlight formula for every phase of a beat', () => {
    // grid 8, 4 beats → 2 slots/beat
    expect(slotIndexAtClock(0, 8, 8, 4)).toBe(0)
    expect(slotIndexAtClock(0.49, 8, 8, 4)).toBe(0)
    expect(slotIndexAtClock(0.5, 8, 8, 4)).toBe(1)
    expect(slotIndexAtClock(1.0, 8, 8, 4)).toBe(2)
    expect(slotIndexAtClock(3.99, 8, 8, 4)).toBe(7)
    expect(slotIndexAtClock(4.0, 8, 8, 4)).toBe(0)
  })
})

describe('useStrumSound sync', () => {
  const starts: ReturnType<typeof vi.fn>[] = []

  beforeEach(() => {
    starts.length = 0
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function AudioContext(this: {
        state: string
        destination: object
        currentTime: number
        createGain: () => {
          gain: { value: number; setValueAtTime: ReturnType<typeof vi.fn> }
          connect: ReturnType<typeof vi.fn>
        }
        createBufferSource: () => {
          buffer: AudioBuffer | null
          connect: ReturnType<typeof vi.fn>
          start: ReturnType<typeof vi.fn>
          stop: ReturnType<typeof vi.fn>
          onended: (() => void) | null
        }
        decodeAudioData: ReturnType<typeof vi.fn>
        resume: ReturnType<typeof vi.fn>
        close: ReturnType<typeof vi.fn>
      }) {
        // Browsers start suspended until a gesture — that was the first-Ouvir lag.
        this.state = 'suspended'
        this.destination = {}
        this.currentTime = 0
        this.createGain = () => ({
          gain: { value: 1, setValueAtTime: vi.fn() },
          connect: vi.fn(),
        })
        this.createBufferSource = () => {
          const start = vi.fn()
          starts.push(start)
          return { buffer: null, connect: vi.fn(), start, stop: vi.fn(), onended: null as (() => void) | null }
        }
        this.decodeAudioData = vi.fn(async () => ({ duration: 0.2 }) as AudioBuffer)
        this.resume = vi.fn(async () => {
          this.state = 'running'
        })
        this.close = vi.fn(async () => undefined)
      }),
    )
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function flushAudio() {
    // Kit is a separate chunk now — settle the dynamic import, then decode/resume.
    await import('../../src/vue/use/strum-sample-data')
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  }

  it('stays silent until enabled, then fires once per armed hit', async () => {
    const s = useStrumSound()

    s.sync(0, PATTERN, 4, 120)
    expect(starts).toHaveLength(0)

    s.setEnabled(true)
    await flushAudio() // preload on enable
    starts.length = 0

    s.sync(0, PATTERN, 4, 120) // slot 0 hit ↓
    expect(starts).toHaveLength(1)
    expect(starts[0]).toHaveBeenCalled()

    s.sync(0.1, PATTERN, 4, 120) // same armed window — no re-fire
    expect(starts).toHaveLength(1)

    s.sync(0.5, PATTERN, 4, 120) // slot 1 ghost — arm, no play
    expect(starts).toHaveLength(1)

    s.sync(1.0, PATTERN, 4, 120) // slot 2 hit ↑ accent
    expect(starts).toHaveLength(2)

    s.dispose()
  })

  it('arms the next hit early so attack meets the highlight (lookahead)', async () => {
    const s = useStrumSound()
    s.setEnabled(true)
    await flushAudio()
    starts.length = 0

    s.sync(0, PATTERN, 4, 120) // hit 0
    expect(starts).toHaveLength(1)

    // 120 BPM, 2 slots/beat → 250ms/slot; ~35ms attack ≈ 0.14 slots.
    // Phase 1.86 → clock 0.93 arms absolute slot 2 before the highlight leaves slot 1.
    s.sync(0.93, PATTERN, 4, 120)
    expect(starts).toHaveLength(2)

    // Highlight only reaches slot 2 at clock 1.0 — audio already started.
    expect(slotIndexAtClock(0.93, 8, 8, 4)).toBe(1)
    expect(slotIndexAtClock(1.0, 8, 8, 4)).toBe(2)

    s.dispose()
  })

  it('stacks voices — a new hit never stops the previous start()', async () => {
    const s = useStrumSound()
    s.setEnabled(true)
    await flushAudio()
    starts.length = 0

    s.sync(0, PATTERN, 4, 120)
    s.sync(1.0, PATTERN, 4, 120)
    expect(starts).toHaveLength(2)
    expect(starts[0]).toHaveBeenCalled()
    expect(starts[1]).toHaveBeenCalled()
    // Polyphony: first voice is not stopped when the second starts.
    // (stop is only used on dispose / disable)
    s.dispose()
  })

  it('resets the slot cursor when the clock stops', async () => {
    const s = useStrumSound()
    s.setEnabled(true)
    await flushAudio()
    starts.length = 0
    s.sync(0, PATTERN, 4, 120)
    expect(starts).toHaveLength(1)
    s.reset()
    s.sync(0, PATTERN, 4, 120)
    expect(starts).toHaveLength(2)
    s.dispose()
  })

  it('after a silent count-in, does not catch-up every missed hit at once', async () => {
    const s = useStrumSound()
    s.setEnabled(true)
    await flushAudio()
    starts.length = 0
    // Simulate count-in: reset while the met clock already advanced one bar.
    s.reset()
    s.sync(4.0, PATTERN, 4, 120) // join downbeat — same phase as 0 for an 8-slot bar
    // One arm window for the current phase, not 0..8 catch-up.
    expect(starts.length).toBeLessThanOrEqual(2)
    expect(starts.length).toBeGreaterThanOrEqual(1)
    s.dispose()
  })

  it('preload decodes the full kit without arming playback', async () => {
    const s = useStrumSound()
    expect(s.ready.value).toBe(false)
    expect(s.enabled.value).toBe(false)
    await s.preload()
    expect(s.ready.value).toBe(true)
    expect(s.enabled.value).toBe(false)
    expect(starts).toHaveLength(0)
    s.dispose()
  })

  it('editor preview loops hit slots when sound is on', async () => {
    vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    const s = useStrumSound()
    await s.preload()
    starts.length = 0
    s.startPreview(PATTERN, 120, 4)
    await flushAudio() // must unlock before the clock starts
    expect(s.previewRunning.value).toBe(true)
    expect(starts.length).toBeGreaterThanOrEqual(1)
    vi.advanceTimersByTime(600)
    await flushAudio()
    expect(starts.length).toBeGreaterThanOrEqual(2)
    s.stopPreview()
    expect(s.previewRunning.value).toBe(false)
    s.dispose()
    vi.useRealTimers()
  })

  it('first Ouvir waits for resume before starting the clock (no cold-start lag)', async () => {
    const s = useStrumSound()
    await s.preload()
    // Context still suspended after preload-only.
    s.startPreview(PATTERN, 120, 4)
    expect(s.previewRunning.value).toBe(true)
    expect(s.previewClock.value).toBe(-1) // clock not started yet
    expect(starts).toHaveLength(0)
    await flushAudio()
    expect(s.previewClock.value).toBeGreaterThanOrEqual(0)
    expect(starts.length).toBeGreaterThanOrEqual(1)
    s.dispose()
  })
})

describe('MetronomeSheet Fonte do ensaio', () => {
  const base = {
    compact: false,
    running: false,
    beat: 0,
    bpm: 100,
    bar: 4,
    chartBpm: 100,
    overridden: false,
    sound: false,
    pulseHead: false,
    follow: true,
    countInOn: true,
    scrolling: false,
    scrollable: true,
    tapCount: 0,
    time: '4/4',
  }

  it('hides Batida source without a strum pattern', () => {
    const w = mount(MetronomeSheet, { props: { ...base, hasStrum: false } })
    expect(w.find('[data-met-source="mute"]').exists()).toBe(true)
    expect(w.find('[data-met-source="click"]').exists()).toBe(true)
    expect(w.find('[data-met-source="batida"]').exists()).toBe(false)
  })

  it('emits setSource when picking Batida and soft click', async () => {
    const w = mount(MetronomeSheet, {
      props: {
        ...base,
        hasStrum: true,
        sound: false,
        strumSound: false,
      },
    })
    expect(w.find('[data-met-source="batida"]').exists()).toBe(true)
    await w.find('[data-met-source="batida"]').trigger('click')
    expect(w.emitted('setSource')?.[0]).toEqual(['batida', false])

    await w.setProps({ strumSound: true, sound: false })
    await nextTick()
    expect(w.find('[data-met-soft-click]').exists()).toBe(true)
    await w.find('[data-met-soft-click]').trigger('click')
    expect(w.emitted('setSource')?.[1]).toEqual(['batida', true])
  })
})

describe('BatidaSheet sound + preview controls', () => {
  it('exposes Som da batida and Ouvir, and auditions on hit pick', async () => {
    const { emptyPattern } = await import('../../src/core')
    const { default: BatidaSheet } = await import('../../src/vue/sheets/BatidaSheet.vue')
    const pattern = emptyPattern({ bpm: 90, meter: '4/4', grid: 8, label: 'P' })
    const w = mount(BatidaSheet, {
      props: {
        compact: false,
        pattern,
        barBeats: 4,
        canDelete: false,
        soundEnabled: true,
        previewRunning: false,
        previewClock: -1,
      },
    })
    expect(w.find('[data-batida-sound]').exists()).toBe(true)
    expect(w.find('[data-batida-preview]').exists()).toBe(true)
    expect(w.find('[data-batida-preview]').attributes('disabled')).toBeDefined()

    await w.get('[data-batida-sound]').trigger('click')
    expect(w.emitted('toggle-sound') ?? w.emitted('toggleSound')).toHaveLength(1)

    await w.get('[data-batida-slot="0"]').trigger('click')
    await nextTick()
    // Anchor picker lists ↓ and ↑ columns — first hit choice.
    const hit = w.find('[data-batida-choice="hit"]')
    expect(hit.exists()).toBe(true)
    await hit.trigger('click')
    await nextTick()
    expect(w.emitted('audition')?.length).toBeGreaterThanOrEqual(1)
    expect(w.find('[data-batida-preview]').attributes('disabled')).toBeUndefined()

    await w.get('[data-batida-preview]').trigger('click')
    const preview = (w.emitted('toggle-preview') ?? w.emitted('togglePreview')) as
      | unknown[][]
      | undefined
    expect(preview).toHaveLength(1)
    const payload = preview![0]![0] as { pattern: StrumPattern; barBeats: number }
    expect(payload.barBeats).toBe(4)
    expect(payload.pattern.slots.length).toBeGreaterThan(0)
  })
})
