import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import NewChartDialog from '../../src/vue/edit/NewChartDialog.vue'
import { memoryStore } from '../../src/core'
import { loadFixture } from '../helpers/load-fixture'

const helpers = join(dirname(fileURLToPath(import.meta.url)), '../helpers')

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
  it('asks before rewriting a fake-capo chart', async () => {
    const w = dialog()
    await w.get('[data-tab="text"]').trigger('click')
    await w.get('[data-nova-text]').setValue(loadFixture('sda/082-o-rei-vem-vindo.cho'))
    await w.get('[data-nova-text-go]').trigger('click')
    expect(w.find('[data-nova-key-rewrite]').exists()).toBe(true)
    expect(w.text()).toMatch(/Declarado/)
    expect(w.text()).toMatch(/Escrito/)
    expect(w.text()).toMatch(/sugere capo 1/)
    expect(w.get('[data-nova-go]').attributes('disabled')).toBeDefined()
    await w.get('[data-nova-key-rewrite-go]').trigger('click')
    expect(w.find('[data-nova-key-rewrite]').exists()).toBe(false)
    await w.get('[data-nova-go]').trigger('click')
    const committed = String(w.emitted('commit')?.[0]?.[0] ?? '')
    expect(committed).toContain('[Ab]')
    expect(committed).toMatch(/\{transpose:-1\}/)
    expect(committed).not.toMatch(/\{capo:/)
  })

  it('can keep the written key and capo instead of rewriting', async () => {
    const w = dialog()
    await w.get('[data-tab="text"]').trigger('click')
    await w.get('[data-nova-text]').setValue(loadFixture('sda/082-o-rei-vem-vindo.cho'))
    await w.get('[data-nova-text-go]').trigger('click')
    await w.get('[data-nova-key-rewrite-keep]').trigger('click')
    await w.get('[data-nova-go]').trigger('click')
    const committed = String(w.emitted('commit')?.[0]?.[0] ?? '')
    expect(committed).toContain('[G]')
    expect(committed).toMatch(/\{capo:1\}/)
    expect(committed).not.toMatch(/\{transpose:/)
  })

  it('converts pasted text and moves on to the details', async () => {
    const w = dialog()
    await w.get('[data-tab="text"]').trigger('click')
    await w.get('[data-nova-text]').setValue(PLAIN)
    await w.get('[data-nova-text-go]').trigger('click')
    expect(w.find('[data-nova-title]').exists()).toBe(true)
    expect(w.text()).toContain('acordes sobre a letra')
    expect(w.find('[data-nova-duration]').exists()).toBe(true)
    await w.get('[data-nova-go]').trigger('click')
    expect(w.emitted('commit')).toBeUndefined()
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

  it('asks for a Cifra Club address, not a generic page', () => {
    const w = dialog()
    expect(w.text()).toContain('Cifra Club')
    expect(w.text()).toContain('Só Cifra Club')
    expect(w.text()).toContain('Trazer do Cifra Club')
    expect((w.get('[data-nova-url]').element as HTMLInputElement).placeholder).toContain(
      'cifraclub.com.br',
    )
  })

  it('names the song from a Cifra Club address before fetching', async () => {
    const w = dialog({ fetchChart: () => Promise.resolve(PLAIN) })
    await w.get('[data-nova-url]').setValue('https://www.cifraclub.com.br/ministerio-jovem/meu-farol/')
    expect(w.text()).toContain('Meu Farol')
    expect(w.text()).toContain('Ministerio Jovem')
  })

  it('starts the fetch when a Cifra Club address is pasted', async () => {
    const fetchChart = vi.fn(() => Promise.resolve(PLAIN))
    const w = dialog({ fetchChart })
    await w.get('[data-nova-url]').trigger('paste', {
      clipboardData: { getData: () => 'https://www.cifraclub.com.br/ministerio-jovem/meu-farol/' },
    })
    await flushPromises()
    expect(fetchChart).toHaveBeenCalledWith('https://www.cifraclub.com.br/ministerio-jovem/meu-farol/')
    expect(w.find('[data-nova-title]').exists()).toBe(true)
  })

  it('refuses a URL that is not Cifra Club before asking the host', async () => {
    const fetchChart = vi.fn(() => Promise.resolve(PLAIN))
    const w = dialog({ fetchChart })
    await w.get('[data-nova-url]').setValue('https://www.letras.mus.br/uma/cifra/')
    await w.get('[data-nova-url-go]').trigger('click')
    await flushPromises()
    expect(fetchChart).not.toHaveBeenCalled()
    expect(w.text()).toContain('Só o Cifra Club')
    expect(w.find('[data-nova-title]').exists()).toBe(false)
  })

  it('says so plainly when the host offers no way to fetch a link', async () => {
    const w = dialog()
    expect(w.text()).toContain('Buscar no Cifra Club não está disponível')
    await w.get('[data-nova-url]').setValue('https://www.cifraclub.com.br/a/b/')
    await w.get('[data-nova-url-go]').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Buscar no Cifra Club não está disponível')
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

  it('asks for duration after a Cifra Club page, not only tom, compasso and bpm', async () => {
    const w = dialog({ fetchChart: () => Promise.resolve(PLAIN) })
    await w.get('[data-nova-url]').setValue('https://www.cifraclub.com.br/ministerio-jovem/meu-farol/')
    await w.get('[data-nova-url-go]').trigger('click')
    await flushPromises()
    expect(w.find('[data-nova-duration]').exists()).toBe(true)
    expect(w.text()).toMatch(/duração/i)
    expect(w.text()).toContain('não rola')
    await w.get('[data-nova-go]').trigger('click')
    expect(w.emitted('commit')).toBeUndefined()
    await w.get('[data-nova-duration]').setValue('4:26')
    await w.get('[data-nova-go]').trigger('click')
    expect(String(w.emitted('commit')?.[0]?.[0])).toContain('{duration:04:26}')
  })

  it('fills duration from YouTube when the host can fetch the watch page', async () => {
    const html = readFileSync(join(helpers, 'cifraclub-tu-es-tabs.html'), 'utf8')
    const w = dialog({
      fetchChart: () => Promise.resolve(html),
      fetchYoutubeDuration: () =>
        Promise.resolve('<meta itemprop="duration" content="PT7M57S"><script>"lengthSeconds":"477"</script>'),
    })
    await w.get('[data-nova-url]').setValue(
      'https://www.cifraclub.com.br/florianopolis-house-of-prayer/tu-es-aguas-purificadoras/',
    )
    await w.get('[data-nova-url-go]').trigger('click')
    await flushPromises()
    expect((w.get('[data-nova-duration]').element as HTMLInputElement).value).toBe('07:57')
    expect(w.find('[data-nova-youtube]').exists()).toBe(true)
    expect(w.text()).toMatch(/vieram preenchidos|Convertido do Cifra Club/i)
  })

  it('reports a fetch that failed rather than opening an empty editor', async () => {
    const w = dialog({ fetchChart: () => Promise.reject(new Error('rede')) })
    await w.get('[data-nova-url]').setValue('https://www.cifraclub.com.br/a/b/')
    await w.get('[data-nova-url-go]').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Não deu para ler essa cifra no Cifra Club')
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
  async function setDuration(w: ReturnType<typeof dialog>, value = '4:26') {
    await w.get('[data-nova-duration]').setValue(value)
  }

  it('says what is still missing — duration is required, the rest can wait', () => {
    const w = atFicha()
    expect(w.text()).toContain('Falta título, tom, andamento e compasso')
    expect(w.text()).toMatch(/duração/i)
    expect(w.text()).toContain('não rola')
    expect(w.find('[data-nova-duration]').exists()).toBe(true)
  })

  it('will not open a new chart without a duration', async () => {
    const w = atFicha()
    await w.get('[data-nova-title]').setValue('Minha música')
    await w.get('[data-nova-go]').trigger('click')
    expect(w.emitted('commit')).toBeUndefined()
  })

  it('refuses a duration too short to roll', async () => {
    const w = atFicha()
    await setDuration(w, '5')
    expect(w.text()).toContain('pelo menos 20s')
    await w.get('[data-nova-go]').trigger('click')
    expect(w.emitted('commit')).toBeUndefined()
  })

  it('picks a key, and minor toggles on the root already chosen', async () => {
    const w = atFicha()
    await setDuration(w)
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
    await setDuration(w)
    await w.get('[data-nova-go]').trigger('click')
    const src = String(w.emitted('commit')?.[0]?.[0])
    expect(src).toContain('{title:Minha música}')
    expect(src).toContain('{time:4/4}')
    expect(src).toContain('{duration:04:26}')
    expect(src).toContain('{c:INTRODUÇÃO}')
  })

  it('writes the header once, in canonical order', async () => {
    const w = dialog({ start: 'ficha', initialSource: '{key:C}\n[G]Letra' })
    await w.get('[data-nova-title]').setValue('Uma')
    await setDuration(w)
    await w.get('[data-nova-go]').trigger('click')
    const src = String(w.emitted('commit')?.[0]?.[0])
    expect(src.match(/\{key:/g)).toHaveLength(1)
    expect(src.split('\n')[0]).toBe('{title:Uma}')
    expect(src).toContain('{duration:04:26}')
  })

  it('keeps a duration that was already in the chart', async () => {
    const w = dialog({
      start: 'ficha',
      initialSource: '{title:Uma}\n{duration:03:12}\n[G]Letra',
    })
    expect((w.get('[data-nova-duration]').element as HTMLInputElement).value).toBe('03:12')
    await w.get('[data-nova-go]').trigger('click')
    const src = String(w.emitted('commit')?.[0]?.[0])
    expect(src.match(/\{duration:/g)).toHaveLength(1)
    expect(src).toContain('{duration:03:12}')
  })
})

describe('what the flow hands back', () => {
  it('becomes the chart of the system and opens the editor on it', async () => {
    const w = viewer({ modes: 'content' })
    await w.get('[data-start-blank]').trigger('click')
    await w.get('[data-nova-title]').setValue('Minha música')
    await w.get('[data-nova-duration]').setValue('4:26')
    await w.get('[data-nova-go]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(w.find('[data-new-chart]').exists()).toBe(false)
    expect(w.emitted('save-content')?.[0]?.[0]).toContain('{title:Minha música}')
    expect(w.emitted('save-content')?.[0]?.[0]).toContain('{duration:04:26}')
    expect(w.emitted('update:mode')?.at(-1)?.[0]).toBe('edit')
  })

  it('stays in the editor when the host writes the new chart back as source', async () => {
    const w = viewer({ modes: 'content' })
    await w.get('[data-start-blank]').trigger('click')
    await w.get('[data-nova-title]').setValue('Minha música')
    await w.get('[data-nova-duration]').setValue('4:26')
    await w.get('[data-nova-go]').trigger('click')
    await flushPromises()
    const src = String(w.emitted('save-content')?.[0]?.[0])
    await w.setProps({ source: src })
    await flushPromises()
    await nextTick()
    expect(w.emitted('update:mode')?.at(-1)?.[0]).toBe('edit')
    expect(w.text()).toMatch(/Para todos/)
    expect(w.find('[data-start-import]').exists()).toBe(false)
  })
})
