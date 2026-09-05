import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'
import { normalizeSource } from '../../src/core/index'

const raw = () => loadFixture(JESUS_1)
/** The line indices an adjustment anchors on live in the normalised text. */
const src = () => normalizeSource(raw())
/** A line that appears once, so the diff cannot spread over a repeat. */
const UNIQUE = 'Je[G]sus, Tu És a minha [G]vida.'
/** The same line as the reader sees it, without the chord brackets. */
const PLAIN = 'Jesus, Tu És a minha vida.'

function mountViewer(props: Record<string, unknown> = {}) {
  return mount(ChordproViewer, {
    props: { source: src(), theme: 'dark', autoHide: false, songId: 'jesus-1', ...props },
    attachTo: document.body,
  })
}

/** Type into the source pane, which is how a whole-text edit reaches the app. */
async function writeSource(w: ReturnType<typeof mountViewer>, next: string) {
  await w.get('[data-source]').trigger('click')
  await flushPromises()
  await w.get('textarea[aria-label="Fonte ChordPro"]').setValue(next)
  await flushPromises()
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

async function personalise(w: ReturnType<typeof mountViewer>, text = ' (meu)') {
  await w.get('[data-edit]').trigger('click')
  await flushPromises()
  const pick = w.find('[data-mode-local]')
  if (pick.exists()) {
    await pick.trigger('click')
    await flushPromises()
  }
  await editLyric(w, PLAIN, PLAIN + text)
  await w.get('[data-read]').trigger('click')
  await flushPromises()
}

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('choosing where a save lands', () => {
  it('default is local-only: no "Para todos" unless the host turns it on', async () => {
    const w = mountViewer()
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(w.find('[data-mode-local]').exists()).toBe(false)
    expect(w.find('[data-mode-content]').exists()).toBe(false)
    expect(w.get('[data-edit-badge]').text()).toBe('Só para mim')
    expect(w.find('[data-save]').exists()).toBe(false)

    await editLyric(w, PLAIN, `${PLAIN} (meu)`)
    await w.get('[data-read]').trigger('click')
    await flushPromises()
    expect(w.emitted('save-content')).toBeUndefined()
    expect(w.find('[data-queue-chip]').exists()).toBe(false)
    w.unmount()
  })

  it('asks when both are allowed, and never after something was typed', async () => {
    const w = mountViewer({ modes: 'both' })
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(w.find('[data-mode-local]').exists()).toBe(true)
    expect(w.find('[data-mode-content]').exists()).toBe(true)
    expect(w.find('[data-edit-badge]').exists()).toBe(false)

    await w.get('[data-mode-local]').trigger('click')
    await flushPromises()
    expect(w.get('[data-edit-badge]').text()).toBe('Só para mim')
    // The phone version has no save button: it is already saved.
    expect(w.find('[data-save]').exists()).toBe(false)
    w.unmount()
  })

  it('modes="content" is how the host activates "Para todos"', async () => {
    const w = mountViewer({ modes: 'content' })
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(w.find('[data-mode-local]').exists()).toBe(false)
    expect(w.find('[data-mode-content]').exists()).toBe(false)
    expect(w.get('[data-edit-badge]').text()).toBe('Para todos')
    w.unmount()
  })

  it('modes="local" never offers the publish path even after an edit', async () => {
    const w = mountViewer({ modes: 'local' })
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(w.find('[data-mode-content]').exists()).toBe(false)
    expect(w.get('[data-edit-badge]').text()).toBe('Só para mim')
    expect(w.find('[data-save]').exists()).toBe(false)
    await w.get('[data-read]').trigger('click')
    await flushPromises()
    expect(w.emitted('save-content')).toBeUndefined()
    w.unmount()
  })

  it('modes="none" takes the editor away entirely', async () => {
    const w = mountViewer({ modes: 'none' })
    await flushPromises()
    expect(w.find('[data-edit]').exists()).toBe(false)
    w.unmount()
  })

  it('modes="both" → Para todos emits save-content for the host to persist', async () => {
    const w = mountViewer({ modes: 'both' })
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-mode-content]').trigger('click')
    await flushPromises()
    expect(w.get('[data-edit-badge]').text()).toBe('Para todos')
    const title = w.get('input[aria-label="Título"]')
    await title.setValue('Oficial agora')
    await title.trigger('blur')
    await flushPromises()
    await w.get('[data-save]').trigger('click')
    await flushPromises()
    expect(String(w.emitted('save-content')?.at(-1)?.[0] ?? '')).toContain('{title: Oficial agora}')
    w.unmount()
  })
})

describe('a version of my own', () => {
  it('stores the edit as an anchored op and reads it back', async () => {
    const w = mountViewer()
    await flushPromises()
    await personalise(w)

    const stored = JSON.parse(localStorage.getItem('cpv:my:jesus-1') ?? 'null')
    expect(stored.ops).toHaveLength(1)
    expect(stored.ops[0].type).toBe('replace')
    expect(w.text()).toContain('Minha versão · 1 ajuste')
    expect(w.get('[data-cpv-scroll]').text()).toContain('(meu)')
    // One op, one line: the mark sits exactly on what the reader changed.
    expect(w.findAll('[data-mine-dot]')).toHaveLength(1)
    w.unmount()
  })

  it('shows the official text without dropping the personal version', async () => {
    const w = mountViewer()
    await flushPromises()
    await personalise(w)

    await w.get('[data-read-orig]').trigger('click')
    await flushPromises()
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('(meu)')
    expect(w.findAll('[data-mine-dot]')).toHaveLength(0)
    expect(localStorage.getItem('cpv:my:jesus-1')).not.toBeNull()

    await w.get('[data-read-mine]').trigger('click')
    await flushPromises()
    expect(w.get('[data-cpv-scroll]').text()).toContain('(meu)')
    w.unmount()
  })

  it('reverts one stretch straight from its own mark', async () => {
    const w = mountViewer()
    await flushPromises()
    await personalise(w)

    await w.get('[data-mine-dot]').trigger('click')
    await flushPromises()
    expect(localStorage.getItem('cpv:my:jesus-1')).toBeNull()
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('(meu)')
    expect(w.find('[data-mine-switch]').exists()).toBe(false)
    w.unmount()
  })

  it('lists every adjustment, and asks twice before dropping them all', async () => {
    const w = mountViewer()
    await flushPromises()
    await personalise(w)

    await w.get('[data-open-my]').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-my-op]')).toHaveLength(1)

    expect(w.get('[data-revert-all]').text()).toBe('Voltar ao original')
    await w.get('[data-revert-all]').trigger('click')
    await flushPromises()
    expect(w.get('[data-revert-all]').text()).toBe('Confirmar — descartar tudo')
    await w.get('[data-revert-all]').trigger('click')
    await flushPromises()
    expect(localStorage.getItem('cpv:my:jesus-1')).toBeNull()
    w.unmount()
  })

  it('pins the key the reader arrived at', async () => {
    const w = mountViewer()
    await flushPromises()
    await personalise(w)
    await w.get('[data-transpose-up]').trigger('click')
    await w.get('[data-transpose-up]').trigger('click')
    await flushPromises()

    await w.get('[data-open-my]').trigger('click')
    await flushPromises()
    await w.get('[data-fix-tune]').trigger('click')
    await flushPromises()
    const ops = JSON.parse(localStorage.getItem('cpv:my:jesus-1') ?? 'null').ops
    expect(ops.find((o: { type: string }) => o.type === 'tune')).toMatchObject({ transpose: 2 })

    // Reopening the chart adopts the pinned key.
    w.unmount()
    const again = mountViewer()
    await flushPromises()
    expect(again.get('[data-display-key]').text()).toBe('A')
    again.unmount()
  })
})

describe('the official chart moved', () => {
  it('asks item by item before reapplying anything', async () => {
    const w = mountViewer()
    await flushPromises()
    await personalise(w)
    w.unmount()

    // Same chart, new official version: what the reader holds is put to them.
    const next = mountViewer({ version: 'v2' })
    await flushPromises()
    expect(next.find('[data-upd-dlg]').exists()).toBe(true)
    expect(next.findAll('[data-upd-item]')).toHaveLength(1)

    await next.get('[data-upd-keep]').trigger('click')
    await flushPromises()
    expect(next.find('[data-upd-dlg]').exists()).toBe(false)
    expect(next.get('[data-cpv-scroll]').text()).toContain('(meu)')
    expect(JSON.parse(localStorage.getItem('cpv:my:jesus-1') ?? 'null').baseVersion).toBe('v2')
    next.unmount()
  })

  it('adopting the new version drops the personal one', async () => {
    const w = mountViewer()
    await flushPromises()
    await personalise(w)
    w.unmount()

    const next = mountViewer({ version: 'v2' })
    await flushPromises()
    await next.get('[data-upd-adopt]').trigger('click')
    await flushPromises()
    expect(localStorage.getItem('cpv:my:jesus-1')).toBeNull()
    expect(next.get('[data-cpv-scroll]').text()).not.toContain('(meu)')
    next.unmount()
  })

  it('says nothing when the official text already absorbed the adjustment', async () => {
    const w = mountViewer()
    await flushPromises()
    await personalise(w)
    w.unmount()

    // The person in charge typed the same correction: it is official now.
    const adopted = src().replace(UNIQUE, UNIQUE + ' (meu)')
    const next = mountViewer({ source: adopted, version: 'v2' })
    await flushPromises()
    expect(next.find('[data-upd-dlg]').exists()).toBe(false)
    expect(localStorage.getItem('cpv:my:jesus-1')).toBeNull()
    expect(next.find('[data-mine-switch]').exists()).toBe(false)
    next.unmount()
  })
})

describe('suggesting to whoever owns the chart', () => {
  it('queues the ops and hands them over one at a time', async () => {
    // The owner queue is part of the "for everyone" surface.
    const w = mountViewer({ modes: 'both' })
    await flushPromises()
    await personalise(w)

    await w.get('[data-open-my]').trigger('click')
    await flushPromises()
    await w.get('[data-suggest]').trigger('click')
    await flushPromises()
    expect(JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')).toHaveLength(1)
    expect(w.get('[data-queue-chip]').text()).toContain('Sugestões · 1')

    await w.get('[data-queue-chip]').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-q-song]')).toHaveLength(1)
    await w.get('[data-q-song]').trigger('click')
    await flushPromises()
    await w.get('[data-q-sug]').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-q-op]')).toHaveLength(1)

    await w.get('[data-q-accept]').trigger('click')
    await flushPromises()
    expect(JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')).toHaveLength(0)
    // Accepting is publishing: the host is told, and the chart carries it.
    expect(w.emitted('save-content')?.at(-1)?.[0]).toContain('(meu)')
    // And it stopped being a personal adjustment — it is the chart now.
    expect(localStorage.getItem('cpv:my:jesus-1')).toBeNull()
    w.unmount()
  })

  it('refusing drops the request without touching the chart', async () => {
    const w = mountViewer({ modes: 'both' })
    await flushPromises()
    await personalise(w)
    await w.get('[data-open-my]').trigger('click')
    await flushPromises()
    await w.get('[data-suggest]').trigger('click')
    await flushPromises()

    await w.get('[data-queue-chip]').trigger('click')
    await flushPromises()
    await w.get('[data-q-song]').trigger('click')
    await flushPromises()
    await w.get('[data-q-sug]').trigger('click')
    await flushPromises()
    await w.get('[data-q-refuse]').trigger('click')
    await flushPromises()
    expect(JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')).toHaveLength(0)
    expect(w.emitted('save-content')).toBeUndefined()
    w.unmount()
  })

  it('suggestions=false takes the button away, the version stays', async () => {
    const w = mountViewer({ suggestions: false })
    await flushPromises()
    await personalise(w)
    await w.get('[data-open-my]').trigger('click')
    await flushPromises()
    expect(w.find('[data-suggest]').exists()).toBe(false)
    expect(w.findAll('[data-my-op]')).toHaveLength(1)
    w.unmount()
  })
})
