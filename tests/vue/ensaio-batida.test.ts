import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import { memoryStore } from '../../src/core'
import { withDuration } from '../helpers/load-fixture'

const CHART = withDuration(`{title: Ensaio}
{tempo: 100}
{time: 4/4}
{duration: 0:30}
{x_strum: bpm=100; meter=4/4; grid=8; label=Padrão; pat=DuDu DuDU}

[G]ola [C]mundo
`)

const mounted: VueWrapper[] = []
afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount()
})

async function viewer() {
  document.body.innerHTML = ''
  const root = document.createElement('div')
  root.style.height = '640px'
  document.body.appendChild(root)
  const w = mount(ChordproViewer, {
    props: { source: CHART, autoHide: false, storage: memoryStore() },
    attachTo: root,
  })
  mounted.push(w)
  await flushPromises()
  // Give layout room so Rolar is enabled.
  Object.defineProperty(w.get('[data-cpv-root]').element, 'clientHeight', { value: 400 })
  const page = w.find('.cpv-page').element as HTMLElement
  Object.defineProperty(page, 'scrollHeight', { value: 2000, configurable: true })
  await flushPromises()
  return w
}

describe('Ensaio Batida + Rolar silencioso', () => {
  it('shows Ensaio batida when the chart has strum', async () => {
    const w = await viewer()
    expect(w.find('[data-ensaio-batida]').exists()).toBe(true)
    expect(w.find('[data-ensaio-batida]').text()).toMatch(/Ensaio batida/i)
  })

  it('entering Ensaio Batida opens the strip and labels Sair', async () => {
    const w = await viewer()
    await w.get('[data-ensaio-batida]').trigger('click')
    await flushPromises()
    expect(w.find('[data-ensaio-batida]').text()).toMatch(/Sair/i)
    expect(w.find('[data-strum-strip]').exists() || w.find('.cpv-strum-dock').exists()).toBe(true)
  })

  it('Fonte Batida in the metronome maps to prefs without forcing Rolar audio', async () => {
    const storage = memoryStore()
    const w = mount(ChordproViewer, {
      props: { source: CHART, autoHide: false, storage },
      attachTo: document.body,
    })
    mounted.push(w)
    await flushPromises()

    await w.get('[data-met-btn]').trigger('click')
    await flushPromises()
    await w.get('[data-met-source="batida"]').trigger('click')
    await flushPromises()
    expect(JSON.parse(storage.get('cpv:prefs')!)).toMatchObject({ metStrumSound: true })
  })
})
