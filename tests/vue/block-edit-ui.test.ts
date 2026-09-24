import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'
import { ChartEnvelopeError, listCharts, normalizeSource } from '../../src/core/index'

const src = () => normalizeSource(loadFixture(JESUS_1))

function mountViewer(props: Record<string, unknown> = {}) {
  return mount(ChordproViewer, {
    props: { source: src(), theme: 'dark', autoHide: false, songId: 'jesus-1', ...props },
    attachTo: document.body,
  })
}

type Viewer = ReturnType<typeof mountViewer>

/** Into the editor, writing for everyone — where delete and hide both exist. */
async function edit(props: Record<string, unknown> = {}) {
  const w = mountViewer({ modes: 'content', ...props })
  await flushPromises()
  await w.get('[data-edit]').trigger('click')
  await flushPromises()
  const pick = w.find('[data-mode-content]')
  if (pick.exists()) {
    await pick.trigger('click')
    await flushPromises()
  }
  return w
}

function lastEmitted(w: Viewer): string {
  const ev = w.emitted('update:source')
  return String(ev?.at(-1)?.[0] ?? '')
}

/** What the editor holds right now, read back through the source pane. */
async function sourceOf(w: Viewer): Promise<string> {
  await w.get('[data-source]').trigger('click')
  await flushPromises()
  const text = (w.get('textarea[aria-label="Fonte ChordPro"]').element as HTMLTextAreaElement).value
  await w.get('button[aria-label="Fechar painel de source"]').trigger('click')
  await flushPromises()
  return text
}

/** Select a block the way a thumb does: tap its grip. */
async function select(w: Viewer, bi: number) {
  await w.get(`[data-grip="${bi}"]`).trigger('pointerdown', { button: 0, clientY: 0 })
  window.dispatchEvent(new Event('pointerup'))
  await flushPromises()
}

/** Index of the first block that has sung rows. */
function firstSongBlock(w: Viewer): number {
  const root = w.element as HTMLElement
  const el = root.querySelector('[data-block] [data-row]')?.closest('[data-block]')
  return Number(el?.getAttribute('data-block') ?? -1)
}

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('the editing surface', () => {
  it('turns each sung line into syllables with the chords floating over them', async () => {
    const w = await edit()
    // Reading has chords glued into the flow; editing has pills that can move.
    expect(w.findAll('[data-pill]').length).toBeGreaterThan(0)
    expect(w.findAll('[data-i]').length).toBeGreaterThan(0)
    expect(w.findAll('[data-grip]').length).toBeGreaterThan(0)
    w.unmount()
  })

  it('has none of that while reading', async () => {
    const w = mountViewer()
    await flushPromises()
    expect(w.findAll('[data-pill]')).toHaveLength(0)
    expect(w.findAll('[data-grip]')).toHaveLength(0)
    w.unmount()
  })

  it('spaces a voiceless intro as reading columns, not a pile of pills', async () => {
    const src = [
      '{title: T}',
      '{key: G}',
      '',
      '{c:Intro}',
      '[G/D]x///   [D7(4)]x///    [G]x///    [C/E]x/    [D/F#]//',
      '',
    ].join('\n')
    const w = await edit({ source: src })
    const row = w.get('[data-played]')
    expect(row.findAll('.cpv-pill--flow').map((p) => p.text())).toEqual([
      'G/D',
      'D7(4)',
      'G',
      'C/E',
      'D/F#',
    ])
    expect(
      row
        .findAll('.cpv-lyric')
        .map((l) => l.text())
        .filter((t) => /[x/]/.test(t)),
    ).toEqual(['x///', 'x///', 'x///', 'x/', '//'])
    expect(row.findAll('.cpv-reading-word').length).toBeGreaterThanOrEqual(5)
    // Sung rows keep the floating pills; this intro must not.
    expect(row.findAll('.cpv-pill:not(.cpv-pill--flow)')).toHaveLength(0)
    w.unmount()
  })

  it('A+ widens a voiceless intro in edit — the spacing control reaches those columns', async () => {
    const src = [
      '{title: T}',
      '{key: G}',
      '',
      '{c:Intro}',
      '[G/D]x///   [D7(4)]x///    [G]x///    [C/E]x/    [D/F#]//',
    ].join('\n')
    const w = await edit({ source: src })
    const before = Number.parseFloat((w.get('[data-played]').element as HTMLElement).style.fontSize)
    await w.get('[aria-label="Aumentar tipografia"]').trigger('click')
    await flushPromises()
    const after = Number.parseFloat((w.get('[data-played]').element as HTMLElement).style.fontSize)
    expect(after).toBeGreaterThan(before)
    w.unmount()
  })

  it('opens the chord editor on a pill, and renames from it', async () => {
    const w = await edit()
    const before = await sourceOf(w)
    const pill = w.findAll('[data-pill]')[0]
    await pill?.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(w.find('[data-chord-dialog]').exists()).toBe(true)

    await w.get('[data-chord-input]').setValue('F#m7')
    await w.get('[data-chord-apply]').trigger('click')
    await flushPromises()
    expect(w.find('[data-chord-dialog]').exists()).toBe(false)
    const after = await sourceOf(w)
    expect(after).toContain('[F#m7]')
    expect(after).not.toBe(before)
    w.unmount()
  })

  it('nudges a chord one syllable with the arrow keys', async () => {
    const w = await edit()
    const before = await sourceOf(w)
    await w.findAll('[data-pill]')[0]?.trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()
    const after = await sourceOf(w)
    expect(after).not.toBe(before)
    // Only one line moved: a chord nudge is not a rewrite of the chart.
    const moved = after.split('\n').filter((l, i) => l !== before.split('\n')[i])
    expect(moved).toHaveLength(1)
    w.unmount()
  })

  it('removes a chord when its name is emptied', async () => {
    const w = await edit()
    const before = (await sourceOf(w)).match(/\[/g)?.length ?? 0
    await w.findAll('[data-pill]')[0]?.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await w.get('[data-chord-remove]').trigger('click')
    await flushPromises()
    const after = (await sourceOf(w)).match(/\[/g)?.length ?? 0
    expect(after).toBe(before - 1)
    w.unmount()
  })
})

describe('editing the words where they are read', () => {
  it('fixes a line without dragging its chords along', async () => {
    const w = await edit()
    const row = w.findAll('[data-row]')[1]
    await row?.trigger('click')
    await flushPromises()
    const input = w.get('.cpv-row-input')
    const value = (input.element as HTMLInputElement).value
    // The whole line is offered, with its chords stripped out of the text.
    expect(value).not.toContain('[')
    expect(value.length).toBeGreaterThan(0)

    await input.setValue(`${value} amém`)
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    const after = await sourceOf(w)
    expect(after).toContain(' amém')
    w.unmount()
  })

  it('throws the typing away on Escape', async () => {
    const w = await edit()
    const before = await sourceOf(w)
    const row = w.findAll('[data-row]')[1]
    await row?.trigger('click')
    await flushPromises()
    const input = w.get('.cpv-row-input')
    await input.setValue('nada disso')
    await input.trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(await sourceOf(w)).toBe(before)
    w.unmount()
  })

  it('renames a rehearsal comment in place', async () => {
    const w = await edit()
    await w.get('.cpv-comment').trigger('click')
    await flushPromises()
    const input = w.get('.cpv-row-input--comment')
    await input.setValue('PONTE')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(await sourceOf(w)).toContain('(PONTE)')
    w.unmount()
  })
})

describe('the block a musician has chosen', () => {
  it('names it and offers only what fits that kind', async () => {
    const w = await edit()
    const bi = firstSongBlock(w)
    await select(w, bi)
    expect(w.find('[data-sel-bar]').exists()).toBe(true)
    expect(w.find('[data-copy-harmony]').exists()).toBe(true)
    expect(w.find('[data-sec-up]').exists()).toBe(true)
    w.unmount()
  })

  it('transposes only that block, and leaves the trace in the file', async () => {
    const w = await edit()
    await select(w, firstSongBlock(w))
    await w.get('[data-sec-up]').trigger('click')
    await flushPromises()
    const after = await sourceOf(w)
    expect(after).toContain('#^+1')
    // The badge says so beside the block, with a way back.
    expect(w.get('.cpv-block-tag--key').text()).toContain('+1')

    await w.get('[data-sec-reset]').trigger('click')
    await flushPromises()
    expect(await sourceOf(w)).not.toContain('#^')
    w.unmount()
  })

  it('gives the block a capo of its own', async () => {
    const w = await edit()
    await select(w, firstSongBlock(w))
    await w.get('[data-block-capo-up]').trigger('click')
    await flushPromises()
    expect(await sourceOf(w)).toContain('#capo:1')
    // With a capo of its own, the block can say whether it shows both chords.
    await w.get('[data-block-dual]').trigger('click')
    await flushPromises()
    expect(await sourceOf(w)).toContain('#capo:1!')
    w.unmount()
  })

  it('hides without deleting, and the card brings it back', async () => {
    const w = await edit()
    const before = await sourceOf(w)
    await select(w, firstSongBlock(w))
    await w.get('[data-hide]').trigger('click')
    await flushPromises()
    const hidden = await sourceOf(w)
    expect(hidden.split('\n').some((l) => l.startsWith('#~'))).toBe(true)
    expect(w.find('.cpv-hidden-card').exists()).toBe(true)

    await w.get('.cpv-hidden-btn').trigger('click')
    await flushPromises()
    expect(await sourceOf(w)).toBe(before)
    w.unmount()
  })

  it('offers no delete where the save is only for this phone', async () => {
    const w = mountViewer({ modes: 'local' })
    await flushPromises()
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await select(w, firstSongBlock(w))
    expect(w.find('[data-delete]').exists()).toBe(false)
    // Hiding IS the removal there, and the label says so.
    expect(w.get('[data-hide]').text()).toContain('Remover daqui')
    w.unmount()
  })

  it('carries the label with the stanza it names', async () => {
    const w = await edit()
    const before = await sourceOf(w)
    // The stanza right under a `{c:(…)}` label owns it: move one, move both.
    const root = w.element as HTMLElement
    const blocks = Array.from(root.querySelectorAll<HTMLElement>('[data-block]'))
    const labelled = blocks.findIndex(
      (el, i) =>
        !!el.querySelector('[data-row]') && !!blocks[i - 1]?.querySelector('.cpv-comment'),
    )
    expect(labelled).toBeGreaterThan(0)
    const label = w.findAll('.cpv-comment')[0]?.text().trim() ?? ''
    expect(label.length).toBeGreaterThan(0)

    await select(w, labelled)
    await w.get('[data-nudge-up]').trigger('click')
    await flushPromises()

    const after = (await sourceOf(w)).split('\n')
    const li = after.findIndex((l) => l.includes(label.replace(/\s+/g, ' ')))
    expect(li).toBeGreaterThanOrEqual(0)
    // The label is still the line before the music it names — never orphaned.
    const next = after.slice(li + 1).find((l) => l.trim())
    expect(next).toBeTruthy()
    expect(/^\{c:/.test(next ?? '')).toBe(false)
    expect(after.join('\n')).not.toBe(before)
    w.unmount()
  })

  it('copies a harmony onto another block without touching its words', async () => {
    const w = await edit()
    const before = await sourceOf(w)
    await select(w, firstSongBlock(w))
    await w.get('[data-copy-harmony]').trigger('click')
    await flushPromises()
    const paste = w.findAll('.cpv-paste-btn')
    expect(paste.length).toBeGreaterThan(0)
    await paste[0]?.trigger('click')
    await flushPromises()
    const after = await sourceOf(w)
    const strip = (t: string) => t.replace(/\[[^\]]*\]/g, '')
    // The chords moved; every sung word stayed exactly where it was.
    expect(after).not.toBe(before)
    expect(strip(after)).toBe(strip(before))
    w.unmount()
  })
})

describe('putting something new into the chart', () => {
  it('says where the block will land before it lands', async () => {
    const w = await edit()
    await w.get('[data-insert]').trigger('click')
    await flushPromises()
    expect(w.get('.cpv-insert-where').text().length).toBeGreaterThan(0)
    expect(w.findAll('.cpv-insert-item').length).toBeGreaterThan(0)
    w.unmount()
  })

  it('offers no image entry when the host has no scores to give', async () => {
    const w = await edit()
    await w.get('[data-insert]').trigger('click')
    await flushPromises()
    const labels = w.findAll('.cpv-insert-item').map((b) => b.text())
    expect(labels.some((l) => l.includes('Imagem'))).toBe(false)
    w.unmount()
  })

  it('offers it when the host does', async () => {
    const w = await edit({ images: [{ file: 'intro.png', label: 'Intro' }] })
    await w.get('[data-insert]').trigger('click')
    await flushPromises()
    const labels = w.findAll('.cpv-insert-item').map((b) => b.text())
    expect(labels.some((l) => l.includes('Imagem'))).toBe(true)
    w.unmount()
  })

  it('writes a chorus with its envelope, so it can be moved as one', async () => {
    const w = await edit()
    await w.get('[data-insert]').trigger('click')
    await flushPromises()
    const chorus = w.findAll('.cpv-insert-item').find((b) => b.text().includes('Refrão'))
    await chorus?.trigger('click')
    await flushPromises()
    const after = await sourceOf(w)
    expect(after).toContain('{soc}')
    expect(after).toContain('{eoc}')
    w.unmount()
  })

  it('leaves no ghost block when a new score is abandoned', async () => {
    const w = await edit()
    const before = await sourceOf(w)
    await w.get('[data-insert]').trigger('click')
    await flushPromises()
    const score = w.findAll('.cpv-insert-item').find((b) => b.text().includes('Partitura'))
    await score?.trigger('click')
    await flushPromises()
    expect(await sourceOf(w)).toContain('{sos:')
    expect(w.find('[data-score-editor]').exists()).toBe(true)

    await w.get('[data-score-cancel]').trigger('click')
    await flushPromises()
    expect(w.find('[data-score-editor]').exists()).toBe(false)
    expect(await sourceOf(w)).toBe(before)
    w.unmount()
  })
})

const ENVELOPE = [
  '{start_of_x_chart:completa}',
  '{title:Uma}',
  '{key:G}',
  '[G]linha completa',
  '{end_of_x_chart}',
  '{start_of_x_chart:oferta}',
  '{title:Uma}',
  '{x_chart_default:oferta}',
  '{key:C}',
  '[C]linha oferta',
  '{end_of_x_chart}',
].join('\n')

describe('chord picker vocabulary', () => {
  it('offers chords from the chart on screen, not a sibling-only chord', async () => {
    const source = [
      '{start_of_x_chart:completa}',
      '{title:Uma}',
      '{key:G}',
      '[F#m7]so a completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{title:Uma}',
      '{x_chart_default:oferta}',
      '{key:C}',
      '[C]oferta [G]mais',
      '{end_of_x_chart}',
    ].join('\n')
    const w = await edit({ source })
    await w.findAll('[data-pill]')[0]?.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(w.find('[data-chord-dialog]').exists()).toBe(true)
    expect(w.findAll('.cpv-vocab-btn').map((b) => b.text())).toEqual(['C', 'G'])
    w.unmount()
  })
})

describe('envelope block edit', () => {
  it('deletes the default chart lyric and keeps the sibling chart', async () => {
    const w = await edit({ source: ENVELOPE })
    expect(w.text()).toContain('linha oferta')
    expect(w.text()).not.toContain('linha completa')
    await select(w, firstSongBlock(w))
    await w.get('[data-delete]').trigger('click')
    await flushPromises()
    const out = lastEmitted(w)
    expect(out).not.toContain('linha oferta')
    expect(out).toContain('{start_of_x_chart:completa}')
    expect(out).toContain('{start_of_x_chart:oferta}')
    expect(out).toContain('linha completa')
    w.unmount()
  })

  it('edits the chart document in the source pane and keeps the sibling', async () => {
    const w = await edit({ source: ENVELOPE })
    await w.get('[data-source]').trigger('click')
    await flushPromises()
    const ta = w.get('textarea[aria-label="Fonte ChordPro"]')
    const shown = (ta.element as HTMLTextAreaElement).value
    expect(shown).toContain('linha oferta')
    expect(shown).not.toContain('linha completa')
    expect(shown).not.toContain('start_of_x_chart')
    await ta.setValue(shown.replace('linha oferta', 'linha nova'))
    await flushPromises()
    const out = lastEmitted(w)
    expect(out).toContain('linha nova')
    expect(out).not.toContain('linha oferta')
    expect(out).toContain('{start_of_x_chart:completa}')
    expect(out).toContain('{start_of_x_chart:oferta}')
    expect(out).toContain('linha completa')
    w.unmount()
  })

  it('does not swap the source pane when the default marker is half-typed', async () => {
    const w = await edit({ source: ENVELOPE })
    await w.get('[data-source]').trigger('click')
    await flushPromises()
    const ta = w.get('textarea[aria-label="Fonte ChordPro"]')
    const shown = (ta.element as HTMLTextAreaElement).value
    expect(shown).toContain('{x_chart_default:oferta}')
    await ta.setValue(shown.replace('{x_chart_default:oferta}', '{x_chart_default:ofert}'))
    await flushPromises()
    let now = (ta.element as HTMLTextAreaElement).value
    expect(now).toContain('{x_chart_default:ofert}')
    expect(now).toContain('linha oferta')
    expect(now).not.toContain('linha completa')
    await ta.setValue(now.replace('{x_chart_default:ofert}', '{x_chart_default:ofer}'))
    await flushPromises()
    now = (ta.element as HTMLTextAreaElement).value
    expect(now).toContain('{x_chart_default:ofer}')
    expect(now).toContain('linha oferta')
    expect(now).not.toContain('linha completa')
    expect(now).not.toContain('start_of_x_chart')
    const out = lastEmitted(w)
    expect(out).toContain('{x_chart_default:ofer}')
    expect(out).toContain('{start_of_x_chart:completa}')
    expect(out).toContain('{start_of_x_chart:oferta}')
    expect(out).toContain('linha completa')
    expect(out.slice(0, out.indexOf('{start_of_x_chart')).trim()).toBe('')
    w.unmount()
  })

  it('does not throw when a completed pair has text outside the blocks', async () => {
    const source = [
      '{title:Fora}',
      '{start_of_x_chart:completa}',
      '[G]linha completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{x_chart_default:oferta}',
      '[C]linha oferta',
      '{end_of_x_chart}',
    ].join('\n')
    expect(() => listCharts(source)).toThrow(ChartEnvelopeError)
    const w = mountViewer({ source })
    await flushPromises()
    expect(w.text()).not.toContain('linha oferta')
    expect(w.text()).not.toContain('linha completa')
    expect(w.find('[data-cpv-scroll]').exists()).toBe(false)
    expect(w.text()).toContain('Há texto fora dos blocos de cifra.')
    expect(w.text()).not.toContain('chart file has text outside chart blocks')
    expect(w.text()).not.toContain('Nenhuma linha legível')
    w.unmount()
  })

  it('maps the other envelope errors to Portuguese', async () => {
    const cases = [
      {
        source: [
          '{start_of_x_chart:completa}',
          '{x_chart_default:oferta}',
          '[G]completa',
          '{end_of_x_chart}',
          '{start_of_x_chart:oferta}',
          '[C]oferta',
          '{end_of_x_chart}',
        ].join('\n'),
        pt: 'A cifra padrão aponta para outra cifra.',
        en: 'x_chart_default names a different chart',
      },
      {
        source: [
          '{start_of_x_chart:completa}',
          '{x_chart_default:completa}',
          '[G]c',
          '{end_of_x_chart}',
          '{start_of_x_chart:oferta}',
          '{x_chart_default:oferta}',
          '[C]o',
          '{end_of_x_chart}',
        ].join('\n'),
        pt: 'Mais de uma cifra está marcada como padrão.',
        en: 'more than one chart marks itself default',
      },
    ]
    for (const c of cases) {
      const w = mountViewer({ source: c.source })
      await flushPromises()
      expect(w.text()).toContain(c.pt)
      expect(w.text()).not.toContain(c.en)
      w.unmount()
    }
  })

  it('still changes a one-chart file', async () => {
    const one = '{title:Uma}\n{key:C}\n[C]linha unica\n'
    const w = await edit({ source: one })
    await select(w, firstSongBlock(w))
    await w.get('[data-delete]').trigger('click')
    await flushPromises()
    const out = lastEmitted(w)
    expect(out).not.toBe(one)
    expect(out).not.toContain('linha unica')
    expect(out).toContain('{title:Uma}')
    w.unmount()
  })
})

describe('leaving the editor', () => {
  it('drops the selection, the clipboard and every open panel', async () => {
    const w = await edit()
    await select(w, firstSongBlock(w))
    await w.get('[data-copy-harmony]').trigger('click')
    await flushPromises()
    expect(w.find('.cpv-clip-bar').exists()).toBe(true)

    await w.get('[data-read]').trigger('click')
    await flushPromises()
    expect(w.find('[data-sel-bar]').exists()).toBe(false)
    expect(w.find('.cpv-clip-bar').exists()).toBe(false)
    expect(w.findAll('[data-pill]')).toHaveLength(0)
    w.unmount()
  })
})
