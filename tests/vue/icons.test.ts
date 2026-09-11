import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import CpvIcon from '../../src/vue/icon/CpvIcon.vue'
import { ICONS, PICKED_ICONS, type CpvIconName } from '../../src/vue/icon/paths'
import { themeIcon } from '../../src/vue/use/useTheme'
import SetlistSheet, { type SetlistItem } from '../../src/vue/sheets/SetlistSheet.vue'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

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
})

async function viewerAt(width: number, props: Record<string, unknown> = {}) {
  const w = mount(ChordproViewer, {
    props: {
      source: loadFixture(JESUS_1),
      theme: 'dark',
      autoHide: false,
      songId: 'jesus-1',
      ...props,
    },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width, height: 800 } }]))
  await flushPromises()
  return w
}

describe('icon set', () => {
  it('ships a path for every locked pick, and refuses the rejected chorus mark', () => {
    for (const name of PICKED_ICONS) {
      expect(ICONS[name].length, name).toBeGreaterThan(0)
    }
    expect('repeat' in ICONS).toBe(false)
  })

  it('draws currentColor so a green button is not a black triangle', () => {
    const w = mount(CpvIcon, { props: { name: 'pencil' } })
    const svg = w.get('svg')
    expect(svg.attributes('data-icon')).toBe('pencil')
    expect(svg.attributes('stroke')).toBe('currentColor')
    expect(svg.classes()).toContain('cpv-ico')
    w.unmount()
  })

  it('maps theme auto / light / dark to sun-moon / sun / moon', () => {
    expect(themeIcon('auto')).toBe('sunMoon')
    expect(themeIcon('light')).toBe('sun')
    expect(themeIcon('dark')).toBe('moon')
  })
})

describe('chrome uses the locked set', () => {
  it('Rolar is chevrons-down, not a media play triangle', async () => {
    const w = await viewerAt(1024)
    expect(w.find('[data-scroll] [data-icon=chevronsDown]').exists()).toBe(true)
    expect(w.find('[data-scroll] .cpv-icon-play').exists()).toBe(false)
  })

  it('keeps A− / A+ as type, not a pictogram', async () => {
    const w = await viewerAt(1024)
    expect(w.get('[aria-label="Diminuir tipografia"]').text()).toBe('A−')
    expect(w.get('[aria-label="Aumentar tipografia"]').text()).toBe('A+')
  })

  it('dock theme / edit / more / fullscreen share SVG siblings', async () => {
    const w = await viewerAt(390)
    expect(w.find('[data-theme-btn] [data-icon=moon]').exists()).toBe(true)
    expect(w.find('[data-edit] [data-icon=pencil]').exists()).toBe(true)
    expect(w.find('[aria-label="Mais controles"] [data-icon=ellipsis]').exists()).toBe(true)
    expect(w.find('[data-fs] [data-icon=maximize2]').exists()).toBe(true)
  })

  it('wide bar names the tools with the same icons the dock uses', async () => {
    const w = await viewerAt(1024)
    expect(w.find('[data-fit] [data-icon=scan]').exists()).toBe(true)
    expect(w.find('[data-lens-btn] [data-icon=glasses]').exists()).toBe(true)
    expect(w.find('[data-met-btn] [data-icon=metronome]').exists()).toBe(true)
    expect(w.find('[aria-label="Exportar"] [data-icon=download]').exists()).toBe(true)
    expect(w.find('[data-theme-btn] [data-icon=moon]').exists()).toBe(true)
    expect(w.find('[data-edit] [data-icon=pencil]').exists()).toBe(true)
  })

  it('Mais rows carry the same icons, not a text-only sheet', async () => {
    const w = await viewerAt(390)
    await w.get('[aria-label="Mais controles"]').trigger('click')
    await flushPromises()
    const dlg = w.get('[role="dialog"][aria-label="Mais controles"]')
    const icons = dlg.findAll('.cpv-ico').map((n) => n.attributes('data-icon'))
    expect(icons).toEqual(expect.arrayContaining(['scan', 'glasses', 'metronome', 'download']))
    expect(dlg.find('[data-icon=x]').exists()).toBe(true)
  })
})

describe('setlist seen mark', () => {
  const item = (over: Partial<SetlistItem> = {}): SetlistItem => ({
    i: 0,
    id: 'a',
    num: '1',
    title: 'Uma',
    sub: '',
    keyLabel: 'G',
    hasKey: true,
    bpmLabel: '80',
    current: false,
    failed: false,
    busy: false,
    seen: false,
    ...over,
  })

  it('draws a compact SVG check, not a platform-dependent ✓', () => {
    const w = mount(SetlistSheet, {
      props: {
        compact: false,
        headLabel: '2 músicas',
        seenLabel: '1 ensaiada',
        showSearch: false,
        query: '',
        items: [item({ seen: true })],
        noHit: false,
      },
    })
    expect(w.find('[data-setlist-item] [data-icon=check]').exists()).toBe(true)
    expect(w.get('[data-setlist-item]').text()).not.toContain('✓')
    w.unmount()
  })

  it('failed songs use the alert triangle, not a typed !', () => {
    const w = mount(SetlistSheet, {
      props: {
        compact: false,
        headLabel: '1',
        seenLabel: '',
        showSearch: false,
        query: '',
        items: [item({ failed: true })],
        noHit: false,
      },
    })
    expect(w.find('[data-setlist-item] [data-icon=alertTri]').exists()).toBe(true)
    w.unmount()
  })
})

describe('insert menu', () => {
  it('uses the locked block icons and does not sneak Lucide repeat onto refrão', async () => {
    const w = await viewerAt(1024, { canEdit: true, modes: 'content' })
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    const pick = w.find('[data-mode-content]')
    if (pick.exists()) {
      await pick.trigger('click')
      await flushPromises()
    }
    await w.get('[data-insert]').trigger('click')
    await flushPromises()
    const menu = w.get('.cpv-insert-menu')
    const names = menu.findAll('[data-icon]').map((n) => n.attributes('data-icon') as CpvIconName)
    expect(names).toEqual(expect.arrayContaining(['music2', 'msgQuote', 'alignLeft']))
    expect(names).not.toContain('repeat')
    expect(menu.text()).toMatch(/Refrão/)
  })
})
