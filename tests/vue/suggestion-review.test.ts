import { flushPromises, mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { diffOps, formatTitanStrum, parseTitanStrum, proposedScoreSources, readStrumPatterns, scoreReviewsFromOp, writeStrumPatterns, writeScoreReference } from '../../src/core/index'
import { TitanChordpro } from '../../src/vue/index'

vi.mock('../../src/vue/chart/ExternalScore.vue', () => ({ default: { props: ['text'], template: '<div data-score-rendered />' } }))

/**
 * Chart that already has a batida. A lyric typo must not look like a batida
 * suggestion, and accepting one item must leave the review open for the rest
 * once the host writes the saved chart back into `source`.
 */
const SRC = `{title:Teste}
{key:D}
{tempo:90}
{time:4/4}
{x_titan_strum:bpm=90;meter=4/4;grid=4;label=Leve;pat=D-DU}
{c:Verso}
[D]Camila canta
{c:Refrão}
[A]Hoje a noite
`

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
  observers.length = 0
  realRO = globalThis.ResizeObserver
  globalThis.ResizeObserver = TestRO as unknown as typeof ResizeObserver
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  globalThis.ResizeObserver = realRO
  localStorage.clear()
})

async function mountAt(props: Record<string, unknown>) {
  const w = mount(TitanChordpro, {
    props: { source: SRC, theme: 'dark', autoHide: false, songId: 'review-1', ...props },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width: 900, height: 800 } }]))
  await flushPromises()
  return w
}

async function editPlain(w: Awaited<ReturnType<typeof mountAt>>, from: string, to: string) {
  const li = SRC.split('\n').findIndex((l) => l.includes(from))
  await w.get(`[data-row="${li}"]`).trigger('click')
  await flushPromises()
  const input = w.get('input[aria-label="Letra desta linha"]')
  await input.setValue(to)
  await input.trigger('blur')
  await flushPromises()
}

async function sendSuggestion(w: Awaited<ReturnType<typeof mountAt>>, name: string) {
  await w.get('[data-read]').trigger('click')
  await flushPromises()
  await w.get('[data-open-my]').trigger('click')
  await flushPromises()
  await w.get('[data-suggest-name]').setValue(name)
  await flushPromises()
  await w.get('[data-suggest]').trigger('click')
  await flushPromises()
  await w.get('[data-suggest]').trigger('click')
  await flushPromises()
}

async function openRequest(w: Awaited<ReturnType<typeof mountAt>>, index = 0) {
  await w.get('[data-queue-chip]').trigger('click')
  await flushPromises()
  await w.get('[data-q-song]').trigger('click')
  await flushPromises()
  await w.findAll('[data-q-sug]')[index]!.trigger('click')
  await flushPromises()
}

/** What the demo does: `@save-content="source = $event"`. */
async function echoSavedChart(w: Awaited<ReturnType<typeof mountAt>>) {
  const saved = String(w.emitted('save-content')?.at(-1)?.[0] ?? '')
  expect(saved.length).toBeGreaterThan(0)
  await w.setProps({ source: saved })
  await flushPromises()
}

describe('suggestion review', () => {
  it('keeps every score file when adjacent excerpts change in one hunk', () => {
    const first = writeScoreReference({ src: 'a.gpx', track: 1, start: 1, end: 2 })
    const second = writeScoreReference({ src: 'b.musicxml', track: 1, start: 3, end: 4 })
    const ops = diffOps(`${first}\n${second}`, `${first.replace('end=2', 'end=3')}\n${second.replace('end=4', 'end=5')}`, { transpose: 0, capo: 0 })
    expect(proposedScoreSources(ops)).toEqual(['a.gpx', 'b.musicxml'])
    expect(ops.flatMap(scoreReviewsFromOp)).toHaveLength(2)
  })

  it('sends the original Guitar Pro file and reviews the excerpt as before/after', async () => {
    const bytes = new Uint8Array(readFileSync('fixtures/notation/notes.gp'))
    const score = writeScoreReference({ src: 'solos/notes.gp', track: 1, start: 1, end: 2, name: 'Solo de entrada' })
    localStorage.setItem('titan-chordpro:my:review-1', JSON.stringify({
      baseVersion: 'v1', at: 1,
      ops: diffOps(SRC, `${SRC}${score}\n`, { transpose: 0, capo: 0 }),
    }))
    const local = await mountAt({ editMode: 'local', actorKey: 'musico', loadBundleAsset: async () => ({ bytes }) })
    await local.get('[data-edit]').trigger('click')
    await flushPromises()
    await sendSuggestion(local, 'Ana Souza')
    const sent = JSON.parse(localStorage.getItem('titan-chordpro:sug') ?? '[]')
    expect(sent).toHaveLength(1)
    expect(sent[0].scoreAttachments).toHaveLength(1)
    expect(sent[0].scoreAttachments[0].src).toBe('solos/notes.gp')
    expect(Buffer.from(sent[0].scoreAttachments[0].base64, 'base64')).toEqual(Buffer.from(bytes))
    local.unmount()

    const admin = await mountAt({ editMode: 'persisted' })
    await openRequest(admin)
    expect(admin.get('[data-q-score-review]').text()).toMatch(/Solo de entrada.*notes\.gp.*faixa 1.*compassos 1–2/s)
    expect(admin.get('[data-q-score-file]').text()).toContain('notes.gp')
    expect(admin.get('[data-q-op]').text()).not.toContain('{x_titan_score:')
    admin.unmount()
  })

  it('stores the attached score for everyone before accepting its reference', async () => {
    const bytes = new Uint8Array(readFileSync('fixtures/notation/notes.gp'))
    const score = writeScoreReference({ src: 'private/notes.gp', track: 1, start: 1, end: 2, name: 'Solo' })
    const ops = diffOps(SRC, `${SRC}${score}\n`, { transpose: 0, capo: 0 })
    localStorage.setItem('titan-chordpro:sug', JSON.stringify([{
      id: 's-score', songId: 'review-1', title: 'Teste', at: 1, baseVersion: 'v1',
      ops, actorName: 'Ana Souza', scoreAttachments: [{ src: 'private/notes.gp', filename: 'notes.gp', base64: Buffer.from(bytes).toString('base64') }],
    }]))
    const uploaded: File[] = []
    const admin = await mountAt({ editMode: 'persisted', uploadScore: async (file: File) => {
      uploaded.push(file)
      return { ref: 'published/notes.gp' }
    } })
    await openRequest(admin)
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    expect(uploaded).toHaveLength(1)
    expect(uploaded[0]?.name).toBe('notes.gp')
    expect(admin.emitted('save-content')?.at(-1)?.[0]).toContain('src="published/notes.gp"')
    expect(JSON.parse(localStorage.getItem('titan-chordpro:sug') ?? '[]')[0].status).toBe('accepted')
    admin.unmount()
  })

  it('keeps the score suggestion pending when the reviewer cannot store the attached file', async () => {
    const score = writeScoreReference({ src: 'private/notes.gp', track: 1, start: 1 })
    localStorage.setItem('titan-chordpro:sug', JSON.stringify([{
      id: 's-score', songId: 'review-1', title: 'Teste', at: 1, baseVersion: 'v1',
      ops: diffOps(SRC, `${SRC}${score}\n`, { transpose: 0, capo: 0 }),
      scoreAttachments: [{ src: 'private/notes.gp', filename: 'notes.gp', base64: 'AA==' }],
    }]))
    const admin = await mountAt({ editMode: 'persisted' })
    await openRequest(admin)
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    expect(admin.emitted('save-content')).toBeUndefined()
    expect(admin.text()).toContain('precisa poder guardar o arquivo')
    expect(JSON.parse(localStorage.getItem('titan-chordpro:sug') ?? '[]')[0].status ?? 'pending').toBe('pending')
    admin.unmount()
  })

  it('does not send a score suggestion without the file bytes', async () => {
    const score = writeScoreReference({ src: 'private/missing.gpx', track: 1, start: 1 })
    localStorage.setItem('titan-chordpro:my:review-1', JSON.stringify({
      baseVersion: 'v1', at: 1,
      ops: diffOps(SRC, `${SRC}${score}\n`, { transpose: 0, capo: 0 }),
    }))
    const local = await mountAt({ editMode: 'local', loadBundleAsset: async () => { throw new Error('missing') } })
    await local.get('[data-edit]').trigger('click')
    await flushPromises()
    await sendSuggestion(local, 'Ana Souza')
    expect(localStorage.getItem('titan-chordpro:sug')).toBeNull()
    expect(local.emitted('suggestion-created')).toBeUndefined()
    expect(local.text()).toContain('Não foi possível anexar o arquivo do solo')
    local.unmount()
  })

  it('does not put the existing batida on a lyric-only suggestion', async () => {
    const local = await mountAt({ editMode: 'local', actorKey: 'musico' })
    await local.get('[data-edit]').trigger('click')
    await flushPromises()
    await editPlain(local, 'Camila canta', 'Camila')
    await sendSuggestion(local, 'Ana Souza')
    local.unmount()

    const admin = await mountAt({ editMode: 'persisted' })
    await openRequest(admin)
    const op = admin.get('[data-q-op]')
    expect(op.text()).toMatch(/Camila/)
    expect(op.text()).not.toMatch(/Batida/i)
    expect(admin.find('[data-q-strum]').exists()).toBe(false)
    expect(admin.find('[data-q-strum-preview]').exists()).toBe(false)
    admin.unmount()
  })

  it('stays on the review after accepting one adjustment when the host saves the chart', async () => {
    const local = await mountAt({ editMode: 'local', actorKey: 'musico' })
    await local.get('[data-edit]').trigger('click')
    await flushPromises()
    await editPlain(local, 'Camila canta', 'Camila')
    await editPlain(local, 'Hoje a noite', 'Hoje')
    await sendSuggestion(local, 'Ana Souza')
    local.unmount()

    const admin = await mountAt({ editMode: 'persisted' })
    await openRequest(admin)
    expect(admin.findAll('[data-q-op]')).toHaveLength(2)
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    expect(admin.find('[data-queue]').exists()).toBe(true)
    expect(admin.findAll('[data-q-op]')).toHaveLength(1)
    await echoSavedChart(admin)
    expect(admin.find('[data-queue]').exists()).toBe(true)
    expect(admin.findAll('[data-q-op]')).toHaveLength(1)
    expect(admin.find('[data-q-close]').exists()).toBe(true)
    admin.unmount()
  })

  it('stays on the review after accepting one request while another is still waiting', async () => {
    const local = await mountAt({ editMode: 'local', actorKey: 'musico' })
    await local.get('[data-edit]').trigger('click')
    await flushPromises()
    await editPlain(local, 'Camila canta', 'Camila')
    await sendSuggestion(local, 'Ana Souza')
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    await local.get('[data-revert-all]').trigger('click')
    await flushPromises()
    await local.get('[data-revert-all]').trigger('click')
    await flushPromises()
    await local.get('[data-edit]').trigger('click')
    await flushPromises()
    await editPlain(local, 'Hoje a noite', 'Hoje')
    await sendSuggestion(local, 'Bruno Dias')
    local.unmount()

    const admin = await mountAt({ editMode: 'persisted' })
    await openRequest(admin, 0)
    expect(admin.findAll('[data-q-op]')).toHaveLength(1)
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    expect(admin.find('[data-queue]').exists()).toBe(true)
    expect(admin.findAll('[data-q-sug]')).toHaveLength(1)
    await echoSavedChart(admin)
    expect(admin.find('[data-queue]').exists()).toBe(true)
    expect(admin.findAll('[data-q-sug]')).toHaveLength(1)
    expect(admin.get('[data-q-sug]').text()).toMatch(/Bruno Dias/)
    admin.unmount()
  })

  it('still shows the batida strip when the suggestion changes it', async () => {
    const local = await mountAt({ editMode: 'local', actorKey: 'musico' })
    await local.get('[data-edit]').trigger('click')
    await flushPromises()
    await local.get('[data-batida-edit-chrome]').trigger('click')
    await flushPromises()
    await local.get('[data-batida-slot="0"]').trigger('click')
    await flushPromises()
    await local.get('[data-batida-choice="ghost"]').trigger('click')
    await flushPromises()
    await local.get('[data-batida-save]').trigger('click')
    await flushPromises()
    await sendSuggestion(local, 'Ana Souza')
    local.unmount()

    const admin = await mountAt({ editMode: 'persisted' })
    await openRequest(admin)
    expect(admin.get('[data-q-op]').text()).toMatch(/Batida/i)
    expect(admin.find('[data-q-strum-preview]').exists()).toBe(true)
    expect(admin.find('[data-q-strum]').exists()).toBe(true)
    admin.unmount()
  })

  it('refusing one adjustment leaves the other on the review', async () => {
    const local = await mountAt({ editMode: 'local', actorKey: 'musico' })
    await local.get('[data-edit]').trigger('click')
    await flushPromises()
    await editPlain(local, 'Camila canta', 'Camila')
    await editPlain(local, 'Hoje a noite', 'Hoje')
    await sendSuggestion(local, 'Ana Souza')
    local.unmount()

    const admin = await mountAt({ editMode: 'persisted' })
    await openRequest(admin)
    expect(admin.findAll('[data-q-op]')).toHaveLength(2)
    await admin.get('[data-q-refuse]').trigger('click')
    await flushPromises()
    expect(admin.emitted('save-content')).toBeUndefined()
    expect(admin.find('[data-queue]').exists()).toBe(true)
    expect(admin.findAll('[data-q-op]')).toHaveLength(1)
    admin.unmount()
  })

  it('keeps the review mounted after the last adjustment is saved back', async () => {
    const local = await mountAt({ editMode: 'local', actorKey: 'musico' })
    await local.get('[data-edit]').trigger('click')
    await flushPromises()
    await editPlain(local, 'Camila canta', 'Camila')
    await sendSuggestion(local, 'Ana Souza')
    local.unmount()

    const admin = await mountAt({ editMode: 'persisted' })
    await openRequest(admin)
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    await echoSavedChart(admin)
    expect(admin.find('[data-queue]').exists()).toBe(true)
    expect(admin.find('[data-q-op]').exists()).toBe(false)
    expect(admin.get('[data-queue]').text()).toMatch(/Nenhuma sugestão pendente/)
    admin.unmount()
  })

  it('shows the batida strip when only the active pattern changes', async () => {
    const leve = parseTitanStrum('bpm=90;meter=4/4;grid=4;label=Leve;pat=D-DU')
    const forte = parseTitanStrum('bpm=90;meter=4/4;grid=4;label=Forte;pat=DUDU')
    expect(leve && forte).toBeTruthy()
    const body = `{title:Teste}\n{key:D}\n[D]Camila canta\n`
    const official = writeStrumPatterns(body, { activeIndex: 0, patterns: [leve!, forte!] })
    const switched = writeStrumPatterns(official, { activeIndex: 1, patterns: [leve!, forte!] })
    const before = readStrumPatterns(official)
    const after = readStrumPatterns(switched)
    expect(before.activeIndex).toBe(0)
    expect(after.activeIndex).toBe(1)
    expect(before.patterns.map((p) => formatTitanStrum(p))).toEqual(after.patterns.map((p) => formatTitanStrum(p)))
    const ops = diffOps(official, switched, { transpose: 0, capo: 0 })
    expect(ops.length).toBeGreaterThan(0)
    localStorage.setItem(
      'titan-chordpro:sug',
      JSON.stringify([
        {
          id: 's-ativa',
          songId: 'review-1',
          title: 'Teste',
          at: 1,
          baseVersion: 'v1',
          ops,
          resolvedOps: [],
          status: 'pending',
          actorName: 'Ana Souza',
        },
      ]),
    )

    const admin = await mountAt({ editMode: 'persisted', source: official })
    await openRequest(admin)
    expect(admin.find('[data-q-strum-preview]').exists()).toBe(true)
    admin.unmount()
  })
})
