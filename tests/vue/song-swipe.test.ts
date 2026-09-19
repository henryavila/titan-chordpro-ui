import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import { memoryStore } from '../../src/core'
import {
  beginSongSwipe,
  SWIPE_EDGE_PX,
  SWIPE_LOCK_PX,
  swipeThreshold,
  type SongSwipeBegin,
} from '../../src/vue/use/song-swipe'
import { JESUS_1, loadFixture, withDuration } from '../helpers/load-fixture'
import type { SetlistSong } from '../../src/vue/use/useSetlist'

const CHART = withDuration(loadFixture(JESUS_1))
const OTHER = loadFixture('sda/084-escuta-meu-clamor.cho')

function start(over: Partial<SongSwipeBegin> = {}) {
  return beginSongSwipe({
    canPrev: true,
    canNext: true,
    width: 390,
    x: 200,
    y: 400,
    pointerKind: 'touch',
    ...over,
  })
}

describe('song swipe recognizer', () => {
  it('treats a mostly vertical move as scroll — never a song change', () => {
    const s = start()
    s.move(200 + 20, 400 + 140)
    expect(s.view().axis).toBe('vertical')
    expect(s.view().peeking).toBe(false)
    expect(s.release().commit).toBe('none')
  })

  it('locks vertical at 45° (the safe side)', () => {
    const s = start()
    s.move(200 - 80, 400 + 80)
    expect(s.view().axis).toBe('vertical')
    expect(s.release().commit).toBe('none')
  })

  it('does not peek in the first lock pixels', () => {
    const s = start()
    s.move(200 - (SWIPE_LOCK_PX - 2), 400)
    expect(s.view().axis).toBe('undecided')
    expect(s.view().peeking).toBe(false)
  })

  it('peeks next when dragging left, and commits past the threshold', () => {
    const s = start()
    const need = swipeThreshold(390)
    s.move(200 - 40, 400 + 8)
    expect(s.view().axis).toBe('horizontal')
    expect(s.view().intent).toBe('next')
    expect(s.view().peeking).toBe(true)
    expect(s.view().armed).toBe(false)
    s.move(200 - (need + 8), 400 + 10)
    expect(s.view().armed).toBe(true)
    expect(s.view().progress).toBe(1)
    expect(s.release().commit).toBe('next')
  })

  it('peeks prev when dragging right', () => {
    const s = start()
    s.move(200 + swipeThreshold(390) + 8, 400)
    expect(s.view().intent).toBe('prev')
    expect(s.release().commit).toBe('prev')
  })

  it('snaps back when released before the threshold', () => {
    const s = start()
    s.move(200 - 48, 400)
    expect(s.view().peeking).toBe(true)
    expect(s.view().armed).toBe(false)
    expect(s.release().commit).toBe('none')
  })

  it('rubber-bands at the end of the list instead of arming', () => {
    const s = start({ canNext: false, canPrev: true })
    s.move(200 - 200, 400)
    expect(s.view().intent).toBe('next')
    expect(s.view().peeking).toBe(true)
    expect(s.view().armed).toBe(false)
    expect(s.view().progress).toBeLessThan(1)
    expect(s.release().commit).toBe('none')
  })

  it('ignores a mouse drag', () => {
    const s = start({ pointerKind: 'mouse' })
    s.move(200 - 200, 400)
    expect(s.view().axis).toBe('ignored')
    expect(s.release().commit).toBe('none')
  })

  it('ignores a touch that starts on the Safari-back edge', () => {
    const s = start({ x: SWIPE_EDGE_PX - 4 })
    s.move(SWIPE_EDGE_PX - 4 - 200, 400)
    expect(s.view().axis).toBe('ignored')
    expect(s.release().commit).toBe('none')
  })

  it('keeps the axis once locked — a later vertical drift cannot steal a swipe', () => {
    const s = start()
    s.move(200 - 40, 400 + 6)
    expect(s.view().axis).toBe('horizontal')
    s.move(200 - 40, 400 + 200)
    expect(s.view().axis).toBe('horizontal')
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

describe('Tinder fade on the rehearsal chart', () => {
  it('paints a next chevron while dragging left, then changes song on release past the line', async () => {
    const w = viewer()
    await flushPromises()
    const root = w.get('[data-cpv-root]').element
    const x = 280
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

    finger(root, 'pointermove', x - 160, y + 8)
    await w.vm.$nextTick()
    expect(w.get('[data-song-swipe]').attributes('data-armed')).toBe('1')
    expect(w.get('[data-song-swipe]').text()).toMatch(/Solte para ir/i)

    finger(root, 'pointerup', x - 160, y + 8)
    await flushPromises()
    await w.vm.$nextTick()
    expect(w.get('[data-cpv-root]').attributes('data-swipe')).toBe('out-next')
    await vi.waitFor(() => {
      expect(w.get('[data-chart-title]').text()).toMatch(/Escuta/i)
    })
    await vi.waitFor(() => {
      expect(w.get('[data-cpv-root]').attributes('data-swipe')).toBeUndefined()
    })
    expect(w.find('[data-song-swipe]').exists()).toBe(false)
  })

  it('does not change song when the page is scrolled down', async () => {
    const w = viewer()
    await flushPromises()
    const root = w.get('[data-cpv-root]').element
    const x = 200
    const y = 80
    finger(root, 'pointerdown', x, y)
    finger(root, 'pointermove', x + 18, y + 160)
    await w.vm.$nextTick()
    expect(w.find('[data-song-swipe]').exists()).toBe(false)
    finger(root, 'pointerup', x + 18, y + 160)
    await flushPromises()
    expect(w.get('[data-chart-title]').text()).toMatch(/Jesus/i)
    expect(w.get('[data-setlist-open]').text()).toMatch(/1\/2/)
  })

  it('hides the fade and stays on the song when the swipe is aborted', async () => {
    const w = viewer()
    await flushPromises()
    const root = w.get('[data-cpv-root]').element
    const x = 280
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
