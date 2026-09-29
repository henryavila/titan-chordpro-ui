import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

/**
 * Hiding "Rolar" below 415px used to dump the leftover into one flex gap, so a
 * 390px phone — the common iPhone width — showed a play triangle and a hole.
 * The word stays on whenever the row can hold it; below that the row
 * redistributes instead of parking the space after the button.
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

async function viewerAt(width: number) {
  const w = mount(ChordproViewer, {
    props: { source: loadFixture(JESUS_1), theme: 'dark', autoHide: false, songId: 'jesus-1' },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width, height: 800 } }]))
  await flushPromises()
  return w
}

describe('dock Rolar label', () => {
  it('keeps the word on a 390px phone — that leftover used to be an empty gap', async () => {
    const w = await viewerAt(390)
    expect(w.get('[data-scroll]').text()).toMatch(/Rolar/)
  })

  it('keeps the word on a 375px phone — Chrome iPhone SE emulation', async () => {
    const w = await viewerAt(375)
    expect(w.get('[data-scroll]').text()).toMatch(/Rolar/)
  })

  it('drops the word only on the 320px class, and still names the control', async () => {
    const w = await viewerAt(320)
    expect(w.get('[data-scroll]').text().trim()).toBe('')
    expect(w.get('[data-scroll]').attributes('aria-label')).toBe('Rolar')
  })

  it('keeps Rolar clickable inside the chrome that lets taps through to the chart', async () => {
    const w = await viewerAt(390)
    const btn = w.get('[data-scroll]').element as HTMLElement
    expect(getComputedStyle(btn).pointerEvents).not.toBe('none')
  })
})

function idleRollPaint(style: string) {
  return {
    chordFill: /background:\s*var\(--chord\)/.test(style),
    chordInk: /color:\s*var\(--chord-ink\)/.test(style),
    ghost: /background:\s*transparent/.test(style),
  }
}

describe('dock Rolar fill', () => {
  it.each([
    [390, 'phone'],
    [768, 'tablet'],
    [1280, 'desktop'],
  ] as const)('idle Rolar is the chord colour at %ipx (%s)', async (width) => {
    const w = await viewerAt(width)
    const paint = idleRollPaint(w.get('[data-scroll]').attributes('style') ?? '')
    expect(paint.ghost, 'Rolar is still a ghost on this width').toBe(false)
    expect(paint.chordFill, 'idle fill is not --chord').toBe(true)
    expect(paint.chordInk, 'idle ink is not --chord-ink').toBe(true)
  })

  it('Parar on the wide bar uses the pill, so rolling is not the same green', async () => {
    const { default: CpvWideDock } = await import('../../src/vue/chrome/CpvWideDock.vue')
    const w = mount(CpvWideDock, {
      props: {
        hidden: false,
        showMine: false,
        mineLabel: '',
        showOriginal: false,
        hintFit: false,
        scrolling: true,
        mul: 1,
        etaLabel: '0:00',
        progress: 0,
        setlistOn: false,
        noPrev: true,
        noNext: true,
        posLabel: '',
        scrollTitle: 'Parar',
        scrollOff: false,
        rollLive: true,
        fitOn: false,
        letra: false,
        hasKey: true,
        nashvilleOn: false,
        hideComments: false,
        metRunning: false,
        metBpm: 80,
        hasStrum: false,
        strumOn: false,
        ensaioBatida: false,
        themeTitle: '',
        themeIcon: 'square',
        themeLabel: '',
        canEdit: false,
        dirty: false,
      },
      attachTo: document.body,
    })
    mounted.push(w)
    const style = w.get('[data-scroll]').attributes('style') ?? ''
    expect(style).toMatch(/background:\s*var\(--pill\)/)
    expect(style).not.toMatch(/background:\s*var\(--chord\)/)
  })
})
