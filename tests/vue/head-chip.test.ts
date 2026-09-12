import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import { memoryStore } from '../../src/core'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

/**
 * Beat-1 invert is keyed to `.cpv-head-chip`, not to today's widgets.
 * A new painted control on the identity bar that forgets the class fails here
 * instead of shipping unreadable on the pulse.
 */

const O_REI = loadFixture('sda/082-o-rei-vem-vindo.cho')
const JESUS = loadFixture(JESUS_1)

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

const rehearsal = [
  { id: 'o-rei', title: '082 - O Rei vem vindo', source: O_REI },
  { id: 'jesus', title: 'Jesus, Tu És a minha vida', source: JESUS },
]

async function viewerAt(width: number) {
  const w = mount(ChordproViewer, {
    props: {
      source: '',
      songs: rehearsal,
      theme: 'dark',
      autoHide: false,
      storage: memoryStore(),
    },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width, height: 800 } }]))
  await flushPromises()
  return w
}

function transparent(bg: string) {
  return !bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)' || bg === 'rgba(0,0,0,0)'
}

function labelOf(el: Element) {
  const s = (el.getAttribute('style') ?? '').replace(/\s+/g, ' ').slice(0, 72)
  return `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).replace(/\s+/g, '.') : ''} ${s}`
}

/**
 * Anything that paints a fill on the identity strip, and is not the strip
 * itself, must be a chip (or inside one). Tela cheia may wash with --sel;
 * popovers under the bar are not the strip.
 */
function paintedOrphans(head: HTMLElement) {
  const headBg = getComputedStyle(head).backgroundColor
  const orphans: string[] = []
  for (const el of head.querySelectorAll<HTMLElement>('*')) {
    if (el.closest('.cpv-veil-2')) continue
    if (el.classList.contains('cpv-head-chip') || el.closest('.cpv-head-chip')) continue
    const bg = getComputedStyle(el).backgroundColor
    if (transparent(bg) || bg === headBg) continue
    const style = el.getAttribute('style') ?? ''
    if (/\bvar\(--sel(?:-line)?\)|\bvar\(--hover\)/.test(style)) continue
    orphans.push(labelOf(el))
  }
  return orphans
}

function chordPaintOutsideChip(head: HTMLElement) {
  const bad: string[] = []
  for (const el of head.querySelectorAll<HTMLElement>('*')) {
    if (el.closest('.cpv-veil-2')) continue
    if (el.classList.contains('cpv-head-chip') || el.closest('.cpv-head-chip')) continue
    const style = el.getAttribute('style') ?? ''
    if (/var\(--chord/.test(style)) bad.push(labelOf(el))
  }
  return bad
}

function colorLiterals(head: HTMLElement) {
  const bad: string[] = []
  for (const el of head.querySelectorAll<HTMLElement>('[style]')) {
    if (el.closest('.cpv-veil-2')) continue
    const style = el.getAttribute('style') ?? ''
    if (/(?:^|;)\s*(?:color|background|border(?:-color)?)\s*:[^;]*(#|rgb\(|hsl\()/i.test(style)) {
      bad.push(labelOf(el))
    }
  }
  return bad
}

describe('identity-bar chips opt into the beat-1 invert', () => {
  it('the wide bar paints tom/capo/list index only through cpv-head-chip', async () => {
    const w = await viewerAt(800)
    const head = w.get('[data-cpv-head]').element as HTMLElement
    expect(w.get('.cpv-keypill').classes()).toContain('cpv-head-chip')
    expect(w.get('.cpv-head-pos').classes()).toContain('cpv-head-chip')
    expect(paintedOrphans(head), paintedOrphans(head).join('\n')).toEqual([])
    expect(chordPaintOutsideChip(head), chordPaintOutsideChip(head).join('\n')).toEqual([])
    expect(colorLiterals(head), colorLiterals(head).join('\n')).toEqual([])
  })

  it('the phone bar paints the tom door only through cpv-head-chip', async () => {
    const w = await viewerAt(390)
    const head = w.get('[data-cpv-head]').element as HTMLElement
    expect(w.get('[data-tone]').classes()).toContain('cpv-head-chip')
    expect(w.get('.cpv-head-pos').classes()).toContain('cpv-head-chip')
    expect(paintedOrphans(head), paintedOrphans(head).join('\n')).toEqual([])
    expect(chordPaintOutsideChip(head), chordPaintOutsideChip(head).join('\n')).toEqual([])
    expect(colorLiterals(head), colorLiterals(head).join('\n')).toEqual([])
  })
})
