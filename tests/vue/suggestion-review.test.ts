import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { diffOps, formatXStrum, parseXStrum, readStrumPatterns, writeStrumPatterns } from '../../src/core/index'
import { ChordproViewer } from '../../src/vue/index'

/**
 * Chart that already has a batida. A lyric typo must not look like a batida
 * suggestion, and accepting one item must leave the review open for the rest
 * once the host writes the saved chart back into `source`.
 */
const SRC = `{title:Teste}
{key:D}
{tempo:90}
{time:4/4}
{x_strum:bpm=90;meter=4/4;grid=4;label=Leve;pat=D-DU}
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
  const w = mount(ChordproViewer, {
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
    const leve = parseXStrum('bpm=90;meter=4/4;grid=4;label=Leve;pat=D-DU')
    const forte = parseXStrum('bpm=90;meter=4/4;grid=4;label=Forte;pat=DUDU')
    expect(leve && forte).toBeTruthy()
    const body = `{title:Teste}\n{key:D}\n[D]Camila canta\n`
    const official = writeStrumPatterns(body, { activeIndex: 0, patterns: [leve!, forte!] })
    const switched = writeStrumPatterns(official, { activeIndex: 1, patterns: [leve!, forte!] })
    const before = readStrumPatterns(official)
    const after = readStrumPatterns(switched)
    expect(before.activeIndex).toBe(0)
    expect(after.activeIndex).toBe(1)
    expect(before.patterns.map((p) => formatXStrum(p))).toEqual(after.patterns.map((p) => formatXStrum(p)))
    const ops = diffOps(official, switched, { transpose: 0, capo: 0 })
    expect(ops.length).toBeGreaterThan(0)
    localStorage.setItem(
      'cpv:sug',
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
