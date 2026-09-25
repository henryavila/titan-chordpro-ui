import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'
import { diffOps, normalizeSource, overlayKey, parse } from '../../src/core/index'

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

  it('modes="both" is deprecated and opens as local (no ModePick)', async () => {
    const w = mountViewer({ modes: 'both' })
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(w.find('[data-mode-local]').exists()).toBe(false)
    expect(w.find('[data-mode-content]').exists()).toBe(false)
    expect(w.get('[data-edit-badge]').text()).toBe('Só para mim')
    expect(w.find('[data-save]').exists()).toBe(false)
    w.unmount()
  })

  it('editMode="persisted" activates "Para todos"', async () => {
    const w = mountViewer({ editMode: 'persisted' })
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

  it('editMode="persisted" emits save-content for the host to persist', async () => {
    const w = mountViewer({ editMode: 'persisted' })
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(w.get('[data-edit-badge]').text()).toBe('Para todos')
    await w.get('[data-meta-open]').trigger('click')
    await flushPromises()
    await w.get('[data-meta-title]').setValue('Oficial agora')
    await w.get('[data-meta-apply]').trigger('click')
    await flushPromises()
    await w.get('[data-save]').trigger('click')
    await flushPromises()
    expect(String(w.emitted('save-content')?.at(-1)?.[0] ?? '')).toMatch(/\{title:\s*Oficial agora\}/)
    w.unmount()
  })

  it('keeps persisted editing when the host echoes a title change', async () => {
    const w = mountViewer({ songId: '', editMode: 'persisted' })
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(w.get('[data-edit-badge]').text()).toBe('Para todos')
    await w.get('[data-meta-open]').trigger('click')
    await flushPromises()
    await w.get('[data-meta-title]').setValue('Titulo ecoado')
    await w.get('[data-meta-apply]').trigger('click')
    await flushPromises()
    const echoed = String(w.emitted('update:source')?.at(-1)?.[0] ?? '')
    expect(echoed).toMatch(/\{title:\s*Titulo ecoado\}/)
    await w.setProps({ source: echoed })
    await flushPromises()

    expect(w.get('[data-edit-badge]').text()).toBe('Para todos')
    expect(w.find('[data-save]').exists()).toBe(true)
    expect(w.text()).not.toMatch(/rascunho anterior foi descartado/)

    const emitted = w.emitted('update:source')?.length ?? 0
    await w.get('[data-meta-open]').trigger('click')
    await flushPromises()
    await w.get('[data-meta-title]').setValue('Titulo de novo')
    await w.get('[data-meta-apply]').trigger('click')
    await flushPromises()
    expect(w.emitted('update:source')?.length ?? 0).toBeGreaterThan(emitted)
    expect(String(w.emitted('update:source')?.at(-1)?.[0] ?? '')).toMatch(/\{title:\s*Titulo de novo\}/)
    w.unmount()
  })
})

describe('a version of my own', () => {
  it('stores the edit as an anchored op and reads it back', async () => {
    const w = mountViewer()
    await flushPromises()
    await personalise(w)

    const stored = JSON.parse(localStorage.getItem(overlayKey('jesus-1')) ?? 'null')
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
    expect(localStorage.getItem(overlayKey('jesus-1'))).not.toBeNull()

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
    expect(localStorage.getItem(overlayKey('jesus-1'))).toBeNull()
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
    expect(localStorage.getItem(overlayKey('jesus-1'))).toBeNull()
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
    const ops = JSON.parse(localStorage.getItem(overlayKey('jesus-1')) ?? 'null').ops
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
    expect(JSON.parse(localStorage.getItem(overlayKey('jesus-1')) ?? 'null').baseVersion).toBe('v2')
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
    expect(localStorage.getItem(overlayKey('jesus-1'))).toBeNull()
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
    expect(localStorage.getItem(overlayKey('jesus-1'))).toBeNull()
    expect(next.find('[data-mine-switch]').exists()).toBe(false)
    next.unmount()
  })
})

async function identify(w: ReturnType<typeof mountViewer>, name = 'Ana Souza') {
  await w.get('[data-suggest-name]').setValue(name)
  await flushPromises()
}

async function confirmSuggest(w: ReturnType<typeof mountViewer>, name = 'Ana Souza') {
  await identify(w, name)
  await w.get('[data-suggest]').trigger('click')
  await flushPromises()
  expect(w.get('[data-suggest]').text()).toMatch(/Confirmar/i)
  await w.get('[data-suggest]').trigger('click')
  await flushPromises()
}

describe('suggesting to whoever owns the chart', () => {
  it('does not queue without a name', async () => {
    const local = mountViewer({ editMode: 'local' })
    await flushPromises()
    await personalise(local)
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    await local.get('[data-suggest]').trigger('click')
    await flushPromises()
    expect(JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')).toHaveLength(0)
    expect(local.emitted('suggestion-created')).toBeUndefined()
    expect(local.get('[data-suggest]').text()).not.toMatch(/Confirmar/i)
    expect(local.get('[data-suggest-name]').attributes('aria-invalid')).toBe('true')
    expect(local.get('[data-suggest-name-error]').text()).toMatch(/obrigatório/i)
    expect(local.get('.cpv-toast').text()).toMatch(/obrigatório|nome/i)
    local.unmount()
  })

  it('clears the name error as soon as the field is filled', async () => {
    const local = mountViewer({ editMode: 'local' })
    await flushPromises()
    await personalise(local)
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    await local.get('[data-suggest]').trigger('click')
    await flushPromises()
    expect(local.find('[data-suggest-name-error]').exists()).toBe(true)
    await identify(local)
    expect(local.find('[data-suggest-name-error]').exists()).toBe(false)
    expect(local.get('[data-suggest-name]').attributes('aria-invalid')).toBe('false')
    local.unmount()
  })

  it('asks twice before sending — first tap does not queue', async () => {
    const local = mountViewer({ editMode: 'local' })
    await flushPromises()
    await personalise(local)
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    await identify(local)
    await local.get('[data-suggest]').trigger('click')
    await flushPromises()
    expect(JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')).toHaveLength(0)
    expect(local.emitted('suggestion-created')).toBeUndefined()
    expect(local.get('[data-suggest]').text()).toMatch(/Confirmar/i)
    local.unmount()
  })

  it('queues on local; admin persisted reviews and archives (not deletes)', async () => {
    const local = mountViewer({ editMode: 'local' })
    await flushPromises()
    await personalise(local)
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    await confirmSuggest(local)
    expect(JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')).toHaveLength(1)
    expect(local.emitted('suggestion-created')).toHaveLength(1)
    local.unmount()

    const admin = mountViewer({ editMode: 'persisted' })
    await flushPromises()
    expect(admin.get('[data-queue-chip]').text()).toMatch(/Sugestões/)
    expect(admin.get('[data-queue-count]').text()).toBe('1')
    await admin.get('[data-queue-chip]').trigger('click')
    await flushPromises()
    expect(admin.findAll('[data-q-song]')).toHaveLength(1)
    await admin.get('[data-q-song]').trigger('click')
    await flushPromises()
    expect(admin.get('[data-q-actor]').text()).toMatch(/Ana Souza/)
    await admin.get('[data-q-sug]').trigger('click')
    await flushPromises()
    expect(admin.get('[data-q-reviewer-actor]').text()).toMatch(/Ana Souza/)
    expect(admin.findAll('[data-q-op]')).toHaveLength(1)
    expect(admin.find('[data-q-accept-batch]').exists()).toBe(true)

    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    const list = JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')
    expect(list).toHaveLength(1)
    expect(list[0].status).toBe('accepted')
    expect(list[0].ops).toHaveLength(0)
    expect(list[0].resolvedOps).toHaveLength(1)
    expect(admin.emitted('save-content')?.at(-1)?.[0]).toContain('(meu)')
    expect(admin.emitted('suggestion-accepted')).toHaveLength(1)
    admin.unmount()
  })

  it('refusing archives the request without touching the chart', async () => {
    const local = mountViewer({ editMode: 'local' })
    await flushPromises()
    await personalise(local)
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    await confirmSuggest(local)
    local.unmount()

    const admin = mountViewer({ editMode: 'persisted' })
    await flushPromises()
    await admin.get('[data-queue-chip]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-song]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-sug]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-refuse]').trigger('click')
    await flushPromises()
    const list = JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')
    expect(list).toHaveLength(1)
    expect(list[0].status).toBe('refused')
    expect(admin.emitted('save-content')).toBeUndefined()
    expect(admin.emitted('suggestion-refused')).toHaveLength(1)
    admin.unmount()
  })

  it('keeps the suggestion badge on a phone and on Mais', async () => {
    const observers: ((entries: unknown[]) => void)[] = []
    class TestRO {
      constructor(cb: (entries: unknown[]) => void) {
        observers.push(cb)
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    const realRO = globalThis.ResizeObserver
    globalThis.ResizeObserver = TestRO as unknown as typeof ResizeObserver
    try {
      const local = mountViewer({ editMode: 'local' })
      await flushPromises()
      await personalise(local)
      await local.get('[data-open-my]').trigger('click')
      await flushPromises()
      await confirmSuggest(local)
      local.unmount()

      const admin = mountViewer({ editMode: 'persisted' })
      await flushPromises()
      observers.forEach((cb) => cb([{ contentRect: { width: 390, height: 800 } }]))
      await flushPromises()
      expect(admin.get('[data-queue-chip]').classes()).not.toContain('is-hidden')
      expect(admin.get('[data-queue-count]').text()).toBe('1')
      expect(admin.get('[data-more-queue-badge]').text()).toBe('1')
      admin.unmount()
    } finally {
      globalThis.ResizeObserver = realRO
    }
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

describe('host persistSuggestion ack', () => {
  it('does not toast enviada until persistSuggestion resolves', async () => {
    let resolve!: () => void
    const persist = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r
        }),
    )
    const local = mountViewer({ persistSuggestion: persist })
    await flushPromises()
    await personalise(local)
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    await confirmSuggest(local)
    expect(persist).toHaveBeenCalledTimes(1)
    expect(local.get('[data-suggest]').text()).toMatch(/Enviando/i)
    expect(local.get('[data-suggest]').attributes('aria-busy')).toBe('true')
    expect(local.get('.cpv-toast').text()).not.toMatch(/enviada/i)
    expect(local.emitted('suggestion-created')).toBeUndefined()
    expect(JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')).toHaveLength(0)
    expect(local.find('[data-my-sugs]').exists()).toBe(false)
    expect(local.get('[data-revert]').attributes('disabled')).toBeDefined()
    expect(local.get('[data-revert-all]').attributes('disabled')).toBeDefined()
    await local.get('[data-revert-all]').trigger('click')
    await local.get('[data-revert-all]').trigger('click')
    await flushPromises()
    expect(local.findAll('[data-my-op]')).toHaveLength(1)
    resolve()
    await flushPromises()
    expect(JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')).toHaveLength(1)
    expect(local.get('.cpv-toast').text()).toMatch(/enviada/i)
    expect(local.emitted('suggestion-created')).toHaveLength(1)
    expect(local.find('[data-suggest]').exists()).toBe(false)
    local.unmount()
  })

  it('picks up persistSuggestion bound after mount', async () => {
    let resolve!: () => void
    const persist = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r
        }),
    )
    const local = mountViewer()
    await flushPromises()
    await personalise(local)
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    await identify(local)
    await local.get('[data-suggest]').trigger('click')
    await flushPromises()
    await local.setProps({ persistSuggestion: persist })
    await flushPromises()
    await local.get('[data-suggest]').trigger('click')
    await flushPromises()
    expect(persist).toHaveBeenCalledTimes(1)
    expect(local.emitted('suggestion-created')).toBeUndefined()
    expect(local.get('[data-suggest]').text()).toMatch(/Enviando/i)
    resolve()
    await flushPromises()
    expect(local.emitted('suggestion-created')).toHaveLength(1)
    local.unmount()
  })

  it('does not emit update:suggestionQueue until persistSuggestion resolves', async () => {
    let resolve!: () => void
    const persist = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r
        }),
    )
    const local = mountViewer({ persistSuggestion: persist, suggestionQueue: [] })
    await flushPromises()
    await personalise(local)
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    await confirmSuggest(local)
    expect(local.emitted('update:suggestionQueue')).toBeUndefined()
    expect(local.find('[data-my-sugs]').exists()).toBe(false)
    resolve()
    await flushPromises()
    expect(local.emitted('update:suggestionQueue')?.at(-1)?.[0]).toHaveLength(1)
    local.unmount()
  })

  it('rolls the queue back and keeps Minha versão when persistSuggestion rejects', async () => {
    const persist = vi.fn(() => Promise.reject(new Error('offline')))
    const local = mountViewer({ persistSuggestion: persist, suggestionQueue: [] })
    await flushPromises()
    await personalise(local)
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    await confirmSuggest(local)
    await flushPromises()
    expect(persist).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')).toHaveLength(0)
    expect(local.emitted('update:suggestionQueue')).toBeUndefined()
    expect(local.emitted('suggestion-created')).toBeUndefined()
    expect(local.get('.cpv-toast').text()).toMatch(/não foi possível enviar|tente de novo/i)
    expect(local.find('[data-suggest]').exists()).toBe(true)
    expect(local.findAll('[data-my-op]')).toHaveLength(1)
    expect(local.get('[data-suggest]').text()).not.toMatch(/Enviando/i)
    local.unmount()
  })

  it('treats a void persistSuggestion as a failed ack, not enviada', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const persist = vi.fn(() => undefined)
    const local = mountViewer({ persistSuggestion: persist })
    await flushPromises()
    await personalise(local)
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    await confirmSuggest(local)
    await flushPromises()
    expect(persist).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')).toHaveLength(0)
    expect(local.emitted('suggestion-created')).toBeUndefined()
    expect(local.get('.cpv-toast').text()).toMatch(/não foi possível enviar|tente de novo/i)
    expect(local.find('[data-suggest]').exists()).toBe(true)
    expect(local.findAll('[data-my-op]')).toHaveLength(1)
    expect(String(err.mock.calls.at(0))).toMatch(/Promise|return/i)
    err.mockRestore()
    local.unmount()
  })
})

/** Two named charts. The default chart is oferta — not the implicit `default` slot. */
const TWO_CHARTS = [
  '{start_of_x_chart:completa}',
  '{title:Uma}',
  '{artist:Alguém}',
  '{x_chart_label:Completa}',
  '{key:G}',
  '{duration:04:26}',
  '[G]corpo da completa',
  '{end_of_x_chart}',
  '{start_of_x_chart:oferta}',
  '{title:Uma}',
  '{artist:Alguém}',
  '{x_chart_label:Oferta}',
  '{x_chart_default:oferta}',
  '{key:C}',
  '{duration:02:00}',
  '[C]corpo da oferta',
  '{end_of_x_chart}',
].join('\n')

function chartBlock(file: string, id: string): string {
  const start = file.indexOf(`{start_of_x_chart:${id}}`)
  const end = file.indexOf('{end_of_x_chart}', start)
  return file.slice(start, end + '{end_of_x_chart}'.length)
}

async function pickChart(w: ReturnType<typeof mountViewer>, id: string) {
  await w.get('[data-chart-switch]').trigger('click')
  await flushPromises()
  await w.get(`[data-chart-option="${id}"]`).trigger('click')
  await flushPromises()
}

describe('suggestion per chart', () => {
  it('stamps the active chart, diffs that document, and splices the whole file on accept', async () => {
    const local = mountViewer({ source: TWO_CHARTS, songId: 'uma', editMode: 'local' })
    await flushPromises()
    await local.get('[data-edit]').trigger('click')
    await flushPromises()
    await local.get('[data-meta-open]').trigger('click')
    await flushPromises()
    await local.get('[data-meta-title]').setValue('Oferta nova')
    await local.get('[data-meta-apply]').trigger('click')
    await flushPromises()
    await local.get('[data-read]').trigger('click')
    await flushPromises()
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    await confirmSuggest(local)

    const created = JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')[0]
    const chart = parse(TWO_CHARTS, { chartId: 'oferta' }).source
    const titleAt = chart.split('\n').findIndex((l) => l === '{title:Uma}')
    expect(created.chartId).toBe('oferta')
    expect(created.songId).toBe('uma')
    const titleOp = created.ops.find((op: { before?: string[] }) => op.before?.includes('{title:Uma}'))
    expect(titleOp.at).toBe(titleAt)
    expect(titleAt).not.toBe(TWO_CHARTS.split('\n').findIndex((l) => l === '{title:Uma}'))
    expect(local.emitted('suggestion-created')?.[0]?.[0]).toMatchObject({ chartId: 'oferta' })
    local.unmount()

    const list = JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')
    list.push({
      id: 's-completa',
      songId: 'uma',
      chartId: 'completa',
      title: 'Uma',
      at: 1,
      baseVersion: 'v1',
      status: 'pending',
      actorName: 'Bia',
      ops: [
        {
          id: 'op-c',
          type: 'replace',
          at: 0,
          anchor: '',
          anchorHash: '0',
          before: ['{title:Uma}'],
          after: ['{title:Completa nova}'],
          ctx: { transpose: 0, capo: 0 },
        },
      ],
      resolvedOps: [],
    })
    list.push({
      ...created,
      id: 's-oferta-2',
      at: 2,
    })
    localStorage.setItem('cpv:sug', JSON.stringify(list))

    const admin = mountViewer({ source: TWO_CHARTS, songId: 'uma', editMode: 'persisted' })
    await flushPromises()
    await admin.get('[data-queue-chip]').trigger('click')
    await flushPromises()
    const songs = admin.findAll('[data-q-song]')
    expect(songs).toHaveLength(2)
    expect(songs.map((s) => s.text()).join('\n')).toContain('Oferta nova · Oferta')
    expect(songs.map((s) => s.text()).join('\n')).toContain('Uma · Completa')
    const ofertaRow = songs.find((s) => s.text().includes('Oferta nova · Oferta'))
    expect(ofertaRow?.text()).toContain('2 pedidos')

    await ofertaRow!.trigger('click')
    await flushPromises()
    await admin.get('[data-q-sug]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()

    const saved = String(admin.emitted('save-content')?.at(-1)?.[0] ?? '')
    expect(saved).toContain('{start_of_x_chart:completa}')
    expect(saved).toContain('{start_of_x_chart:oferta}')
    expect(parse(saved, { chartId: 'completa' }).meta.title).toBe('Uma')
    expect(parse(saved, { chartId: 'oferta' }).meta.title).toBe('Oferta nova')
    expect(saved).toContain('[G]corpo da completa')
    expect(saved).toContain('[C]corpo da oferta')
    expect(chartBlock(saved, 'completa')).toBe(chartBlock(TWO_CHARTS, 'completa'))
    expect(saved).not.toBe(parse(saved, { chartId: 'oferta' }).source)
    admin.unmount()
  })

  it('puts an accepted sibling chart into the working file', async () => {
    localStorage.setItem(
      'cpv:sug',
      JSON.stringify([
        {
          id: 's-completa',
          songId: 'uma',
          chartId: 'completa',
          title: 'Uma',
          at: 1,
          baseVersion: 'v1',
          status: 'pending',
          actorName: 'Bia',
          ops: [
            {
              id: 'op-c',
              type: 'replace',
              at: 0,
              anchor: '',
              anchorHash: '0',
              before: ['{title:Uma}'],
              after: ['{title:Completa nova}'],
              ctx: { transpose: 0, capo: 0 },
            },
          ],
          resolvedOps: [],
        },
      ]),
    )

    const admin = mountViewer({ source: TWO_CHARTS, songId: 'uma', editMode: 'persisted' })
    await flushPromises()
    expect(admin.get('[data-cpv-scroll]').text()).toContain('corpo da oferta')
    await admin.get('[data-queue-chip]').trigger('click')
    await flushPromises()
    const row = admin.findAll('[data-q-song]').find((s) => s.text().includes('Uma · Completa'))
    expect(row).toBeTruthy()
    await row!.trigger('click')
    await flushPromises()
    await admin.get('[data-q-sug]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()

    const working = (admin.vm as { getSource: () => string }).getSource()
    expect(parse(working, { chartId: 'completa' }).meta.title).toBe('Completa nova')
    expect(parse(working, { chartId: 'oferta' }).meta.title).toBe('Uma')
    expect(working).toContain('{start_of_x_chart:completa}')
    expect(working).toContain('{start_of_x_chart:oferta}')
    expect(admin.get('[data-cpv-scroll]').text()).toContain('corpo da oferta')
    expect(admin.get('[data-cpv-scroll]').text()).not.toContain('corpo da completa')
    const saved = String(admin.emitted('save-content')?.at(-1)?.[0] ?? '')
    expect(saved).toBe(working)
    expect(saved).not.toBe(parse(saved, { chartId: 'oferta' }).source)
    admin.unmount()
  })

  it('keeps an unsaved oferta rascunho when accepting a sibling chart', async () => {
    localStorage.setItem(
      'cpv:sug',
      JSON.stringify([
        {
          id: 's-completa',
          songId: 'uma',
          chartId: 'completa',
          title: 'Uma',
          at: 1,
          baseVersion: 'v1',
          status: 'pending',
          actorName: 'Bia',
          ops: [
            {
              id: 'op-c',
              type: 'replace',
              at: 0,
              anchor: '',
              anchorHash: '0',
              before: ['{title:Uma}'],
              after: ['{title:Completa nova}'],
              ctx: { transpose: 0, capo: 0 },
            },
          ],
          resolvedOps: [],
        },
      ]),
    )

    const admin = mountViewer({ source: TWO_CHARTS, songId: 'uma', editMode: 'persisted' })
    await flushPromises()
    expect(admin.get('[data-cpv-scroll]').text()).toContain('corpo da oferta')
    await admin.get('[data-edit]').trigger('click')
    await flushPromises()
    const row = admin.findAll('[data-row]').find((r) => r.text().includes('corpo da oferta'))
    expect(row).toBeTruthy()
    await row!.trigger('click')
    await flushPromises()
    const input = admin.get('input[aria-label="Letra desta linha"]')
    await input.setValue('corpo da oferta (rascunho)')
    await input.trigger('blur')
    await flushPromises()
    await admin.get('[data-read]').trigger('click')
    await flushPromises()
    expect(admin.text()).toMatch(/Rascunho não salvo/)
    expect((admin.vm as { getSource: () => string }).getSource()).toContain('corpo da oferta (rascunho)')

    await admin.get('[data-queue-chip]').trigger('click')
    await flushPromises()
    const qRow = admin.findAll('[data-q-song]').find((s) => s.text().includes('Uma · Completa'))
    expect(qRow).toBeTruthy()
    await qRow!.trigger('click')
    await flushPromises()
    await admin.get('[data-q-sug]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()

    const working = (admin.vm as { getSource: () => string }).getSource()
    expect(working).toContain('corpo da oferta (rascunho)')
    expect(parse(working, { chartId: 'completa' }).meta.title).toBe('Completa nova')
    expect(working).toContain('{start_of_x_chart:completa}')
    expect(working).toContain('{start_of_x_chart:oferta}')
    expect(admin.get('[data-cpv-scroll]').text()).toContain('corpo da oferta (rascunho)')
    expect(admin.get('[data-cpv-scroll]').text()).not.toContain('corpo da completa')
    const saved = String(admin.emitted('save-content')?.at(-1)?.[0] ?? '')
    expect(saved).toContain('{start_of_x_chart:completa}')
    expect(saved).toContain('{start_of_x_chart:oferta}')
    expect(parse(saved, { chartId: 'completa' }).meta.title).toBe('Completa nova')
    expect(saved).not.toContain('(rascunho)')
    expect(saved).not.toBe(working)
    admin.unmount()
  })

  it('does not treat a sibling overlay as stale when another chart is published', async () => {
    const completa = parse(TWO_CHARTS, { chartId: 'completa' }).source
    const mine = completa.replace('{title:Uma}', '{title:Uma minha}')
    const completaOps = diffOps(completa, mine, { transpose: 0, capo: 0 })
    localStorage.setItem(
      overlayKey('uma', 'completa'),
      JSON.stringify({ baseVersion: 'v1', ops: completaOps, at: 1 }),
    )
    const oferta = parse(TWO_CHARTS, { chartId: 'oferta' }).source
    const ofertaOps = diffOps(oferta, oferta.replace('{title:Uma}', '{title:Oferta nova}'), {
      transpose: 0,
      capo: 0,
    })
    localStorage.setItem(
      'cpv:sug',
      JSON.stringify([
        {
          id: 's-oferta',
          songId: 'uma',
          chartId: 'oferta',
          title: 'Uma',
          at: 1,
          baseVersion: 'v1',
          status: 'pending',
          actorName: 'Bia',
          ops: ofertaOps,
          resolvedOps: [],
        },
      ]),
    )

    const admin = mountViewer({
      source: TWO_CHARTS,
      songId: 'uma',
      editMode: 'persisted',
      chartId: 'completa',
    })
    await flushPromises()
    expect(admin.get('[data-chart-title]').text()).toBe('Uma minha')
    expect(admin.get('[data-cpv-scroll]').text()).toContain('corpo da completa')

    await admin.get('[data-queue-chip]').trigger('click')
    await flushPromises()
    const qRow = admin.findAll('[data-q-song]').find((s) => s.text().includes('Oferta'))
    expect(qRow).toBeTruthy()
    await qRow!.trigger('click')
    await flushPromises()
    await admin.get('[data-q-sug]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()

    expect(admin.find('[data-upd-dlg]').exists()).toBe(false)
    expect(JSON.parse(localStorage.getItem(overlayKey('uma', 'completa')) ?? 'null').ops).toHaveLength(1)
    const saved = String(admin.emitted('save-content')?.at(-1)?.[0] ?? '')
    expect(parse(saved, { chartId: 'completa' }).meta.title).toBe('Uma')
    expect(parse(saved, { chartId: 'oferta' }).meta.title).toBe('Oferta nova')
    expect(admin.get('[data-chart-title]').text()).toBe('Uma minha')
    expect(admin.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(admin.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
    admin.unmount()
  })

  it('does not accept a suggestion whose chart id is not in the file', async () => {
    const oferta = parse(TWO_CHARTS, { chartId: 'oferta' }).source
    const ops = diffOps(oferta, oferta.replace('[C]corpo da oferta', '[C]corpo da oferta (ok)'), {
      transpose: 0,
      capo: 0,
    })
    localStorage.setItem(
      'cpv:sug',
      JSON.stringify([
        {
          id: 's-ghost',
          songId: 'uma',
          chartId: 'fantasma',
          title: 'Uma',
          at: 1,
          baseVersion: 'v1',
          status: 'pending',
          actorName: 'Bia',
          ops,
          resolvedOps: [],
        },
      ]),
    )
    const admin = mountViewer({ source: TWO_CHARTS, songId: 'uma', editMode: 'persisted' })
    await flushPromises()
    await admin.get('[data-queue-chip]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-song]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-sug]').trigger('click')
    await flushPromises()
    expect(admin.get('[data-q-batch]').text()).toMatch(/0 encaixam/)
    expect(admin.get('[data-q-batch]').text()).toMatch(/conflito/)

    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    const list = JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')
    expect(list[0].ops).toHaveLength(1)
    expect(list[0].resolvedOps).toHaveLength(0)
    expect(admin.emitted('save-content')).toBeUndefined()
    expect(admin.get('.cpv-toast').text()).toMatch(/não encaixa/i)
    expect(String(admin.emitted('save-content')?.at(-1)?.[0] ?? TWO_CHARTS)).toBe(TWO_CHARTS)
    admin.unmount()
  })

  it('does not accept a suggestion whose song is not the open file', async () => {
    const official = src()
    const changed = official.replace(UNIQUE, `${UNIQUE} (outro)`)
    const ops = diffOps(official, changed, { transpose: 0, capo: 0 })
    localStorage.setItem(
      'cpv:sug',
      JSON.stringify([
        {
          id: 's-outra',
          songId: 'outra',
          title: 'Outra',
          at: 1,
          baseVersion: 'v1',
          status: 'pending',
          actorName: 'Bia',
          ops,
          resolvedOps: [],
        },
      ]),
    )
    const admin = mountViewer({ editMode: 'persisted' })
    await flushPromises()
    await admin.get('[data-queue-chip]').trigger('click')
    await flushPromises()
    const row = admin.get('[data-q-song]')
    expect(row.text()).toContain('Outra')
    expect(row.text()).not.toContain('default')
    await row.trigger('click')
    await flushPromises()
    await admin.get('[data-q-sug]').trigger('click')
    await flushPromises()
    expect(admin.get('[data-q-batch]').text()).toMatch(/0 encaixam/)

    await admin.get('[data-q-accept]').trigger('click')
    await flushPromises()
    await admin.get('[data-q-accept-batch]').trigger('click')
    await flushPromises()

    const list = JSON.parse(localStorage.getItem('cpv:sug') ?? '[]')
    expect(list[0].songId).toBe('outra')
    expect(list[0].status).toBe('pending')
    expect(list[0].ops).toHaveLength(ops.length)
    expect(list[0].resolvedOps).toHaveLength(0)
    expect(admin.emitted('save-content')).toBeUndefined()
    expect(admin.emitted('suggestion-accepted')).toBeUndefined()
    expect((admin.vm as { getSource: () => string }).getSource()).not.toContain('(outro)')
    expect(admin.get('.cpv-chart').text()).not.toContain('(outro)')
    expect(admin.text()).not.toContain('Aceito — já vale para todos')
    expect(admin.get('.cpv-toast').text()).toMatch(/Abra essa música/)
    admin.unmount()
  })
})

describe('switching the chart on screen', () => {
  it('does not carry the default chart overlay onto the chart that opens once its default marker is removed', async () => {
    const oferta = parse(TWO_CHARTS, { chartId: 'oferta' }).source
    const mine = oferta.replace('{title:Uma}', '{title:Uma minha}')
    const ops = diffOps(oferta, mine, { transpose: 0, capo: 0 })
    localStorage.setItem(
      overlayKey('uma', 'oferta'),
      JSON.stringify({ baseVersion: 'v1', ops, at: 1 }),
    )

    const w = mountViewer({ source: TWO_CHARTS, songId: 'uma', editMode: 'persisted' })
    await flushPromises()
    expect(w.get('[data-chart-title]').text()).toBe('Uma minha')

    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-source]').trigger('click')
    await flushPromises()
    const area = w.get('textarea[aria-label="Fonte ChordPro"]')
    const shown = String((area.element as HTMLTextAreaElement).value)
    expect(shown).toContain('{x_chart_default:oferta}')
    await area.setValue(shown.replace('{x_chart_default:oferta}\n', '').replace('{x_chart_default:oferta}', ''))
    await flushPromises()
    await w.get('[data-save]').trigger('click')
    await flushPromises()
    await w.get('[data-read]').trigger('click')
    await flushPromises()

    expect(w.get('[data-chart-title]').text()).toBe('Uma')
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
    expect(w.text()).not.toContain('Uma minha')
    expect(w.text()).not.toContain('Minha versão')
    const reading = (w.vm as { getSource: () => string }).getSource()
    expect(parse(reading).meta.title).toBe('Uma')
    expect(parse(reading, { chartId: 'completa' }).meta.title).toBe('Uma')
    expect(localStorage.getItem(overlayKey('uma', 'completa'))).toBeNull()
    expect(JSON.parse(localStorage.getItem(overlayKey('uma', 'oferta')) ?? 'null').ops).toHaveLength(1)
    w.unmount()
  })

  it('reloads the chart that opens when the default overlay removes its marker', async () => {
    const oferta = parse(TWO_CHARTS, { chartId: 'oferta' }).source
    const semMarcador = oferta.replace('{x_chart_default:oferta}\n', '').replace('{x_chart_default:oferta}', '')
    const ofertaOps = diffOps(oferta, semMarcador, { transpose: 0, capo: 0 })
    expect(ofertaOps.some((op) => op.before.some((line) => line.includes('x_chart_default:oferta')))).toBe(true)

    const completa = parse(TWO_CHARTS, { chartId: 'completa' }).source
    const completaMine = completa.replace('[G]corpo da completa', '[G]corpo da completa (meu)')
    const completaOps = diffOps(completa, completaMine, { transpose: 0, capo: 0 })
    const song = 'uma'
    localStorage.setItem(overlayKey(song, 'oferta'), JSON.stringify({ baseVersion: 'v1', ops: ofertaOps, at: 1 }))
    localStorage.setItem(
      overlayKey(song, 'completa'),
      JSON.stringify({ baseVersion: 'v1', ops: completaOps, at: 2 }),
    )
    const seededCompleta = localStorage.getItem(overlayKey(song, 'completa'))
    const seededOferta = localStorage.getItem(overlayKey(song, 'oferta'))

    const w = mountViewer({ source: TWO_CHARTS, songId: song })
    await flushPromises()
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
    expect(w.get('[data-cpv-scroll]').text()).toContain('(meu)')

    await w.get('[data-open-my]').trigger('click')
    await flushPromises()
    // The opened chart's own op, not the marker removal that is still stored on oferta.
    expect(w.get('[data-my-op]').text()).toContain('(meu)')
    expect(localStorage.getItem(overlayKey(song, 'completa'))).toBe(seededCompleta)
    expect(localStorage.getItem(overlayKey(song, 'oferta'))).toBe(seededOferta)

    await w.get('[data-revert]').trigger('click')
    await flushPromises()

    // Revert targets that visible op. Oferta keeps its own op; completa is not replaced by it.
    expect(localStorage.getItem(overlayKey(song, 'oferta'))).toBe(seededOferta)
    expect(localStorage.getItem(overlayKey(song, 'completa'))).toBeNull()
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('(meu)')
    w.unmount()
  })

  it('keeps the opened chart when reading the original', async () => {
    const oferta = parse(TWO_CHARTS, { chartId: 'oferta' }).source
    const semMarcador = oferta.replace('{x_chart_default:oferta}\n', '').replace('{x_chart_default:oferta}', '')
    const ofertaOps = diffOps(oferta, semMarcador, { transpose: 0, capo: 0 })
    const completa = parse(TWO_CHARTS, { chartId: 'completa' }).source
    const completaMine = completa.replace('[G]corpo da completa', '[G]corpo da completa (meu)')
    const completaOps = diffOps(completa, completaMine, { transpose: 0, capo: 0 })
    const song = 'uma'
    localStorage.setItem(overlayKey(song, 'oferta'), JSON.stringify({ baseVersion: 'v1', ops: ofertaOps, at: 1 }))
    localStorage.setItem(
      overlayKey(song, 'completa'),
      JSON.stringify({ baseVersion: 'v1', ops: completaOps, at: 2 }),
    )

    const w = mountViewer({ source: TWO_CHARTS, songId: song })
    await flushPromises()
    expect(w.get('[data-cpv-scroll]').text()).toContain('(meu)')

    await w.get('[data-read-orig]').trigger('click')
    await flushPromises()
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('(meu)')

    await w.get('[data-read-mine]').trigger('click')
    await flushPromises()
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).toContain('(meu)')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
    w.unmount()
  })

  it('keeps the opened chart when local editing starts', async () => {
    const oferta = parse(TWO_CHARTS, { chartId: 'oferta' }).source
    const semMarcador = oferta.replace('{x_chart_default:oferta}\n', '').replace('{x_chart_default:oferta}', '')
    const ofertaOps = diffOps(oferta, semMarcador, { transpose: 0, capo: 0 })
    const completa = parse(TWO_CHARTS, { chartId: 'completa' }).source
    const completaMine = completa.replace('[G]corpo da completa', '[G]corpo da completa (meu)')
    const completaOps = diffOps(completa, completaMine, { transpose: 0, capo: 0 })
    const song = 'uma'
    localStorage.setItem(overlayKey(song, 'oferta'), JSON.stringify({ baseVersion: 'v1', ops: ofertaOps, at: 1 }))
    localStorage.setItem(
      overlayKey(song, 'completa'),
      JSON.stringify({ baseVersion: 'v1', ops: completaOps, at: 2 }),
    )

    const w = mountViewer({ source: TWO_CHARTS, songId: song })
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()

    expect(w.get('[data-edit-badge]').text()).toBe('Só para mim')
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
    w.unmount()
  })

  it('applies the opened chart transpose, capo and dual', async () => {
    const oferta = parse(TWO_CHARTS, { chartId: 'oferta' }).source
    const semMarcador = oferta.replace('{x_chart_default:oferta}\n', '').replace('{x_chart_default:oferta}', '')
    const ofertaOps = diffOps(oferta, semMarcador, { transpose: 0, capo: 0 })
    const completa = parse(TWO_CHARTS, { chartId: 'completa' }).source
    const completaMine = completa.replace('[G]corpo da completa', '[G]corpo da completa (meu)')
    const completaOps = diffOps(completa, completaMine, { transpose: 0, capo: 0 })
    const song = 'uma'
    localStorage.setItem(overlayKey(song, 'oferta'), JSON.stringify({ baseVersion: 'v1', ops: ofertaOps, at: 1 }))
    localStorage.setItem(
      overlayKey(song, 'completa'),
      JSON.stringify({
        baseVersion: 'v1',
        ops: [
          {
            id: 'tune',
            type: 'tune',
            transpose: 2,
            capo: 2,
            dual: true,
            ctx: { transpose: 2, capo: 2 },
          },
          ...completaOps,
        ],
        at: 2,
      }),
    )

    const w = mountViewer({ source: TWO_CHARTS, songId: song })
    await flushPromises()
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).toContain('(meu)')
    expect(w.get('[data-display-key]').text()).toBe('A')
    expect(w.get('[data-capo]').text()).toMatch(/Dual · capo 2/i)
    w.unmount()
  })

  it('resets transpose, capo and dual when the opened chart has no tune', async () => {
    const source = TWO_CHARTS.replace('{key:G}', '{key:G}\n{capo:3}')
    const oferta = parse(source, { chartId: 'oferta' }).source
    const semMarcador = oferta.replace('{x_chart_default:oferta}\n', '').replace('{x_chart_default:oferta}', '')
    const ofertaOps = diffOps(oferta, semMarcador, { transpose: 0, capo: 0 })
    const completa = parse(source, { chartId: 'completa' }).source
    const completaMine = completa.replace('[G]corpo da completa', '[G]corpo da completa (meu)')
    const completaOps = diffOps(completa, completaMine, { transpose: 0, capo: 0 })
    const song = 'uma'
    localStorage.setItem(
      overlayKey(song, 'oferta'),
      JSON.stringify({
        baseVersion: 'v1',
        ops: [
          {
            id: 'tune',
            type: 'tune',
            transpose: 2,
            capo: 2,
            dual: true,
            ctx: { transpose: 2, capo: 2 },
          },
          ...ofertaOps,
        ],
        at: 1,
      }),
    )
    localStorage.setItem(
      overlayKey(song, 'completa'),
      JSON.stringify({ baseVersion: 'v1', ops: completaOps, at: 2 }),
    )

    const w = mountViewer({ source, songId: song })
    await flushPromises()
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.get('[data-cpv-scroll]').text()).toContain('(meu)')
    expect(w.get('[data-display-key]').text()).toBe('G')
    expect(w.get('[data-capo]').text()).toMatch(/capo 3/i)
    expect(w.get('[data-capo]').text()).not.toMatch(/Dual · capo 2/i)
    w.unmount()
  })

  it('keeps an unsaved persisted edit when leaving changes the open chart', async () => {
    const w = mountViewer({ source: TWO_CHARTS, songId: 'uma', editMode: 'persisted' })
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-source]').trigger('click')
    await flushPromises()
    const area = w.get('textarea[aria-label="Fonte ChordPro"]')
    const shown = String((area.element as HTMLTextAreaElement).value)
    await area.setValue(
      shown.replace('{x_chart_default:oferta}\n', '').replace('[C]corpo da oferta', '[C]corpo da oferta (rascunho)'),
    )
    await flushPromises()
    await w.get('[data-read]').trigger('click')
    await flushPromises()

    expect(w.text()).toMatch(/Rascunho não salvo/)
    const draft = (w.vm as { getSource: () => string }).getSource()
    expect(draft).toContain('(rascunho)')
    expect(draft).not.toMatch(/x_chart_default:\s*oferta/)
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa')
    expect(w.find('[data-save]').exists()).toBe(false)

    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(w.get('[data-edit-badge]').text()).toBe('Para todos')
    expect((w.vm as { getSource: () => string }).getSource()).toContain('(rascunho)')
    expect(w.get('[data-undo]').attributes('disabled')).toBeUndefined()
    await w.get('[data-undo]').trigger('click')
    await flushPromises()
    expect((w.vm as { getSource: () => string }).getSource()).toContain('{x_chart_default:oferta}')
    expect((w.vm as { getSource: () => string }).getSource()).not.toContain('(rascunho)')
    w.unmount()
  })

  it('paints Minha versão of the opened chart while a sibling rascunho stays', async () => {
    const completa = parse(TWO_CHARTS, { chartId: 'completa' }).source
    const mine = completa.replace('[G]corpo da completa', '[G]corpo da completa (meu)')
    const ops = [
      {
        id: 'tune',
        type: 'tune',
        transpose: 2,
        capo: 0,
        dual: false,
        ctx: { transpose: 2, capo: 0 },
      },
      ...diffOps(completa, mine, { transpose: 0, capo: 0 }),
    ]
    localStorage.setItem(
      overlayKey('uma', 'completa'),
      JSON.stringify({ baseVersion: 'v1', ops, at: 1 }),
    )

    const w = mountViewer({ source: TWO_CHARTS, songId: 'uma', editMode: 'persisted' })
    await flushPromises()
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da oferta')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da completa')

    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    const row = w.findAll('[data-row]').find((r) => r.text().includes('corpo da oferta'))
    expect(row).toBeTruthy()
    await row!.trigger('click')
    await flushPromises()
    const input = w.get('input[aria-label="Letra desta linha"]')
    await input.setValue('corpo da oferta (rascunho)')
    await input.trigger('blur')
    await flushPromises()
    await w.get('[data-read]').trigger('click')
    await flushPromises()
    expect(w.text()).toMatch(/Rascunho não salvo/)
    expect((w.vm as { getSource: () => string }).getSource()).toContain('corpo da oferta (rascunho)')

    await pickChart(w, 'completa')
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da completa (meu)')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da oferta')
    expect((w.vm as { getSource: () => string }).getSource()).toContain('corpo da oferta (rascunho)')
    expect(w.get('[data-display-key]').text()).toBe('A')

    await pickChart(w, 'oferta')
    expect(w.get('[data-cpv-scroll]').text()).toContain('corpo da oferta (rascunho)')
    expect(w.get('[data-cpv-scroll]').text()).not.toContain('corpo da completa')
    w.unmount()
  })
})

describe('switching the song on screen', () => {
  it('does not reconcile the next song overlay against the save just made', async () => {
    const songA = '{title:Alpha}\n[G]linha da primeira'
    const songB = '{title:Beta}\n[C]linha exclusiva da segunda\n[D]fica'
    const songBId = 'beta'
    const dropped = songB.replace('[C]linha exclusiva da segunda\n', '')
    const ops = diffOps(songB, dropped, { transpose: 0, capo: 0 })
    expect(ops.some((op) => op.type === 'delete')).toBe(true)
    expect(songA).not.toContain('linha exclusiva da segunda')
    expect(overlayKey(songBId)).toBe(overlayKey(songBId, 'default'))
    localStorage.setItem(overlayKey(songBId), JSON.stringify({ baseVersion: 'v1', ops, at: 1 }))

    const w = mountViewer({
      source: '',
      editMode: 'persisted',
      songs: [
        { id: 'alpha', title: 'Alpha', source: songA },
        { id: songBId, title: 'Beta', source: songB },
      ],
    })
    await flushPromises()
    expect(w.text()).toContain('linha da primeira')

    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-meta-open]').trigger('click')
    await flushPromises()
    await w.get('[data-meta-title]').setValue('Alpha oficial')
    await w.get('[data-meta-apply]').trigger('click')
    await flushPromises()
    await w.get('[data-save]').trigger('click')
    await flushPromises()
    expect(w.emitted('save-content')).toBeTruthy()
    await w.get('[data-read]').trigger('click')
    await flushPromises()
    await w.get('[data-song-next]').trigger('click')
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(w.text()).toContain('fica')
    expect(w.text()).not.toMatch(/virou oficial|viraram oficiais/)
    const stored = JSON.parse(localStorage.getItem(overlayKey(songBId)) ?? 'null')
    expect(stored.ops).toEqual(ops)
    w.unmount()
  })

  it('does not drop the next song overlay when both files contain that chart id', async () => {
    const songA = [
      '{start_of_x_chart:completa}',
      '{title:Alpha}',
      '{x_chart_label:Completa}',
      '{x_chart_default:completa}',
      '{key:G}',
      '[G]corpo da completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{title:Alpha}',
      '{x_chart_label:Oferta}',
      '{key:C}',
      '[C]corpo da oferta A',
      '{end_of_x_chart}',
    ].join('\n')
    const songB = [
      '{start_of_x_chart:oferta}',
      '{title:Beta}',
      '{x_chart_label:Oferta}',
      '{x_chart_default:oferta}',
      '{key:C}',
      '[C]linha exclusiva da oferta B',
      '[D]fica na oferta',
      '{end_of_x_chart}',
    ].join('\n')
    const ofertaB = parse(songB, { chartId: 'oferta' }).source
    const dropped = ofertaB.replace('[C]linha exclusiva da oferta B\n', '')
    const ops = diffOps(ofertaB, dropped, { transpose: 0, capo: 0 })
    expect(ops.some((op) => op.type === 'delete')).toBe(true)
    expect(parse(songA, { chartId: 'oferta' }).source).not.toContain('linha exclusiva da oferta B')
    const songBId = 'beta-env'
    localStorage.setItem(overlayKey(songBId, 'oferta'), JSON.stringify({ baseVersion: 'v1', ops, at: 1 }))

    const w = mountViewer({
      source: '',
      editMode: 'persisted',
      songs: [
        { id: 'alpha-env', title: 'Alpha', source: songA },
        { id: songBId, title: 'Beta', source: songB },
      ],
    })
    await flushPromises()
    expect(w.get('[data-chart-title]').text()).toBe('Alpha')

    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-meta-open]').trigger('click')
    await flushPromises()
    await w.get('[data-meta-title]').setValue('Alpha oficial')
    await w.get('[data-meta-apply]').trigger('click')
    await flushPromises()
    await w.get('[data-save]').trigger('click')
    await flushPromises()
    expect(w.emitted('save-content')).toBeTruthy()
    await w.get('[data-read]').trigger('click')
    await flushPromises()
    await w.get('[data-song-next]').trigger('click')
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(w.get('[data-chart-title]').text()).toBe('Beta')
    expect(w.text()).not.toMatch(/virou oficial|viraram oficiais/)
    const stored = JSON.parse(localStorage.getItem(overlayKey(songBId, 'oferta')) ?? 'null')
    expect(stored.ops).toEqual(ops)
    w.unmount()
  })

  it('loads the next song overlay when the ChordPro text is the same', async () => {
    const shared = normalizeSource('{title:Igual}\n[G]linha unica da cifra')
    const opsA = diffOps(shared, shared.replace('linha unica da cifra', 'linha unica da cifra (de A)'), {
      transpose: 0,
      capo: 0,
    })
    const opsB = diffOps(shared, shared.replace('linha unica da cifra', 'linha unica da cifra (de B)'), {
      transpose: 0,
      capo: 0,
    })
    const keyA = overlayKey('igual-a')
    const keyB = overlayKey('igual-b')
    localStorage.setItem(keyA, JSON.stringify({ baseVersion: 'v1', ops: opsA, at: 1 }))
    localStorage.setItem(keyB, JSON.stringify({ baseVersion: 'v1', ops: opsB, at: 2 }))
    const storedA = localStorage.getItem(keyA)

    const w = mountViewer({
      source: '',
      songs: [
        { id: 'igual-a', title: 'A', source: shared },
        { id: 'igual-b', title: 'B', source: shared },
      ],
    })
    await flushPromises()
    expect(w.text()).toContain('linha unica da cifra (de A)')
    expect(w.text()).not.toContain('(de B)')

    await w.get('[data-song-next]').trigger('click')
    await flushPromises()

    expect(w.text()).toContain('linha unica da cifra (de B)')
    expect(w.text()).not.toContain('(de A)')
    expect(localStorage.getItem(keyA)).toBe(storedA)
    w.unmount()
  })

  it('drops a removed song id without writing either overlay key', async () => {
    const official = src()
    const title = parse(official).meta.title || 'song'
    const idOps = diffOps(official, official.replace(UNIQUE, `${UNIQUE} (id)`), { transpose: 0, capo: 0 })
    const titleOps = diffOps(official, official.replace(UNIQUE, `${UNIQUE} (titulo)`), { transpose: 0, capo: 0 })
    localStorage.setItem(overlayKey('jesus-1'), JSON.stringify({ baseVersion: 'v1', ops: idOps, at: 1 }))
    localStorage.setItem(overlayKey(title), JSON.stringify({ baseVersion: 'v1', ops: titleOps, at: 2 }))
    const idKey = localStorage.getItem(overlayKey('jesus-1'))
    const titleKey = localStorage.getItem(overlayKey(title))

    const w = mountViewer()
    await flushPromises()
    await w.setProps({ songId: '' })
    await flushPromises()

    expect(w.text()).toContain('A identidade da música mudou.')
    expect(w.text()).not.toContain('(id)')
    expect(w.text()).not.toContain('(titulo)')
    expect(localStorage.getItem(overlayKey('jesus-1'))).toBe(idKey)
    expect(localStorage.getItem(overlayKey(title))).toBe(titleKey)
    w.unmount()
  })

  it('does not write overlay keys when a local edit loses the song id', async () => {
    const official = src()
    const title = parse(official).meta.title || 'song'
    const idOps = diffOps(official, official.replace(UNIQUE, `${UNIQUE} (id)`), { transpose: 0, capo: 0 })
    const titleOps = diffOps(official, official.replace(UNIQUE, `${UNIQUE} (titulo)`), { transpose: 0, capo: 0 })
    localStorage.setItem(overlayKey('jesus-1'), JSON.stringify({ baseVersion: 'v1', ops: idOps, at: 1 }))
    localStorage.setItem(overlayKey(title), JSON.stringify({ baseVersion: 'v1', ops: titleOps, at: 2 }))
    const idKey = localStorage.getItem(overlayKey('jesus-1'))
    const titleKey = localStorage.getItem(overlayKey(title))

    const w = mountViewer()
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(w.get('[data-edit-badge]').text()).toBe('Só para mim')
    await w.setProps({ songId: '' })
    await flushPromises()

    expect(w.text()).toContain('A identidade da música mudou.')
    expect(w.text()).not.toContain('(id)')
    expect(w.text()).not.toContain('(titulo)')
    expect(localStorage.getItem(overlayKey('jesus-1'))).toBe(idKey)
    expect(localStorage.getItem(overlayKey(title))).toBe(titleKey)
    w.unmount()
  })

  it('does not publish after the song id disappears', async () => {
    const w = mountViewer({ editMode: 'persisted' })
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(w.get('[data-edit-badge]').text()).toBe('Para todos')
    await w.setProps({ songId: '' })
    await flushPromises()

    expect(w.text()).toContain('A identidade da música mudou.')
    expect(w.emitted('update:mode')?.at(-1)?.[0]).toBe('view')
    expect(w.find('[data-save]').exists()).toBe(false)
    const saves = w.emitted('save')?.length ?? 0
    const contents = w.emitted('save-content')?.length ?? 0
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }))
    await flushPromises()
    expect(w.emitted('save')?.length ?? 0).toBe(saves)
    expect(w.emitted('save-content')?.length ?? 0).toBe(contents)
    w.unmount()
  })
})

describe('a broken envelope with an overlay', () => {
  it('does not throw, and shows the Portuguese envelope message', async () => {
    const source = ['{title:Fora}', '{start_of_x_chart:a}', '{title:Dentro}', '[G]ola', '{end_of_x_chart}'].join(
      '\n',
    )
    const changed = source.replace('[G]ola', '[G]ola minha')
    const ops = diffOps(source, changed, { transpose: 0, capo: 0 })
    localStorage.setItem(overlayKey('ruim'), JSON.stringify({ baseVersion: 'v1', ops, at: 1 }))

    const w = mountViewer({ source, songId: 'ruim' })
    await flushPromises()
    expect(w.text()).toContain('Há texto fora dos blocos de cifra.')
    w.unmount()
  })
})
