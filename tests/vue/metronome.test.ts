import { flushPromises, mount } from '@vue/test-utils'
import { computed, ref, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import { memoryStore } from '../../src/core'
import { useMetronome, type MetronomeOpts } from '../../src/vue/use/useMetronome'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

const CHART = loadFixture(JESUS_1)
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

/** Walks the beat clock forward. The loop runs on rAF, which the timers fake. */
function beats(n: number) {
  vi.advanceTimersByTime(n * BEAT)
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

// ------------------------------------------------------- the two are one thing

describe('the click and the scroll are one control', () => {
  it('stops the chart when the click is stopped — the contract the comment already claimed', () => {
    const { m, scrolling, calls } = met()
    m.countInOn.value = false
    m.start()
    expect(scrolling.value).toBe(true)

    m.stop()
    expect(calls.stop).toBe(1)
    expect(scrolling.value).toBe(false)
  })

  it('leaves the chart alone when the reader asked for an independent scroll', () => {
    const { m, scrolling, calls } = met()
    m.countInOn.value = false
    m.follow.value = false
    m.start()
    expect(calls.start).toBe(0)
    expect(scrolling.value).toBe(false)

    m.stop()
    expect(calls.stop).toBe(0)
  })

  it('stops the chart even when the click only joined one already rolling', () => {
    const { m, scrolling, calls } = met()
    scrolling.value = true
    m.start()
    // Nothing to start: the chart was already moving.
    expect(calls.start).toBe(0)

    m.stop()
    expect(scrolling.value).toBe(false)
    expect(calls.stop).toBe(1)
  })

  /**
   * The viewer's `stopScroll` calls back into `stop()`, so an unguarded pair
   * would ring each other until the stack gave out.
   */
  it('survives the scroll stopping it back', () => {
    const scrolling = ref(false)
    let stops = 0
    const m: { stop: () => void } = { stop: () => {} }
    const inner = useMetronome({
      songKey: computed(() => 'x'),
      tempo: computed(() => '120'),
      time: computed(() => '4/4'),
      store: memoryStore(),
      scrolling,
      scrollable: ref(true),
      onFollowStart: () => (scrolling.value = true),
      onFollowStop: () => {
        stops++
        scrolling.value = false
        // Exactly what the viewer does on the way out of the scroll.
        inner.stop()
      },
      onPanelClose: () => {},
    })
    m.stop = inner.stop
    inner.countInOn.value = false
    inner.start()
    expect(() => inner.stop()).not.toThrow()
    expect(stops).toBe(1)
    expect(inner.running.value).toBe(false)
  })

  it('does not stop a chart that was never rolling', () => {
    const { m, calls } = met()
    m.stop()
    expect(calls.stop).toBe(0)
  })
})

// ------------------------------------------------------------- the panel goes

describe('the panel steps aside on start', () => {
  it('closes whatever the reader is holding — phone, desktop, linked or not', () => {
    for (const [follow, already] of [
      [true, false],
      [true, true],
      [false, false],
      [false, true],
    ] as const) {
      const { m, scrolling, calls } = met()
      m.follow.value = follow
      scrolling.value = already
      m.start()
      expect(calls.close).toBe(1)
    }
  })
})

// ----------------------------------------------------------- count-in

describe('a bar of count-in before the chart moves', () => {
  it('holds the chart still for one bar, then starts it on the downbeat', () => {
    const { m, scrolling, calls } = met()
    m.start()
    settle()
    // The click is running, but the chart has not been told anything yet.
    expect(m.running.value).toBe(true)
    expect(scrolling.value).toBe(false)
    expect(m.countIn.value).toBe(4)

    beats(1)
    expect(m.countIn.value).toBe(3)
    beats(2)
    expect(m.countIn.value).toBe(1)
    expect(scrolling.value).toBe(false)

    // Fourth beat lands: the chart joins on the accent that follows it.
    beats(1)
    expect(calls.start).toBe(1)
    expect(scrolling.value).toBe(true)
    expect(m.countIn.value).toBe(0)
    expect(m.beat.value).toBe(0)
  })

  it('counts the bar the chart is written in, not four beats', () => {
    const { m } = met({ time: computed(() => '3/4') })
    m.start()
    expect(m.countIn.value).toBe(3)
  })

  it('never counts into a chart that is already moving', () => {
    const { m, scrolling, calls } = met()
    scrolling.value = true
    m.start()
    expect(m.countIn.value).toBe(0)
    beats(5)
    expect(calls.start).toBe(0)
  })

  it('never counts into a chart that fits the frame — there is no scroll to lead', () => {
    const { m, scrollable, calls } = met()
    scrollable.value = false
    m.start()
    expect(m.countIn.value).toBe(0)
    beats(5)
    expect(calls.start).toBe(0)
    expect(m.running.value).toBe(true)
  })

  it('starts the chart at once when the reader turned the count-in off', () => {
    const { m, scrolling } = met()
    m.countInOn.value = false
    m.start()
    expect(scrolling.value).toBe(true)
    expect(m.countIn.value).toBe(0)
  })

  it('drops the count when stopped mid-count, and never starts the chart', () => {
    const { m, scrolling, calls } = met()
    m.start()
    settle()
    beats(2)
    m.stop()
    expect(m.countIn.value).toBe(0)

    beats(5)
    expect(calls.start).toBe(0)
    expect(scrolling.value).toBe(false)
  })
})

// ------------------------------------------------------------------ tap tempo

describe('beating the tempo out', () => {
  it('says nothing from a single tap — one instant is not an interval', () => {
    const { m } = met()
    m.tap()
    expect(m.tapCount.value).toBe(1)
    expect(m.userBpm.value).toBe(null)
  })

  it('reads the tempo from the gaps between taps', () => {
    const { m } = met()
    for (let i = 0; i < 4; i++) {
      m.tap()
      vi.advanceTimersByTime(500)
    }
    expect(m.bpm.value).toBe(120)
    expect(m.tapCount.value).toBe(4)
  })

  it('follows a musician who settles on a different tempo', () => {
    const { m } = met()
    m.tap()
    vi.advanceTimersByTime(600)
    m.tap()
    vi.advanceTimersByTime(600)
    m.tap()
    expect(m.bpm.value).toBe(100)
  })

  it('starts a new measurement after a pause, instead of averaging across it', () => {
    const { m } = met()
    m.tap()
    vi.advanceTimersByTime(500)
    m.tap()
    expect(m.bpm.value).toBe(120)

    vi.advanceTimersByTime(4000)
    m.tap()
    expect(m.tapCount.value).toBe(1)
    // The long gap is not a 15 BPM tempo: the reading holds until two taps
    // describe an interval again.
    expect(m.bpm.value).toBe(120)
  })

  it('ignores a slip of the hand outside any playable tempo', () => {
    const { m } = met()
    m.tap()
    vi.advanceTimersByTime(500)
    m.tap()
    expect(m.bpm.value).toBe(120)

    // 40 ms apart is 1500 BPM — a double hit, not a tempo.
    vi.advanceTimersByTime(40)
    m.tap()
    expect(m.bpm.value).toBe(120)
  })

  it('keeps the tapped tempo with the song, and gives it back on reset', () => {
    const store = memoryStore()
    const { m } = met({ store })
    m.tap()
    vi.advanceTimersByTime(500)
    m.tap()
    expect(m.bpm.value).toBe(120)

    const again = met({ store })
    again.m.loadBpm()
    expect(again.m.userBpm.value).toBe(120)

    again.m.resetBpm()
    expect(again.m.userBpm.value).toBe(null)
    expect(again.m.tapCount.value).toBe(0)
  })
})

// -------------------------------------------------------------- on the surface

/**
 * The viewer learns its width from a ResizeObserver, which jsdom never runs.
 * Capturing the callbacks lets a test say how wide the frame is, which is the
 * whole point here: the badge has to land in a different place on each.
 */
const observers: ((entries: unknown[]) => void)[] = []
class TestRO {
  constructor(cb: (entries: unknown[]) => void) {
    observers.push(cb)
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

const mounted: ReturnType<typeof mount>[] = []
let realRO: typeof ResizeObserver

beforeEach(() => {
  observers.length = 0
  realRO = globalThis.ResizeObserver
  globalThis.ResizeObserver = TestRO as unknown as typeof ResizeObserver
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  globalThis.ResizeObserver = realRO
})

async function viewerAt(px: number) {
  vi.useRealTimers()
  const w = mount(ChordproViewer, {
    props: { source: CHART, autoHide: false, storage: memoryStore() },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width: px, height: 800 } }]))
  await flushPromises()
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }))
  await flushPromises()
  return w
}

describe('the beat readout hangs off the chart, not the window', () => {
  it('lands at the edge of the reading column on a wide screen', async () => {
    const w = await viewerAt(1600)
    // A 1600px frame holds a 980px column: the chart ends where the leftover
    // has been halved, and 300px further out is background nobody is reading.
    // jsdom rewrites `max()`/`calc()` into its own shape, so this asks the
    // thing that matters — the offset is derived from the column width.
    const style = w.get('[data-met-pulse]').attributes('style') ?? ''
    expect(style).toContain('980px')
    expect(style).toContain('max(16px')
  })

  it('leaves the phone where it was — there the column is the whole screen', async () => {
    const w = await viewerAt(390)
    expect(w.get('[data-met-pulse]').attributes('style')).toContain('right: 16px')
  })

  // jsdom lays nothing out, so `scrollHeight` is 0 and the viewer correctly
  // reads the chart as fitting the frame — no scroll to count into. The
  // count-in on a real chart is asserted in tests/browser/layout.spec.ts.
  it('reads the tempo back with the panel closed', async () => {
    const w = await viewerAt(1600)
    expect(w.find('[data-met-countin]').exists()).toBe(false)
    expect(w.get('[data-met-pulse]').text()).toContain('60')
  })
})
