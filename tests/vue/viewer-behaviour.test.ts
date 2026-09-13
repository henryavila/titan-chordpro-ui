import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import SourcePane from '../../src/vue/edit/SourcePane.vue'
import { lintSource } from '../../src/core/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

const src = () => loadFixture(JESUS_1)

function mountViewer(props: Record<string, unknown> = {}) {
  return mount(ChordproViewer, {
    props: { source: src(), theme: 'dark', autoHide: false, ...props },
    attachTo: document.body,
  })
}

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('fit hint', () => {
  it('shows once and stays away after it has been seen', async () => {
    const first = mountViewer()
    await flushPromises()
    expect(first.text()).toContain('Ajuste encaixa a cifra')
    await first.get('button[aria-label="Entendi"]').trigger('click')
    await flushPromises()
    expect(first.text()).not.toContain('Ajuste encaixa a cifra')
    first.unmount()

    // The flag lives in storage; a later session must honour it. It used to be
    // read into a plain variable the computed never depended on.
    const second = mountViewer()
    await flushPromises()
    expect(second.text()).not.toContain('Ajuste encaixa a cifra')
    second.unmount()
  })
})

describe('zen', () => {
  it('a tap on empty chart puts the chrome away and brings it back', async () => {
    localStorage.setItem('cpv:fitSeen', '1')
    const w = mountViewer()
    await flushPromises()
    const chrome = () => w.get('.cpv-chrome')
    expect(chrome().classes()).not.toContain('is-hidden')

    await w.get('[data-cpv-scroll]').trigger('click')
    await flushPromises()
    expect(chrome().classes()).toContain('is-hidden')
    expect(w.find('.cpv-chrome-hint').exists(), 'standing hint stayed after the toast').toBe(false)
    expect(w.get('.cpv-toast').text()).toBe('Toque na tela para mostrar os controles')

    await w.get('[data-cpv-scroll]').trigger('click')
    await flushPromises()
    expect(chrome().classes()).not.toContain('is-hidden')
    w.unmount()
  })

  it('the first hide on a phone is the same toast, not a standing band', async () => {
    localStorage.setItem('cpv:fitSeen', '1')
    const observers: ((entries: unknown[]) => void)[] = []
    class RO {
      constructor(cb: (entries: unknown[]) => void) {
        observers.push(cb)
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    const realRO = globalThis.ResizeObserver
    globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver
    try {
      const w = mountViewer()
      await flushPromises()
      observers.forEach((cb) => cb([{ contentRect: { width: 390, height: 800 } }]))
      await flushPromises()

      await w.get('[data-cpv-scroll]').trigger('click')
      await flushPromises()
      expect(w.find('.cpv-chrome-hint').exists()).toBe(false)
      expect(w.get('.cpv-toast').text()).toBe('Toque na tela para mostrar os controles')
      w.unmount()
    } finally {
      globalThis.ResizeObserver = realRO
    }
  })

  it('fades the toast out instead of dropping it', async () => {
    localStorage.setItem('cpv:fitSeen', '1')
    const w = mountViewer()
    try {
      await flushPromises()
      vi.useFakeTimers()
      await w.get('[data-cpv-scroll]').trigger('click')
      await flushPromises()
      expect(w.get('.cpv-toast').classes()).not.toContain('is-out')

      await vi.advanceTimersByTimeAsync(2400)
      await flushPromises()
      expect(w.get('.cpv-toast').classes()).toContain('is-out')
      expect(w.find('.cpv-toast').exists()).toBe(true)

      await vi.advanceTimersByTimeAsync(450)
      await flushPromises()
      expect(w.find('.cpv-toast').exists()).toBe(false)
    } finally {
      w.unmount()
      vi.useRealTimers()
    }
  })

  it('ignores a tap that lands on a control', async () => {
    localStorage.setItem('cpv:fitSeen', '1')
    const w = mountViewer()
    await flushPromises()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    expect(w.get('.cpv-chrome').classes()).not.toContain('is-hidden')
    w.unmount()
  })

  /**
   * Hiding the chrome must not reflow the chart — phone or desktop. Opacity
   * only: reclaiming the band shoved the line under the eye.
   */
  it.each([
    [1280, 'desktop'],
    [390, 'phone'],
  ] as const)('on %s, zen hides the chrome without shrinking the page pad', async (width, _label) => {
    localStorage.setItem('cpv:fitSeen', '1')
    const observers: ((entries: unknown[]) => void)[] = []
    class RO {
      constructor(cb: (entries: unknown[]) => void) {
        observers.push(cb)
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    const realRO = globalThis.ResizeObserver
    globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver
    try {
      const w = mountViewer()
      await flushPromises()
      observers.forEach((cb) => cb([{ contentRect: { width, height: 900 } }]))
      await flushPromises()

      const pad = () => (w.get('.cpv-page').attributes('style') ?? '')
      const before = pad()
      expect(before).toMatch(/padding:/)

      await w.get('[data-cpv-scroll]').trigger('click')
      await flushPromises()
      expect(w.get('.cpv-chrome').classes()).toContain('is-hidden')
      expect(pad(), 'zen reclaimed the chrome band and jumped the chart').toBe(before)

      await w.get('[data-cpv-scroll]').trigger('click')
      await flushPromises()
      expect(w.get('.cpv-chrome').classes()).not.toContain('is-hidden')
      expect(pad()).toBe(before)
      w.unmount()
    } finally {
      globalThis.ResizeObserver = realRO
    }
  })
})

/** Host-activated "Para todos": skip the picker when that is the only mode. */
async function enterContentEdit(w: ReturnType<typeof mountViewer>) {
  await w.get('[data-edit]').trigger('click')
  await flushPromises()
  const pick = w.find('[data-mode-content]')
  if (pick.exists()) {
    await pick.trigger('click')
    await flushPromises()
  }
}

async function renameChart(w: ReturnType<typeof mountViewer>, title: string) {
  await w.get('[data-meta-open]').trigger('click')
  await flushPromises()
  await w.get('[data-meta-title]').setValue(title)
  await w.get('[data-meta-apply]').trigger('click')
  await flushPromises()
}

async function titleInMeta(w: ReturnType<typeof mountViewer>) {
  if (!w.find('[data-meta-title]').exists()) {
    await w.get('[data-meta-open]').trigger('click')
    await flushPromises()
  }
  return (w.get('[data-meta-title]').element as HTMLInputElement).value
}

describe('edit chrome (E0)', () => {
  it('editing meta marks the chart dirty and rewrites the directive', async () => {
    localStorage.setItem('cpv:fitSeen', '1')
    const w = mountViewer({ modes: 'content' })
    await flushPromises()
    await enterContentEdit(w)
    await renameChart(w, 'Outro título')

    expect(w.text()).toContain('não salvo')
    expect(w.emitted('dirty')?.at(-1)?.[0]).toBe(true)
    expect(await titleInMeta(w)).toBe('Outro título')

    await w.get('[data-save]').trigger('click')
    await flushPromises()
    expect(String(w.emitted('save')?.at(-1)?.[0] ?? '')).toMatch(/\{title:\s*Outro título\}/)
    expect(String(w.emitted('update:source')?.at(-1)?.[0] ?? '')).toMatch(/\{title:\s*Outro título\}/)
    expect(w.text()).not.toContain('não salvo')
    w.unmount()
  })

  it('carries an unsaved draft into reading and back into editing', async () => {
    localStorage.setItem('cpv:fitSeen', '1')
    const w = mountViewer({ modes: 'content' })
    await flushPromises()
    await enterContentEdit(w)
    await renameChart(w, 'Rascunho vivo')

    await w.get('[data-read]').trigger('click')
    await flushPromises()
    // Reading shows the draft, and the entry point says a draft is waiting.
    expect(w.text()).toContain('Rascunho vivo')
    expect(w.get('[data-edit]').text()).toContain('rascunho')

    await enterContentEdit(w)
    expect(await titleInMeta(w)).toBe('Rascunho vivo')
    w.unmount()
  })

  it('asks twice before discarding, then goes back to the last saved text', async () => {
    localStorage.setItem('cpv:fitSeen', '1')
    const w = mountViewer({ modes: 'content' })
    await flushPromises()
    await enterContentEdit(w)
    await renameChart(w, 'Some outro')

    expect(w.get('[data-discard]').text()).toBe('Descartar')
    await w.get('[data-discard]').trigger('click')
    await flushPromises()
    expect(w.get('[data-discard]').text()).toBe('Confirmar descarte')
    await w.get('[data-discard]').trigger('click')
    await flushPromises()
    expect(w.text()).not.toContain('não salvo')
    expect(await titleInMeta(w)).toBe('087 - Jesus, Tu És a minha vida')
    w.unmount()
  })

  it('offers redo only once something has been undone', async () => {
    localStorage.setItem('cpv:fitSeen', '1')
    const w = mountViewer({ modes: 'content' })
    await flushPromises()
    await enterContentEdit(w)
    expect(w.find('[data-redo]').exists()).toBe(false)

    await renameChart(w, 'Mudou')
    await w.get('[data-undo]').trigger('click')
    await flushPromises()
    expect(w.find('[data-redo]').exists()).toBe(true)
    await w.get('[data-redo]').trigger('click')
    await flushPromises()
    expect(await titleInMeta(w)).toBe('Mudou')
    w.unmount()
  })
})

describe('host contract', () => {
  it('canEdit=false removes every way into the editor', async () => {
    localStorage.setItem('cpv:fitSeen', '1')
    const w = mountViewer({ canEdit: false })
    await flushPromises()
    expect(w.find('[data-edit]').exists()).toBe(false)
    w.unmount()
  })

  it('resolveImage maps a {image:} reference onto a URL the host serves', async () => {
    localStorage.setItem('cpv:fitSeen', '1')
    const w = mountViewer({
      source: '{title: T}\n\n{image: assets/intro.png}\n',
      resolveImage: (s: string) => `/cdn/${s}`,
    })
    await flushPromises()
    const img = w.get('figure img')
    expect(img.attributes('src')).toBe('/cdn/assets/intro.png')
    expect(img.attributes('alt')).toContain('intro.png')
    expect(w.text()).toContain('Ver inteira')
    w.unmount()
  })
})

describe('source pane', () => {
  it('drops a directive at the caret, not at the end of the file', async () => {
    const text = '{title: T}\nlinha um\nlinha dois'
    const w = mount(SourcePane, {
      props: { source: text, lint: lintSource(text) },
      attachTo: document.body,
    })
    const ta = w.get('textarea').element as HTMLTextAreaElement
    ta.setSelectionRange(11, 11) // start of "linha um"
    await w.get('button[title="Comentário de ensaio"]').trigger('click')
    await flushPromises()
    expect(w.emitted('input')?.at(-1)?.[0]).toBe('{title: T}\n{c:()}linha um\nlinha dois')
    w.unmount()
  })

  it('shows the lint verdict for the source it was handed', () => {
    const bad = '{soc}\n[C]a'
    const w = mount(SourcePane, { props: { source: bad, lint: lintSource(bad) } })
    expect(w.text()).toContain('refrão sem fechar')
    w.unmount()
  })
})
