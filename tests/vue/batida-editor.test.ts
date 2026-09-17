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

const NO_STRUM = `{title:Teste}
{key:D}
{tempo:90}
{time:4/4}
{duration:04:00}
{c:Verso}
[D]Oi
`

const WITH_STRUM = `{title:Teste}
{key:D}
{tempo:71}
{time:4/4}
{duration:04:00}
{x_strum: bpm=71; meter=4/4; grid=8; label=Padrão; pat=DuDu DuDU}
{c:Verso}
[D]Oi
`

const LEGACY_REST = `{title:Teste}
{key:D}
{tempo:80}
{time:4/4}
{duration:04:00}
{x_strum:bpm=80; meter=4/4; grid=4; label=Old; pat=D-U-}
{c:Verso}
[D]Oi
`

async function viewerAt(
  source: string,
  width = 900,
  modes: 'content' | 'local' | 'both' | 'none' = 'content',
) {
  const w = mount(ChordproViewer, {
    props: { source, storage: memoryStore(), autoHide: false, modes },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width, height: 800 } }]))
  await flushPromises()
  return w
}

async function enterContentEdit(w: Awaited<ReturnType<typeof viewerAt>>) {
  await w.get('[data-edit]').trigger('click')
  await flushPromises()
  // modes=both shows a picker; content-only enters directly.
  const contentPick = w.find('[data-mode-content]')
  if (contentPick.exists()) {
    await contentPick.trigger('click')
    await flushPromises()
  }
}

describe('Batida editor CTA + sheet', () => {
  it('hides + Criar batida in view mode', async () => {
    const w = await viewerAt(NO_STRUM)
    expect(w.find('[data-batida-create]').exists()).toBe(false)
  })

  it('shows + Criar batida in Só para mim edit and opens BatidaSheet', async () => {
    const w = await viewerAt(NO_STRUM, 900, 'local')
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    const create = w.get('[data-batida-create]')
    expect(create.text()).toMatch(/Criar batida/i)
    await create.trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-sheet]').exists()).toBe(true)
  })

  it('hides batida create/edit when editMode is none', async () => {
    const w = await viewerAt(NO_STRUM, 900, 'none')
    expect(w.find('[data-edit]').exists()).toBe(false)
    expect(w.find('[data-batida-create]').exists()).toBe(false)
    expect(w.find('[data-batida-sheet]').exists()).toBe(false)
  })

  it('shows + Criar batida in Para todos edit and opens BatidaSheet', async () => {
    const w = await viewerAt(NO_STRUM)
    await enterContentEdit(w)
    const create = w.get('[data-batida-create]')
    expect(create.text()).toMatch(/Criar batida/i)
    expect(w.find('[data-batida-sheet]').exists()).toBe(false)
    await create.trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-sheet]').exists()).toBe(true)
  })

  it('lays out one beat per row on a narrow viewport', async () => {
    const w = await viewerAt(NO_STRUM, 390)
    await enterContentEdit(w)
    await w.get('[data-batida-create]').trigger('click')
    await flushPromises()
    const rows = w.findAll('[data-batida-beat-row]')
    expect(rows.length).toBe(4)
    for (const row of rows) {
      expect(row.findAll('[data-batida-slot]')).toHaveLength(4)
    }
  })

  it('Recomeçar clears the anchor so the musician can pick direction again', async () => {
    const w = await viewerAt(NO_STRUM)
    await enterContentEdit(w)
    await w.get('[data-batida-create]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-restart]').exists()).toBe(false)
    await w.get('[data-batida-slot="0"]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-choice="hit"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-restart]').exists()).toBe(true)
    expect(w.get('[data-batida-slot="0"]').text()).not.toMatch(/vazio/i)
    await w.get('[data-batida-restart]').trigger('click')
    await flushPromises()
    expect(w.get('[data-batida-slot="0"]').text()).toMatch(/vazio/i)
    expect(w.get('[data-batida-save]').attributes('disabled')).toBeDefined()
    await w.get('[data-batida-slot="0"]').trigger('click')
    await flushPromises()
    // Back to both directions
    expect(w.findAll('[data-batida-choice]')).toHaveLength(10)
  })

  it('unanchored picker offers both dirs; after anchor only the required dir', async () => {
    const w = await viewerAt(NO_STRUM)
    await enterContentEdit(w)
    await w.get('[data-batida-create]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-slot="0"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-picker]').exists()).toBe(true)
    expect(w.find('[data-batida-pick-dirs]').exists()).toBe(true)
    expect(w.find('[data-batida-dir-col="down"]').exists()).toBe(true)
    expect(w.find('[data-batida-dir-col="up"]').exists()).toBe(true)
    // Each direction column keeps its own hits + ghost (no mixed rows).
    expect(w.findAll('[data-batida-dir-col="down"] [data-batida-choice="hit"]')).toHaveLength(4)
    expect(w.findAll('[data-batida-dir-col="up"] [data-batida-choice="hit"]')).toHaveLength(4)
    expect(w.findAll('[data-batida-dir-col="down"] [data-batida-choice="ghost"]')).toHaveLength(1)
    expect(w.findAll('[data-batida-dir-col="up"] [data-batida-choice="ghost"]')).toHaveLength(1)
    expect(w.findAll('[data-batida-choice]')).toHaveLength(10)
    expect(w.text().toLowerCase()).not.toMatch(/pausa/)

    // Anchor with first hit in the down column
    await w.get('[data-batida-dir-col="down"] [data-batida-choice="hit"]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-slot="1"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-pick-dirs]').exists()).toBe(false)
    expect(w.findAll('[data-batida-choice]')).toHaveLength(5)
    expect(w.findAll('[data-batida-choice="hit"]')).toHaveLength(4)
    expect(w.findAll('[data-batida-choice="ghost"]')).toHaveLength(1)
    expect(w.get('[data-batida-picker]').text()).toMatch(/só ↑/)
  })

  it('marks the current choice via slotEquals', async () => {
    const w = await viewerAt(WITH_STRUM)
    await enterContentEdit(w)
    await w.get('[data-batida-edit-chrome]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-slot="0"]').trigger('click')
    await flushPromises()
    const on = w.find('[data-batida-choice][aria-pressed="true"]')
    expect(on.exists()).toBe(true)
    expect(on.attributes('data-batida-choice')).toBe('hit')
  })

  it('save writes {x_strum:} via writeMeta and hasStrum becomes true', async () => {
    const w = await viewerAt(NO_STRUM)
    await enterContentEdit(w)
    await w.get('[data-batida-create]').trigger('click')
    await flushPromises()
    expect(w.get('[data-batida-save]').attributes('disabled')).toBeDefined()
    await w.get('[data-batida-slot="0"]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-choice="hit"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-batida-save]').attributes('disabled')).toBeUndefined()
    await w.get('[data-batida-save]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-sheet]').exists()).toBe(false)
    expect(w.find('[data-batida-create]').exists()).toBe(false)
    expect(w.find('[data-batida-edit-chrome]').exists()).toBe(true)
    const src = (w.emitted('update:source')?.at(-1)?.[0] as string) ?? ''
    expect(readMeta(src).x_strum).toBeTruthy()
    expect(readMeta(src).x_strum).toContain('bpm=90')
    expect(readMeta(src).x_strum).not.toContain('-')
    // Cascaded fill must alternate — no DD/UU runs in pat=
    const pat = String(readMeta(src).x_strum).match(/pat=([^;]*)/)?.[1] ?? ''
    expect(pat).not.toMatch(/DD|UU|dd|uu|Dd|dD|Uu|uU/)
  })

  it('Apagar removes x_strum and restores + Criar', async () => {
    const w = await viewerAt(WITH_STRUM)
    await enterContentEdit(w)
    await w.get('[data-batida-edit-chrome]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-delete]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-create]').exists()).toBe(true)
    expect(w.find('[data-batida-edit-chrome]').exists()).toBe(false)
    const src = (w.emitted('update:source')?.at(-1)?.[0] as string) ?? ''
    expect(readMeta(src).x_strum).toBeUndefined()
  })

  it('legacy pat - displays/edits as passa and save does not write new -', async () => {
    const w = await viewerAt(LEGACY_REST)
    await enterContentEdit(w)
    await w.get('[data-batida-edit-chrome]').trigger('click')
    await flushPromises()
    const slot1 = w.get('[data-batida-slot="1"]')
    expect(slot1.text().toLowerCase()).toMatch(/passa/)
    expect(slot1.text().toLowerCase()).not.toMatch(/pausa/)
    await w.get('[data-batida-save]').trigger('click')
    await flushPromises()
    const src = (w.emitted('update:source')?.at(-1)?.[0] as string) ?? ''
    const raw = readMeta(src).x_strum ?? ''
    expect(raw).toBeTruthy()
    expect(raw).not.toContain('-')
    expect(raw).toMatch(/[du]/i)
  })

  it('create path mirrors {tempo:} into pattern bpm', async () => {
    const w = await viewerAt(NO_STRUM)
    await enterContentEdit(w)
    await w.get('[data-batida-create]').trigger('click')
    await flushPromises()
    expect(w.get('[data-batida-sheet]').text()).toMatch(/90/)
    expect(w.get('[data-batida-density]').text()).toMatch(/4\s*\/\s*tempo/)
    await w.get('[data-batida-slot="0"]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-choice="hit"]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-save]').trigger('click')
    await flushPromises()
    const src = (w.emitted('update:source')?.at(-1)?.[0] as string) ?? ''
    expect(readMeta(src).x_strum).toContain('bpm=90')
  })

  it('Só para mim: save writes overlay, not the official source', async () => {
    const w = await viewerAt(NO_STRUM, 900, 'local')
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
    const officialWrites = (w.emitted('update:source') ?? []).map((e) => String(e[0] ?? ''))
    expect(officialWrites.some((s) => s.includes('x_strum'))).toBe(false)
    expect(w.emitted('save-content')).toBeUndefined()
    expect(w.find('[data-batida-edit-chrome]').exists()).toBe(true)
    await w.get('[data-read]').trigger('click')
    await flushPromises()
    expect(w.find('[data-strum-btn]').exists()).toBe(true)
  })

  it('strip stays read-only in view; edit opens from Para todos chrome', async () => {
    const w = await viewerAt(WITH_STRUM)
    await w.get('[data-strum-btn]').trigger('click')
    await flushPromises()
    expect(w.find('[data-strum-strip]').exists()).toBe(true)
    expect(w.find('[data-strum-edit]').exists()).toBe(false)
    expect(w.find('[data-batida-create]').exists()).toBe(false)
    expect(w.find('[data-batida-edit-chrome]').exists()).toBe(false)

    await enterContentEdit(w)
    expect(w.find('[data-strum-strip]').exists()).toBe(false)
    expect(w.find('[data-batida-edit-chrome]').exists()).toBe(true)
    await w.get('[data-batida-edit-chrome]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-sheet]').exists()).toBe(true)
  })
})
