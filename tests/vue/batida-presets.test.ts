import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  emptyPattern,
  formatXStrum,
  listStrumPresets,
  memoryStore,
  parseXStrum,
  readMeta,
  setSlot,
} from '../../src/core'
import { ChordproViewer } from '../../src/vue'
import BatidaSheet from '../../src/vue/sheets/BatidaSheet.vue'

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
let confirmSpy: {
  mockRestore: () => void
  mockReturnValue: (v: boolean) => unknown
  mockReturnValueOnce: (v: boolean) => unknown
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('cpv:fitSeen', '1')
  observers.length = 0
  realRO = globalThis.ResizeObserver
  globalThis.ResizeObserver = TestRO as unknown as typeof ResizeObserver
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  globalThis.ResizeObserver = realRO
  localStorage.clear()
  confirmSpy.mockRestore()
})

const NO_STRUM = `{title:Teste}
{key:D}
{tempo:90}
{time:4/4}
{duration:04:00}
{c:Verso}
[D]Oi
`

async function viewerAt(source: string, width = 900) {
  const w = mount(ChordproViewer, {
    props: { source, storage: memoryStore(), autoHide: false, modes: 'content' },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  observers.forEach((cb) => cb([{ contentRect: { width, height: 800 } }]))
  await flushPromises()
  return w
}

function mountSheet(
  pattern = emptyPattern({ bpm: 90, meter: '4/4', grid: 16, label: 'Padrão' }),
  props: { presetsEnabled?: boolean; canDelete?: boolean } = {},
) {
  const w = mount(BatidaSheet, {
    props: {
      compact: false,
      pattern,
      barBeats: 4,
      canDelete: props.canDelete ?? false,
      presetsEnabled: props.presetsEnabled,
    },
    attachTo: document.body,
  })
  mounted.push(w)
  return w
}

describe('Batida presets section', () => {
  it('shows preset buttons when presetsEnabled (default true)', async () => {
    const w = mountSheet()
    await flushPromises()
    expect(w.find('[data-batida-presets]').exists()).toBe(true)
    const presets = listStrumPresets()
    expect(presets.length).toBeGreaterThanOrEqual(3)
    for (const p of presets) {
      expect(w.find(`[data-batida-preset="${p.id}"]`).exists()).toBe(true)
    }
  })

  it('hides presets when presetsEnabled is false', async () => {
    const w = mountSheet(undefined, { presetsEnabled: false })
    await flushPromises()
    expect(w.find('[data-batida-presets]').exists()).toBe(false)
  })

  it('applies preset to draft without confirm when clean', async () => {
    const w = mountSheet()
    await flushPromises()
    const preset = listStrumPresets()[0]!
    await w.get(`[data-batida-preset="${preset.id}"]`).trigger('click')
    await flushPromises()
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(w.get('[data-batida-label]').element).toHaveProperty('value', preset.pattern.label)
    const slot0 = w.get('[data-batida-slot="0"]')
    expect(slot0.classes().join(' ')).not.toMatch(/is-ghost/)
  })

  it('asks confirm when draft is dirty before applying', async () => {
    const base = emptyPattern({ bpm: 90, meter: '4/4', grid: 16, label: 'Padrão' })
    const dirty = setSlot(base, 0, { dir: 'down', contact: 'hit', essence: 'accent' })
    const w = mountSheet(dirty)
    await flushPromises()
    // Edit label so sheet draft is dirty vs initial... actually initial IS dirty pattern.
    // Make a further edit from the mounted baseline:
    await w.get('[data-batida-slot="1"]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-choice="ghost"]').trigger('click')
    await flushPromises()

    confirmSpy.mockReturnValueOnce(false)
    const preset = listStrumPresets()[1]!
    await w.get(`[data-batida-preset="${preset.id}"]`).trigger('click')
    await flushPromises()
    expect(confirmSpy).toHaveBeenCalled()
    expect(w.get('[data-batida-label]').element).toHaveProperty('value', dirty.label)

    confirmSpy.mockReturnValueOnce(true)
    await w.get(`[data-batida-preset="${preset.id}"]`).trigger('click')
    await flushPromises()
    expect(w.get('[data-batida-label]').element).toHaveProperty('value', preset.pattern.label)
  })

  it('save after preset still writes a single x_strum via writeMeta', async () => {
    const w = await viewerAt(NO_STRUM)
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-create]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-presets]').exists()).toBe(true)
    const preset = listStrumPresets()[0]!
    await w.get(`[data-batida-preset="${preset.id}"]`).trigger('click')
    await flushPromises()
    await w.get('[data-batida-save]').trigger('click')
    await flushPromises()
    const src = (w.emitted('update:source')?.at(-1)?.[0] as string) ?? ''
    const raw = readMeta(src).x_strum
    expect(raw).toBeTruthy()
    expect(raw).toContain('bpm=90')
    expect(raw).toContain(`label=${preset.pattern.label}`)
    const parsed = parseXStrum(raw!)
    expect(parsed?.slots).toEqual(preset.pattern.slots)
    expect(formatXStrum(parsed!).match(/pat=([^;]*)/)?.[1]).not.toContain('-')
    // single meta key — no multi-pattern wire
    expect(src.match(/\{x_strum:/g)?.length).toBe(1)
  })
})
