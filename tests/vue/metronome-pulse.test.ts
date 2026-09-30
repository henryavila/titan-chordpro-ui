import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { computed, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryStore } from '../../src/core'
import { useMetronome, metronomePulseHit, type MetronomeOpts } from '../../src/vue/use/useMetronome'

/** 120 BPM in 4/4: one beat is half a second, one bar two seconds. */
const BEAT = 500

type Calls = { start: number; stop: number; close: number }

function met(over: Partial<MetronomeOpts> = {}) {
  const scrolling = ref(false)
  const scrollable = ref(true)
  const calls: Calls = { start: 0, stop: 0, close: 0 }
  const m = useMetronome({
    songKey: computed(() => 'uma-cancao'),
    tempo: computed(() => '120'),
    time: computed(() => '4/4'),
    store: memoryStore(),
    scrolling,
    scrollable,
    onFollowStart: () => {
      calls.start++
      scrolling.value = true
    },
    onFollowStop: () => {
      calls.stop++
      scrolling.value = false
    },
    onPanelClose: () => {
      calls.close++
    },
    ...over,
  })
  return { m, scrolling, scrollable, calls }
}

/** Lets the first frame land, so beat one has been played and counted. */
function settle() {
  vi.advanceTimersByTime(32)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'] })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('metronomePulseHit', () => {
  it('is silent when the clock is stopped', () => {
    expect(metronomePulseHit(false, 0, 0)).toBe('')
  })

  it('marks beat 1 on the attack', () => {
    expect(metronomePulseHit(true, 0, 0)).toBe('1')
    expect(metronomePulseHit(true, 0, 0.49)).toBe('1')
  })

  it('rests on the off-beat half, including exactly 0.5', () => {
    expect(metronomePulseHit(true, 0, 0.5)).toBe('')
    expect(metronomePulseHit(true, 0, 0.99)).toBe('')
  })

  it('marks beats 2–4 as n on the attack', () => {
    expect(metronomePulseHit(true, 1, 1.0)).toBe('n')
    expect(metronomePulseHit(true, 2, 2.2)).toBe('n')
    expect(metronomePulseHit(true, 3, 3.49)).toBe('n')
  })

  it('rests on the off-beat of n', () => {
    expect(metronomePulseHit(true, 1, 1.5)).toBe('')
    expect(metronomePulseHit(true, 3, 3.8)).toBe('')
  })

  it('marks a later-bar downbeat as 1', () => {
    expect(metronomePulseHit(true, 0, 4.2)).toBe('1')
  })

  it('stays silent when running is false even on an attack clock', () => {
    expect(metronomePulseHit(false, 3, 3.2)).toBe('')
  })
})

describe('the live clock drives the 50/50 hit', () => {
  it('the live clock is on the attack just after start and off at half a beat', () => {
    const { m } = met()
    m.countInOn.value = false
    m.start()
    settle()
    expect(metronomePulseHit(m.running.value, m.beat.value, m.beatClock.value)).toBe('1')
    vi.advanceTimersByTime(BEAT / 2) // 120 BPM → 500 ms beat, off at the rest
    expect(metronomePulseHit(m.running.value, m.beat.value, m.beatClock.value)).toBe('')
    m.stop()
    expect(metronomePulseHit(m.running.value, m.beat.value, m.beatClock.value)).toBe('')
  })
})

describe('the viewer follows beatClock', () => {
  it('the title hit follows beatClock, not a nextTick retrigger', () => {
    const src = readFileSync(join(process.cwd(), 'src/vue/ChordproViewer.vue'), 'utf8')
    expect(src).toMatch(/metronomePulseHit\(/)
    expect(src).not.toMatch(/metHit\.value = ''/)
  })
})
