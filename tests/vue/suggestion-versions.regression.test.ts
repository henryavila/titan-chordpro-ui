/**
 * Regression gate: suggestions follow one chart through every file shape.
 * Single chart, one chart that grows versions, review on another version,
 * editor, and the collapse back to one chart.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addChart, deleteChart, parse, renameChart } from '../../src/core'
import { ChordproViewer } from '../../src/vue'

const TWO = `{start_of_x_chart:completa}
{title:Uma}
{x_chart_label:Completa}
{key:G}
[G]corpo da completa
{end_of_x_chart}

{start_of_x_chart:oferta}
{title:Uma}
{x_chart_label:Oferta}
{x_chart_default:oferta}
{key:C}
[C]corpo da oferta
{end_of_x_chart}
`

const ONE = `{title:Uma}
[C]corpo único
`

const mounted: ReturnType<typeof mount>[] = []

beforeEach(() => localStorage.clear())
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  localStorage.clear()
})

function mountViewer(props: Record<string, unknown> = {}) {
  const w = mount(ChordproViewer, {
    props: { source: TWO, theme: 'dark', autoHide: false, songId: 'uma', ...props },
    attachTo: document.body,
  })
  mounted.push(w)
  return w
}

function lyricOp(doc: string, from: string, to: string) {
  const at = doc.split('\n').findIndex((line) => line.includes(from))
  return {
    id: `op-${from}`,
    type: 'replace' as const,
    at,
    anchor: '',
    anchorHash: '0',
    before: [doc.split('\n')[at]],
    after: [doc.split('\n')[at]!.replace(from, to)],
    ctx: { transpose: 0, capo: 0 },
  }
}

function seed(list: unknown[]) {
  localStorage.setItem('cpv:sug', JSON.stringify(list))
}

function sug(partial: Record<string, unknown>) {
  return {
    id: 's-1',
    songId: 'uma',
    title: 'Uma',
    at: 1,
    baseVersion: 'v1',
    status: 'pending',
    actorName: 'Ana',
    resolvedOps: [],
    ...partial,
  }
}

async function editPlain(w: ReturnType<typeof mountViewer>, from: string, to: string) {
  await w.get('[data-edit]').trigger('click')
  await flushPromises()
  const row = w.findAll('[data-row]').find((r) => r.text().includes(from))
  expect(row, from).toBeTruthy()
  await row!.trigger('click')
  await flushPromises()
  const input = w.get('input[aria-label="Letra desta linha"]')
  await input.setValue(to)
  await input.trigger('blur')
  await flushPromises()
  await w.get('[data-read]').trigger('click')
  await flushPromises()
}

async function send(w: ReturnType<typeof mountViewer>) {
  await w.get('[data-open-my]').trigger('click')
  await flushPromises()
  await w.get('[data-suggest-name]').setValue('Ana Souza')
  await flushPromises()
  await w.get('[data-suggest]').trigger('click')
  await flushPromises()
  await w.get('[data-suggest]').trigger('click')
  await flushPromises()
}

async function openReview(w: ReturnType<typeof mountViewer>, rowText: string) {
  await w.get('[data-queue-chip]').trigger('click')
  await flushPromises()
  const row = w.findAll('[data-q-song]').find((s) => s.text().includes(rowText))
  expect(row, rowText).toBeTruthy()
  await row!.trigger('click')
  await flushPromises()
  await w.get('[data-q-sug]').trigger('click')
  await flushPromises()
}

describe('suggestion versions regression', () => {
  it('sends a one-chart file as default and reviews that chart', async () => {
    const local = mountViewer({ source: ONE, editMode: 'local' })
    await flushPromises()
    expect(local.find('[data-chart-switch]').exists()).toBe(false)
    await editPlain(local, 'corpo único', 'corpo único (meu)')
    await send(local)
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    expect(local.find('[data-my-sug-chart]').exists()).toBe(false)

    const created = JSON.parse(localStorage.getItem('cpv:sug') ?? '[]').at(-1)
    expect(created.chartId).toBe('default')
    expect(JSON.stringify(created.ops)).not.toContain('start_of_x_chart')

    const admin = mountViewer({ source: ONE, editMode: 'persisted' })
    await flushPromises()
    const before = admin.emitted('update:chartId')?.length ?? 0
    await admin.get('[data-queue-chip]').trigger('click')
    await flushPromises()
    expect(admin.get('[data-q-song]').text()).not.toMatch(/· Padrão|· default/)
    await admin.get('[data-q-song]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-sug]').trigger('click')
    await flushPromises()
    expect(admin.find('[data-q-version]').exists()).toBe(false)
    expect(admin.get('[data-q-chart]').text()).toContain('corpo único (meu)')
    expect(admin.get('[data-review-op]').exists()).toBe(true)
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    const saved = String(admin.emitted('save-content')?.at(-1)?.[0] ?? '')
    expect(saved).toContain('corpo único (meu)')
    expect(saved).not.toMatch(/start_of_x_chart/)
    expect(admin.emitted('update:chartId')?.length ?? 0).toBe(before)
    await admin.get('[data-q-close]').trigger('click')
    await flushPromises()
    expect(admin.emitted('update:chartId')?.length ?? 0).toBe(before)
  })

  it('sends the version the program opened and reviews it while another is on screen', async () => {
    const w = mountViewer({ chartId: 'completa', editMode: 'local' })
    await flushPromises()
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    await editPlain(w, 'corpo da completa', 'corpo da completa (meu)')
    await send(w)
    await w.get('[data-open-my]').trigger('click')
    await flushPromises()
    expect(w.get('[data-my-sug-chart]').text()).toBe('Completa')

    const created = JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')[0]
    const doc = parse(TWO, { chartId: 'completa' }).source
    const op = created.ops.find((item: { before?: string[] }) =>
      item.before?.some((line) => line.includes('corpo da completa')),
    )
    expect(created.chartId).toBe('completa')
    expect(op.at).toBe(doc.split('\n').findIndex((line) => line.includes('corpo da completa')))
    expect(JSON.stringify(created.ops)).not.toContain('corpo da oferta')

    const admin = mountViewer({ source: TWO, songId: 'uma', editMode: 'persisted' })
    await flushPromises()
    expect(admin.get('[data-cpv-scroll]').text()).toContain('corpo da oferta')
    await openReview(admin, 'Uma · Completa')
    expect(admin.get('[data-q-version]').text()).toBe('Completa')
    const chart = admin.get('[data-q-chart]').text()
    expect(chart).toContain('corpo da completa (meu)')
    expect(chart).not.toContain('corpo da oferta')
    expect(admin.get('[data-cpv-scroll]').text()).toContain('corpo da oferta')

    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    const saved = String(admin.emitted('save-content')?.at(-1)?.[0] ?? '')
    expect(parse(saved, { chartId: 'completa' }).source).toContain('corpo da completa (meu)')
    expect(parse(saved, { chartId: 'oferta' }).source).toContain('corpo da oferta')
    expect(parse(saved, { chartId: 'oferta' }).source).not.toContain('(meu)')
    expect(admin.get('[data-cpv-scroll]').text()).toContain('corpo da oferta')
    expect(admin.get('[data-cpv-scroll]').text()).not.toContain('(meu)')
  })

  it('keeps a one-chart suggestion on Padrão after the file grows a second version', async () => {
    const plain = parse(ONE).source
    const wrapped = addChart(ONE, 'default', { id: 'oferta', label: 'Oferta' })
    const copy = wrapped.replace('{start_of_x_chart:oferta}', '{start_of_x_chart:oferta}\n[C]só na cópia')
    seed([
      sug({
        chartId: 'default',
        ops: [lyricOp(plain, 'corpo único', 'corpo único (ok)')],
      }),
    ])
    const admin = mountViewer({ source: copy, editMode: 'persisted' })
    await flushPromises()
    await openReview(admin, 'Uma · Padrão')
    const chart = admin.get('[data-q-chart]').text()
    expect(chart).toContain('corpo único (ok)')
    expect(chart).not.toContain('só na cópia')
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    const saved = String(admin.emitted('save-content')?.at(-1)?.[0] ?? '')
    expect(parse(saved, { chartId: 'default' }).source).toContain('corpo único (ok)')
    expect(parse(saved, { chartId: 'oferta' }).source).toContain('só na cópia')
    expect(parse(saved, { chartId: 'oferta' }).source).not.toContain('(ok)')
  })

  it('reads a suggestion written before chart ids as the default block', async () => {
    const plain = parse(ONE).source
    const wrapped = addChart(ONE, 'default', { id: 'oferta', label: 'Oferta' })
    seed([
      sug({
        ops: [lyricOp(plain, 'corpo único', 'corpo único (antigo)')],
      }),
    ])
    const admin = mountViewer({ source: wrapped, editMode: 'persisted' })
    await flushPromises()
    await openReview(admin, 'Uma · Padrão')
    expect(admin.get('[data-q-chart]').text()).toContain('corpo único (antigo)')
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    const saved = String(admin.emitted('save-content')?.at(-1)?.[0] ?? '')
    expect(parse(saved, { chartId: 'default' }).source).toContain('(antigo)')
    expect(parse(saved, { chartId: 'oferta' }).source).not.toContain('(antigo)')
  })

  it('does not apply a pre-version suggestion onto charts that were never default', async () => {
    const one = parse(ONE).source
    seed([
      sug({
        ops: [lyricOp(one, 'corpo único', 'corpo único (meu)')],
      }),
    ])
    const admin = mountViewer({ source: TWO, editMode: 'persisted' })
    await flushPromises()
    await openReview(admin, 'Uma')
    expect(admin.get('[data-q-missing]').text()).toMatch(/não existe mais/i)
    expect(admin.get('[data-q-chart]').text()).not.toContain('corpo da oferta')
    expect(admin.find('[data-q-accept]').exists()).toBe(false)
    expect(admin.emitted('save-content')).toBeUndefined()
  })

  it('follows a rename and still accepts into the same chart id', async () => {
    const oferta = parse(TWO, { chartId: 'oferta' }).source
    const renamed = renameChart(TWO, 'oferta', 'Oferta curta')
    seed([
      sug({
        chartId: 'oferta',
        ops: [lyricOp(oferta, 'corpo da oferta', 'corpo da oferta (ok)')],
      }),
    ])
    const admin = mountViewer({ source: renamed, editMode: 'persisted' })
    await flushPromises()
    await openReview(admin, 'Uma · Oferta curta')
    expect(admin.get('[data-q-version]').text()).toBe('Oferta curta')
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    const saved = String(admin.emitted('save-content')?.at(-1)?.[0] ?? '')
    expect(parse(saved, { chartId: 'oferta' }).source).toContain('(ok)')
    expect(saved).toContain('{start_of_x_chart:oferta}')
    expect(saved).toContain('{x_chart_label:Oferta curta}')
  })

  it('accepts the survivor after the file collapses and refuses the deleted version', async () => {
    const completa = parse(TWO, { chartId: 'completa' }).source
    const oferta = parse(TWO, { chartId: 'oferta' }).source
    const collapsed = deleteChart(TWO, 'oferta')
    seed([
      sug({
        id: 's-keep',
        chartId: 'completa',
        ops: [lyricOp(completa, 'corpo da completa', 'corpo da completa (ok)')],
      }),
      sug({
        id: 's-gone',
        at: 2,
        chartId: 'oferta',
        ops: [lyricOp(oferta, 'corpo da oferta', 'corpo da oferta (ok)')],
      }),
    ])
    const admin = mountViewer({ source: collapsed, editMode: 'persisted' })
    await flushPromises()
    expect(admin.find('[data-chart-switch]').exists()).toBe(false)
    await openReview(admin, 'Uma')
    expect(admin.find('[data-q-version]').exists()).toBe(false)
    expect(admin.get('[data-q-chart]').text()).toContain('corpo da completa (ok)')
    expect(admin.get('[data-q-chart]').text()).not.toContain('corpo da oferta')
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    const saved = String(admin.emitted('save-content')?.at(-1)?.[0] ?? '')
    expect(saved).toContain('corpo da completa (ok)')
    expect(saved).toContain('{x_chart_id:completa}')
    expect(saved).not.toMatch(/start_of_x_chart/)

    await admin.get('[data-q-back]').trigger('click')
    await flushPromises()
    const gone = admin.findAll('[data-q-song]').find((s) => s.text().includes('oferta'))
    expect(gone).toBeTruthy()
    await gone!.trigger('click')
    await flushPromises()
    await admin.get('[data-q-sug]').trigger('click')
    await flushPromises()
    expect(admin.get('[data-q-missing]').text()).toMatch(/não existe mais/i)
    expect(admin.find('[data-q-accept]').exists()).toBe(false)
    const saves = admin.emitted('save-content')?.length ?? 0
    await admin.get('[data-q-refuse]').trigger('click')
    await flushPromises()
    expect(admin.emitted('save-content')?.length ?? 0).toBe(saves)
  })

  it('draws a deleted line struck and drops it only when accepted', async () => {
    const oferta = parse(TWO, { chartId: 'oferta' }).source
    const at = oferta.split('\n').findIndex((line) => line.includes('corpo da oferta'))
    seed([
      sug({
        chartId: 'oferta',
        ops: [
          {
            id: 'op-del',
            type: 'delete',
            at,
            anchor: '',
            anchorHash: '0',
            before: ['[C]corpo da oferta'],
            after: [],
            ctx: { transpose: 0, capo: 0 },
          },
        ],
      }),
    ])
    const admin = mountViewer({ editMode: 'persisted' })
    await flushPromises()
    await openReview(admin, 'Uma · Oferta')
    const struck = admin.get('[data-review-struck]')
    expect(struck.text()).toContain('corpo da oferta')
    expect(admin.get('[data-q-chart]').text()).not.toContain('corpo da completa')
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    const saved = String(admin.emitted('save-content')?.at(-1)?.[0] ?? '')
    expect(parse(saved, { chartId: 'oferta' }).source).not.toContain('corpo da oferta')
    expect(parse(saved, { chartId: 'completa' }).source).toContain('corpo da completa')
  })

  it('shows a tune chip and does not paint an op that no longer matches', async () => {
    seed([
      sug({
        chartId: 'oferta',
        ops: [
          {
            id: 'op-miss',
            type: 'replace',
            at: 0,
            anchor: '',
            anchorHash: '0',
            before: ['[C]linha que sumiu'],
            after: ['[C]nada'],
            ctx: { transpose: 0, capo: 0 },
          },
          {
            id: 'tune',
            type: 'tune',
            transpose: 2,
            capo: 3,
            dual: false,
            ctx: { transpose: 2, capo: 3 },
          },
        ],
      }),
    ])
    const admin = mountViewer({ editMode: 'persisted' })
    await flushPromises()
    await openReview(admin, 'Uma · Oferta')
    expect(admin.get('[data-q-tune]').text()).toBe('Tom +2 · capo 3')
    expect(admin.get('[data-q-chart]').text()).not.toContain('nada')
    expect(admin.get('[data-q-op]').text()).toMatch(/não encaixa/i)
    const accept = admin.findAll('[data-q-accept]')
    expect(accept[0]!.attributes('disabled')).toBeDefined()
    await accept[0]!.trigger('click')
    await flushPromises()
    expect(admin.emitted('save-content')).toBeUndefined()
  })

  it('waits for a dirty draft of the same version and still accepts the other', async () => {
    const oferta = parse(TWO, { chartId: 'oferta' }).source
    const completa = parse(TWO, { chartId: 'completa' }).source
    seed([
      sug({
        id: 's-oferta',
        chartId: 'oferta',
        ops: [lyricOp(oferta, 'corpo da oferta', 'corpo da oferta (ok)')],
      }),
      sug({
        id: 's-completa',
        at: 2,
        chartId: 'completa',
        ops: [lyricOp(completa, 'corpo da completa', 'corpo da completa (ok)')],
      }),
    ])
    const admin = mountViewer({ editMode: 'persisted' })
    await flushPromises()
    await admin.get('[data-edit]').trigger('click')
    await flushPromises()
    const row = admin.findAll('[data-row]').find((r) => r.text().includes('corpo da oferta'))
    await row!.trigger('click')
    await flushPromises()
    const input = admin.get('input[aria-label="Letra desta linha"]')
    await input.setValue('rascunho da oferta')
    await input.trigger('blur')
    await flushPromises()
    await admin.get('[data-read]').trigger('click')
    await flushPromises()

    await openReview(admin, 'Uma · Oferta')
    expect(admin.get('[data-q-draft]').text()).toMatch(/rascunho desta versão não entra/i)
    expect(admin.get('[data-q-chart]').text()).toContain('corpo da oferta (ok)')
    expect(admin.get('[data-q-chart]').text()).not.toContain('rascunho da oferta')
    expect(admin.get('[data-q-accept]').attributes('disabled')).toBeDefined()
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    expect(admin.emitted('save-content')).toBeUndefined()

    await admin.get('[data-q-back]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-back]').trigger('click')
    await flushPromises()
    const other = admin.findAll('[data-q-song]').find((s) => s.text().includes('Completa'))
    await other!.trigger('click')
    await flushPromises()
    await admin.get('[data-q-sug]').trigger('click')
    await flushPromises()
    expect(admin.find('[data-q-draft]').exists()).toBe(false)
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    const saved = String(admin.emitted('save-content')?.at(-1)?.[0] ?? '')
    expect(parse(saved, { chartId: 'completa' }).source).toContain('corpo da completa (ok)')
    expect(parse(saved, { chartId: 'oferta' }).source).toContain('corpo da oferta')
    expect(parse(saved, { chartId: 'oferta' }).source).not.toContain('rascunho')
    expect(admin.get('[data-cpv-scroll]').text()).toContain('rascunho da oferta')
  })

  it('hides version creation while the edit is only for this phone', async () => {
    const alone = mountViewer({ source: ONE, editMode: 'local' })
    await flushPromises()
    await alone.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(alone.find('[data-chart-switch]').exists()).toBe(false)
    expect(alone.find('[data-chart-add]').exists()).toBe(false)

    const many = mountViewer({ editMode: 'local' })
    await flushPromises()
    await many.get('[data-edit]').trigger('click')
    await flushPromises()
    await many.get('[data-chart-switch]').trigger('click')
    await flushPromises()
    expect(many.find('[data-chart-option="completa"]').exists()).toBe(true)
    expect(many.find('[data-chart-add]').exists()).toBe(false)
  })
})
