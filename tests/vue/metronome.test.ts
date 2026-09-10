import { flushPromises, mount } from '@vue/test-utils'
import { computed, ref, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import { memoryStore, STORE_KEYS } from '../../src/core'
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

// ------------------------------------------------------- silent until asked

describe('the click is a visual pulse until the panel turns the sound on', () => {
  it('starts silent — the panel is what arms the oscillator', () => {
    const AC = vi.fn()
    vi.stubGlobal('AudioContext', AC)
    try {
      const { m } = met()
      expect(m.sound.value).toBe(false)
      m.start()
      expect(AC, 'AudioContext was created before the click was armed').not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('builds the oscillator only after the click is turned on', () => {
    const AC = vi.fn(function AudioContext() {
      return {
        state: 'running',
        currentTime: 0,
        resume: () => {},
        close: () => {},
        createOscillator: () => {
          throw new Error('no oscillator in this test')
        },
        createGain: () => ({
          gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {},
        }),
      }
    })
    vi.stubGlobal('AudioContext', AC)
    try {
      const { m } = met()
      m.toggleSound()
      expect(m.sound.value).toBe(true)
      m.start()
      expect(AC).toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
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
  it('sits to the left of the reading column on a wide screen', async () => {
    const w = await viewerAt(1600)
    // A 1600px frame holds a 980px column: leftover is halved on each side.
    const style = w.get('[data-met-count]').attributes('style') ?? ''
    expect(style).toContain('980px')
    expect(style).toMatch(/left:/)
    expect(style).not.toMatch(/right:\s*16px/)
  })

  it('stays on the left on a phone — the column is the whole screen', async () => {
    const w = await viewerAt(390)
    const style = w.get('[data-met-count]').attributes('style') ?? ''
    expect(style).toMatch(/left:\s*12px/)
  })

  it('keeps the count while the panel is closed', async () => {
    const w = await viewerAt(1600)
    expect(w.find('[data-met-countin]').exists()).toBe(false)
    expect(w.get('[data-met-count]').text()).toMatch(/1/)
    expect(w.find('[data-met-pulse]').exists()).toBe(false)
  })
})

/**
 * jsdom reports every element as zero height, so the viewer thinks the chart
 * fits and greys Rolar out. Giving the scroller a body is what makes Rolar a
 * real control, which is the whole point of these cases.
 */
async function viewerWithRoom(props: Record<string, unknown> = {}) {
  const w = mount(ChordproViewer, {
    props: { source: CHART, autoHide: false, storage: memoryStore(), ...props },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  const el = w.get('[data-cpv-scroll]').element as HTMLElement
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 4000 })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: 500 })
  observers.forEach((cb) => cb([{ contentRect: { width: 900, height: 800 } }]))
  await flushPromises()
  return w
}

describe('Rolar starts the metronome with the chart', () => {
  it('counts in silently, and does not move the chart until the bar is done', async () => {
    const w = await viewerWithRoom()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()

    expect(w.find('[data-met-count]').exists(), 'Rolar did not start the metronome').toBe(true)
    expect(w.find('[data-met-pulse]').exists()).toBe(false)
    expect(w.get('[data-cpv-root]').classes().join(' ')).not.toMatch(/cpv-head-hit/)
    const chord = w.get('.cpv-chord')
    expect(getComputedStyle(chord.element).transform).not.toMatch(/translate/i)
    expect(w.find('[data-met-countin]').exists(), 'Rolar skipped the count-in').toBe(true)
    expect(w.get('[data-scroll]').text()).toMatch(/Parar/)
    expect(w.get('.cpv-progress').classes()).not.toContain('is-live')
    expect(
      w.get('[data-scroll]').element.closest('.cpv-chrome')!.classList.contains('is-hidden'),
      'autoHide is off, so the dock should still be up',
    ).toBe(false)

    await w.get('[data-met-btn]').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Só pulso visual')
  })

  it('tucks the dock away as soon as Rolar is pressed, and the toast sits where the bar was', async () => {
    const w = await viewerWithRoom({ autoHide: true })
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()

    const dock = w.get('[data-scroll]').element.closest('.cpv-chrome') as HTMLElement
    expect(dock.classList.contains('is-hidden'), 'the dock waited for idle').toBe(true)
    const toast = w.get('.cpv-toast')
    expect(toast.text()).toMatch(/mostrar/)
    const bottom = toast.attributes('style') ?? ''
    expect(bottom, 'toast still sits above the (now gone) bar').not.toMatch(/124px|78px/)
    expect(bottom).toMatch(/22px|18px|safe-area/)
  })

  it('a second tap on Rolar during the count-in cancels, instead of skipping it', async () => {
    const w = await viewerWithRoom()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    expect(w.find('[data-met-countin]').exists()).toBe(true)

    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    expect(w.find('[data-met-count]').exists()).toBe(false)
    expect(w.get('[data-scroll]').text()).toMatch(/Rolar/)
    expect(w.get('.cpv-progress').classes()).not.toContain('is-live')
  })

  it('leaves the metronome alone when the chart fits the frame', async () => {
    const w = mount(ChordproViewer, {
      props: { source: CHART, autoHide: false, storage: memoryStore() },
      attachTo: document.body,
    })
    mounted.push(w)
    await flushPromises()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    expect(w.find('[data-met-count]').exists()).toBe(false)
  })

  it('does not start the click when the reader unlinked the two', async () => {
    const w = await viewerWithRoom()
    await w.get('[data-met-btn]').trigger('click')
    await flushPromises()
    const follow = w.findAll('.cpv-met-switch')[1]!
    await follow.trigger('click')
    await flushPromises()
    await w.get('[aria-label="Fechar"]').trigger('click')
    await flushPromises()

    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    expect(w.find('[data-met-count]').exists()).toBe(false)
    expect(w.get('.cpv-progress').classes()).toContain('is-live')
  })

  it('keeps a click the musician turned on, so the next song has sound', async () => {
    const storage = memoryStore()
    const w = await viewerWithRoom({ storage })
    await w.get('[data-met-btn]').trigger('click')
    await flushPromises()
    await w.get('[data-met-sound]').trigger('click')
    await flushPromises()
    expect(JSON.parse(storage.get(STORE_KEYS.prefs)!)).toMatchObject({ metSound: true })
  })

  it('paints the title strip only after the panel asks for it', async () => {
    const storage = memoryStore()
    const w = await viewerWithRoom({ storage })
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    expect(w.find('.cpv-head-hit-1, .cpv-head-hit-n').exists()).toBe(false)

    await w.get('[data-met-btn]').trigger('click')
    await flushPromises()
    await w.get('[data-met-head]').trigger('click')
    await flushPromises()
    expect(w.find('.cpv-head-hit-1, .cpv-head-hit-n').exists()).toBe(true)
    expect(JSON.parse(storage.get(STORE_KEYS.prefs)!)).toMatchObject({ metPulseHead: true })
  })

  it('keeps the count outside the chrome so a hidden dock does not take it', async () => {
    const w = await viewerWithRoom()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    const count = w.get('[data-met-count]').element
    expect(count.closest('.cpv-chrome')).toBeNull()
    const box = w.get('[data-met-count] .cpv-met-beat')
    expect(getComputedStyle(box.element).width).toBe('20px')
    expect(getComputedStyle(box.element).height).toBe('20px')
  })
})

/**
 * "entrada" labels the count-in bar. Absolute `bottom: 100%` pulled it up into
 * the title strip; it must sit in the count column flow — below the strip,
 * above 1–2–3.
 */
describe('count-in label sits below the title strip', () => {
  it('keeps "entrada" in normal flow above the beat numbers', async () => {
    const w = await viewerWithRoom()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()

    const label = w.get('[data-met-countin]').element
    const firstBeat = w.get('.cpv-met-beat').element
    expect(label.compareDocumentPosition(firstBeat) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const style = getComputedStyle(label)
    expect(style.position, 'absolute bottom:100% pulls the label into the title strip').not.toBe('absolute')
  })

  it('does not pin the label with bottom:100%', async () => {
    const w = await viewerWithRoom()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    const style = getComputedStyle(w.get('[data-met-countin]').element)
    // jsdom keeps the specified percentage when layout cannot resolve it.
    expect(style.bottom === '100%' || style.bottom === '100').toBe(false)
  })

  it('clears the chrome pad when placing the count column', async () => {
    const w = await viewerWithRoom()
    observers.forEach((cb) => cb([{ contentRect: { width: 1600, height: 800 } }]))
    await flushPromises()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    const top = Number.parseFloat(
      (w.get('[data-met-count]').attributes('style') ?? '').match(/top:\s*([\d.]+)px/)?.[1] ?? 'NaN',
    )
    // xl chromeTop=20 + headH(72) + 8 = 100. The old `headH+22` landed at 94 and
    // parked "entrada" against the title strip.
    expect(top).toBeGreaterThanOrEqual(100)
  })

  /**
   * "entrada" is ~51px wide; the beat column is 20px and sits 12px from the
   * left on a phone. Centering the word hangs ~15px off-screen and the root
   * clips the E. Grow toward the chart instead.
   */
  it('aligns "entrada" to the start of the beat column, not centered on it', async () => {
    const w = await viewerWithRoom()
    observers.forEach((cb) => cb([{ contentRect: { width: 390, height: 844 } }]))
    await flushPromises()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()

    const style = getComputedStyle(w.get('[data-met-countin]').element)
    expect(style.alignSelf, 'centered label overhangs the left edge on a phone').toBe('flex-start')
  })

  it('drops the label when the count-in is cancelled, with the rest of the pulse', async () => {
    const w = await viewerWithRoom()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    expect(w.find('[data-met-countin]').exists()).toBe(true)

    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    expect(w.find('[data-met-countin]').exists()).toBe(false)
    expect(w.find('[data-met-count]').exists()).toBe(false)
  })
})

/**
 * The beat column is position:absolute over the existing padX. Growing the
 * page's left padding to 44px while the click runs shoved the chart right and
 * left a dead gutter — the count does not need layout reservation.
 */
describe('beat count overlays the chart margin — no reserved gutter', () => {
  function pagePadding(w: ReturnType<typeof mount>): string {
    return (w.get('.cpv-page').attributes('style') ?? '').match(/padding:\s*([^;]+)/)?.[1]?.trim() ?? ''
  }

  it('does not force 44px left padding on a phone while the click runs', async () => {
    const w = await viewerAt(390)
    expect(w.find('[data-met-count]').exists()).toBe(true)
    const pad = pagePadding(w)
    // 3-value shorthand (top X bottom) keeps left = right = padX. A trailing
    // 44px is the 4-value form that reserved the dead gutter.
    expect(pad, `page padding while running: ${pad}`).not.toMatch(/\s44px\s*$/)
  })

  it('still shows the beat column on a phone while the click runs', async () => {
    const w = await viewerAt(390)
    expect(w.get('[data-met-count]').text()).toMatch(/1/)
    expect(w.get('[data-met-count]').attributes('style') ?? '').toMatch(/left:\s*12px/)
  })

  it('keeps the same page padding when the click starts and stops on a phone', async () => {
    vi.useRealTimers()
    const w = mount(ChordproViewer, {
      props: { source: CHART, autoHide: false, storage: memoryStore() },
      attachTo: document.body,
    })
    mounted.push(w)
    await flushPromises()
    observers.forEach((cb) => cb([{ contentRect: { width: 390, height: 800 } }]))
    await flushPromises()

    const before = pagePadding(w)
    expect(before).not.toMatch(/\s44px\s*$/)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }))
    await flushPromises()
    expect(w.find('[data-met-count]').exists()).toBe(true)
    expect(pagePadding(w), 'starting the click must not widen the left gutter').toBe(before)

    await w.get('[data-met-count]').trigger('click')
    await flushPromises()
    expect(w.find('[data-met-count]').exists()).toBe(false)
    expect(pagePadding(w), 'stopping the click must not change horizontal pad').toBe(before)
  })

  it('does not add a 44px left pad on desktop while the click runs', async () => {
    const w = await viewerAt(900)
    expect(w.find('[data-met-count]').exists()).toBe(true)
    expect(pagePadding(w)).not.toMatch(/\s44px\s*$/)
  })

  it('keeps the count outside chrome so zen cannot take it (phone)', async () => {
    const w = await viewerAt(390)
    expect(w.get('[data-met-count]').element.closest('.cpv-chrome')).toBeNull()
  })

  it('keeps count left:12px on xs phone — overlay, not a wider page', async () => {
    const w = await viewerAt(390)
    const style = w.get('[data-met-count]').attributes('style') ?? ''
    expect(style).toMatch(/left:\s*12px/)
    expect(pagePadding(w)).not.toMatch(/\s44px\s*$/)
  })
})
