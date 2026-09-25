import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    expect(again.get('[data-display-key]').text()).toBe('G')
    expect(again.get('[data-tone-shift]').text()).toMatch(/tocando em A/)
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

  it('sends a full key rewrite as one suggestion op, not one per line', async () => {
    const local = mountViewer({
      source: loadFixture('sda/082-o-rei-vem-vindo.cho'),
      songId: '082',
    })
    await flushPromises()
    await local.get('[data-edit]').trigger('click')
    await flushPromises()
    await local.get('[data-meta-open]').trigger('click')
    await flushPromises()
    await local.get('[data-meta-rewrite-go]').trigger('click')
    await flushPromises()
    await local.get('[data-read]').trigger('click')
    await flushPromises()
    await local.get('[data-open-my]').trigger('click')
    await flushPromises()
    expect(local.findAll('[data-my-op]')).toHaveLength(1)
    expect(local.get('[data-my-op]').text()).toMatch(/Cifra reescrita no tom Ab/)
    await confirmSuggest(local)
    const sug = JSON.parse(localStorage.getItem('cpv:sug') ?? '[]') as Array<{ ops: unknown[] }>
    expect(sug).toHaveLength(1)
    expect(sug[0]?.ops).toHaveLength(1)
    local.unmount()
  })
})
