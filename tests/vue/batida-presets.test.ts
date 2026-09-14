import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  emptyPattern,
  formatXStrum,
  memoryStore,
  parseXStrum,
  readMeta,
  setSlotCascading,
  type StrumPreset,
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
const HOST_PRESETS: StrumPreset[] = [
  {
    id: 'basic-down-up',
    label: 'Baixo-cima',
    pattern: parseXStrum(
      'bpm=90; meter=4/4; grid=16; label=Baixo-cima; pat=DuDu DuDu DuDu DuDu',
    )!,
  },
  {
    id: 'folk-passa',
    label: 'Folk passa',
    pattern: parseXStrum(
      'bpm=90; meter=4/4; grid=16; label=Folk passa; pat=Dudu Dudu Dudu Dudu',
    )!,
  },
  {
    id: 'pop-accent',
    label: 'Pop acento',
    pattern: parseXStrum(
      'bpm=90; meter=4/4; grid=16; label=Pop acento; pat=DuDu DuD!u DuDu DuD!u',
    )!,
  },
]

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

async function viewerAt(
  source: string,
  width = 900,
  extra: Record<string, unknown> = {},
) {
  const w = mount(ChordproViewer, {
    props: {
      source,
      storage: memoryStore(),
      autoHide: false,
      modes: 'content',
      capabilities: { batidaPresets: true },
      strumPresets: HOST_PRESETS,
      ...extra,
    },
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
  props: {
    presetsEnabled?: boolean
    canDelete?: boolean
    presets?: StrumPreset[]
  } = {},
) {
  const w = mount(BatidaSheet, {
    props: {
      compact: false,
      pattern,
      barBeats: 4,
      canDelete: props.canDelete ?? false,
      presetsEnabled: props.presetsEnabled ?? true,
      presets: props.presets ?? HOST_PRESETS,
    },
    attachTo: document.body,
  })
  mounted.push(w)
  return w
}

describe('Batida presets section (host catalog)', () => {
  it('hides presets when capability is off (default)', async () => {
    const w = mountSheet(undefined, { presetsEnabled: false })
    await flushPromises()
    expect(w.find('[data-batida-presets]').exists()).toBe(false)
  })

  it('shows host preset buttons when enabled', async () => {
    const w = mountSheet()
    await flushPromises()
    expect(w.find('[data-batida-presets]').exists()).toBe(true)
    expect(w.find('[data-batida-preset-save]').exists()).toBe(true)
    for (const p of HOST_PRESETS) {
      expect(w.find(`[data-batida-preset="${p.id}"]`).exists()).toBe(true)
    }
  })

  it('shows empty hint when host catalog is empty', async () => {
    const w = mountSheet(undefined, { presets: [] })
    await flushPromises()
    expect(w.find('[data-batida-presets-empty]').exists()).toBe(true)
    expect(w.find('[data-batida-preset-save]').exists()).toBe(true)
  })

  it('applies preset to draft without confirm when clean', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const w = mountSheet()
    await flushPromises()
    const preset = HOST_PRESETS[0]!
    await w.get(`[data-batida-preset="${preset.id}"]`).trigger('click')
    await flushPromises()
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(w.find('[data-batida-preset-replace-dialog]').exists()).toBe(false)
    expect(w.get('[data-batida-label]').element).toHaveProperty('value', preset.pattern.label)
    confirmSpy.mockRestore()
  })

  it('asks UI confirm when draft is dirty before applying', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const base = emptyPattern({ bpm: 90, meter: '4/4', grid: 16, label: 'Padrão' })
    const dirty = setSlotCascading(base, 0, { dir: 'down', contact: 'hit', essence: 'accent' })
    const w = mountSheet(dirty)
    await flushPromises()
    // Change essence on slot 0 so the draft diverges from baseline.
    await w.get('[data-batida-slot="0"]').trigger('click')
    await flushPromises()
    const mute = w.findAll('[data-batida-choice="hit"]').find((b) => b.text().match(/Mute/i))
    expect(mute).toBeTruthy()
    await mute!.trigger('click')
    await flushPromises()

    const preset = HOST_PRESETS[1]!
    await w.get(`[data-batida-preset="${preset.id}"]`).trigger('click')
    await flushPromises()
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(w.find('[data-batida-preset-replace-dialog]').exists()).toBe(true)
    expect(w.get('[data-batida-label]').element).toHaveProperty('value', dirty.label)

    await w.get('[data-batida-preset-replace-cancel]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-preset-replace-dialog]').exists()).toBe(false)
    expect(w.get('[data-batida-label]').element).toHaveProperty('value', dirty.label)

    await w.get(`[data-batida-preset="${preset.id}"]`).trigger('click')
    await flushPromises()
    await w.get('[data-batida-preset-replace-ok]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-preset-replace-dialog]').exists()).toBe(false)
    expect(w.get('[data-batida-label]').element).toHaveProperty('value', preset.pattern.label)
    confirmSpy.mockRestore()
  })

  it('emits save-preset from the in-sheet name dialog (no browser prompt)', async () => {
    const promptSpy = vi.spyOn(window, 'prompt')
    const w = mountSheet()
    await flushPromises()
    await w.get('[data-batida-preset-save]').trigger('click')
    await flushPromises()
    expect(promptSpy).not.toHaveBeenCalled()
    expect(w.find('[data-batida-preset-name-dialog]').exists()).toBe(true)
    await w.get('[data-batida-preset-name]').setValue('Ensaio sexta')
    await w.get('[data-batida-preset-name-ok]').trigger('click')
    await flushPromises()
    const payload = w.emitted('save-preset')?.at(-1)?.[0] as {
      id?: string
      label: string
      pattern: { label: string }
    }
    expect(payload).toBeTruthy()
    expect(payload.id).toBeUndefined()
    expect(payload.label).toBe('Ensaio sexta')
    expect(payload.pattern.label).toBe('Ensaio sexta')
    expect(w.find('[data-batida-preset-name-dialog]').exists()).toBe(false)
    promptSpy.mockRestore()
  })

  it('cancel closes the name dialog without emitting', async () => {
    const w = mountSheet()
    await flushPromises()
    await w.get('[data-batida-preset-save]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-preset-name-cancel]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-preset-name-dialog]').exists()).toBe(false)
    expect(w.emitted('save-preset')).toBeUndefined()
  })

  it('viewer forwards save-strum-preset and applies host presets', async () => {
    const w = await viewerAt(NO_STRUM)
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-create]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-presets]').exists()).toBe(true)
    const preset = HOST_PRESETS[0]!
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

    await w.get('[data-batida-edit-chrome]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-preset-save]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-preset-name]').setValue('Salvo pelo host')
    await w.get('[data-batida-preset-name-ok]').trigger('click')
    await flushPromises()
    const saved = w.emitted('save-strum-preset')?.at(-1)?.[0] as { label: string }
    expect(saved.label).toBe('Salvo pelo host')
  })

  it('viewer hides presets when batidaPresets capability is absent', async () => {
    const w = await viewerAt(NO_STRUM, 900, {
      capabilities: { sourcePane: true },
      strumPresets: HOST_PRESETS,
    })
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-create]').trigger('click')
    await flushPromises()
    expect(w.find('[data-batida-presets]').exists()).toBe(false)
  })
})
