import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'
import { createSourceSession, normalizeSource } from '../../src/core/index'

const src = () => normalizeSource(loadFixture(JESUS_1))
const UNIQUE = 'Je[G]sus, Tu És a minha [G]vida.'
const PLAIN = 'Jesus, Tu És a minha vida.'

const pdfCalls: Array<Record<string, unknown> | undefined> = []
vi.mock('titan-chordpro-ui/pdf', () => ({
  renderPdf: (_view: unknown, opts?: Record<string, unknown>) => {
    pdfCalls.push(opts)
    return Promise.resolve(new Uint8Array([1, 2, 3]))
  },
}))

function mountViewer(props: Record<string, unknown> = {}) {
  return mount(ChordproViewer, {
    props: { source: src(), theme: 'dark', autoHide: false, songId: 'jesus-1', ...props },
    attachTo: document.body,
  })
}

async function enterEdit(w: ReturnType<typeof mountViewer>, kind: 'local' | 'content') {
  await w.get('[data-edit]').trigger('click')
  await flushPromises()
  const pick = w.find(`[data-mode-${kind}]`)
  if (pick.exists()) {
    await pick.trigger('click')
    await flushPromises()
  }
}

/** The one gesture the local mode has for text: tap the line, fix it in place. */
async function editLyric(w: ReturnType<typeof mountViewer>, next: string) {
  const li = src().split('\n').findIndex((l) => l === UNIQUE)
  await w.get(`[data-row="${li}"]`).trigger('click')
  await flushPromises()
  const input = w.get('input[aria-label="Letra desta linha"]')
  await input.setValue(next)
  await input.trigger('blur')
  await flushPromises()
}

beforeEach(() => {
  localStorage.clear()
  pdfCalls.length = 0
})
afterEach(() => localStorage.clear())

/**
 * B1 — a personal chart must not print as the team's. The `.cho` already
 * carried the mark; the PDF was generated with no options at all.
 */
describe('B1 · the PDF says when it is a personal version', () => {
  it('marks the export while the reader is on their own version', async () => {
    const w = mountViewer()
    await enterEdit(w, 'local')
    await editLyric(w, `${PLAIN} (meu)`)
    await w.get('[data-read]').trigger('click')
    await flushPromises()

    await w.get('[aria-label="Exportar"]').trigger('click')
    await flushPromises()
    await w.get('[data-export="pdf"]').trigger('click')
    await flushPromises()

    expect(pdfCalls.at(-1)).toMatchObject({ personal: true })
    w.unmount()
  })

  it('leaves the mark off a chart with no personal version', async () => {
    const w = mountViewer()
    await flushPromises()
    await w.get('[aria-label="Exportar"]').trigger('click')
    await flushPromises()
    await w.get('[data-export="pdf"]').trigger('click')
    await flushPromises()

    expect(pdfCalls.at(-1)).toMatchObject({ personal: false })
    w.unmount()
  })
})

/**
 * B2 — meta belongs to the chart everyone reads. Worse than the spec breach:
 * `songId` falls back to the title, so committing one in the local mode moved
 * the overlay's own key and orphaned the reader's version.
 */
describe('B2 · meta is a "for everyone" tool', () => {
  it('shows no meta fields in the local mode', async () => {
    const w = mountViewer()
    await enterEdit(w, 'local')
    expect(w.find('[data-meta="title"]').exists()).toBe(false)
    expect(w.find('[data-meta="key"]').exists()).toBe(false)
    expect(w.get('[data-meta-locked]').text()).toContain('só o responsável muda')
    w.unmount()
  })

  it('keeps them in the "for everyone" mode', async () => {
    const w = mountViewer({ modes: 'content' })
    await enterEdit(w, 'content')
    expect(w.find('[data-meta="title"]').exists()).toBe(true)
    expect(w.find('[data-meta="key"]').exists()).toBe(true)
    expect(w.find('[data-meta-locked]').exists()).toBe(false)
    w.unmount()
  })

  it('a personal version survives, because the title cannot move under it', async () => {
    const w = mountViewer({ songId: '' })
    await enterEdit(w, 'local')
    await editLyric(w, `${PLAIN} (meu)`)
    await w.get('[data-read]').trigger('click')
    await flushPromises()

    // songId falls back to the title: the key that holds the overlay is the
    // one the reader's own edit must never be able to change.
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('cpv:my:'))
    expect(keys).toHaveLength(1)
    expect(w.html()).toContain('(meu)')
    w.unmount()
  })
})

/**
 * B5 — the raw ChordPro is a "for everyone" tool: an anchored overlay cannot
 * carry the structural rewrites it allows.
 */
describe('B5 · the source pane is a "for everyone" tool', () => {
  it('is gone in the local mode', async () => {
    const w = mountViewer()
    await enterEdit(w, 'local')
    expect(w.find('[data-source]').exists()).toBe(false)
    w.unmount()
  })

  it('is there in the "for everyone" mode', async () => {
    const w = mountViewer({ modes: 'content' })
    await enterEdit(w, 'content')
    expect(w.find('[data-source]').exists()).toBe(true)
    w.unmount()
  })
})

/**
 * B6 — undo works in edits, not in keystrokes. Typing used to push one step
 * per character and bury every block operation under the 50-slot stack.
 */
describe('B6 · typing in the source is one undo step', () => {
  it('coalesces a whole typing run into the step its checkpoint opened', () => {
    const s = createSourceSession({ source: 'a' })
    s.checkpoint()
    for (const text of ['ab', 'abc', 'abcd', 'abcde']) s.edit(text)
    expect(s.getSource()).toBe('abcde')

    s.undo()
    expect(s.getSource()).toBe('a')
    expect(s.canUndo()).toBe(false)
  })

  it('keeps discrete operations as steps of their own', () => {
    const s = createSourceSession({ source: 'a' })
    s.replace('b')
    s.replace('c')
    s.undo()
    expect(s.getSource()).toBe('b')
    s.undo()
    expect(s.getSource()).toBe('a')
  })

  it('does not open an empty step when nothing was typed', () => {
    const s = createSourceSession({ source: 'a' })
    s.checkpoint()
    s.checkpoint()
    s.edit('ab')
    s.undo()
    expect(s.getSource()).toBe('a')
    expect(s.canUndo()).toBe(false)
  })

  it('a typing run in the pane costs the chart one step, not one per key', async () => {
    const w = mountViewer({ modes: 'content' })
    await enterEdit(w, 'content')
    await w.get('[data-source]').trigger('click')
    await flushPromises()

    const ta = w.get('textarea[aria-label="Fonte ChordPro"]')
    await ta.trigger('focus')
    const base = src()
    for (const suffix of ['\n{c: A}', '\n{c: AB}', '\n{c: ABC}']) {
      await ta.setValue(base + suffix)
      await flushPromises()
    }

    // One undo returns the whole run, and there is nothing left to undo:
    // three keystrokes cost the chart one step, not three.
    await w.get('[data-undo]').trigger('click')
    await flushPromises()
    const after = w.get('textarea[aria-label="Fonte ChordPro"]').element as HTMLTextAreaElement
    expect(after.value).toBe(base)
    expect(w.get('[data-undo]').attributes('disabled')).toBeDefined()
    w.unmount()
  })
})

/**
 * B3 — the grade is a decision about the CURRENT theme, and both the filter
 * and the mat behind the sheet are inline style. Running it only on `load`
 * left a lit white rectangle in the dark after a theme switch.
 */
describe('B3 · a scanned score follows the theme', () => {
  const IMG = '{title: Com partitura}\n\n{image: partitura.png}\n\n[G]Uma linha cantada\n'

  /** jsdom has no raster pipeline: white paper, measured. */
  function stubPaper() {
    const ctx = {
      drawImage: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(40 * 40 * 4).fill(255) }),
    }
    const canvas = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    const natural = vi
      .spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get')
      .mockReturnValue(600)
    return () => {
      canvas.mockRestore()
      natural.mockRestore()
    }
  }

  it('regrades when the reader switches theme under it', async () => {
    const restore = stubPaper()
    const w = mount(ChordproViewer, {
      props: { source: IMG, theme: 'dark', autoHide: false, songId: 'img' },
      attachTo: document.body,
    })
    await flushPromises()

    const img = w.get('img').element as HTMLImageElement
    img.dispatchEvent(new Event('load'))
    await flushPromises()
    // White paper in the dark is a lit rectangle: it gets inverted.
    expect(img.style.filter).toContain('invert(1)')

    const setTheme = w.setProps.bind(w) as (p: Record<string, unknown>) => Promise<void>
    await setTheme({ theme: 'light' })
    await flushPromises()
    expect(img.style.filter).toBe('')

    await setTheme({ theme: 'dark' })
    await flushPromises()
    expect(img.style.filter).toContain('invert(1)')

    w.unmount()
    restore()
  })

  it('leaves the sheet alone when the host turned inversion off', async () => {
    const restore = stubPaper()
    const w = mount(ChordproViewer, {
      props: {
        source: IMG,
        theme: 'dark',
        autoHide: false,
        songId: 'img2',
        autoInvertScores: false,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const img = w.get('img').element as HTMLImageElement
    img.dispatchEvent(new Event('load'))
    await flushPromises()
    expect(img.style.filter).toBe('')

    w.unmount()
    restore()
  })
})

/**
 * B4 — with the score editor open the keyboard is its own. The editor's own
 * handler returns before `stopPropagation()` for Ctrl/Meta/Alt, so the chart
 * behind the modal used to act on the same keystroke: one Ctrl+Z undid the
 * note AND an operation on the chart, invisibly.
 */
describe('B4 · the score editor owns the keyboard', () => {
  const SCORE =
    '{title: Com solo}\n\n[G]Uma linha cantada\n\n{sos: time=4/4 key=G tempo=90 tuning=EADGBE}\n| g4:q a4:q b4:q d5:q |\n{eos}\n'

  async function openScoreEditor(w: ReturnType<typeof mountViewer>) {
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await w.get('[data-source]').trigger('click')
    await flushPromises()
    const ta = w.get('textarea[aria-label="Fonte ChordPro"]')
    await ta.trigger('focus')
    await ta.setValue(`${SCORE}\n{c: MARCA}\n`)
    await flushPromises()
    await w.get('[aria-label="Fechar painel de source"]').trigger('click')
    await flushPromises()
  }

  it('does not let Ctrl+Z reach the chart behind the modal', async () => {
    const w = mount(ChordproViewer, {
      props: { source: SCORE, theme: 'dark', autoHide: false, songId: 'solo', modes: 'content' },
      attachTo: document.body,
    })
    await flushPromises()
    await openScoreEditor(w)
    expect(w.html()).toContain('MARCA')

    // Open the score editor from the block's own "Editar".
    await w.get('[data-score] .cpv-figure-btn--go').trigger('click')
    await flushPromises()
    expect(w.find('.cpv-score-modal').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    await flushPromises()

    // The chart kept the edit: the undo belonged to the editor, not to it.
    expect(w.html()).toContain('MARCA')
    w.unmount()
  })
})

/**
 * M1 — nothing else teaches the three touch rules of the editor. The hint is
 * shown once and burns its flag only after it has actually been on screen.
 */
describe('M1 · the editor introduces itself once', () => {
  /** The hint yields to the toast that entering the editor raises. */
  async function afterToast(w: ReturnType<typeof mountViewer>) {
    vi.advanceTimersByTime(3000)
    await flushPromises()
    return w
  }

  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('greets the first edit with the three touch rules', async () => {
    const w = mountViewer({ modes: 'content' })
    await enterEdit(w, 'content')
    await afterToast(w)
    const hint = w.get('[data-edit-hint]')
    expect(hint.text()).toContain('Toque na linha para editar a letra')
    expect(hint.text()).toContain('arraste até a sílaba')
    expect(hint.text()).toContain('reordena o bloco')
    w.unmount()
  })

  it('never comes back once it has been seen', async () => {
    const first = mountViewer({ modes: 'content' })
    await enterEdit(first, 'content')
    await afterToast(first)
    await first.get('[data-edit-hint] [aria-label="Entendi"]').trigger('click')
    await flushPromises()
    expect(first.find('[data-edit-hint]').exists()).toBe(false)
    first.unmount()

    const second = mountViewer({ modes: 'content' })
    await enterEdit(second, 'content')
    await afterToast(second)
    expect(second.find('[data-edit-hint]').exists()).toBe(false)
    second.unmount()
  })

  it('an edit that lands is the lesson: the hint stops appearing', async () => {
    const first = mountViewer({ modes: 'content' })
    await enterEdit(first, 'content')
    await afterToast(first)
    expect(first.find('[data-edit-hint]').exists()).toBe(true)
    await editLyric(first, `${PLAIN} (x)`)
    await afterToast(first)
    expect(first.find('[data-edit-hint]').exists()).toBe(false)
    first.unmount()

    const second = mountViewer({ modes: 'content' })
    await enterEdit(second, 'content')
    await afterToast(second)
    expect(second.find('[data-edit-hint]').exists()).toBe(false)
    second.unmount()
  })
})

/**
 * M2 — the editor knows which lines the selected block owns, so finding it in
 * the raw file should not be a search by eye.
 */
describe('M2 · the source pane jumps to the selection', () => {
  it('selects the block’s own lines in the field', async () => {
    const w = mountViewer({ modes: 'content' })
    await enterEdit(w, 'content')

    // Select a block by its grip, the way a thumb does.
    const bi = Number(
      (w.element as HTMLElement)
        .querySelector('[data-block] [data-row]')
        ?.closest('[data-block]')
        ?.getAttribute('data-block') ?? -1,
    )
    await w.get(`[data-grip="${bi}"]`).trigger('pointerdown', { button: 0, clientY: 0 })
    window.dispatchEvent(new Event('pointerup'))
    await flushPromises()
    await w.get('[data-source]').trigger('click')
    await flushPromises()

    const jump = w.get('[data-jump-sel]')
    expect(jump.text()).toContain('Ir para')
    await jump.trigger('click')
    await flushPromises()

    const ta = w.get('textarea[aria-label="Fonte ChordPro"]').element as HTMLTextAreaElement
    expect(ta.selectionEnd).toBeGreaterThan(ta.selectionStart)
    expect(src().slice(ta.selectionStart, ta.selectionEnd).trim()).not.toBe('')
    w.unmount()
  })

  it('offers nothing to jump to with no block selected', async () => {
    const w = mountViewer({ modes: 'content' })
    await enterEdit(w, 'content')
    await w.get('[data-source]').trigger('click')
    await flushPromises()
    expect(w.find('[data-jump-sel]').exists()).toBe(false)
    w.unmount()
  })
})

/**
 * M3 — the accent is the one token a host may choose. The derivatives
 * come from a single RGB at fixed opacities, so a host picks a colour, not a
 * palette, and the relationships stay as the design set them.
 */
describe('M3 · the host may choose the accent', () => {
  it('paints the chart in the chosen accent', async () => {
    const w = mountViewer({ accent: 'teal' })
    await flushPromises()
    const root = w.get('.cpv-root').element as HTMLElement
    expect(root.style.getPropertyValue('--chord')).toBe('#6FD8E4')
    expect(root.style.getPropertyValue('--focus')).toBe('#6FD8E4')
    w.unmount()
  })

  it('keeps the design tokens character for character at strength 1', async () => {
    const w = mountViewer({ accent: 'verde', theme: 'light' })
    await flushPromises()
    const root = w.get('.cpv-root').element as HTMLElement
    expect(root.style.getPropertyValue('--chord')).toBe('#17713C')
    expect(root.style.getPropertyValue('--chord-soft')).toBe('rgba(23,113,60,0.10)')
    expect(root.style.getPropertyValue('--chord-edge')).toBe('rgba(23,113,60,0.30)')
    w.unmount()
  })

  it('accepts a host hex and still derives the fills', async () => {
    const w = mountViewer({ accent: '#4F46E5', theme: 'light' })
    await flushPromises()
    const root = w.get('.cpv-root').element as HTMLElement
    const chord = root.style.getPropertyValue('--chord')
    expect(chord).toMatch(/^#[0-9A-F]{6}$/)
    expect(chord).not.toBe('#17713C')
    expect(root.style.getPropertyValue('--chord-soft')).toMatch(/^rgba\(\d+,\d+,\d+,0\.10\)$/)
    w.unmount()
  })

  it('forwards the host accent to the PDF', async () => {
    const w = mountViewer({ accent: 'teal' })
    await flushPromises()
    await w.get('[aria-label="Exportar"]').trigger('click')
    await flushPromises()
    await w.get('[data-export="pdf"]').trigger('click')
    await flushPromises()
    expect(pdfCalls.at(-1)).toMatchObject({ accent: 'teal' })
    w.unmount()
  })

  it('scales the derivatives without moving the hue', async () => {
    const w = mountViewer({ accent: 'verde', theme: 'light', accentStrength: 1.5 })
    await flushPromises()
    const root = w.get('.cpv-root').element as HTMLElement
    expect(root.style.getPropertyValue('--chord')).toBe('#17713C')
    expect(root.style.getPropertyValue('--chord-soft')).toBe('rgba(23,113,60,0.15)')
    w.unmount()
  })
})
