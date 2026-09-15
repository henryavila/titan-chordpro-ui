import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  emptyPattern,
  formatXStrum,
  memoryStore,
  readMeta,
  readStrumPatterns,
  writeStrumPatterns,
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
  patterns = [
    emptyPattern({ bpm: 90, meter: '4/4', grid: 16, label: 'Parte 1' }),
    emptyPattern({ bpm: 90, meter: '4/4', grid: 16, label: 'Parte 2' }),
  ],
  activeIndex = 0,
) {
  const w = mount(BatidaSheet, {
    props: {
      compact: false,
      pattern: patterns[activeIndex]!,
      patterns,
      activeIndex,
      barBeats: 4,
      canDelete: true,
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

  it('save persists full set via writeStrumPatterns (active drives x_strum)', async () => {
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
    expect(readMeta(src).x_strum).toContain('Refrão A')
    expect(readMeta(src).x_strum_set).toBeTruthy()
    expect(formatXStrum(set.patterns[set.activeIndex]!)).toBe(readMeta(src).x_strum)
  })
})
