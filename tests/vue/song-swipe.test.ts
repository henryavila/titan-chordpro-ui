import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import { memoryStore } from '../../src/core'
import {
  beginSongSwipe,
  SWIPE_EDGE_PX,
  SWIPE_HAND_CLEAR_PX,
  SWIPE_STAMP_H,
  SWIPE_STAMP_PAD_BOTTOM,
  SWIPE_STAMP_PAD_TOP,
  swipeIgnoresPointer,
  swipeRailPx,
  swipeStampTop,
  swipeThreshold,
  swipeZone,
  type SongSwipeBegin,
} from '../../src/vue/use/song-swipe'
import { JESUS_1, loadFixture, withDuration } from '../helpers/load-fixture'
import type { SetlistSong } from '../../src/vue/use/useSetlist'

const CHART = withDuration(loadFixture(JESUS_1))
const OTHER = loadFixture('sda/084-escuta-meu-clamor.cho')
const PHONE = 390

const PHONE_H = 844

function start(over: Partial<SongSwipeBegin> = {}) {
  return beginSongSwipe({
    canPrev: true,
    canNext: true,
    width: PHONE,
    height: PHONE_H,
    x: PHONE - 20,
    y: 400,
    pointerKind: 'touch',
    ...over,
  })
}

describe('swipeZone', () => {
  it('keeps Safari-back, left rail, centre, and right rail disjoint on a phone', () => {
    const rail = swipeRailPx(PHONE)
    expect(rail).toBe(64)
    expect(swipeZone(SWIPE_EDGE_PX - 1, PHONE)).toBe('dead')
    expect(swipeZone(SWIPE_EDGE_PX, PHONE)).toBe('prev-rail')
    expect(swipeZone(SWIPE_EDGE_PX + rail - 1, PHONE)).toBe('prev-rail')
    expect(swipeZone(SWIPE_EDGE_PX + rail, PHONE)).toBe('center')
    expect(swipeZone(PHONE / 2, PHONE)).toBe('center')
    expect(swipeZone(PHONE - rail - 1, PHONE)).toBe('center')
    expect(swipeZone(PHONE - rail, PHONE)).toBe('next-rail')
    expect(swipeZone(PHONE - 1, PHONE)).toBe('next-rail')
  })

  it('doubles the rail from the tablet breakpoint (640) onward', () => {
    expect(swipeRailPx(639)).toBe(64)
    expect(swipeRailPx(640)).toBe(128)
    expect(swipeRailPx(768)).toBe(128)
    expect(swipeRailPx(1280)).toBe(128)
    const tablet = 768
    const rail = swipeRailPx(tablet)
    expect(swipeZone(SWIPE_EDGE_PX + rail - 1, tablet)).toBe('prev-rail')
    expect(swipeZone(SWIPE_EDGE_PX + rail, tablet)).toBe('center')
    expect(swipeZone(tablet - rail, tablet)).toBe('next-rail')
  })
})

describe('swipeIgnoresPointer', () => {
  function node(tag: string, attrs: Record<string, string> = {}) {
    const el = document.createElement(tag)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    return el
  }

  it('keeps a rail down when the paint stack is only the rail', () => {
    const rail = node('div', { class: 'cpv-swipe-rail', 'data-swipe-rail': 'next' })
    expect(swipeIgnoresPointer(rail, 370, 400, () => [rail])).toBe(false)
  })

  it('yields when the event target is already a control', () => {
    const more = node('button', { 'data-more': '' })
    expect(swipeIgnoresPointer(more, 370, 800, () => [])).toBe(true)
  })

  it('yields when iOS names the rail as target but Mais is under the finger', () => {
    const rail = node('div', { class: 'cpv-swipe-rail', 'data-swipe-rail': 'next' })
    const more = node('button', { 'data-more': '' })
    expect(swipeIgnoresPointer(rail, 370, 800, () => [rail, more])).toBe(true)
  })

  it('yields when Rolar sits in the paint stack under a left-rail down', () => {
    const rail = node('div', { class: 'cpv-swipe-rail', 'data-swipe-rail': 'prev' })
    const roll = node('button', { 'data-scroll': '' })
    expect(swipeIgnoresPointer(rail, 40, 800, () => [rail, roll])).toBe(true)
  })

  it('yields when the phone stack is in the paint stack', () => {
    const rail = node('div', { class: 'cpv-swipe-rail' })
    const stack = node('div', { class: 'cpv-phone-stack' })
    expect(swipeIgnoresPointer(rail, 40, 800, () => [rail, stack])).toBe(true)
  })

  it('keeps a rail swipe when a reading-chord button sits under the rail', () => {
    const rail = node('div', { class: 'cpv-swipe-rail', 'data-swipe-rail': 'next' })
    const chord = node('button', { 'aria-label': 'Forma de G' })
    expect(swipeIgnoresPointer(rail, 370, 400, () => [rail, chord])).toBe(false)
  })
})

describe('swipeStampTop', () => {
  it('parks the whole stamp above a mid-screen finger', () => {
    const fingerY = 422
    const top = swipeStampTop(fingerY, PHONE_H)
    expect(top + SWIPE_STAMP_H).toBeLessThanOrEqual(fingerY - SWIPE_HAND_CLEAR_PX)
    expect(top).toBe(fingerY - SWIPE_HAND_CLEAR_PX - SWIPE_STAMP_H)
  })

  it('keeps a low finger from dragging the stamp into the dock', () => {
    const top = swipeStampTop(800, PHONE_H)
    expect(top + SWIPE_STAMP_H).toBeLessThanOrEqual(800 - SWIPE_HAND_CLEAR_PX)
    expect(top).toBeLessThanOrEqual(PHONE_H - SWIPE_STAMP_H - SWIPE_STAMP_PAD_BOTTOM)
    expect(swipeStampTop(2000, PHONE_H)).toBe(
      PHONE_H - SWIPE_STAMP_H - SWIPE_STAMP_PAD_BOTTOM,
    )
  })

  it('clamps a high finger under the title chrome instead of leaving the screen', () => {
    expect(swipeStampTop(90, PHONE_H)).toBe(SWIPE_STAMP_PAD_TOP)
    expect(swipeStampTop(-40, PHONE_H)).toBe(SWIPE_STAMP_PAD_TOP)
  })

  it('does not go negative when the viewer has no measured height', () => {
    expect(swipeStampTop(400, 0)).toBeGreaterThanOrEqual(SWIPE_STAMP_PAD_TOP)
    expect(swipeStampTop(400, Number.NaN)).toBeGreaterThanOrEqual(SWIPE_STAMP_PAD_TOP)
  })
})

describe('song swipe recognizer', () => {
  it('ignores a down in the centre even with a long horizontal drag', () => {
    const s = start({ x: PHONE / 2 })
    s.move(PHONE / 2 - 200, 400)
    expect(s.view().axis).toBe('ignored')
    expect(s.view().peeking).toBe(false)
    expect(s.release().commit).toBe('none')
  })

  it('does not reclassify a centre down that later crosses a rail', () => {
    const s = start({ x: PHONE / 2 })
    s.move(PHONE - 10, 400)
    expect(s.view().axis).toBe('ignored')
    expect(s.release().commit).toBe('none')
  })

  it('locks the right rail as horizontal on down — no 12px axis wait', () => {
    const s = start({ x: PHONE - 20 })
    expect(s.view().axis).toBe('horizontal')
    expect(s.view().peeking).toBe(false)
  })

  it('peeks next from the right rail and commits past the threshold', () => {
    const x0 = PHONE - 20
    const s = start({ x: x0 })
    const need = swipeThreshold(PHONE)
    s.move(x0 - 40, 400 + 8)
    expect(s.view().axis).toBe('horizontal')
    expect(s.view().intent).toBe('next')
    expect(s.view().peeking).toBe(true)
    expect(s.view().armed).toBe(false)
    expect(s.view().stampTop).toBe(swipeStampTop(400 + 8, PHONE_H))
    s.move(x0 - (need + 8), 400 + 10)
    expect(s.view().armed).toBe(true)
    expect(s.view().progress).toBe(1)
    expect(s.release().commit).toBe('next')
  })

  it('peeks prev from the left rail (after the Safari-back strip)', () => {
    const x0 = SWIPE_EDGE_PX + 10
    const s = start({ x: x0 })
    s.move(x0 + swipeThreshold(PHONE) + 8, 400)
    expect(s.view().intent).toBe('prev')
    expect(s.release().commit).toBe('prev')
  })

  it('does not commit next from the left rail (wrong direction)', () => {
    const x0 = SWIPE_EDGE_PX + 10
    const s = start({ x: x0 })
    s.move(x0 - 200, 400)
    expect(s.view().armed).toBe(false)
    expect(s.release().commit).toBe('none')
  })

  it('does not commit prev from the right rail (wrong direction)', () => {
    const x0 = PHONE - 20
    const s = start({ x: x0 })
    s.move(x0 + 200, 400)
    expect(s.view().armed).toBe(false)
    expect(s.release().commit).toBe('none')
  })

  it('snaps back when released before the threshold', () => {
    const x0 = PHONE - 20
    const s = start({ x: x0 })
    s.move(x0 - 48, 400)
    expect(s.view().peeking).toBe(true)
    expect(s.view().armed).toBe(false)
    expect(s.release().commit).toBe('none')
  })

  it('does not commit a mostly vertical drag on the rail', () => {
    const x0 = PHONE - 20
    const s = start({ x: x0 })
    s.move(x0 + 8, 400 + 180)
    expect(s.view().armed).toBe(false)
    expect(s.release().commit).toBe('none')
  })

  it('rubber-bands at the end of the list instead of arming', () => {
    const x0 = PHONE - 20
    const s = start({ x: x0, canNext: false, canPrev: true })
    s.move(x0 - 200, 400)
    expect(s.view().intent).toBe('next')
    expect(s.view().peeking).toBe(true)
    expect(s.view().armed).toBe(false)
    expect(s.view().progress).toBeLessThan(1)
    expect(s.release().commit).toBe('none')
  })

  it('ignores a mouse drag on the rail', () => {
    const s = start({ pointerKind: 'mouse' })
    s.move(PHONE - 20 - 200, 400)
    expect(s.view().axis).toBe('ignored')
    expect(s.release().commit).toBe('none')
  })

  it('ignores a touch that starts on the Safari-back edge', () => {
    const s = start({ x: SWIPE_EDGE_PX - 4 })
    s.move(SWIPE_EDGE_PX - 4 + 200, 400)
    expect(s.view().axis).toBe('ignored')
    expect(s.release().commit).toBe('none')
  })

  it('keeps the rail axis — a later vertical drift cannot steal a swipe', () => {
    const x0 = PHONE - 20
    const s = start({ x: x0 })
    s.move(x0 - 40, 400 + 6)
    expect(s.view().axis).toBe('horizontal')
    s.move(x0 - 40, 400 + 200)
    expect(s.view().axis).toBe('horizontal')
  })

  it('lifts the stamp as the finger drifts down so the card stays above the hand', () => {
    const x0 = PHONE - 20
    const s = start({ x: x0, y: 360 })
    s.move(x0 - 48, 520)
    expect(s.view().peeking).toBe(true)
    expect(s.view().stampTop).toBe(swipeStampTop(520, PHONE_H))
    expect(s.view().stampTop + SWIPE_STAMP_H).toBeLessThanOrEqual(520 - SWIPE_HAND_CLEAR_PX)
  })
})

function songs(): SetlistSong[] {
  return [
    { id: 'a', title: 'Jesus', key: 'G', source: CHART },
    { id: 'b', title: 'Escuta', key: 'G', source: OTHER },
  ]
}

const mounted: ReturnType<typeof mount>[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
})

function viewer() {
  const w = mount(ChordproViewer, {
    props: { source: '', songs: songs(), autoHide: false, storage: memoryStore() },
    attachTo: document.body,
  })
  mounted.push(w)
  return w
}

function finger(el: Element, type: string, x: number, y: number) {
  const ev = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'touch',
    clientX: x,
    clientY: y,
  })
  el.dispatchEvent(ev)
  if (type !== 'pointerdown') window.dispatchEvent(ev)
}

describe('swipe zone debug overlay', () => {
  it('is off by default', async () => {
    const w = viewer()
    await flushPromises()
    expect(w.find('.cpv-swipe-debug').exists()).toBe(false)
    expect(w.get('[data-cpv-root]').classes()).not.toContain('is-swipe-debug')
  })

  it('paints the rails when capabilities.debugSwipe is on', async () => {
    const w = mount(ChordproViewer, {
      props: {
        source: '',
        songs: songs(),
        autoHide: false,
        storage: memoryStore(),
        capabilities: { debugSwipe: true },
      },
      attachTo: document.body,
    })
    mounted.push(w)
    await flushPromises()
    expect(w.find('.cpv-swipe-debug').exists()).toBe(true)
    expect(w.get('[data-cpv-root]').classes()).toContain('is-swipe-debug')
  })
})

describe('rail peek on the rehearsal chart', () => {
  it('paints a next chevron from the right rail, then changes song on release past the line', async () => {
    const w = viewer()
    await flushPromises()
    const root = w.get('[data-cpv-root]').element
    const x = 880
    const y = 200

    finger(root, 'pointerdown', x, y)
    finger(root, 'pointermove', x - 40, y + 6)
    await w.vm.$nextTick()
    const veil = w.get('[data-song-swipe]')
    expect(veil.attributes('data-intent')).toBe('next')
    expect(veil.attributes('data-armed')).toBe('0')
    expect(w.find('[data-icon="chevronRight"]').exists()).toBe(true)
    expect(veil.text()).toMatch(/Próxima/i)
    expect(veil.text()).not.toMatch(/Solte para ir/i)
    expect(veil.attributes('style') ?? '').toMatch(/--cpv-swipe-stamp-top:\s*\d+(\.\d+)?px/)

    finger(root, 'pointermove', x - 160, y + 8)
    await w.vm.$nextTick()
    expect(w.get('[data-song-swipe]').attributes('data-armed')).toBe('1')
    expect(w.get('[data-song-swipe]').text()).toMatch(/Solte para ir/i)

    finger(root, 'pointerup', x - 160, y + 8)
    await flushPromises()
    await w.vm.$nextTick()
    expect(w.get('[data-cpv-root]').attributes('data-swipe')).toBeUndefined()
    await vi.waitFor(() => {
      expect(w.get('[data-chart-title]').text()).toMatch(/Escuta/i)
    })
    await vi.waitFor(() => {
      expect(w.find('[data-song-swipe]').exists()).toBe(false)
    })
  })

  it('does not peek or change song when the drag starts in the centre', async () => {
    const w = viewer()
    await flushPromises()
    const root = w.get('[data-cpv-root]').element
    const x = 450
    const y = 80
    finger(root, 'pointerdown', x, y)
    finger(root, 'pointermove', x - 180, y + 8)
    await w.vm.$nextTick()
    expect(w.find('[data-song-swipe]').exists()).toBe(false)
    finger(root, 'pointerup', x - 180, y + 8)
    await flushPromises()
    expect(w.get('[data-chart-title]').text()).toMatch(/Jesus/i)
    expect(w.get('[data-setlist-open]').text()).toMatch(/1\/2/)
  })

  it('does not start a swipe when the finger is on Mais under the right rail', async () => {
    const w = viewer()
    await flushPromises()
    const root = w.get('[data-cpv-root]').element as HTMLElement
    const more = document.createElement('button')
    more.setAttribute('data-more', '')
    const rail = document.createElement('div')
    rail.className = 'cpv-swipe-rail'
    const hit = vi.fn(() => [rail, more])
    Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: hit })
    try {
      finger(root, 'pointerdown', 880, 200)
      finger(root, 'pointermove', 840, 206)
      await w.vm.$nextTick()
      expect(w.find('[data-song-swipe]').exists()).toBe(false)
      expect(hit).toHaveBeenCalled()
    } finally {
      delete (document as { elementsFromPoint?: unknown }).elementsFromPoint
    }
  })

  it('hides the fade and stays on the song when the rail swipe is aborted', async () => {
    const w = viewer()
    await flushPromises()
    const root = w.get('[data-cpv-root]').element
    const x = 880
    const y = 80
    finger(root, 'pointerdown', x, y)
    finger(root, 'pointermove', x - 48, y)
    await w.vm.$nextTick()
    expect(w.get('[data-song-swipe]').attributes('data-intent')).toBe('next')
    finger(root, 'pointerup', x - 48, y)
    await flushPromises()
    expect(w.find('[data-song-swipe]').exists()).toBe(false)
    expect(w.get('[data-chart-title]').text()).toMatch(/Jesus/i)
  })
})
