import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'
import { STORE_KEYS, diffOps, memoryStore, normalizeSource, overlayKey, parse } from '../../src/core/index'
import type { ChartStore } from '../../src/core/index'

const src = () => normalizeSource(loadFixture(JESUS_1))
const UNIQUE = 'Je[G]sus, Tu És a minha [G]vida.'
/** The same line as the reader sees it, without the chord brackets. */
const PLAIN = 'Jesus, Tu És a minha vida.'

/** A host store that records what the package asked it to keep. */
function hostStore(): ChartStore & { seen: string[] } {
  const inner = memoryStore()
  const seen: string[] = []
  return {
    seen,
    get: (k) => inner.get(k),
    set: (k, v) => {
      seen.push(k)
      inner.set(k, v)
    },
    remove: (k) => inner.remove(k),
  }
}

function mountViewer(store: ChartStore, props: Record<string, unknown> = {}) {
  return mount(ChordproViewer, {
    props: {
      source: src(),
      theme: 'dark',
      autoHide: false,
      songId: 'jesus-1',
      storage: store,
      ...props,
    },
    attachTo: document.body,
  })
}

/**
 * The gesture the local mode actually has: tap the line, fix the lyric in
 * place. The source pane is a "for everyone" tool, so a personal adjustment
 * can never be made through it.
 */
async function editLyric(w: ReturnType<typeof mountViewer>, plain: string, next: string) {
  const li = src().split('\n').findIndex((l) => l === UNIQUE)
  await w.get(`[data-row="${li}"]`).trigger('click')
  await flushPromises()
  const input = w.get('input[aria-label="Letra desta linha"]')
  await input.setValue(next)
  await input.trigger('blur')
  await flushPromises()
}

async function personalise(w: ReturnType<typeof mountViewer>) {
  await w.get('[data-edit]').trigger('click')
  await flushPromises()
  const pick = w.find('[data-mode-local]')
  if (pick.exists()) {
    await pick.trigger('click')
    await flushPromises()
  }
  await editLyric(w, PLAIN, `${PLAIN} (meu)`)
  await w.get('[data-read]').trigger('click')
  await flushPromises()
}

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

/**
 * The behaviour is the package's; the destination is the host's. These tests
 * exist so the seam cannot quietly close again — a direct `localStorage` call
 * added anywhere in the package fails here.
 */
describe('storage seam', () => {
  it('keeps the personal version in the host store, not in localStorage', async () => {
    const store = hostStore()
    const w = mountViewer(store)
    await personalise(w)

    const key = overlayKey('jesus-1')
    expect(store.get(key)).toBeTruthy()
    expect(localStorage.getItem(key)).toBeNull()
    w.unmount()
  })

  it('reads a personal version back from the host store', async () => {
    const store = hostStore()
    const first = mountViewer(store)
    await personalise(first)
    first.unmount()

    // A second reader session on the same host storage sees the adjustment.
    const second = mountViewer(store)
    await flushPromises()
    expect(second.html()).toContain('(meu)')
    second.unmount()
  })

  it('sends a suggestion to the host store', async () => {
    const store = hostStore()
    const w = mountViewer(store)
    await personalise(w)

    await w.get('[data-open-my]').trigger('click')
    await flushPromises()
    await w.get('[data-suggest-name]').setValue('Ana Souza')
    await flushPromises()
    await w.get('[data-suggest]').trigger('click')
    await flushPromises()
    await w.get('[data-suggest]').trigger('click')
    await flushPromises()

    const list = JSON.parse(store.get(STORE_KEYS.suggestions) ?? '[]')
    expect(list).toHaveLength(1)
    expect(list[0].ops.length).toBeGreaterThan(0)
    expect(list[0].actorName).toBe('Ana Souza')
    expect(localStorage.getItem(STORE_KEYS.suggestions)).toBeNull()
    w.unmount()
  })

  it('writes reading preferences through the host store', async () => {
    const store = hostStore()
    const w = mountViewer(store)
    await w.get('[data-theme-btn]').trigger('click')
    await flushPromises()

    expect(store.get(STORE_KEYS.prefs)).toBeTruthy()
    expect(localStorage.getItem(STORE_KEYS.prefs)).toBeNull()
    w.unmount()
  })

  it('falls back to this device when the host passes no store', async () => {
    const w = mount(ChordproViewer, {
      props: { source: src(), theme: 'dark', autoHide: false, songId: 'jesus-1' },
      attachTo: document.body,
    })
    await w.get('[data-theme-btn]').trigger('click')
    await flushPromises()

    expect(localStorage.getItem(STORE_KEYS.prefs)).toBeTruthy()
    w.unmount()
  })

  it('reads nothing and throws nothing when the host store is empty', async () => {
    const w = mountViewer(memoryStore())
    await flushPromises()
    expect(w.html()).toContain('Jesus')
    w.unmount()
  })
})

// A real personal edit survives host policy changes and unrelated pref writes.
it('keeps the overlay and free theme preference while the host controls appearance', async () => {
  const store = hostStore()
  store.set(STORE_KEYS.prefs, JSON.stringify({ theme: 'dark' }))
  const w = mountViewer(store, { theme: 'light', themeControl: 'host' })
  await personalise(w)
  const key = overlayKey('jesus-1')
  const overlay = store.get(key)
  expect(overlay).toBeTruthy()
  await w.setProps({ theme: 'auto' })
  await w.get('[data-cpv-root]').trigger('keydown', { key: 'a' })
  await flushPromises()
  // `a` toggles the fit away from its default, which is on.
  expect(JSON.parse(store.get(STORE_KEYS.prefs)!)).toMatchObject({ theme: 'dark', fit: false })
  expect(store.get(key)).toBe(overlay)
  await w.setProps({ theme: 'light', themeControl: 'preference' })
  expect(w.get('[data-cpv-root]').attributes('data-theme')).toBe('dark')
  expect(w.html()).toContain('(meu)')
  expect(store.get(key)).toBe(overlay)
  w.unmount()
})

const TWO_CHARTS = [
  '{start_of_x_chart:completa}',
  '{title:Uma}',
  '{x_chart_label:Completa}',
  '{key:G}',
  '{duration:04:26}',
  '[G]corpo da completa',
  '{end_of_x_chart}',
  '',
  '{start_of_x_chart:oferta}',
  '{title:Uma}',
  '{x_chart_label:Oferta}',
  '{x_chart_default:oferta}',
  '{key:C}',
  '{duration:02:00}',
  '[C]corpo da oferta',
  '{end_of_x_chart}',
].join('\n')

it('loads a legacy overlay for the default chart and writes the default slot', async () => {
  const store = hostStore()
  const official = src()
  const mine = official.replace(UNIQUE, `${UNIQUE} (meu)`)
  const ops = diffOps(official, mine, { transpose: 0, capo: 0 })
  const legacy = `${STORE_KEYS.overlayPrefix}jesus-1`
  store.set(legacy, JSON.stringify({ baseVersion: 'v1', ops, at: 1 }))

  const w = mountViewer(store)
  await flushPromises()
  expect(w.html()).toContain('(meu)')
  expect(store.get(overlayKey('jesus-1'))).toBeNull()
  expect(store.get(legacy)).toBeTruthy()

  await w.get('[data-transpose-up]').trigger('click')
  await w.get('[data-transpose-up]').trigger('click')
  await flushPromises()
  await w.get('[data-open-my]').trigger('click')
  await flushPromises()
  await w.get('[data-fix-tune]').trigger('click')
  await flushPromises()

  const saved = JSON.parse(store.get(overlayKey('jesus-1', 'default')) ?? 'null')
  expect(saved.ops.some((o: { type: string }) => o.type === 'tune')).toBe(true)
  expect(saved.ops.find((o: { type: string }) => o.type === 'tune')).toMatchObject({ transpose: 2 })
  expect(saved.ops.some((o: { type: string }) => o.type === 'replace')).toBe(true)
  expect(store.get(legacy)).toBeNull()
  expect(store.get(overlayKey('jesus-1'))).toBe(store.get(overlayKey('jesus-1', 'default')))
  w.unmount()
})

it('stores the personal version on the active chart, not the implicit default slot', async () => {
  const store = hostStore()
  const legacy = `${STORE_KEYS.overlayPrefix}uma`
  store.set(
    legacy,
    JSON.stringify({
      baseVersion: 'v1',
      at: 1,
      ops: diffOps(TWO_CHARTS, TWO_CHARTS.replace('[G]corpo da completa', '[G]corpo da completa (legado)'), {
        transpose: 0,
        capo: 0,
      }),
    }),
  )
  const w = mountViewer(store, { source: TWO_CHARTS, songId: 'uma' })
  await flushPromises()
  expect(w.html()).not.toContain('(legado)')

  const doc = parse(TWO_CHARTS, { chartId: 'oferta' }).source
  const li = doc.split('\n').findIndex((l) => l.includes('corpo da oferta'))
  await w.get('[data-edit]').trigger('click')
  await flushPromises()
  await w.get(`[data-row="${li}"]`).trigger('click')
  await flushPromises()
  const input = w.get('input[aria-label="Letra desta linha"]')
  await input.setValue('corpo da oferta (meu)')
  await input.trigger('blur')
  await flushPromises()

  expect(store.get(overlayKey('uma', 'oferta'))).toBeTruthy()
  expect(store.get(overlayKey('uma', 'default'))).toBeNull()
  expect(store.get(legacy)).toBeTruthy()
  w.unmount()
})

it('keeps the legacy overlay when the new key write throws', async () => {
  const legacy = `${STORE_KEYS.overlayPrefix}uma`
  const kept = 'legacy-keep'
  const map = new Map<string, string>([[legacy, kept]])
  const store: ChartStore = {
    get: (k) => map.get(k) ?? null,
    set: () => {
      throw new Error('denied')
    },
    remove: (k) => {
      map.delete(k)
    },
  }
  const w = mountViewer(store, { songId: 'uma' })
  await personalise(w)
  expect(store.get(legacy)).toBe(kept)
  w.unmount()
})
