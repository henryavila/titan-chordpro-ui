import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { memoryStore, readMeta } from '../../src/core'
import { ChordproViewer } from '../../src/vue'

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
  observers.length = 0
  realRO = globalThis.ResizeObserver
  globalThis.ResizeObserver = TestRO as unknown as typeof ResizeObserver
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  globalThis.ResizeObserver = realRO
})

const NO_STRUM = `{title:Teste}
{key:D}
{tempo:90}
{time:4/4}
{duration:04:00}
{c:Verso}
[D]Oi
`

async function mountAt(
  props: Record<string, unknown>,
  width = 900,
) {
  const w = mount(ChordproViewer, {
    props: { source: NO_STRUM, autoHide: false, ...props },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width, height: 800 } }]))
  await flushPromises()
  return w
}

async function createLocalBatida(w: Awaited<ReturnType<typeof mountAt>>) {
  await w.get('[data-edit]').trigger('click')
  await flushPromises()
  await w.get('[data-batida-create]').trigger('click')
  await flushPromises()
  await w.get('[data-batida-slot="0"]').trigger('click')
  await flushPromises()
  await w.get('[data-batida-choice="hit"]').trigger('click')
  await flushPromises()
  await w.get('[data-batida-save]').trigger('click')
  await flushPromises()
}

async function confirmSuggest(w: Awaited<ReturnType<typeof mountAt>>, name = 'Carlos Lima') {
  await w.get('[data-suggest-name]').setValue(name)
  await flushPromises()
  await w.get('[data-suggest]').trigger('click')
  await flushPromises()
  expect(w.get('[data-suggest]').text()).toMatch(/Confirmar/i)
  await w.get('[data-suggest]').trigger('click')
  await flushPromises()
}

describe('local batida → suggest → merge', () => {
  it('queues a batida op and persisted accept writes {x_strum:} on the official chart', async () => {
    const store = memoryStore()
    const local = await mountAt({
      storage: store,
      editMode: 'local',
      songId: 'batida-sug',
      actorKey: 'musico',
    })
    await createLocalBatida(local)
    await local.get('[data-read]').trigger('click')
    await flushPromises()
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    expect(local.get('[data-my-op]').text()).toMatch(/Batida/i)
    await confirmSuggest(local)
    expect(local.emitted('suggestion-created')).toHaveLength(1)
    const created = local.emitted('suggestion-created')![0]![0] as {
      ops: unknown[]
      actorName?: string
    }
    expect(created.ops.length).toBeGreaterThan(0)
    expect(created.actorName).toBe('Carlos Lima')
    local.unmount()

    const admin = await mountAt({
      storage: store,
      editMode: 'persisted',
      songId: 'batida-sug',
    })
    await admin.get('[data-queue-chip]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-song]').trigger('click')
    await flushPromises()
    expect(admin.get('[data-q-actor]').text()).toMatch(/Carlos Lima/)
    await admin.get('[data-q-sug]').trigger('click')
    await flushPromises()
    expect(admin.get('[data-q-reviewer-actor]').text()).toMatch(/Carlos Lima/)
    expect(admin.get('[data-q-op]').text()).toMatch(/Batida/i)
    expect(admin.find('[data-q-strum]').exists()).toBe(true)
    expect(admin.find('[data-strum-strip]').exists()).toBe(true)
    expect(admin.find('[data-q-strum-preview]').exists()).toBe(true)
    expect(admin.get('[data-q-strum-preview]').element.parentElement?.getAttribute('data-q-batch')).toBe('')
    expect(admin.find('[data-strum-diff="added"]').exists()).toBe(true)
    expect(admin.find('[data-q-strum-before]').exists()).toBe(false)
    expect(admin.find('[data-q-accept-batch]').exists()).toBe(true)
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    const saved = String(admin.emitted('save-content')?.at(-1)?.[0] ?? '')
    expect(readMeta(saved).x_strum).toBeTruthy()
    expect(admin.emitted('suggestion-accepted')).toHaveLength(1)
    admin.unmount()
  })

  it('Aceitar lote applies the batida with the rest of the request', async () => {
    const store = memoryStore()
    const local = await mountAt({
      storage: store,
      editMode: 'local',
      songId: 'batida-lote',
    })
    await createLocalBatida(local)
    await local.get('[data-read]').trigger('click')
    await flushPromises()
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    await confirmSuggest(local)
    local.unmount()

    const admin = await mountAt({
      storage: store,
      editMode: 'persisted',
      songId: 'batida-lote',
    })
    await admin.get('[data-queue-chip]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-song]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-sug]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-accept-batch]').trigger('click')
    await flushPromises()
    const saved = String(admin.emitted('save-content')?.at(-1)?.[0] ?? '')
    expect(readMeta(saved).x_strum).toBeTruthy()
    expect(String(readMeta(saved).x_strum)).toMatch(/pat=/i)
    admin.unmount()
  })
})
