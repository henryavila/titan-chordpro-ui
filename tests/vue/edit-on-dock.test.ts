import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

/**
 * The bug this guards: on desktop Editar was a floating chip
 * (`position:absolute; right:16px; bottom:22px`) sitting next to the bottom
 * bar. At ~640–900px the chip visually stuck to the pill; at 1280px it
 * floated off to the glass corner. The phone already kept it in the dock.
 * One place at every width: the same row as Rolar.
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

function editPlace(w: Awaited<ReturnType<typeof viewerAt>>) {
  const edit = w.get('[data-edit]').element as HTMLElement
  const scroll = w.get('[data-scroll]').element as HTMLElement
  const row = scroll.parentElement
  return {
    chip: w.find('.cpv-edit-chip').exists(),
    count: w.findAll('[data-edit]').length,
    inRolarRow: row?.contains(edit) ?? false,
    position: getComputedStyle(edit).position,
  }
}

describe('Editar lives in the bottom bar at every width', () => {
  it.each([
    [639, 'phone, just under the 640 breakpoint'],
    [640, 'desktop threshold — used to flip to the floating chip'],
    [768, 'tablet'],
    [900, 'default viewer width'],
    [1280, 'notebook — chip used to float at the glass corner'],
  ] as const)('sits in the Rolar row at %ipx (%s)', async (width, _label) => {
    const place = editPlace(await viewerAt(width))
    expect(place.count, 'two Editar buttons at once').toBe(1)
    expect(place.chip, 'floating chip is still painted').toBe(false)
    expect(place.inRolarRow, 'Editar is not in the same row as Rolar').toBe(true)
    expect(place.position, 'Editar is still absolutely positioned').not.toBe('absolute')
  })

  it('hides with the chrome on desktop — no leftover floating entry', async () => {
    const w = await viewerAt(1280)
    expect(editPlace(w).inRolarRow).toBe(true)
    await w.get('[data-cpv-scroll]').trigger('click')
    await flushPromises()
    expect(
      w.findAll('.cpv-chrome').every((c) => c.classes().includes('is-hidden')),
      'a chrome band stayed up',
    ).toBe(true)
    expect(w.get('[data-edit]').element.closest('.cpv-chrome.is-hidden')).not.toBeNull()
    expect(w.find('.cpv-edit-chip').exists()).toBe(false)
  })

  it('canEdit=false still removes every way in, on desktop and on a phone', async () => {
    for (const width of [390, 1280]) {
      const w = await viewerAt(width, { canEdit: false })
      expect(w.find('[data-edit]').exists(), `${width}px leaked an edit control`).toBe(false)
      expect(w.find('.cpv-edit-chip').exists()).toBe(false)
    }
  })

  it('names a waiting draft on the desktop bar, not on a chip', async () => {
    const w = await viewerAt(900, { modes: 'content' })
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    const pick = w.find('[data-mode-content]')
    if (pick.exists()) {
      await pick.trigger('click')
      await flushPromises()
    }
    await w.get('[data-meta-open]').trigger('click')
    await flushPromises()
    await w.get('[data-meta-title]').setValue('Rascunho vivo')
    await w.get('[data-meta-apply]').trigger('click')
    await flushPromises()
    await w.get('[data-read]').trigger('click')
    await flushPromises()

    expect(w.find('.cpv-edit-chip').exists()).toBe(false)
    expect(w.get('[data-edit]').text()).toContain('rascunho')
    expect(editPlace(w).inRolarRow).toBe(true)
  })
})
