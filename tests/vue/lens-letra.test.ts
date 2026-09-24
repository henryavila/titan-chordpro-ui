import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { ELE_VIVE_IMG, JESUS_1, loadFixture } from '../helpers/load-fixture'

const JESUS = JESUS_1

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
      source: loadFixture(JESUS),
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

async function pickLetra(w: Awaited<ReturnType<typeof viewerAt>>) {
  await w.get('[data-reading=letra]').trigger('click')
  await flushPromises()
}

function pressed(w: Awaited<ReturnType<typeof viewerAt>>, which: 'cifra' | 'letra') {
  return w.get(`[data-reading=${which}]`).attributes('aria-pressed')
}

describe('lens Só letra', () => {
  it('puts Cifra | Letra on the chrome, not behind a Lentes sheet', async () => {
    const w = await viewerAt(1024)
    expect(w.get('[data-reading-switch]').text()).toMatch(/Cifra/)
    expect(w.get('[data-reading-switch]').text()).toMatch(/Letra/)
    expect(pressed(w, 'cifra')).toBe('true')
    expect(pressed(w, 'letra')).toBe('false')
    expect(w.find('[role="dialog"][aria-label="Lentes de leitura"]').exists()).toBe(false)
    expect(w.find('[data-lens=nashville]').exists()).toBe(true)
    expect(w.find('[data-comments-toggle]').exists()).toBe(true)
  })

  it('hides chords and the chord lane with one tap on Letra', async () => {
    const w = await viewerAt(1024)
    expect(w.find('.cpv-chord').exists()).toBe(true)
    await pickLetra(w)
    expect(pressed(w, 'letra')).toBe('true')
    expect(pressed(w, 'cifra')).toBe('false')
    expect(w.find('.cpv-chord').exists()).toBe(false)
    expect(w.text()).toMatch(/Jesus/i)
    const box = w.get('.cpv-chord-box')
    expect(box.attributes('style') || '').toMatch(/height:\s*0px/)
  })

  it('drops a rhythm-only intro so it does not sit as dead space in the lyric', async () => {
    const w = await viewerAt(1024)
    expect(w.text()).toMatch(/x\/\/\//)
    await pickLetra(w)
    const lyrics = w.findAll('.cpv-lyric').map((n) => n.text()).join('')
    expect(lyrics).toMatch(/Jesus/)
    expect(lyrics).not.toMatch(/x\/+/)
    expect(lyrics).not.toMatch(/(^|\s)\/+(\s|$)/)
    expect(w.findAll('.cpv-reading-row').some((row) => /^[xX/\s]+$/.test(row.text().trim()))).toBe(false)
  })

  it('drops tab, score and image on a chart that has them', async () => {
    const w = await viewerAt(1024, {
      source: loadFixture(ELE_VIVE_IMG),
      songId: 'ele-vive',
    })
    expect(w.find('.cpv-tab').exists()).toBe(true)
    expect(w.find('.cpv-figure').exists()).toBe(true)
    await pickLetra(w)
    expect(w.find('.cpv-tab').exists()).toBe(false)
    expect(w.find('.cpv-figure').exists()).toBe(false)
    expect(w.text()).toMatch(/Ele Vive/i)
  })

  it('does not project in edit — chords come back with the editor', async () => {
    const w = await viewerAt(1024, { canEdit: true, modes: 'content' })
    await pickLetra(w)
    expect(w.find('.cpv-chord').exists()).toBe(false)
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    const pick = w.find('[data-mode-content]')
    if (pick.exists()) {
      await pick.trigger('click')
      await flushPromises()
    }
    expect(w.find('[data-read]').exists()).toBe(true)
    expect(w.find('.cpv-chord').exists() || w.find('[data-pill]').exists()).toBe(true)
  })

  it('on a phone, Letra is one tap on the dock — Mais is not required', async () => {
    const w = await viewerAt(390)
    expect(w.find('[role="dialog"][aria-label="Mais controles"]').exists()).toBe(false)
    await pickLetra(w)
    expect(pressed(w, 'letra')).toBe('true')
    expect(w.find('.cpv-chord').exists()).toBe(false)
  })

  it('the phone Mais lists Nashville and comments, not a Lentes submenu', async () => {
    const w = await viewerAt(390)
    await w.get('[aria-label="Mais controles"]').trigger('click')
    await flushPromises()
    const dlg = w.get('[role="dialog"][aria-label="Mais controles"]')
    expect(dlg.text()).toContain('Nashville')
    expect(dlg.text()).toContain('Comentários de ensaio')
    expect(dlg.text()).not.toContain('Lentes de leitura')
    expect(dlg.find('[data-lens=nashville]').exists()).toBe(true)
    expect(dlg.find('[data-comments-toggle]').exists()).toBe(true)
    expect(w.get('.cpv-phone-stack .cpv-chrome').classes()).toContain('is-hidden')
  })

  it('Cifra brings named chords back after Letra', async () => {
    const w = await viewerAt(1024)
    await pickLetra(w)
    expect(w.find('.cpv-chord').exists()).toBe(false)
    await w.get('[data-reading=cifra]').trigger('click')
    await flushPromises()
    expect(w.find('.cpv-chord').exists()).toBe(true)
    expect(pressed(w, 'cifra')).toBe('true')
  })

  it('opens already in Letra when the host passes lens=letra', async () => {
    const w = await viewerAt(1024, { lens: 'letra' })
    expect(pressed(w, 'letra')).toBe('true')
    expect(w.find('.cpv-chord').exists()).toBe(false)
    expect(w.text()).toMatch(/Jesus/i)
  })

  it('opens with Nashville when the host passes lens=nashville', async () => {
    const w = await viewerAt(1024, { lens: 'nashville' })
    expect(pressed(w, 'cifra')).toBe('true')
    expect(w.get('[data-lens=nashville]').attributes('aria-pressed')).toBe('true')
  })

  it('emits update:lens when the musician picks Letra', async () => {
    const w = await viewerAt(1024)
    await pickLetra(w)
    expect(w.emitted('update:lens')?.at(-1)).toEqual(['letra'])
  })

  it('L toggles Letra without opening a sheet', async () => {
    const w = await viewerAt(1024)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }))
    await flushPromises()
    expect(pressed(w, 'letra')).toBe('true')
    expect(w.find('.cpv-chord').exists()).toBe(false)
    expect(w.find('[role="dialog"][aria-label="Lentes de leitura"]').exists()).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }))
    await flushPromises()
    expect(pressed(w, 'cifra')).toBe('true')
    expect(w.find('.cpv-chord').exists()).toBe(true)
  })

  it('Nashville from the bar, and Cifra restores it after Letra', async () => {
    const w = await viewerAt(1024)
    await w.get('[data-lens=nashville]').trigger('click')
    await flushPromises()
    expect(w.emitted('update:lens')?.at(-1)).toEqual(['nashville'])
    await pickLetra(w)
    expect(pressed(w, 'letra')).toBe('true')
    await w.get('[data-reading=cifra]').trigger('click')
    await flushPromises()
    expect(w.get('[data-lens=nashville]').attributes('aria-pressed')).toBe('true')
    expect(w.emitted('update:lens')?.at(-1)).toEqual(['nashville'])
  })

  it('hides rehearsal comments from the bar without a Lentes sheet', async () => {
    const w = await viewerAt(1024)
    expect(w.text()).toMatch(/BEM SUAVE/)
    await w.get('[data-comments-toggle]').trigger('click')
    await flushPromises()
    expect(w.text()).not.toMatch(/BEM SUAVE/)
    expect(w.emitted('update:hideComments')?.at(-1)).toEqual([true])
  })
})
