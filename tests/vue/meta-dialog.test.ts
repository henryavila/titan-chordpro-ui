import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { chartBody, memoryStore, parse } from '../../src/core'
import { splitCho } from '../../src/core/charts'
import { ChordproViewer } from '../../src/vue'
import MetaDialog from '../../src/vue/edit/MetaDialog.vue'
import { loadFixture } from '../helpers/load-fixture'

const helpers = join(dirname(fileURLToPath(import.meta.url)), '../helpers')
const TU_ES = readFileSync(join(helpers, 'cifraclub-tu-es-tabs.html'), 'utf8')
const TUA_CC_NO_STRUM = readFileSync(join(helpers, 'cifraclub-tua-vontade-no-strum.html'), 'utf8')
const CEU_AZUL = readFileSync(join(helpers, 'cifraclub-ceu-azul-strum.html'), 'utf8')
const SDA = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/sda/005-tua-vontade.cho'),
  'utf8',
)

const mounted: ReturnType<typeof mount>[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
})

const SRC = `{title: Uma}
{subtitle: Ministério}
{key: G}
{tempo: 90}
{time: 4/4}
{duration: 04:26}

{c:Verso}
[G]letra
`

function dialog(source = SRC, extra: Record<string, unknown> = {}) {
  const w = mount(MetaDialog, {
    props: { compact: false, source, allowRestart: true, ...extra },
    attachTo: document.body,
  })
  mounted.push(w)
  return w
}

function viewer(props: Record<string, unknown> = {}) {
  const w = mount(ChordproViewer, {
    props: {
      source: SRC,
      storage: memoryStore(),
      autoHide: false,
      modes: 'content',
      ...props,
    },
    attachTo: document.body,
  })
  mounted.push(w)
  return w
}

async function enterContent(w: ReturnType<typeof viewer>) {
  await w.get('[data-edit]').trigger('click')
  await flushPromises()
}

describe('MetaDialog', () => {
  it('does not treat a sibling chart as the chords of the default chart', () => {
    const src = `{start_of_x_chart:completa}
{title:Uma}
{key:G}
[G]completa [G]mais [G]ainda
{end_of_x_chart}
{start_of_x_chart:oferta}
{title:Uma}
{x_chart_default:oferta}
{key:C}
{transpose:2}
[C]oferta
{end_of_x_chart}
`
    const w = dialog(src)
    expect(w.find('[data-meta-rewrite]').exists()).toBe(false)
    expect(w.text()).not.toMatch(/acordes estão em/i)
  })

  it('offers rewrite when the declared key is not what the chords spell', async () => {
    const src = loadFixture('sda/082-o-rei-vem-vindo.cho')
    const w = dialog(src)
    expect(w.find('[data-meta-rewrite]').exists()).toBe(true)
    expect(w.text()).toMatch(/acordes estão em G/i)
    await w.get('[data-meta-rewrite-go]').trigger('click')
    const next = String(w.emitted('apply')?.at(-1)?.[0] ?? '')
    expect(next).toMatch(/\{key:Ab\}/)
    expect(next).toMatch(/\{transpose:-1\}/)
    expect(next).toContain('[Ab]')
    expect(next).not.toMatch(/\{capo:/)
    expect(next).toContain('O Rei vem')
  })

  it('loads every known header field into the form', () => {
    const w = dialog()
    expect((w.get('[data-meta-title]').element as HTMLInputElement).value).toBe('Uma')
    expect((w.get('[data-meta-subtitle]').element as HTMLInputElement).value).toBe('Ministério')
    expect((w.get('[data-meta-tempo]').element as HTMLInputElement).value).toBe('90')
    expect((w.get('[data-meta-duration]').element as HTMLInputElement).value).toBe('04:26')
    expect(w.get('[data-meta-key-shown]').text()).toBe('G')
    expect(w.get('[data-meta-time="4/4"]').attributes('style')).toContain('var(--chord)')
  })

  it('writes duration, time and reference back into the source on apply', async () => {
    const w = dialog('{title: Só}\n[G]a\n')
    await w.get('[data-meta-duration]').setValue('345')
    await w.get('[data-meta-time="6/8"]').trigger('click')
    await w.get('[data-meta-source]').setValue('https://youtu.be/abc')
    await w.get('[data-meta-apply]').trigger('click')
    const next = w.emitted('apply')?.at(-1)?.[0] as string
    expect(next).toMatch(/\{duration:03:45\}/)
    expect(next).toMatch(/\{time:6\/8\}/)
    expect(next).toMatch(/\{x_source:https:\/\/youtu\.be\/abc\}/)
    expect(next).toContain('[G]a')
  })

  it('masks duration as MM:SS while typing', async () => {
    const w = dialog('{title: Só}\n[G]a\n')
    await w.get('[data-meta-duration]').setValue('426')
    expect((w.get('[data-meta-duration]').element as HTMLInputElement).value).toBe('4:26')
    await w.get('[data-meta-duration]').trigger('blur')
    expect((w.get('[data-meta-duration]').element as HTMLInputElement).value).toBe('04:26')
  })

  it('keeps the body intact when only the header changes', async () => {
    const body = '{c:Intro}\n[G]x///\n\n[G]linha cantada'
    const w = dialog(`{title: T}\n${body}`)
    await w.get('[data-meta-title]').setValue('Novo')
    await w.get('[data-meta-apply]').trigger('click')
    const next = w.emitted('apply')?.at(-1)?.[0] as string
    expect(next).toContain('{title:Novo}')
    expect(next).toContain(body)
  })

  it('a tempo save on N>1 does not rewrite {t:} or {composer:}', async () => {
    const src = [
      '{start_of_x_chart:completa}',
      '{t:Completa}',
      '{composer:Um}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{t:Oferta}',
      '{composer:Dois}',
      '{x_chart_default:oferta}',
      '{tempo:80}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    const w = dialog(src)
    await w.get('[data-meta-tempo]').setValue('100')
    await w.get('[data-meta-apply]').trigger('click')
    const next = w.emitted('apply')?.at(-1)?.[0] as string
    expect(next).toContain('{t:Oferta}')
    expect(next).toContain('{composer:Dois}')
    expect(next).toContain('{t:Completa}')
    expect(next).toContain('{composer:Um}')
    expect(next).not.toContain('{title:')
    expect(next).not.toContain('{artist:')
    expect(next).toContain('{tempo:100}')
    expect(next).not.toContain('{tempo:80}')
  })

  it('clearing the title removes a later {t:} that readMeta left hidden', async () => {
    const src = '{title:}\n{t:Second}\n[C]song\n'
    const w = dialog(src)
    expect((w.get('[data-meta-title]').element as HTMLInputElement).value).toBe('')
    await w.get('[data-meta-title]').setValue('')
    await w.get('[data-meta-apply]').trigger('click')
    const next = w.emitted('apply')?.at(-1)?.[0] as string
    expect(parse(next).meta.title ?? '').toBe('')
    expect(parse(next).meta.title).not.toBe('Second')
    expect(next).not.toContain('Second')
    expect(next).toContain('[C]song')
  })

  it('clearing the open chart title removes its later {t:} and keeps the sibling', async () => {
    const src = [
      '{start_of_x_chart:completa}',
      '{title:First}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{title:}',
      '{t:Second}',
      '{x_chart_default:oferta}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    const w = dialog(src)
    await w.get('[data-meta-title]').setValue('')
    await w.get('[data-meta-apply]').trigger('click')
    const next = w.emitted('apply')?.at(-1)?.[0] as string
    expect(parse(next).meta.title ?? '').toBe('')
    expect(parse(next, { chartId: 'completa' }).meta.title).toBe('First')
    expect(next).not.toContain('Second')
    expect(next).toContain('[G]completa')
    expect(next).toContain('[C]oferta')
    expect(next).toContain('{x_chart_default:oferta}')
    expect(next.slice(0, next.indexOf('{start_of_x_chart')).trim()).toBe('')
  })

  it('a tempo save does not mark the same duration changed or reprint the sound header', async () => {
    const src = [
      '{start_of_x_chart:completa}',
      '{t:Completa}',
      '{composer:Um}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{t:Oferta}',
      '{composer:Dois}',
      '{x_chart_default:oferta}',
      '{key:C}',
      '{duration:4:26}',
      '{tempo:80}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    const w = dialog(src)
    expect((w.get('[data-meta-duration]').element as HTMLInputElement).value).toBe('4:26')
    await w.get('[data-meta-tempo]').setValue('100')
    await w.get('[data-meta-apply]').trigger('click')
    const next = w.emitted('apply')?.at(-1)?.[0] as string
    const before = splitCho(src).charts.find((c) => c.id === 'oferta')?.inner
    const after = splitCho(next).charts.find((c) => c.id === 'oferta')?.inner
    expect(after).toBe(before?.replace('{tempo:80}', '{tempo:100}'))
    expect(next).toContain('{duration:4:26}')
    expect(next).not.toContain('{duration:04:26}')
    expect(next).toContain('{t:Oferta}')
    expect(next).toContain('{composer:Dois}')
    expect(next).not.toContain('{title:')
    expect(next).not.toContain('{artist:')
    expect(splitCho(next).charts.find((c) => c.id === 'completa')?.inner).toBe(
      splitCho(src).charts.find((c) => c.id === 'completa')?.inner,
    )
  })

  it('applying 04:26 replaces a stored 4m26s the mask would hide', async () => {
    const src = [
      '{start_of_x_chart:completa}',
      '{title:Completa}',
      '{duration:4m26s}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{title:Oferta}',
      '{x_chart_default:oferta}',
      '{duration:4m26s}',
      '{tempo:80}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    const w = dialog(src)
    await w.get('[data-meta-duration]').setValue('04:26')
    await w.get('[data-meta-apply]').trigger('click')
    const next = w.emitted('apply')?.at(-1)?.[0] as string
    const oferta = splitCho(next).charts.find((c) => c.id === 'oferta')?.inner ?? ''
    const completa = splitCho(next).charts.find((c) => c.id === 'completa')?.inner ?? ''
    expect(oferta).toContain('{duration:04:26}')
    expect(oferta).not.toContain('4m26s')
    expect(completa).toContain('{duration:4m26s}')
  })

  it('applying 04:26 replaces a duration stored as 426 seconds', async () => {
    const src = [
      '{start_of_x_chart:completa}',
      '{title:Completa}',
      '{duration:426}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{title:Oferta}',
      '{x_chart_default:oferta}',
      '{duration:426}',
      '{tempo:80}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    const w = dialog(src)
    expect((w.get('[data-meta-duration]').element as HTMLInputElement).value).toBe('426')
    await w.get('[data-meta-duration]').setValue('04:26')
    await w.get('[data-meta-apply]').trigger('click')
    const next = w.emitted('apply')?.at(-1)?.[0] as string
    const oferta = splitCho(next).charts.find((c) => c.id === 'oferta')?.inner ?? ''
    const completa = splitCho(next).charts.find((c) => c.id === 'completa')?.inner ?? ''
    expect(oferta).toContain('{duration:04:26}')
    expect(oferta).not.toContain('{duration:426}')
    expect(completa).toContain('{duration:426}')
    expect(parse(next).meta.duration).toBe('04:26')
  })

  it('a tempo save does not rewrite 426 seconds into 04:26', async () => {
    const src = [
      '{start_of_x_chart:completa}',
      '{title:Completa}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{title:Oferta}',
      '{x_chart_default:oferta}',
      '{duration:426}',
      '{tempo:80}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    const w = dialog(src)
    await w.get('[data-meta-tempo]').setValue('100')
    await w.get('[data-meta-apply]').trigger('click')
    const next = w.emitted('apply')?.at(-1)?.[0] as string
    expect(next).toContain('{duration:426}')
    expect(next).not.toContain('{duration:04:26}')
    expect(next).toContain('{tempo:100}')
    expect(splitCho(next).charts.find((c) => c.id === 'completa')?.inner).toContain('[G]completa')
  })

  it('tabbing through duration keeps 426 and 1:04:26', async () => {
    const src = [
      '{start_of_x_chart:completa}',
      '{title:Completa}',
      '{duration:426}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{title:Oferta}',
      '{x_chart_default:oferta}',
      '{duration:426}',
      '{tempo:80}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    const w = dialog(src)
    const duration = w.get('[data-meta-duration]')
    expect((duration.element as HTMLInputElement).value).toBe('426')
    await duration.trigger('blur')
    expect((duration.element as HTMLInputElement).value).toBe('426')
    await w.get('[data-meta-apply]').trigger('click')
    const next = w.emitted('apply')?.at(-1)?.[0] as string
    expect(next).toContain('{duration:426}')
    expect(next).not.toContain('{duration:04:26}')
    expect(splitCho(next).charts.find((c) => c.id === 'completa')?.inner).toContain('{duration:426}')

    const hour = src.replaceAll('{duration:426}', '{duration:1:04:26}')
    const w2 = dialog(hour)
    const duration2 = w2.get('[data-meta-duration]')
    expect((duration2.element as HTMLInputElement).value).toBe('1:04:26')
    await duration2.trigger('blur')
    expect((duration2.element as HTMLInputElement).value).toBe('1:04:26')
    await w2.get('[data-meta-apply]').trigger('click')
    const next2 = w2.emitted('apply')?.at(-1)?.[0] as string
    expect(next2).toContain('{duration:1:04:26}')
    expect(next2).not.toContain('{duration:10:42}')
    expect(next2).not.toContain('{duration:04:26}')
  })

  it('a tempo save does not clear a later short title the field did not edit', async () => {
    const src = '{title:}\n{t:Second}\n{tempo:80}\n[C]song\n'
    const w = dialog(src)
    await w.get('[data-meta-tempo]').setValue('100')
    await w.get('[data-meta-apply]').trigger('click')
    const next = w.emitted('apply')?.at(-1)?.[0] as string
    expect(parse(next).meta.title).toBe('Second')
    expect(next).toContain('{t:Second}')
    expect(next).toContain('{tempo:100}')
    expect(next).toContain('[C]song')
  })
})

describe('rewrite of a registered mismatch', () => {
  it('rewrites from the tom pill and drops the fake capo', async () => {
    localStorage.setItem('cpv:fitSeen', '1')
    const w = viewer({ source: loadFixture('sda/082-o-rei-vem-vindo.cho') })
    await flushPromises()
    expect(w.find('[data-rewrite-go]').exists()).toBe(true)
    await w.get('[data-rewrite-go]').trigger('click')
    await flushPromises()
    expect(w.get('[data-display-key]').text()).toBe('G')
    expect(w.get('[data-tone-shift]').text()).toBe('Ab · − ½ tom')
    w.unmount()
  })
})

describe('edit chrome · dedicated metadata door', () => {
  it('offers the metadata button in both edits', async () => {
    const content = viewer({ modes: 'content' })
    await enterContent(content)
    expect(content.find('[data-meta-open]').exists()).toBe(true)
    expect(content.find('[data-meta-locked]').exists()).toBe(false)

    const local = viewer({ modes: 'local', songId: 'uma' })
    await local.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(local.find('[data-meta-open]').exists()).toBe(true)
    expect(local.find('[data-meta-locked]').exists()).toBe(false)
  })

  it('opens the dialog and applies duration into the working source', async () => {
    const w = viewer({
      source: '{title: Uma}\n{key: G}\n{tempo: 90}\n{time: 4/4}\n\n[G]letra\n',
    })
    await enterContent(w)
    await w.get('[data-meta-open]').trigger('click')
    await flushPromises()
    expect(w.find('[data-meta-dialog]').exists()).toBe(true)
    await w.get('[data-meta-duration]').setValue('04:26')
    await w.get('[data-meta-apply]').trigger('click')
    await flushPromises()
    expect(w.find('[data-meta-dialog]').exists()).toBe(false)
    expect((w.vm as { getSource: () => string }).getSource()).toMatch(/\{duration:04:26\}/)
    expect(w.emitted('dirty')?.at(-1)?.[0]).toBe(true)
  })

  it('local edit applies meta into the personal overlay without emitting update:source', async () => {
    const storage = memoryStore()
    const w = viewer({
      modes: 'local',
      songId: 'uma',
      storage,
      source: '{title: Uma}\n{key: G}\n{tempo: 90}\n{time: 4/4}\n\n[G]letra\n',
    })
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    const before = w.emitted('update:source')?.length ?? 0
    await w.get('[data-meta-open]').trigger('click')
    await flushPromises()
    await w.get('[data-meta-duration]').setValue('04:26')
    await w.get('[data-meta-apply]').trigger('click')
    await flushPromises()
    expect((w.vm as { getSource: () => string }).getSource()).toMatch(/\{duration:04:26\}/)
    expect(w.emitted('update:source')?.length ?? 0).toBe(before)
    expect(storage.get('cpv:my:uma')).toBeTruthy()
  })

  it('flags a missing duration on the dedicated button', async () => {
    const w = viewer({
      source: '{title: Uma}\n{key: G}\n{tempo: 90}\n{time: 4/4}\n\n[G]letra\n',
    })
    await enterContent(w)
    const btn = w.get('[data-meta-open]')
    expect(btn.attributes('title')).toMatch(/duração/i)
  })
})

describe('MetaDialog · Completar com Cifra Club', () => {
  it('says fetch is unavailable without fetchChart', () => {
    const w = dialog(SDA)
    expect(w.text()).toContain('Completar com Cifra Club')
    expect(w.find('[data-meta-enrich-unavailable]').exists()).toBe(true)
    expect(w.find('[data-meta-enrich-url]').exists()).toBe(false)
  })

  it('asks for YouTube, then applies meta without replacing the body', async () => {
    const fetchChart = vi.fn(async () => TU_ES)
    const url = 'https://www.cifraclub.com.br/florianopolis-house-of-prayer/tu-es-aguas-purificadoras/'
    const w = mount(MetaDialog, {
      props: { compact: false, source: SDA, fetchChart },
      attachTo: document.body,
    })
    mounted.push(w)

    await w.get('[data-meta-enrich-url]').setValue(url)
    await w.get('[data-meta-enrich-fetch]').trigger('click')
    await flushPromises()

    expect(fetchChart).toHaveBeenCalledWith(url)
    expect(w.find('[data-meta-enrich-youtube]').exists()).toBe(true)
    expect(w.get('[data-meta-enrich-yt-title]').text()).toMatch(/Tua Vontade/i)
    expect(w.get('[data-meta-enrich-yt-remote-link]').attributes('href')).toContain('YXnQ02HYB1w')
    expect(w.find('iframe').exists()).toBe(true)

    await w.get('[data-meta-enrich-yt-pick-remote]').trigger('click')
    await w.get('[data-meta-enrich-apply]').trigger('click')
    await flushPromises()

    const next = w.emitted('apply')?.at(-1)?.[0] as string
    expect(chartBody(next)).toBe(chartBody(SDA))
    expect(next).not.toContain('[Bm7]')
    expect(next).toMatch(/\{x_youtube:YXnQ02HYB1w\}/)
    // keep-local: SDA already has x_strum — enrich must not overwrite batida
    expect(next).toMatch(/\{x_strum:[^}]*bpm=75/)
    expect(next).not.toMatch(/\{x_strum:[^}]*bpm=71/)
    expect(next).toContain(`{x_source:${url}}`)
    expect(next).toMatch(/\{tempo:75\}/)
  })

  it('refuses a non-Cifra-Club URL before fetching', async () => {
    const fetchChart = vi.fn(async () => TU_ES)
    const w = mount(MetaDialog, {
      props: { compact: false, source: SDA, fetchChart },
      attachTo: document.body,
    })
    mounted.push(w)
    await w.get('[data-meta-enrich-url]').setValue('https://example.com/x')
    await w.get('[data-meta-enrich-fetch]').trigger('click')
    await flushPromises()
    expect(fetchChart).not.toHaveBeenCalled()
    expect(w.text()).toMatch(/Só cifraclub/i)
  })

  it('warns when the Cifra Club page has no batida', async () => {
    const fetchChart = vi.fn(async () => TUA_CC_NO_STRUM)
    const w = mount(MetaDialog, {
      props: { compact: false, source: SDA, fetchChart },
      attachTo: document.body,
    })
    mounted.push(w)
    await w.get('[data-meta-enrich-url]').setValue('https://www.cifraclub.com.br/adoradores/tua-vontade/')
    await w.get('[data-meta-enrich-fetch]').trigger('click')
    await flushPromises()
    expect(w.find('[data-meta-enrich-no-strum]').exists()).toBe(true)
    expect(w.text()).toMatch(/não traz batida/i)
    expect(w.find('[data-meta-enrich-strum-conflict]').exists()).toBe(false)
  })

  it('surfaces Manter / Trazer CC when local batida conflicts with CC', async () => {
    const fetchChart = vi.fn(async () => TU_ES)
    const url = 'https://www.cifraclub.com.br/florianopolis-house-of-prayer/tu-es-aguas-purificadoras/'
    const w = mount(MetaDialog, {
      props: { compact: false, source: SDA, fetchChart },
      attachTo: document.body,
    })
    mounted.push(w)

    await w.get('[data-meta-enrich-url]').setValue(url)
    await w.get('[data-meta-enrich-fetch]').trigger('click')
    await flushPromises()

    expect(w.find('[data-meta-enrich-strum-conflict]').exists()).toBe(true)
    expect(w.text()).toMatch(/batida local/i)
    expect(w.find('[data-meta-enrich-strum-keep]').exists()).toBe(true)
    expect(w.find('[data-meta-enrich-strum-replace]').exists()).toBe(true)
    expect(w.text()).toMatch(/Manter/i)
    expect(w.text()).toMatch(/Trazer CC/i)
  })

  it('Manter (default) keeps local batida on Trazer metadados', async () => {
    const fetchChart = vi.fn(async () => TU_ES)
    const url = 'https://www.cifraclub.com.br/florianopolis-house-of-prayer/tu-es-aguas-purificadoras/'
    const w = mount(MetaDialog, {
      props: { compact: false, source: SDA, fetchChart },
      attachTo: document.body,
    })
    mounted.push(w)

    await w.get('[data-meta-enrich-url]').setValue(url)
    await w.get('[data-meta-enrich-fetch]').trigger('click')
    await flushPromises()
    await w.get('[data-meta-enrich-yt-pick-remote]').trigger('click')
    // Manter is the default — do not click Trazer CC
    await w.get('[data-meta-enrich-apply]').trigger('click')
    await flushPromises()

    const next = w.emitted('apply')?.at(-1)?.[0] as string
    expect(next).toMatch(/\{x_strum:[^}]*bpm=75/)
    expect(next).not.toMatch(/\{x_strum:[^}]*bpm=71/)
  })

  it('Trazer CC replaces local single batida with CC pattern', async () => {
    const fetchChart = vi.fn(async () => TU_ES)
    const url = 'https://www.cifraclub.com.br/florianopolis-house-of-prayer/tu-es-aguas-purificadoras/'
    const w = mount(MetaDialog, {
      props: { compact: false, source: SDA, fetchChart },
      attachTo: document.body,
    })
    mounted.push(w)

    await w.get('[data-meta-enrich-url]').setValue(url)
    await w.get('[data-meta-enrich-fetch]').trigger('click')
    await flushPromises()
    await w.get('[data-meta-enrich-yt-pick-remote]').trigger('click')
    await w.get('[data-meta-enrich-strum-replace]').trigger('click')
    await w.get('[data-meta-enrich-apply]').trigger('click')
    await flushPromises()

    const next = w.emitted('apply')?.at(-1)?.[0] as string
    expect(next).toMatch(/\{x_strum:[^}]*bpm=71/)
    expect(next).not.toMatch(/\{x_strum:[^}]*bpm=75/)
  })

  it('Trazer CC with multi CC keeps previous local active as named copy', async () => {
    const fetchChart = vi.fn(async () => CEU_AZUL)
    const local = `{title:X}\n{x_strum:bpm=40;meter=4/4;grid=4;label=Old;pat=DUDU}\n{x_origem:https://example.com}\n[G]a\n`
    const w = mount(MetaDialog, {
      props: {
        compact: false,
        source: local,
        fetchChart,
      },
      attachTo: document.body,
    })
    mounted.push(w)

    await w.get('[data-meta-enrich-url]').setValue('https://www.cifraclub.com.br/charlie-brown-jr/ceu-azul/')
    await w.get('[data-meta-enrich-fetch]').trigger('click')
    await flushPromises()
    // CEU_AZUL has youtube — pick or skip
    if (w.find('[data-meta-enrich-yt-skip]').exists()) {
      await w.get('[data-meta-enrich-yt-skip]').trigger('click')
    }
    expect(w.find('[data-meta-enrich-strum-conflict]').exists()).toBe(true)
    await w.get('[data-meta-enrich-strum-replace]').trigger('click')
    await w.get('[data-meta-enrich-apply]').trigger('click')
    await flushPromises()

    const next = w.emitted('apply')?.at(-1)?.[0] as string
    expect(next).toMatch(/x_strum_set:/)
    expect(next).toMatch(/Parte 1/)
    expect(next).toMatch(/Parte 2/)
    expect(next).toMatch(/Old/i)
    expect(next).toMatch(/local/i)
    expect(next).toMatch(/bpm=40/)
  })
})

describe('MetaDialog · Começar de novo', () => {
  it('offers a restart door next to Completar com Cifra Club', () => {
    const w = dialog(SDA)
    expect(w.find('[data-meta-restart]').exists()).toBe(true)
    expect(w.text()).toMatch(/Começar de novo/i)
    expect(w.find('[data-meta-restart-confirm]').exists()).toBe(false)
  })

  it('hides Começar de novo outside content edit (Só para mim)', () => {
    const w = dialog(SDA, { allowRestart: false })
    expect(w.find('[data-meta-restart]').exists()).toBe(false)
    expect(w.find('[data-meta-restart-box]').exists()).toBe(false)
  })

  it('is absent in local edit on the viewer', async () => {
    localStorage.setItem('cpv:fitSeen', '1')
    const w = viewer({ source: SDA, modes: 'local', songId: 'tua' })
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-meta-open]').trigger('click')
    await flushPromises()
    expect(w.find('[data-meta-dialog]').exists()).toBe(true)
    expect(w.find('[data-meta-restart]').exists()).toBe(false)
  })

  it('does not emit restart on the first click — only after explicit confirm', async () => {
    const w = dialog(SDA)
    await w.get('[data-meta-restart]').trigger('click')
    expect(w.emitted('restart')).toBeUndefined()
    expect(w.find('[data-meta-restart-confirm]').exists()).toBe(true)
    expect(w.text()).toMatch(/apaga|substitui|Nova cifra/i)

    await w.get('[data-meta-restart-cancel]').trigger('click')
    expect(w.find('[data-meta-restart-confirm]').exists()).toBe(false)
    expect(w.emitted('restart')).toBeUndefined()

    await w.get('[data-meta-restart]').trigger('click')
    await w.get('[data-meta-restart-confirm]').trigger('click')
    expect(w.emitted('restart')).toHaveLength(1)
  })

  it('opens Nova cifra from a populated chart only after confirm, and cancel keeps the body', async () => {
    localStorage.setItem('cpv:fitSeen', '1')
    const w = viewer({ source: SDA, fetchChart: vi.fn(async () => TU_ES) })
    await enterContent(w)
    await w.get('[data-meta-open]').trigger('click')
    await flushPromises()

    await w.get('[data-meta-restart]').trigger('click')
    expect(w.find('[data-new-chart]').exists()).toBe(false)

    await w.get('[data-meta-restart-confirm]').trigger('click')
    await flushPromises()
    expect(w.find('[data-meta-dialog]').exists()).toBe(false)
    expect(w.find('[data-new-chart]').exists()).toBe(true)
    expect(w.find('[data-nova-blank]').exists()).toBe(true)
    expect(w.text()).toMatch(/Cifra Club/i)
    // Current chart is not wiped until Nova commits — cancel keeps it
    expect(w.text()).toMatch(/Norte ou Sul|Tua Vontade/i)

    await w.get('[data-new-chart] button[aria-label="Fechar"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-new-chart]').exists()).toBe(false)
    expect(w.text()).toContain('Tua Vontade')
    expect(w.text()).toMatch(/Norte ou Sul/i)
  })
})
