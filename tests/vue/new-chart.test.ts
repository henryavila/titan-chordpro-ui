import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import NewChartDialog from '../../src/vue/edit/NewChartDialog.vue'
import { memoryStore } from '../../src/core'

const mounted: ReturnType<typeof mount>[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})

function dialog(props: Record<string, unknown> = {}) {
  const w = mount(NewChartDialog, { props: { compact: false, ...props }, attachTo: document.body })
  mounted.push(w)
  return w
}
function viewer(props: Record<string, unknown> = {}) {
  const w = mount(ChordproViewer, {
    props: { source: '', storage: memoryStore(), autoHide: false, ...props },
    attachTo: document.body,
  })
  mounted.push(w)
  return w
}

const PLAIN = 'G       C\nUma letra qualquer'

/** Hands a PDF to the file input the way the browser would. */
async function dropPdf(w: ReturnType<typeof dialog>) {
  const field = w.find('input[type=file]')
  const file = new File(['%PDF-1.4'], 'cifra.pdf', { type: 'application/pdf' })
  Object.defineProperty(field.element, 'files', { value: [file], configurable: true })
  await field.trigger('change')
  await flushPromises()
}

describe('a song with no chart', () => {
  it('offers nothing to a reader who cannot write for everyone', () => {
    expect(viewer().find('[data-start-import]').exists()).toBe(false)
    expect(viewer({ modes: 'local' }).find('[data-start-import]').exists()).toBe(false)
  })

  it('offers import and blank to whoever can', () => {
    const w = viewer({ modes: 'content' })
    expect(w.find('[data-start-import]').exists()).toBe(true)
    expect(w.find('[data-start-blank]').exists()).toBe(true)
  })

  it('canEdit=false closes the door even in content mode', () => {
    expect(viewer({ modes: 'content', canEdit: false }).find('[data-start-import]').exists()).toBe(false)
  })

  it('opens the flow, and blank goes straight to the details', async () => {
    const w = viewer({ modes: 'content' })
    await w.get('[data-start-blank]').trigger('click')
    expect(w.find('[data-new-chart]').exists()).toBe(true)
    expect(w.find('[data-nova-title]').exists()).toBe(true)
    expect(w.text()).toContain('Cifra em branco')
  })
})

describe('bringing a chart in', () => {
  it('converts pasted text and moves on to the details', async () => {
    const w = dialog()
    await w.get('[data-tab="text"]').trigger('click')
    await w.get('[data-nova-text]').setValue(PLAIN)
    await w.get('[data-nova-text-go]').trigger('click')
    expect(w.find('[data-nova-title]').exists()).toBe(true)
    expect(w.text()).toContain('acordes sobre a letra')
  })

  it('says what it recognised while it is still being pasted', async () => {
    const w = dialog()
    await w.get('[data-tab="text"]').trigger('click')
    await w.get('[data-nova-text]').setValue('{title:Uma}\n[G]Letra')
    expect(w.text()).toContain('reconhecido: ChordPro')
  })

  it('refuses an empty paste instead of making an empty chart', async () => {
    const w = dialog()
    await w.get('[data-tab="text"]').trigger('click')
    await w.get('[data-nova-text-go]').trigger('click')
    expect(w.text()).toContain('Nada colado ainda')
    expect(w.find('[data-nova-title]').exists()).toBe(false)
  })

  it('says so plainly when the host offers no way to fetch a link', async () => {
    const w = dialog()
    await w.get('[data-nova-url]').setValue('https://www.cifraclub.com.br/a/b/')
    await w.get('[data-nova-url-go]').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Buscar por link não está disponível')
  })

  it('uses the host fetcher and keeps the link as the reference', async () => {
    const w = dialog({ fetchChart: () => Promise.resolve(PLAIN) })
    await w.get('[data-nova-url]').setValue('https://www.cifraclub.com.br/ministerio-jovem/meu-farol/')
    await w.get('[data-nova-url-go]').trigger('click')
    await flushPromises()
    expect(w.find('[data-nova-title]').exists()).toBe(true)
    // The title is guessed from the address when the page carried none.
    expect((w.get('[data-nova-title]').element as HTMLInputElement).value).toBe('Meu Farol')
  })

  it('reports a fetch that failed rather than opening an empty editor', async () => {
    const w = dialog({ fetchChart: () => Promise.reject(new Error('rede')) })
    await w.get('[data-nova-url]').setValue('https://www.cifraclub.com.br/a/b/')
    await w.get('[data-nova-url-go]').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Não deu para ler essa página')
  })

  it('does not offer PDF when the host cannot read one', async () => {
    const without = dialog()
    await without.get('[data-tab="file"]').trigger('click')
    expect(without.text()).not.toContain('PDF com texto')

    const with_ = dialog({ readPdf: () => Promise.resolve('x') })
    await with_.get('[data-tab="file"]').trigger('click')
    expect(with_.text()).toContain('PDF com texto')
  })

  it('refuses a PDF up front when there is no reader for it', async () => {
    const w = dialog()
    await w.get('[data-tab="file"]').trigger('click')
    await dropPdf(w)
    expect(w.text()).toContain('PDF não está disponível aqui')
  })

  it('says a scanned PDF has no text, and points at the way out', async () => {
    const w = dialog({ readPdf: () => Promise.reject(new Error('sem-texto')) })
    await w.get('[data-tab="file"]').trigger('click')
    await dropPdf(w)
    expect(w.text()).toContain('Este PDF não tem texto')
  })
})

describe('identifying the song', () => {
  function atFicha() {
    const w = dialog({ start: 'blank' })
    return w
  }

  it('says what is still missing, without blocking', () => {
    const w = atFicha()
    expect(w.text()).toContain('Falta título, tom, andamento e compasso')
  })

  it('picks a key, and minor toggles on the root already chosen', async () => {
    const w = atFicha()
    await w.get('[data-key-chip="G"]').trigger('click')
    await w.findAll('button').find((b) => b.text() === 'menor (m)')!.trigger('click')
    await w.get('[data-nova-go]').trigger('click')
    expect(w.emitted('commit')?.[0]?.[0]).toContain('{key:Gm}')
  })

  it('steps the bpm and clamps it', async () => {
    const w = atFicha()
    const up = w.findAll('button').find((b) => b.attributes('aria-label') === 'Aumentar')!
    await up.trigger('click')
    expect((w.get('[data-nova-bpm]').element as HTMLInputElement).value).toBe('91')
  })

  it('a blank chart still commits something the editor can open', async () => {
    const w = atFicha()
    await w.get('[data-nova-title]').setValue('Minha música')
    await w.get('[data-time-chip="4/4"]').trigger('click')
    await w.get('[data-nova-go]').trigger('click')
    const src = String(w.emitted('commit')?.[0]?.[0])
    expect(src).toContain('{title:Minha música}')
    expect(src).toContain('{time:4/4}')
    expect(src).toContain('{c:Intro}')
  })

  it('writes the header once, in canonical order', async () => {
    const w = dialog({ start: 'ficha', initialSource: '{key:C}\n[G]Letra' })
    await w.get('[data-nova-title]').setValue('Uma')
    await w.get('[data-nova-go]').trigger('click')
    const src = String(w.emitted('commit')?.[0]?.[0])
    expect(src.match(/\{key:/g)).toHaveLength(1)
    expect(src.split('\n')[0]).toBe('{title:Uma}')
  })
})

describe('what the flow hands back', () => {
  it('becomes the chart of the system and opens the editor on it', async () => {
    const w = viewer({ modes: 'content' })
    await w.get('[data-start-blank]').trigger('click')
    await w.get('[data-nova-title]').setValue('Minha música')
    await w.get('[data-nova-go]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(w.find('[data-new-chart]').exists()).toBe(false)
    expect(w.emitted('save-content')?.[0]?.[0]).toContain('{title:Minha música}')
    expect(w.emitted('update:mode')?.at(-1)?.[0]).toBe('edit')
  })
})
