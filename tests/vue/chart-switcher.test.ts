import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { diffOps, overlayKey, parse } from '../../src/core'
import { ChordproViewer } from '../../src/vue'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

/** Same N>1 file as `TWO_CHART_SOURCE` in tests/core/charts-envelope.test.ts. */
const TWO_CHART_SOURCE = `{start_of_x_chart:completa}
{title:Uma}
{artist:Alguém}
{x_chart_label:Completa}
{key:G}
{duration:04:26}
[G]corpo da completa
{end_of_x_chart}

{start_of_x_chart:oferta}
{title:Uma}
{artist:Alguém}
{x_chart_label:Oferta}
{x_chart_default:oferta}
{key:C}
{duration:02:00}
[C]corpo da oferta
{end_of_x_chart}
`

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
  localStorage.clear()
  localStorage.setItem('cpv:fitSeen', '1')
  observers.length = 0
  realRO = globalThis.ResizeObserver
  globalThis.ResizeObserver = TestRO as unknown as typeof ResizeObserver
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  globalThis.ResizeObserver = realRO
  localStorage.clear()
  vi.unstubAllGlobals()
})

async function mountViewer(props: Record<string, unknown> = {}) {
  const w = mount(ChordproViewer, {
    props: {
      source: TWO_CHART_SOURCE,
      theme: 'dark',
      autoHide: false,
      songId: 'uma',
      ...props,
    },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width: 800, height: 800 } }]))
  await flushPromises()
  return w
}

async function pickChart(w: Awaited<ReturnType<typeof mountViewer>>, id: string) {
  await w.get('[data-chart-switch]').trigger('click')
  await flushPromises()
  await w.get(`[data-chart-option="${id}"]`).trigger('click')
  await flushPromises()
}

describe('title chip and chartId prop', () => {
  it('shows a cifra chip with the default chart label', async () => {
    const w = await mountViewer()
    const chip = w.get('[data-chart-switch]')
    expect(chip.exists()).toBe(true)
    expect(chip.text()).not.toMatch(/Cifra/i)
    expect(chip.text()).toMatch(/Oferta/)
    expect(chip.text()).not.toMatch(/Completa/)
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da oferta')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da completa')
  })

  it('selecting Completa emits update:chartId and re-parses that chart only', async () => {
    const w = await mountViewer()
    await pickChart(w, 'completa')
    expect(w.emitted('update:chartId')?.flat()).toContain('completa')
    expect(w.get('[data-chart-switch]').text()).toMatch(/Completa/)
    expect(w.get('[data-chart-switch]').text()).not.toMatch(/Oferta/)
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
  })

  it('opens on the chartId prop', async () => {
    const w = await mountViewer({ chartId: 'completa' })
    expect(w.get('[data-chart-switch]').text()).toMatch(/Completa/)
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
  })

  it('hides the control on a one-chart file', async () => {
    const w = await mountViewer({ source: loadFixture(JESUS_1) })
    expect(w.find('[data-chart-switch]').exists()).toBe(false)
  })

  it('uses cpv-head-chip invert class and does not steal the Tom chip', async () => {
    const w = await mountViewer()
    const chip = w.get('[data-chart-switch]')
    expect(chip.classes()).toContain('cpv-head-chip')
    expect(w.get('.cpv-keypill').classes()).toContain('cpv-head-chip')
    expect(w.get('.cpv-keypill').text()).toMatch(/Tom/i)
    expect(chip.text()).not.toMatch(/Tom/i)
  })
})

async function frames() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
  await flushPromises()
}

describe('chart switch is not a song change', () => {
  it('does not call setlist go and leaves songId on the same item', async () => {
    const other = loadFixture('sda/084-escuta-meu-clamor.cho')
    const w = await mountViewer({
      source: '',
      songs: [
        { id: 'uma', title: 'Uma', source: TWO_CHART_SOURCE },
        { id: 'escuta', title: 'Escuta meu clamor', source: other },
      ],
    })
    expect(w.get('[data-setlist-open]').text()).toMatch(/1\/2/)
    expect(w.get('[data-chart-title]').text()).toMatch(/Uma/)
    await pickChart(w, 'completa')
    expect(w.get('[data-setlist-open]').text()).toMatch(/1\/2/)
    expect(w.get('[data-chart-title]').text()).toMatch(/Uma/)
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.find('[data-chart-switch]').exists()).toBe(true)

    await w.get('[data-song-next]').trigger('click')
    await flushPromises()
    expect(w.get('[data-setlist-open]').text()).toMatch(/2\/2/)
    expect(w.get('[data-chart-title]').text()).toMatch(/Escuta/i)
    expect(w.find('[data-chart-switch]').exists()).toBe(false)
  })

  it('keeps the sibling overlay in storage and reloads it on return', async () => {
    const oferta = parse(TWO_CHART_SOURCE, { chartId: 'oferta' }).source
    const mine = oferta.replace('[C]corpo da oferta', '[C]corpo da oferta (meu)')
    const ops = diffOps(oferta, mine, { transpose: 0, capo: 0 })
    const seeded = JSON.stringify({ baseVersion: 'v1', ops, at: 1 })
    localStorage.setItem(overlayKey('uma', 'oferta'), seeded)

    const w = await mountViewer()
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da oferta (meu)')
    await pickChart(w, 'completa')
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('(meu)')
    expect(localStorage.getItem(overlayKey('uma', 'oferta'))).toBe(seeded)
    expect(localStorage.getItem(overlayKey('uma', 'completa'))).toBeNull()

    await pickChart(w, 'oferta')
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da oferta (meu)')
    expect(localStorage.getItem(overlayKey('uma', 'oferta'))).toBe(seeded)
  })

  it('restores live transpose, capo, speed and scroll per chartId', async () => {
    const w = await mountViewer()
    const el = w.get('[data-cpv-scroll]').element as HTMLElement
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 4000 })
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: 500 })
    observers.forEach((cb) => cb([{ contentRect: { width: 800, height: 800 } }]))
    await flushPromises()

    expect(w.get('[data-display-key]').text()).toBe('C')
    await w.get('[data-transpose-up]').trigger('click')
    await flushPromises()
    expect(w.get('[data-display-key]').text()).toBe('C')
    expect(w.get('[data-tone-shift]').text()).toMatch(/tocando em C#/)
    await w.get('[data-capo]').trigger('click')
    await flushPromises()
    await w.get('[aria-label="Capo acima"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-capo]').text()).toMatch(/1/)
    el.scrollTop = 180

    await w.get('[data-met-btn]').trigger('click')
    await flushPromises()
    await w.get('[data-met-follow]').trigger('click')
    await flushPromises()
    await w.get('[aria-label="Fechar"]').trigger('click')
    await flushPromises()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    await w.get('[aria-label="Mais rápido"]').trigger('click')
    await flushPromises()
    expect(w.text()).toMatch(/1\.12/)

    await pickChart(w, 'completa')
    expect(w.get('[data-display-key]').text()).toBe('G')
    expect(w.get('[data-capo]').text()).not.toMatch(/1/)
    expect(el.scrollTop).toBe(0)

    await pickChart(w, 'oferta')
    await frames()
    expect(w.get('[data-display-key]').text()).toBe('C')
    expect(w.get('[data-tone-shift]').text()).toMatch(/tocando em C#/)
    expect(w.get('[data-capo]').text()).toMatch(/1/)
    expect(el.scrollTop).toBe(180)
    observers.forEach((cb) => cb([{ contentRect: { width: 800, height: 800 } }]))
    await flushPromises()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    expect(w.text()).toMatch(/1\.12/)
  })

  it('keeps metronome BPM per chart so oferta does not leak onto completa', async () => {
    const w = await mountViewer()
    await w.get('[data-met-btn]').trigger('click')
    await flushPromises()
    expect(w.get('[data-bpm]').text()).toBe('100')
    await w.get('[aria-label="+5 BPM"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-bpm]').text()).toBe('105')

    await pickChart(w, 'completa')
    expect(w.get('[data-bpm]').text()).toBe('100')

    await pickChart(w, 'oferta')
    expect(w.get('[data-bpm]').text()).toBe('105')
  })

  it('does not reset lens or hideComments on chart switch', async () => {
    const w = await mountViewer()
    await w.get('[data-reading=letra]').trigger('click')
    await flushPromises()
    await w.get('[data-comments-toggle]').trigger('click')
    await flushPromises()
    expect(w.get('[data-reading=letra]').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-comments-toggle]').attributes('aria-pressed')).toBe('true')

    await pickChart(w, 'completa')
    expect(w.get('[data-reading=letra]').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-comments-toggle]').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
  })
})

const WITH_AUDIO = `{start_of_x_chart:completa}
{title:Uma}
{artist:Alguém}
{x_chart_label:Completa}
{key:G}
{duration:04:26}
{x_titan_audio_sung:https://cdn.sda/completa.m4a?h=1}
[G]corpo da completa
{end_of_x_chart}

{start_of_x_chart:oferta}
{title:Uma}
{artist:Alguém}
{x_chart_label:Oferta}
{x_chart_default:oferta}
{key:C}
{duration:02:00}
{x_titan_audio_sung:https://cdn.sda/oferta.m4a?h=2}
[C]corpo da oferta
{end_of_x_chart}
`

const AUDIO_INHERIT = `{start_of_x_chart:completa}
{title:Uma}
{artist:Alguém}
{x_chart_label:Completa}
{key:G}
{duration:04:26}
[G]corpo da completa
{end_of_x_chart}

{start_of_x_chart:oferta}
{title:Uma}
{artist:Alguém}
{x_chart_label:Oferta}
{x_chart_default:oferta}
{key:C}
{duration:02:00}
{x_titan_audio_sung:https://cdn.sda/song.m4a?h=9}
[C]corpo da oferta
{end_of_x_chart}
`

describe('timeline and audio follow the chart', () => {
  it('rebuilds duration from the open chart document', async () => {
    const w = await mountViewer()
    expect(w.get('[data-cpv-head]').text()).toContain('02:00')
    expect(w.get('[data-cpv-head]').text()).not.toContain('04:26')
    await pickChart(w, 'completa')
    expect(w.get('[data-cpv-head]').text()).toContain('04:26')
    expect(w.get('[data-cpv-head]').text()).not.toContain('02:00')
  })

  it('does not keep the previous chart playhead', async () => {
    const w = await mountViewer()
    const el = w.get('[data-cpv-scroll]').element as HTMLElement
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 4000 })
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: 500 })
    observers.forEach((cb) => cb([{ contentRect: { width: 800, height: 800 } }]))
    await flushPromises()
    await w.get('[data-met-btn]').trigger('click')
    await flushPromises()
    await w.get('[data-met-follow]').trigger('click')
    await flushPromises()
    await w.get('[aria-label="Fechar"]').trigger('click')
    await flushPromises()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    el.scrollTop = 220
    const bar = w.get('.cpv-progress span')
    bar.element.setAttribute('style', 'width: 40%')

    await pickChart(w, 'completa')
    expect(el.scrollTop).toBe(0)
    expect((w.get('.cpv-progress span').element as HTMLElement).style.width).toMatch(/^0/)
    expect(w.get('[data-scroll]').text()).toMatch(/Rolar/)
  })

  it('reads x_audio of the open chart, not the sibling', async () => {
    const created: { src: string }[] = []
    class SilentAudio {
      src = ''
      currentTime = 0
      duration = Number.NaN
      paused = true
      preload = 'metadata'
      play = async () => {
        this.paused = false
      }
      pause = () => {
        this.paused = true
      }
      load = () => {}
      removeAttribute() {}
      addEventListener() {}
      removeEventListener() {}
      constructor() {
        created.push(this)
      }
    }
    vi.stubGlobal('Audio', SilentAudio)
    const w = await mountViewer({ source: WITH_AUDIO })
    expect(w.find('[data-audio-ref]').exists()).toBe(true)
    expect(created.some((a) => a.src.includes('oferta.m4a'))).toBe(true)
    expect(created.some((a) => a.src.includes('completa.m4a'))).toBe(false)

    await pickChart(w, 'completa')
    expect(created.some((a) => a.src.includes('completa.m4a'))).toBe(true)
    const last = created[created.length - 1]
    expect(last?.src).toContain('completa.m4a')
    expect(last?.paused).toBe(true)
    vi.unstubAllGlobals()
  })

  it('does not leak sibling audio when the open chart omits tracks', async () => {
    const created: { src: string }[] = []
    class SilentAudio {
      src = ''
      currentTime = 0
      duration = Number.NaN
      paused = true
      preload = 'metadata'
      play = async () => {}
      pause = () => {}
      load = () => {}
      removeAttribute() {}
      addEventListener() {}
      removeEventListener() {}
      constructor() {
        created.push(this)
      }
    }
    vi.stubGlobal('Audio', SilentAudio)
    const w = await mountViewer({ source: AUDIO_INHERIT })
    expect(w.find('[data-audio-ref]').exists()).toBe(true)
    expect(created.some((a) => a.src.includes('song.m4a'))).toBe(true)

    await pickChart(w, 'completa')
    expect(w.find('[data-audio-ref]').exists()).toBe(false)
    vi.unstubAllGlobals()
  })
})

const CULT_SOURCE = `{start_of_x_chart:ensaio}
{title:Duas}
{artist:Alguém}
{x_chart_label:Ensaio}
{key:G}
{duration:03:00}
[G]corpo do ensaio
{end_of_x_chart}

{start_of_x_chart:culto}
{title:Duas}
{artist:Alguém}
{x_chart_label:Culto}
{x_chart_default:culto}
{key:D}
{duration:04:00}
[D]corpo do culto
{end_of_x_chart}
`

const THREE_CHART_SOURCE = `{start_of_x_chart:completa}
{title:Uma}
{artist:Alguém}
{x_chart_label:Completa}
{key:G}
{duration:04:26}
[G]corpo da completa
{end_of_x_chart}

{start_of_x_chart:oferta}
{title:Uma}
{artist:Alguém}
{x_chart_label:Oferta}
{x_chart_default:oferta}
{key:C}
{duration:02:00}
[C]corpo da oferta
{end_of_x_chart}

{start_of_x_chart:louvor}
{title:Uma}
{artist:Alguém}
{x_chart_label:Louvor}
{key:A}
{duration:01:30}
[A]corpo do louvor
{end_of_x_chart}
`

describe('download is the open cifra', () => {
  it('saves the visible chart, not the sibling', async () => {
    const blobs: Blob[] = []
    const names: string[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((obj) => {
      blobs.push(obj as Blob)
      return 'blob:cifra'
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download)
    })
    const w = await mountViewer()
    await w.get('[aria-label="Exportar"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-export="cho"]').text()).toMatch(/Oferta/)
    await w.get('[data-export="cho"]').trigger('click')
    await flushPromises()
    expect(names.at(-1)).toBe('uma-oferta-c.cho')
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(blobs.at(-1) as Blob)
    })
    expect(text).toContain('corpo da oferta')
    expect(text).not.toContain('corpo da completa')
    expect(text).not.toMatch(/start_of_x_chart/)
    vi.restoreAllMocks()
  })
})

describe('program opens the cifra it named', () => {
  it('opens that cifra, not the file default or the viewer prop', async () => {
    const w = await mountViewer({
      source: '',
      chartId: 'oferta',
      songs: [
        { id: 'uma', title: 'Uma', source: TWO_CHART_SOURCE, chartId: 'completa' },
        { id: 'duas', title: 'Duas', source: CULT_SOURCE },
      ],
    })
    expect(w.get('[data-chart-switch]').text()).toMatch(/Completa/)
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
  })

  it('keeps the musician pick across songs and does not borrow chartId', async () => {
    const w = await mountViewer({
      source: '',
      chartId: 'ensaio',
      songs: [
        { id: 'uma', title: 'Uma', source: TWO_CHART_SOURCE, chartId: 'completa' },
        { id: 'duas', title: 'Duas', source: CULT_SOURCE },
      ],
    })
    await pickChart(w, 'oferta')
    expect(w.get('[data-setlist-open]').text()).toMatch(/1\/2/)

    await w.get('[data-song-next]').trigger('click')
    await flushPromises()
    expect(w.get('[data-chart-switch]').text()).toMatch(/Culto/)
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo do culto')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo do ensaio')

    await w.get('[data-song-prev]').trigger('click')
    await flushPromises()
    expect(w.get('[data-setlist-open]').text()).toMatch(/1\/2/)
    expect(w.get('[data-chart-switch]').text()).toMatch(/Oferta/)
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da oferta')
  })

  it('keeps the pick when the program repeats the same cifra', async () => {
    const songs = [
      { id: 'uma', title: 'Uma', source: THREE_CHART_SOURCE, chartId: 'completa' },
      { id: 'duas', title: 'Duas', source: CULT_SOURCE, chartId: 'culto' },
    ]
    const w = await mountViewer({ source: '', songs })
    await pickChart(w, 'oferta')
    await w.setProps({
      songs: [
        { id: 'uma', title: 'Uma', source: THREE_CHART_SOURCE, chartId: 'completa' },
        { id: 'duas', title: 'Duas', source: CULT_SOURCE, chartId: 'culto' },
      ],
    })
    await flushPromises()
    expect(w.get('[data-chart-switch]').text()).toMatch(/Oferta/)
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da oferta')
  })

  it('opens the new cifra when the program changes it', async () => {
    const w = await mountViewer({
      source: '',
      songs: [
        { id: 'uma', title: 'Uma', source: THREE_CHART_SOURCE, chartId: 'completa' },
        { id: 'duas', title: 'Duas', source: CULT_SOURCE, chartId: 'culto' },
      ],
    })
    await pickChart(w, 'oferta')
    await w.setProps({
      songs: [
        { id: 'uma', title: 'Uma', source: THREE_CHART_SOURCE, chartId: 'louvor' },
        { id: 'duas', title: 'Duas', source: CULT_SOURCE, chartId: 'culto' },
      ],
    })
    await flushPromises()
    expect(w.get('[data-chart-switch]').text()).toMatch(/Louvor/)
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo do louvor')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
  })
})
