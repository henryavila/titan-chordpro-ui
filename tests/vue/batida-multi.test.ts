import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  emptyPattern,
  formatTitanStrum,
  memoryStore,
  parseTitanStrum,
  readMeta,
  readStrumPatterns,
  writeStrumPatterns,
} from '../../src/core'
import { TitanChordpro } from '../../src/vue'
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

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('titan-chordpro:fitSeen', '1')
  observers.length = 0
  realRO = globalThis.ResizeObserver
  globalThis.ResizeObserver = TestRO as unknown as typeof ResizeObserver
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  globalThis.ResizeObserver = realRO
  localStorage.clear()
})

const MULTI = writeStrumPatterns(
  `{title:Teste}
{key:D}
{tempo:120}
{time:4/4}
{duration:04:00}
{c:Verso}
[D]Oi
`,
  {
    activeIndex: 0,
    patterns: [
      emptyPattern({ bpm: 120, meter: '4/4', grid: 8, label: 'Parte 1' }),
      emptyPattern({ bpm: 120, meter: '4/4', grid: 8, label: 'Parte 2' }),
    ],
  },
)

async function viewerAt(source: string, width = 900) {
  const w = mount(TitanChordpro, {
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
  patterns = [
    emptyPattern({ bpm: 90, meter: '4/4', grid: 16, label: 'Parte 1' }),
    emptyPattern({ bpm: 90, meter: '4/4', grid: 16, label: 'Parte 2' }),
  ],
  activeIndex = 0,
  extra: Record<string, unknown> = {},
) {
  const w = mount(BatidaSheet, {
    props: {
      compact: false,
      pattern: patterns[activeIndex]!,
      patterns,
      activeIndex,
      barBeats: 4,
      canDelete: true,
      ...extra,
    },
    attachTo: document.body,
  })
  mounted.push(w)
  return w
}

describe('StrumStrip canPick when N>1', () => {
  it('shows pick control and cycles active pattern', async () => {
    const w = await viewerAt(MULTI)
    expect(w.find('[data-strum-btn]').exists()).toBe(true)
    await w.get('[data-strum-btn]').trigger('click')
    await flushPromises()

    expect(w.find('[data-strum-strip]').exists()).toBe(true)
    expect(w.find('[data-strum-pick]').exists()).toBe(true)
    expect(w.get('[data-strum-strip]').attributes('aria-label')).toMatch(/Parte 1/)

    await w.get('[data-strum-pick]').trigger('click')
    await flushPromises()

    const src = (w.emitted('update:source')?.at(-1)?.[0] as string) ?? MULTI
    const set = readStrumPatterns(src)
    expect(set.activeIndex).toBe(1)
    expect(set.patterns).toHaveLength(2)
    expect(w.get('[data-strum-strip]').attributes('aria-label')).toMatch(/Parte 2/)
  })
})

describe('BatidaSheet multi pattern management', () => {
  it('lists named patterns and can switch active', async () => {
    const w = mountSheet()
    await flushPromises()
    expect(w.findAll('[data-batida-pattern]').length).toBe(2)
    expect(w.get('[data-batida-pattern="0"]').classes().join(' ')).toMatch(/is-active|active/)
    await w.get('[data-batida-pattern="1"]').trigger('click')
    await flushPromises()
    expect(w.emitted('select-pattern')?.at(-1)?.[0]).toBe(1)
  })

  it('can rename, duplicate, delete and add named patterns', async () => {
    const w = mountSheet()
    await flushPromises()

    const label = w.get('[data-batida-label]')
    await label.setValue('Intro')
    await flushPromises()

    await w.get('[data-batida-dup]').trigger('click')
    await flushPromises()
    expect(w.emitted('duplicate-pattern')).toBeTruthy()

    await w.get('[data-batida-add]').trigger('click')
    await flushPromises()
    expect(w.emitted('add-pattern')).toBeTruthy()

    await w.get('[data-batida-remove-pattern]').trigger('click')
    await flushPromises()
    expect(w.emitted('remove-pattern')).toBeTruthy()
  })

  it('save persists full set via writeStrumPatterns (active drives x_titan_strum)', async () => {
    const w = await viewerAt(MULTI)
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-edit-chrome]').trigger('click')
    await flushPromises()

    expect(w.find('[data-batida-sheet]').exists()).toBe(true)
    expect(w.find('[data-batida-patterns]').exists()).toBe(true)

    await w.get('[data-batida-label]').setValue('Refrão A')
    await w.get('[data-batida-save]').trigger('click')
    await flushPromises()

    const src = (w.emitted('update:source')?.at(-1)?.[0] as string) ?? ''
    const set = readStrumPatterns(src)
    expect(set.patterns).toHaveLength(2)
    expect(set.patterns[set.activeIndex]?.label).toBe('Refrão A')
    expect(readMeta(src).x_titan_strum).toContain('Refrão A')
    expect(readMeta(src).x_titan_strum_set).toBeTruthy()
    expect(formatTitanStrum(set.patterns[set.activeIndex]!)).toBe(readMeta(src).x_titan_strum)
  })

  it('does not emit select-pattern when the active chip is clicked again', async () => {
    const w = mountSheet()
    await flushPromises()
    await w.get('[data-batida-pattern="0"]').trigger('click')
    await flushPromises()
    expect(w.emitted('select-pattern')).toBeUndefined()
  })

  it('keeps a typed name on the chip only after leaving that pattern', async () => {
    const w = mountSheet()
    await flushPromises()
    await w.get('[data-batida-label]').setValue('Intro')
    await flushPromises()
    expect(w.get('[data-batida-pattern="0"]').text()).toBe('Parte 1')
    await w.get('[data-batida-pattern="1"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-batida-pattern="0"]').text()).toBe('Intro')
    expect((w.get('[data-batida-label]').element as HTMLInputElement).value).toBe('Parte 2')
  })

  it('names a duplicate with (cópia) and the next added pattern from the list length', async () => {
    const w = mountSheet()
    await flushPromises()
    await w.get('[data-batida-label]').setValue('Intro')
    await w.get('[data-batida-dup]').trigger('click')
    await flushPromises()
    expect(w.get('[data-batida-pattern="1"]').text()).toBe('Intro (cópia)')
    expect((w.get('[data-batida-label]').element as HTMLInputElement).value).toBe('Intro (cópia)')
    await w.get('[data-batida-add]').trigger('click')
    await flushPromises()
    expect(w.get('[data-batida-pattern="3"]').text()).toBe('Padrão 4')
    expect((w.get('[data-batida-label]').element as HTMLInputElement).value).toBe('Padrão 4')
  })

  it('hides Remover while a single pattern is open', async () => {
    const only = emptyPattern({ bpm: 90, meter: '4/4', grid: 16, label: 'Só' })
    const w = mountSheet([only], 0)
    await flushPromises()
    expect(w.find('[data-batida-remove-pattern]').exists()).toBe(false)
  })

  it('density 2 lays out two slots on each of four beats', async () => {
    const w = mountSheet()
    await flushPromises()
    expect(w.findAll('[data-batida-slot]')).toHaveLength(16)
    await w.get('[data-batida-density]').setValue('2')
    await flushPromises()
    expect(w.findAll('[data-batida-beat-row]')).toHaveLength(4)
    for (const row of w.findAll('[data-batida-beat-row]')) {
      expect(row.findAll('[data-batida-slot]')).toHaveLength(2)
    }
  })

  it('shows the 6/8 pulse control and resizes the grid with it', async () => {
    const six = emptyPattern({ bpm: 80, meter: '6/8', grid: 8, label: 'Comp' })
    const w = mountSheet([six], 0)
    await flushPromises()
    expect(w.find('[data-batida-pulse]').exists()).toBe(true)
    expect(w.findAll('[data-batida-beat-row]')).toHaveLength(2)
    expect(w.get('[data-batida-sheet]').text()).toMatch(/80 BPM/)
    await w.get('[data-batida-pulse]').setValue('6')
    await flushPromises()
    expect(w.findAll('[data-batida-beat-row]')).toHaveLength(6)
    expect(w.findAll('[data-batida-slot]')).toHaveLength(24)
  })

  it('emits toggle-sound and keeps Ouvir disabled until every pattern is complete', async () => {
    const w = mountSheet()
    await flushPromises()
    await w.get('[data-batida-sound]').trigger('click')
    expect(w.emitted('toggle-sound')).toHaveLength(1)
    expect((w.get('[data-batida-preview]').element as HTMLButtonElement).disabled).toBe(true)
    expect(w.get('[data-batida-preview]').attributes('aria-label')).toBe('Ouvir')
  })

  it('emits toggle-preview with the draft and the beat count the grid uses', async () => {
    const done = parseTitanStrum('bpm=90; meter=4/4; grid=8; label=Parte 1; pat=DuDu DuDU')!
    const w = mountSheet([done], 0)
    await flushPromises()
    await w.get('[data-batida-preview]').trigger('click')
    const payload = w.emitted('toggle-preview')?.at(-1)?.[0] as {
      pattern: { label: string; slots: unknown[] }
      barBeats: number
    }
    expect(payload.barBeats).toBe(4)
    expect(payload.pattern.label).toBe('Parte 1')
    expect(payload.pattern.slots).toHaveLength(8)
  })

  it('refreshes the running preview when the grid changes, not when only the name changes', async () => {
    const done = parseTitanStrum('bpm=90; meter=4/4; grid=8; label=Parte 1; pat=DuDu DuDU')!
    const w = mountSheet([done], 0, { previewRunning: true, previewClock: 0 })
    await flushPromises()
    expect(w.get('[data-batida-slot="0"]').classes()).toContain('is-preview')
    expect(w.get('[data-batida-preview]').attributes('aria-label')).toBe('Parar')
    await w.get('[data-batida-label]').setValue('Outro')
    await flushPromises()
    expect(w.emitted('update-preview')).toBeUndefined()
    await w.get('[data-batida-density]').setValue('4')
    await flushPromises()
    const updated = w.emitted('update-preview')?.at(-1)?.[0] as { label: string; slots: unknown[] }
    expect(updated.label).toBe('Outro')
    expect(updated.slots).toHaveLength(16)
  })

  it('auditions a hit and stays quiet for a pass', async () => {
    const done = parseTitanStrum('bpm=90; meter=4/4; grid=8; label=Parte 1; pat=DuDu DuDU')!
    const w = mountSheet([done], 0, { previewRunning: true })
    await flushPromises()
    await w.get('[data-batida-slot="1"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-batida-slot="1"]').classes()).toContain('is-focus')
    await w.get('[data-batida-choice="ghost"]').trigger('click')
    await flushPromises()
    expect(w.emitted('audition')).toBeUndefined()
    expect(w.emitted('update-preview')).toBeTruthy()

    await w.get('[data-batida-slot="0"]').trigger('click')
    await flushPromises()
    await w.get('[data-batida-choice="hit"]').trigger('click')
    await flushPromises()
    const audition = w.emitted('audition')?.at(-1)?.[0] as { contact: string }
    expect(audition.contact).toBe('hit')
  })

  it('closes from the scrim', async () => {
    const w = mountSheet()
    await flushPromises()
    await w.get('[data-batida-scrim]').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('save emits the active pattern and the full set', async () => {
    const done = parseTitanStrum('bpm=90; meter=4/4; grid=8; label=Parte 1; pat=DuDu DuDU')!
    const other = parseTitanStrum('bpm=90; meter=4/4; grid=8; label=Parte 2; pat=DuDu DuDU')!
    const w = mountSheet([done, other], 0)
    await flushPromises()
    await w.get('[data-batida-label]').setValue('Refrão')
    await w.get('[data-batida-save]').trigger('click')
    await flushPromises()
    const saved = w.emitted('save')?.at(-1)?.[0] as { label: string }
    const set = w.emitted('save-set')?.at(-1)?.[0] as {
      activeIndex: number
      patterns: { label: string }[]
    }
    expect(saved.label).toBe('Refrão')
    expect(set.activeIndex).toBe(0)
    expect(set.patterns.map((p) => p.label)).toEqual(['Refrão', 'Parte 2'])
  })

  it('does not save while a sibling pattern is still empty', async () => {
    const done = parseTitanStrum('bpm=90; meter=4/4; grid=8; label=Parte 1; pat=DuDu DuDU')!
    const blank = emptyPattern({ bpm: 90, meter: '4/4', grid: 8, label: 'Parte 2' })
    expect(done).not.toBeNull()
    const w = mountSheet([done!, blank], 0)
    await flushPromises()
    expect((w.get('[data-batida-save]').element as HTMLButtonElement).disabled).toBe(true)
    await w.get('[data-batida-save]').trigger('click')
    await flushPromises()
    expect(w.emitted('save-set')).toBeUndefined()
  })
})
