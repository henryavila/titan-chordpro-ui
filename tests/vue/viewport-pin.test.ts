import { afterEach, describe, expect, it } from 'vitest'
import {
  PIN_GAIN_PX,
  pinWouldFillViewport,
  uncoveredViewportPx,
  visualViewportInsets,
} from '../../src/vue/use/viewportPin'

type Box = { top: number; left: number; width: number; height: number }

function box(el: HTMLElement, r: Box, view: { w: number; h: number; x?: number; y?: number }) {
  el.getBoundingClientRect = () =>
    ({
      x: r.left,
      y: r.top,
      top: r.top,
      left: r.left,
      right: r.left + r.width,
      bottom: r.top + r.height,
      width: r.width,
      height: r.height,
      toJSON: () => ({}),
    }) as DOMRect
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: view.w })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: view.h })
  const x = view.x ?? 0
  const y = view.y ?? 0
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: { width: view.w, height: view.h, offsetLeft: x, offsetTop: y },
  })
}

let el: HTMLElement
afterEach(() => {
  el?.remove()
  Reflect.deleteProperty(window, 'visualViewport')
})

describe('uncoveredViewportPx', () => {
  it('is 0 when the element already covers the visual viewport — standalone page', () => {
    el = document.createElement('div')
    box(el, { top: 0, left: 0, width: 390, height: 844 }, { w: 390, h: 844 })
    expect(uncoveredViewportPx(el)).toBe(0)
    expect(pinWouldFillViewport(el)).toBe(false)
  })

  it('counts a host header sitting above the chart — in-page composition', () => {
    el = document.createElement('div')
    box(el, { top: 88, left: 0, width: 390, height: 756 }, { w: 390, h: 844 })
    expect(uncoveredViewportPx(el)).toBe(88)
    expect(pinWouldFillViewport(el)).toBe(true)
  })

  it('ignores a sliver smaller than the gain floor — that was the 20px "fullscreen" that did nothing', () => {
    el = document.createElement('div')
    box(el, { top: 20, left: 0, width: 390, height: 824 }, { w: 390, h: 844 })
    expect(uncoveredViewportPx(el)).toBe(20)
    expect(20).toBeLessThan(PIN_GAIN_PX)
    expect(pinWouldFillViewport(el)).toBe(false)
  })

  it('turns on exactly at the gain floor, not one pixel under', () => {
    el = document.createElement('div')
    box(el, { top: PIN_GAIN_PX - 1, left: 0, width: 390, height: 844 - (PIN_GAIN_PX - 1) }, { w: 390, h: 844 })
    expect(pinWouldFillViewport(el)).toBe(false)
    box(el, { top: PIN_GAIN_PX, left: 0, width: 390, height: 844 - PIN_GAIN_PX }, { w: 390, h: 844 })
    expect(pinWouldFillViewport(el)).toBe(true)
  })

  it('counts a gap on any edge, not only the top', () => {
    el = document.createElement('div')
    box(el, { top: 0, left: 0, width: 390, height: 844 - 120 }, { w: 390, h: 844 })
    expect(uncoveredViewportPx(el)).toBe(120)
    expect(pinWouldFillViewport(el)).toBe(true)
  })

  it('reads visualViewport offset, not the layout viewport — iOS address bar', () => {
    el = document.createElement('div')
    box(el, { top: 0, left: 0, width: 390, height: 844 }, { w: 390, h: 700, x: 0, y: 144 })
    // The element covers 0..844; the visual viewport is 144..844. No gap.
    expect(uncoveredViewportPx(el)).toBe(0)
    expect(pinWouldFillViewport(el)).toBe(false)
  })

  it('does not treat overflow past the fold as a gap — the viewport is still covered', () => {
    el = document.createElement('div')
    box(el, { top: 0, left: 0, width: 390, height: 2000 }, { w: 390, h: 844 })
    expect(uncoveredViewportPx(el)).toBe(0)
    expect(pinWouldFillViewport(el)).toBe(false)
  })

  it('is 0 without an element — nothing to pin', () => {
    expect(uncoveredViewportPx(null)).toBe(0)
    expect(pinWouldFillViewport(null)).toBe(false)
  })
})

describe('visualViewportInsets', () => {
  const parent = { top: 0, left: 0, right: 390, bottom: 844 }

  it('lifts the bottom when the soft keyboard shrinks the visual viewport', () => {
    // Layout 844px tall; keyboard leaves 500px visible — sheet must clear 344px.
    expect(
      visualViewportInsets(parent, { offsetTop: 0, offsetLeft: 0, width: 390, height: 500 }),
    ).toEqual({ top: 0, left: 0, right: 0, bottom: 344 })
  })

  it('is all zeros when the visual viewport already matches the parent', () => {
    expect(
      visualViewportInsets(parent, { offsetTop: 0, offsetLeft: 0, width: 390, height: 844 }),
    ).toEqual({ top: 0, left: 0, right: 0, bottom: 0 })
  })

  it('stays zero when the parent already sits inside a shifted iOS visual viewport', () => {
    const host = { top: 88, left: 0, right: 390, bottom: 844 }
    expect(
      visualViewportInsets(host, { offsetTop: 88, offsetLeft: 0, width: 390, height: 756 }),
    ).toEqual({ top: 0, left: 0, right: 0, bottom: 0 })
  })

  it('counts a top gap when the visual viewport starts below the parent', () => {
    expect(
      visualViewportInsets(parent, { offsetTop: 120, offsetLeft: 0, width: 390, height: 500 }),
    ).toEqual({ top: 120, left: 0, right: 0, bottom: 224 })
  })

  it('never returns a negative inset when the view overflows the parent', () => {
    expect(
      visualViewportInsets(parent, { offsetTop: -20, offsetLeft: -10, width: 420, height: 900 }),
    ).toEqual({ top: 0, left: 0, right: 0, bottom: 0 })
  })
})
