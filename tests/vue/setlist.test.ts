import { flushPromises, mount } from '@vue/test-utils'
import { computed, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import { memoryStore } from '../../src/core'
import { useSetlist, type SetlistSong, type SongSpot } from '../../src/vue/use/useSetlist'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

const CHART = loadFixture(JESUS_1)
const OTHER = loadFixture('escuta-meu-clamor-sda-86.cho')

function songs(n: number, withSource = true): SetlistSong[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    title: `Música ${i + 1}`,
    subtitle: i % 2 ? 'Adoradores' : '',
    key: 'G',
    ...(withSource ? { source: i === 0 ? CHART : OTHER } : {}),
  }))
}

function setlistOf(list: SetlistSong[] | undefined, load?: (id: string) => Promise<string> | string) {
  const songsRef = ref(list)
  const loadRef = ref(load ? (id: string) => load(id) : undefined)
  return useSetlist({ songs: computed(() => songsRef.value), loadSong: computed(() => loadRef.value) })
}

const spot = (over: Partial<SongSpot> = {}): SongSpot => ({ offset: 0, capo: 0, mul: 1, top: 0, u: 0, ...over })

// ---------------------------------------------------------------- the model

describe('a rehearsal is a list, but only when there is one', () => {
  it('stays off with none or one song — nothing of it exists', () => {
    expect(setlistOf(undefined).on.value).toBe(false)
    expect(setlistOf([]).on.value).toBe(false)
    expect(setlistOf(songs(1)).on.value).toBe(false)
  })

  it('turns on from two', () => {
    const s = setlistOf(songs(2))
    expect(s.on.value).toBe(true)
    expect(s.posLabel.value).toBe('1/2')
    expect(s.nextChip.value).toBe('Próxima · Música 2')
  })

  it('says so on the last one instead of offering nothing', () => {
    const s = setlistOf(songs(2))
    s.go(1, spot())
    expect(s.posLabel.value).toBe('2/2')
    expect(s.nextChip.value).toBe('Última da lista')
    expect(s.noNext.value).toBe(true)
  })

  it('never lets two songs share an id — a personal version would follow both', () => {
    const s = setlistOf([
      { id: 'x', title: 'Uma' },
      { id: 'x', title: 'Outra' },
    ])
    const ids = s.list.value.map((x) => x.id)
    expect(new Set(ids).size).toBe(2)
  })
})

describe('the list shows the tempo without a new column', () => {
  it('reads {tempo:} off the chart the host already has', () => {
    const s = setlistOf(songs(2))
    expect(s.items.value[0]?.bpmLabel).toBe('60')
    expect(s.items.value[1]?.bpmLabel).toBe('63')
  })

  it('uses the host tempo when the ChordPro is not on hand yet', () => {
    const s = setlistOf([
      { id: 'a', title: 'Uma', tempo: 80 },
      { id: 'b', title: 'Outra', tempo: '92' },
    ])
    expect(s.items.value.map((x) => x.bpmLabel)).toEqual(['80', '92'])
  })

  it('prefers the host tempo over a number in the source', () => {
    const s = setlistOf([
      { id: 'a', title: 'Uma', tempo: 100, source: '{tempo:60}\n[C]oi' },
      { id: 'b', title: 'Outra', source: CHART },
    ])
    expect(s.items.value[0]?.bpmLabel).toBe('100')
  })

  it('says nothing when there is no usable tempo', () => {
    const s = setlistOf([
      { id: 'a', title: 'Uma', source: '{title: Uma}\n[C]oi' },
      { id: 'b', title: 'Outra' },
    ])
    expect(s.items.value.every((x) => x.bpmLabel === '')).toBe(true)
  })
})

describe('changing song puts down where this one was left', () => {
  it('gives back tone, capo, speed and place when the reader returns', () => {
    const s = setlistOf(songs(3))
    s.go(1, spot({ offset: 2, capo: 3, mul: 1.25, top: 640, u: 0.4 }))
    expect(s.takeRestore()).toBeNull() // song 2 was never read before

    s.go(0, spot({ offset: -1, capo: 0, mul: 1, top: 90, u: 0.1 }))
    expect(s.takeRestore()).toEqual(spot({ offset: 2, capo: 3, mul: 1.25, top: 640, u: 0.4 }))
  })

  it('hands the saved place over exactly once', () => {
    const s = setlistOf(songs(2))
    s.go(1, spot({ top: 300 }))
    s.go(0, spot())
    expect(s.takeRestore()).not.toBeNull()
    expect(s.takeRestore()).toBeNull()
  })

  it('marks what has already been rehearsed', () => {
    const s = setlistOf(songs(3))
    expect(s.seenLabel.value).toBe('nenhuma ainda')
    s.go(1, spot())
    expect(s.seenLabel.value).toBe('2 já passamos')
  })

  it('going nowhere just closes the list', () => {
    const s = setlistOf(songs(2))
    s.open()
    s.go(0, spot({ offset: 5 }))
    expect(s.listOpen.value).toBe(false)
    expect(s.takeRestore()).toBeNull()
  })
})

describe('a song that has to be fetched', () => {
  it('asks for the current one and both neighbours, never twice', async () => {
    const asked: string[] = []
    const s = setlistOf(songs(4, false), (id) => {
      asked.push(id)
      return CHART
    })
    s.prefetch()
    s.prefetch()
    await flushPromises()
    expect(asked.sort()).toEqual(['s0', 's1'])
    expect(s.currentSource.value).toBe(CHART)
  })

  it('falls into songFail when the host cannot deliver, and retry asks again', async () => {
    let attempt = 0
    const s = setlistOf(songs(2, false), () => {
      attempt += 1
      if (attempt <= 2) return Promise.reject(new Error('rede'))
      return CHART
    })
    s.prefetch()
    await flushPromises()
    expect(s.failing.value).toBe(true)
    expect(s.currentSource.value).toBeNull()

    s.retry()
    await flushPromises()
    expect(s.failing.value).toBe(false)
    expect(s.currentSource.value).toBe(CHART)
  })

  it('treats an empty answer as a failure, not as an empty chart', async () => {
    const s = setlistOf(songs(2, false), () => '   ')
    s.prefetch()
    await flushPromises()
    expect(s.failing.value).toBe(true)
  })

  it('fails outright when the host offered no way to load', async () => {
    const s = setlistOf(songs(2, false))
    s.prefetch()
    await flushPromises()
    expect(s.failing.value).toBe(true)
  })
})

describe('the list on screen', () => {
  it('only offers search once it is too long to scan', () => {
    expect(setlistOf(songs(10)).showSearch.value).toBe(false)
    expect(setlistOf(songs(11)).showSearch.value).toBe(true)
  })

  it('searches title and subtitle, and says when nothing matches', () => {
    const s = setlistOf(songs(4))
    s.query.value = 'Música 3'
    expect(s.items.value.map((i) => i.title)).toEqual(['Música 3'])
    s.query.value = 'adoradores'
    expect(s.items.value.length).toBeGreaterThan(0)
    s.query.value = 'zzz'
    expect(s.items.value).toEqual([])
    expect(s.noHit.value).toBe(true)
  })

  it('numbers from the real position, not from the filtered one', () => {
    const s = setlistOf(songs(4))
    s.query.value = 'Música 3'
    expect(s.items.value[0]).toMatchObject({ num: '03', i: 2 })
  })
})

describe('the end of a song', () => {
  it('offers the next one and does not move on its own', () => {
    const s = setlistOf(songs(2))
    s.offerNext()
    expect(s.endOffer.value).toBe(true)
    expect(s.si.value).toBe(0)
  })

  it('offers nothing on the last song', () => {
    const s = setlistOf(songs(2))
    s.go(1, spot())
    s.offerNext()
    expect(s.endOffer.value).toBe(false)
  })

  it('offers nothing when there is no rehearsal', () => {
    const s = setlistOf(songs(1))
    s.offerNext()
    expect(s.endOffer.value).toBe(false)
  })
})

// ------------------------------------------------------------- the surface

const mounted: ReturnType<typeof mount>[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})
function viewer(props: Record<string, unknown> = {}) {
  const w = mount(ChordproViewer, {
    props: { source: CHART, autoHide: false, storage: memoryStore(), ...props },
    attachTo: document.body,
  })
  mounted.push(w)
  return w
}

describe('the viewer without a list is the viewer it always was', () => {
  it('shows no list control at all', () => {
    const w = viewer()
    expect(w.find('[data-setlist-open]').exists()).toBe(false)
    expect(w.find('[data-song-prev]').exists()).toBe(false)
    expect(w.find('[data-song-next]').exists()).toBe(false)
  })

  it('one song is not a rehearsal either', () => {
    const w = viewer({ songs: songs(1) })
    expect(w.find('[data-setlist-open]').exists()).toBe(false)
  })
})

describe('the viewer in a rehearsal', () => {
  it('puts the list on the title and reads the first song', async () => {
    const w = viewer({ source: '', songs: songs(2) })
    await flushPromises()
    expect(w.find('[data-setlist-open]').exists()).toBe(true)
    expect(w.text()).toContain('Jesus')
  })

  it('prints the BPM on the row, next to the key, not as a heading', async () => {
    const w = viewer({ source: '', songs: songs(2) })
    await flushPromises()
    await w.get('[data-setlist-open]').trigger('click')
    const bpm = w.get('[data-setlist-item] [data-setlist-bpm]')
    expect(bpm.text()).toBe('60')
    expect(bpm.attributes('title')).toBe('60 BPM')
  })

  it('opens the list and changes song from it', async () => {
    const w = viewer({ source: '', songs: songs(2) })
    await flushPromises()
    await w.get('[data-setlist-open]').trigger('click')
    const items = w.findAll('[data-setlist-item]')
    expect(items).toHaveLength(2)
    await items[1]!.trigger('click')
    await flushPromises()
    await nextTick()
    expect(w.find('[data-setlist-item]').exists()).toBe(false)
    expect(w.text()).toContain('Escuta')
  })

  it('Escape closes the list', async () => {
    const w = viewer({ source: '', songs: songs(2) })
    await flushPromises()
    await w.get('[data-setlist-open]').trigger('click')
    expect(w.find('[data-setlist-item]').exists()).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(w.find('[data-setlist-item]').exists()).toBe(false)
  })

  it('stays navigable while a chart is still downloading', async () => {
    // Waiting is exactly when a musician wants to skip ahead.
    const w = viewer({
      source: '',
      songs: songs(3, false),
      loadSong: () => new Promise<string>(() => {}),
    })
    await flushPromises()
    await nextTick()
    expect(w.find('[data-song-loading]').exists()).toBe(true)
    expect(w.find('.cpv-song-skel-page').exists(), 'skeleton stands in for the chart').toBe(true)
    expect(w.text()).toContain('Buscando')
    expect(w.find('[data-setlist-open]').exists()).toBe(true)
    expect(w.find('[data-song-next]').exists()).toBe(true)
  })

  it('lets the reader skip past a song that is taking too long', async () => {
    const w = viewer({
      source: '',
      songs: songs(3, false),
      loadSong: () => new Promise<string>(() => {}),
    })
    await flushPromises()
    await w.get('[data-song-next]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(w.text()).toContain('Música 2')
  })

  it('an empty list is nothing selected — not a song without a chart', async () => {
    const w = viewer({ source: '', songs: [], modes: 'content' })
    await nextTick()
    expect(w.find('[data-empty-setlist]').exists()).toBe(true)
    // The invitation to author would offer to duplicate a chart that exists.
    expect(w.find('[data-start-import]').exists()).toBe(false)
  })

  /**
   * Pinned as it is, not as it should be: a song the list carries no chart for
   * is reported as a failed fetch, whether `loadSong` is absent, resolves
   * empty, or rejects. There is no way for a host to say "this one has no
   * chart yet — write it". The design template does the same; changing it is a
   * contract decision, not a bug fix.
   */
  it('cannot yet tell "no chart yet" apart from "could not fetch"', async () => {
    for (const loadSong of [undefined, () => '', () => Promise.reject(new Error('rede'))]) {
      const w = viewer({
        source: '',
        songs: [
          { id: 'a', title: 'Uma' },
          { id: 'b', title: 'Outra', source: CHART },
        ],
        modes: 'content',
        ...(loadSong ? { loadSong } : {}),
      })
      await flushPromises()
      await nextTick()
      expect(w.find('[data-song-fail]').exists()).toBe(true)
      expect(w.find('[data-start-import]').exists()).toBe(false)
    }
  })

  it('says a song did not arrive, instead of "no chart loaded"', async () => {
    const w = viewer({ source: '', songs: songs(2, false), loadSong: () => Promise.reject(new Error('rede')) })
    await flushPromises()
    await nextTick()
    expect(w.find('[data-song-fail]').exists()).toBe(true)
    expect(w.text()).toContain('Não carregou')
    expect(w.text()).not.toContain('Nenhuma cifra carregada')
  })
})

/**
 * The window wheel handler used to steal every gesture outside `.cpv-scroll`
 * and feed it to the chart — including when the rehearsal list was open on
 * top. The list has its own scrollbar; the chart underneath must stay put.
 */
describe('wheel over the open rehearsal list stays on the list', () => {
  function wheel(target: Element, deltaY: number) {
    const ev = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true })
    target.dispatchEvent(ev)
    return ev
  }

  it('does not scroll the chart when the wheel is over a list item', async () => {
    const w = viewer({ source: '', songs: songs(12) })
    await flushPromises()
    const scroll = w.get('[data-cpv-scroll]').element as HTMLElement
    Object.defineProperty(scroll, 'scrollHeight', { configurable: true, value: 4000 })
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 500 })
    scroll.scrollTop = 120

    await w.get('[data-setlist-open]').trigger('click')
    await nextTick()
    const item = w.get('[data-setlist-item]').element
    wheel(item, 80)

    expect(scroll.scrollTop).toBe(120)
  })

  it('does not scroll the chart when the wheel is over the scrim', async () => {
    const w = viewer({ source: '', songs: songs(12) })
    await flushPromises()
    const scroll = w.get('[data-cpv-scroll]').element as HTMLElement
    Object.defineProperty(scroll, 'scrollHeight', { configurable: true, value: 4000 })
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 500 })
    scroll.scrollTop = 90

    await w.get('[data-setlist-open]').trigger('click')
    await nextTick()
    const scrim = w.get('.cpv-scrim').element
    const ev = wheel(scrim, 60)

    expect(scroll.scrollTop).toBe(90)
    expect(ev.defaultPrevented, 'scrim must not leak the wheel to the page').toBe(true)
  })

  it('still scrolls the chart from chrome when the list is closed', async () => {
    const w = viewer({ source: '', songs: songs(3) })
    await flushPromises()
    const scroll = w.get('[data-cpv-scroll]').element as HTMLElement
    Object.defineProperty(scroll, 'scrollHeight', { configurable: true, value: 4000 })
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 500 })
    scroll.scrollTop = 40

    const chrome = w.get('[data-setlist-open]').element
    wheel(chrome, 50)

    expect(scroll.scrollTop).toBe(90)
  })

  it('does not preventDefault on a wheel over the dialog body', async () => {
    const w = viewer({ source: '', songs: songs(12) })
    await flushPromises()
    await w.get('[data-setlist-open]').trigger('click')
    await nextTick()
    const item = w.get('[data-setlist-item]').element
    const ev = wheel(item, 40)
    expect(ev.defaultPrevented).toBe(false)
  })
})

/**
 * "Fim da música / Próxima" is the end of the paper, not a clock that can
 * fire because the musician paused, dragged the chart and hit Rolar again.
 */
describe('the end-of-song offer does not fire mid-chart', () => {
  const observers: ((entries: unknown[]) => void)[] = []
  class TestRO {
    constructor(cb: (entries: unknown[]) => void) {
      observers.push(cb)
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  let realRO: typeof ResizeObserver

  beforeEach(() => {
    observers.length = 0
    realRO = globalThis.ResizeObserver
    globalThis.ResizeObserver = TestRO as unknown as typeof ResizeObserver
    vi.useFakeTimers({
      toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'],
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    globalThis.ResizeObserver = realRO
  })

  const TINY = '{title: Tiny}\n{key: C}\n[C]Oi\n'
  function tinySongs(n: number): SetlistSong[] {
    return Array.from({ length: n }, (_, i) => ({
      id: `t${i}`,
      title: `Música ${i + 1}`,
      source: TINY,
    }))
  }

  async function rehearsalWithRoom(list: SetlistSong[] = songs(2)) {
    const w = viewer({ source: '', songs: list, autoHide: false })
    await flushPromises()
    const el = w.get('[data-cpv-scroll]').element as HTMLElement
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 4000 })
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: 500 })
    observers.forEach((cb) => cb([{ contentRect: { width: 900, height: 800 } }]))
    await flushPromises()
    await w.get('[data-met-btn]').trigger('click')
    await flushPromises()
    await w.findAll('.cpv-met-switch')[1]!.trigger('click')
    await flushPromises()
    await w.get('[aria-label="Fechar"]').trigger('click')
    await flushPromises()
    return { w, el }
  }

  async function frames(n: number) {
    for (let i = 0; i < n; i++) {
      await vi.advanceTimersByTimeAsync(16)
      await flushPromises()
    }
  }

  async function waitOffer(w: ReturnType<typeof viewer>, on: boolean, budget = 250) {
    for (let i = 0; i < budget; i++) {
      if (w.find('[data-end-offer]').exists() === on) return
      // 250ms is the loop's dt cap, so each frame burns a quarter-second of music.
      await vi.advanceTimersByTimeAsync(250)
      await flushPromises()
    }
    expect(w.find('[data-end-offer]').exists()).toBe(on)
  }

  it('does not offer the next song after pause, drag, and Rolar again', async () => {
    const { w, el } = await rehearsalWithRoom()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    await frames(4)
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()

    el.scrollTop = 1800
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    await frames(8)

    expect(w.find('[data-end-offer]').exists(), 'offered next while the page was still mid-chart').toBe(false)
    expect((w.get('[data-scroll]').text() + (w.get('[data-scroll]').attributes('aria-label') ?? ''))).toMatch(/Parar/)
  })

  it('clears a leftover offer when the musician hits Rolar again', async () => {
    const { w, el } = await rehearsalWithRoom(tinySongs(2))
    el.scrollTop = 3499
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    await waitOffer(w, true)

    el.scrollTop = 900
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    expect(w.find('[data-end-offer]').exists(), 'Rolar must dismiss the leftover fim-da-música badge').toBe(false)
  })

  it('offers the next song only when the paper is actually at the end', async () => {
    const { w, el } = await rehearsalWithRoom(tinySongs(2))
    el.scrollTop = 3499
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    await waitOffer(w, true)
    expect(w.find('[data-end-next]').exists()).toBe(true)
  })

  it('does not offer next on the last song even at the paper end', async () => {
    const w = viewer({ source: '', songs: tinySongs(2), autoHide: false })
    await flushPromises()
    await w.get('[data-song-next]').trigger('click')
    await flushPromises()
    const el = w.get('[data-cpv-scroll]').element as HTMLElement
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 4000 })
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: 500 })
    observers.forEach((cb) => cb([{ contentRect: { width: 900, height: 800 } }]))
    await flushPromises()
    await w.get('[data-met-btn]').trigger('click')
    await flushPromises()
    await w.findAll('.cpv-met-switch')[1]!.trigger('click')
    await flushPromises()
    await w.get('[aria-label="Fechar"]').trigger('click')
    await flushPromises()
    el.scrollTop = 3499
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    await waitOffer(w, false, 80)
  })

  it('does not offer next when Rolar starts from the top', async () => {
    const { w, el } = await rehearsalWithRoom()
    el.scrollTop = 0
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    await frames(6)
    expect(w.find('[data-end-offer]').exists()).toBe(false)
  })
})
