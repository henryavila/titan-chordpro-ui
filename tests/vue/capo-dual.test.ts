import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

function mountViewer(props: Record<string, unknown> = {}) {
  return mount(ChordproViewer, {
    props: { source: loadFixture(JESUS_1), theme: 'dark', autoHide: false, ...props },
    attachTo: document.body,
  })
}

function chordNames(w: ReturnType<typeof mountViewer>): string[] {
  return w.findAll('.cpv-chord').map((n) => n.text()).filter(Boolean)
}

function shapeNames(w: ReturnType<typeof mountViewer>): string[] {
  return w.findAll('.cpv-shape').map((n) => n.text()).filter(Boolean)
}

describe('capo dual vs capo sozinho', () => {
  it('dual shows concert chords with capo shapes above; turning dual off rewrites the chart', async () => {
    const w = mountViewer({ initialCapo: 2, initialDual: true })
    await flushPromises()

    expect(w.find('[data-legend]').exists()).toBe(true)
    expect(chordNames(w)[0]).toBe('G')
    expect(shapeNames(w)[0]).toBe('F')
    expect(w.get('[data-display-key]').text()).toBe('G')
    expect(w.get('[data-capo]').text()).toMatch(/Dual · capo 2/i)

    await w.get('[data-capo]').trigger('click')
    await flushPromises()
    await w.get('[data-dual]').trigger('click')
    await flushPromises()

    expect(w.find('[data-legend]').exists()).toBe(false)
    expect(shapeNames(w)).toEqual([])
    expect(chordNames(w)[0]).toBe('F')
    expect(w.get('[data-display-key]').text()).toBe('G')
    expect(w.get('[data-capo]').text()).toMatch(/^Capo 2/i)
    // Capo popover is still open — one line of new shapes, no prose.
    const hint = w.get('[data-capo-hint]').text()
    expect(hint).toMatch(/^F · /)
    expect(hint).toMatch(/A#|Bb/)
    expect(hint).toMatch(/Dm/)
    expect(hint).not.toMatch(/Você toca|Soa|Formas de/)
    expect(w.text()).not.toMatch(/soa continua/)

    await w.get('[data-dual]').trigger('click')
    await flushPromises()
    expect(w.find('[data-legend]').exists()).toBe(true)
    expect(chordNames(w)[0]).toBe('G')
    expect(shapeNames(w)[0]).toBe('F')
    w.unmount()
  })

  it('starting without dual already shows the capo shapes, not the concert names', async () => {
    const w = mountViewer({ initialCapo: 2, initialDual: false })
    await flushPromises()
    expect(w.find('[data-legend]').exists()).toBe(false)
    expect(shapeNames(w)).toEqual([])
    expect(chordNames(w)[0]).toBe('F')
    expect(w.get('[data-display-key]').text()).toBe('G')
    w.unmount()
  })
})
