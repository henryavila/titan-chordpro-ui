import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TitanChordpro } from '../../src/vue'
import TitanChordproChartSwitch from '../../src/vue/ui/TitanChordproChartSwitch.vue'
import { versionMenuOffset } from '../../src/vue/ui/TitanChordproVersionMenuOffset'

const css = readFileSync(join(process.cwd(), 'src/vue/titan-chordpro.css'), 'utf8')

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`(^|\\n)${escaped}\\s*\\{[^}]*\\}`))?.[0] ?? ''
}

describe('version menu offset', () => {
  const limitLeft = 0
  const limitRight = 390
  const margin = 8

  it('stays put when the menu fits inside the margins', () => {
    expect(versionMenuOffset(100, 300, limitLeft, limitRight, margin)).toBe(0)
  })

  it('pulls left when the menu passes the right margin', () => {
    const shift = versionMenuOffset(300, 660, limitLeft, limitRight, margin)
    expect(shift).toBe(-278)
    expect(300 + shift + 360).toBe(limitRight - margin)
  })

  it('pushes right when the menu passes the left margin', () => {
    const shift = versionMenuOffset(-40, 140, limitLeft, limitRight, margin)
    expect(shift).toBe(48)
    expect(-40 + shift).toBe(limitLeft + margin)
  })

  it('aligns left with the margin when the menu is wider than the limit', () => {
    const shift = versionMenuOffset(0, 500, limitLeft, limitRight, margin)
    expect(shift).toBe(8)
    expect(0 + shift).toBe(limitLeft + margin)
  })

  it('leaves a menu exactly as wide as the band alone', () => {
    expect(versionMenuOffset(8, 382, limitLeft, limitRight, margin)).toBe(0)
  })
})

describe('the version menu is a floating surface', () => {
  it('does not paint its own background over the head', () => {
    const rule = block('.titan-chordpro-version-menu')
    expect(rule).not.toBe('')
    expect(rule).not.toMatch(/(^|[;\s])background\s*:/)
    expect(rule).not.toMatch(/(^|[;\s])border\s*:/)
  })

  it('wears the shared veil-2 surface', () => {
    const veil = block('.titan-chordpro-veil-2')
    expect(veil).toMatch(/background:\s*var\(--veil-2\)/)
    expect(veil).toMatch(/box-shadow:\s*var\(--shadow\)/)
  })

  it('rows and actions inherit the Titan font at 13px', () => {
    const rule = css.match(/\.titan-chordpro-version-row,\s*\.titan-chordpro-version-action\s*\{[^}]*\}/)?.[0] ?? ''
    expect(rule).toMatch(/font-family:\s*inherit/)
    expect(rule).toMatch(/font-size:\s*13px/)
  })
})

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

/** ResizeObserver that records its target, its callback and its disconnection. */
const observers: {
  cb: (entries: unknown[]) => void
  observed: Element[]
  disconnected: boolean
}[] = []
class TrackingRO {
  cb: (entries: unknown[]) => void
  observed: Element[] = []
  disconnected = false
  constructor(cb: (entries: unknown[]) => void) {
    this.cb = cb
    observers.push(this)
  }
  observe(el: Element) {
    this.observed.push(el)
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true
  }
}

const mounted: ReturnType<typeof mount>[] = []
let realRO: typeof ResizeObserver

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('cpv:fitSeen', '1')
  observers.length = 0
  realRO = globalThis.ResizeObserver
  globalThis.ResizeObserver = TrackingRO as unknown as typeof ResizeObserver
})

afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  globalThis.ResizeObserver = realRO
  localStorage.clear()
  vi.restoreAllMocks()
})

async function mountViewer(props: Record<string, unknown> = {}) {
  const w = mount(TitanChordpro, {
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
  observers.slice().forEach((ro) => ro.cb([{ contentRect: { width: 800, height: 800 } }]))
  await flushPromises()
  return w
}

function rect(left: number, right: number): DOMRect {
  return {
    left,
    right,
    top: 0,
    bottom: 0,
    width: right - left,
    height: 0,
    x: left,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect
}

/** The shift the element is rendering right now. */
function shiftOf(el: Element): number {
  const match = /translateX\((-?[\d.]+)px\)/.exec((el as HTMLElement).style.transform)
  return match ? Number(match[1]) : 0
}

function menuObserver() {
  return observers.find((ro) => ro.observed.some((el) => el.classList.contains('titan-chordpro-version-menu')))
}

function menuBox(menu: Element, baseLeft: number, width: number): DOMRect {
  const shift = shiftOf(menu)
  return rect(baseLeft + shift, baseLeft + shift + width)
}

describe('the open menu keeps measuring', () => {
  it('takes the new shift when its content grows', async () => {
    const w = await mountViewer()
    const original = Element.prototype.getBoundingClientRect
    let width = 300
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.classList.contains('titan-chordpro-version-menu')) return menuBox(this, 150, width)
      if (this.hasAttribute('data-titan-chordpro-root')) return rect(0, 390)
      return original.call(this)
    })
    try {
      await w.get('[data-chart-switch]').trigger('click')
      await flushPromises()
      expect(shiftOf(w.get('.titan-chordpro-version-menu').element)).toBe(-68)

      width = 340
      const ro = menuObserver()
      expect(ro, 'the open menu is observed').toBeTruthy()
      ro!.cb([{ contentRect: { width: 340, height: 100 } }])
      await flushPromises()

      const shift = shiftOf(w.get('.titan-chordpro-version-menu').element)
      expect(shift).toBe(-108)
      expect(150 + shift).toBeGreaterThanOrEqual(8)
      expect(150 + shift + 340).toBeLessThanOrEqual(382)
    } finally {
      spy.mockRestore()
    }
  })

  it('measures the same shift twice when a shift is already applied', async () => {
    const w = await mountViewer()
    const original = Element.prototype.getBoundingClientRect
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.classList.contains('titan-chordpro-version-menu')) return menuBox(this, 150, 340)
      if (this.hasAttribute('data-titan-chordpro-root')) return rect(0, 390)
      return original.call(this)
    })
    try {
      await w.get('[data-chart-switch]').trigger('click')
      await flushPromises()
      const ro = menuObserver()
      expect(ro, 'the open menu is observed').toBeTruthy()

      for (let i = 0; i < 2; i++) {
        ro!.cb([{ contentRect: { width: 340, height: 100 } }])
        await flushPromises()
        expect(shiftOf(w.get('.titan-chordpro-version-menu').element)).toBe(-108)
      }
    } finally {
      spy.mockRestore()
    }
  })

  it('listens to the window only while the menu is open', async () => {
    const w = await mountViewer()
    const original = Element.prototype.getBoundingClientRect
    let limitRight = 390
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.classList.contains('titan-chordpro-version-menu')) return menuBox(this, 300, 360)
      if (this.hasAttribute('data-titan-chordpro-root')) return rect(0, limitRight)
      return original.call(this)
    })
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    try {
      expect(add.mock.calls.filter(([type]) => type === 'resize'), 'no listener while closed').toHaveLength(0)

      await w.get('[data-chart-switch]').trigger('click')
      await flushPromises()
      const resizeCalls = add.mock.calls.filter(([type]) => type === 'resize')
      expect(resizeCalls, 'one listener while open').toHaveLength(1)
      const handler = resizeCalls[0]![1]
      const ro = menuObserver()
      expect(ro?.disconnected, 'the menu observer is connected while open').toBe(false)

      limitRight = 600
      window.dispatchEvent(new Event('resize'))
      await flushPromises()
      expect(shiftOf(w.get('.titan-chordpro-version-menu').element)).toBe(-68)

      await w.get('[data-chart-switch]').trigger('click')
      await flushPromises()
      expect(remove).toHaveBeenCalledWith('resize', handler)
      expect(ro?.disconnected, 'closing disconnects the menu observer').toBe(true)
    } finally {
      spy.mockRestore()
    }
  })

  it('uses the window as the limit when there is no Titan root', async () => {
    const widthSpy = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(500)
    const original = Element.prototype.getBoundingClientRect
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.classList.contains('titan-chordpro-version-menu')) return menuBox(this, 300, 360)
      return original.call(this)
    })
    const w = mount(TitanChordproChartSwitch, {
      props: {
        open: true,
        charts: [{ id: 'a', label: 'A' }],
        label: 'A',
      },
      attachTo: document.body,
    })
    mounted.push(w)
    try {
      await flushPromises()
      expect(w.find('.titan-chordpro-version-menu').exists()).toBe(true)
      const shift = shiftOf(w.get('.titan-chordpro-version-menu').element)
      expect(shift).toBe(-168)
      expect(300 + shift).toBeGreaterThanOrEqual(8)
      expect(300 + shift + 360).toBe(492)
    } finally {
      spy.mockRestore()
      widthSpy.mockRestore()
    }
  })

  it('stays inside the limit after the edit head opens Nova versão', async () => {
    const w = await mountViewer({ editMode: 'persisted' })
    const original = Element.prototype.getBoundingClientRect
    let width = 280
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.classList.contains('titan-chordpro-version-menu')) return menuBox(this, 100, width)
      if (this.hasAttribute('data-titan-chordpro-root')) return rect(0, 390)
      return original.call(this)
    })
    try {
      await w.get('[data-edit]').trigger('click')
      await flushPromises()
      await w.get('[data-chart-switch]').trigger('click')
      await flushPromises()
      expect(shiftOf(w.get('.titan-chordpro-version-menu').element)).toBe(0)

      await w.get('[data-chart-add]').trigger('click')
      await flushPromises()
      expect(w.find('.titan-chordpro-version-form').exists()).toBe(true)

      width = 340
      menuObserver()!.cb([{ contentRect: { width: 340, height: 120 } }])
      await flushPromises()

      const shift = shiftOf(w.get('.titan-chordpro-version-menu').element)
      expect(shift).toBe(-58)
      expect(100 + shift).toBe(42)
      expect(100 + shift + 340).toBe(382)
    } finally {
      spy.mockRestore()
    }
  })
})
