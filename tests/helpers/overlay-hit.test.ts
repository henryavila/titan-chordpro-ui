import { describe, expect, it } from 'vitest'
import {
  overlayThiefOf,
  samplePoints,
  OVERLAY_THIEF_SEL,
} from './overlay-hit'

function node(tag: string, attrs: Record<string, string> = {}) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  return el
}

describe('overlayThiefOf', () => {
  it('flags a swipe rail sitting on Mais — the iPhone setlist freeze', () => {
    const more = node('button', { 'data-more': '', 'aria-label': 'Mais controles' })
    const rail = node('div', { class: 'cpv-swipe-rail', 'data-swipe-rail': 'next' })
    expect(overlayThiefOf(rail, more)).toBe('rail:next')
  })

  it('flags a swipe rail sitting on Rolar', () => {
    const roll = node('button', { 'data-scroll': '', 'aria-label': 'Rolar' })
    const rail = node('div', { class: 'cpv-swipe-rail', 'data-swipe-rail': 'prev' })
    expect(overlayThiefOf(rail, roll)).toBe('rail:prev')
  })

  it('flags the debug paint layer over a dock control', () => {
    const roll = node('button', { 'data-scroll': '' })
    const debug = node('div', { class: 'cpv-swipe-debug' })
    expect(overlayThiefOf(debug, roll)).toBe('cpv-swipe-debug')
  })

  it('does not flag the control itself', () => {
    const more = node('button', { 'data-more': '' })
    expect(overlayThiefOf(more, more)).toBeNull()
  })

  it('does not flag an icon inside the control', () => {
    const more = node('button', { 'data-more': '' })
    const icon = node('span', { class: 'cpv-ico' })
    more.appendChild(icon)
    expect(overlayThiefOf(icon, more)).toBeNull()
  })

  it('does not flag a parent that wraps the control (phone stack)', () => {
    const stack = node('div', { class: 'cpv-phone-stack' })
    const more = node('button', { 'data-more': '' })
    stack.appendChild(more)
    expect(overlayThiefOf(stack, more)).toBeNull()
  })

  it('reports miss when nothing is under the finger', () => {
    const more = node('button', { 'data-more': '' })
    expect(overlayThiefOf(null, more)).toBe('miss')
  })

  it('does not treat a chord diagram button as a thief of itself', () => {
    const chord = node('button', { class: 'cpv-chord-hit', 'data-diagram-hit': '' })
    expect(overlayThiefOf(chord, chord)).toBeNull()
  })
})

describe('samplePoints', () => {
  it('keeps left and right samples inside a 44px dock button, where the rail used to sit', () => {
    const pts = samplePoints({ left: 10, top: 700, width: 44, height: 44 })
    const left = pts.find((p) => p.where === 'left')!
    const right = pts.find((p) => p.where === 'right')!
    expect(left.x).toBeGreaterThanOrEqual(10)
    expect(left.x).toBeLessThan(10 + 22)
    expect(right.x).toBeLessThanOrEqual(54)
    expect(right.x).toBeGreaterThan(10 + 22)
    expect(OVERLAY_THIEF_SEL).toContain('.cpv-swipe-rail')
  })
})
