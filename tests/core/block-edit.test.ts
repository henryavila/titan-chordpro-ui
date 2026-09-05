import { describe, expect, it } from 'vitest'
import {
  addChord,
  blockLabel,
  blockSpan,
  copyHarmony,
  deleteBlock,
  duplicateBlock,
  hideBlock,
  insertBlock,
  markCtx,
  moveBlock,
  moveChord,
  pasteHarmony,
  rowJoin,
  rowParts,
  setBlockCapo,
  setComment,
  setLyric,
  shiftBlock,
  toggleBlockDual,
  unhideBlock,
} from '../../src/core/block-edit'
import { layoutChartFull } from '../../src/core/layout'
import { parse } from '../../src/core/parse'
import type { ChartBlock } from '../../src/core/types'

const CHART = [
  '{title: T}',
  '{key: G}',
  '',
  '{c:(REFRÃO)}',
  '{soc}',
  '[G]Uma linha do refrão',
  '[C]Outra linha do refrão',
  '{eoc}',
  '',
  '[D]Uma estrofe qualquer',
  '',
].join('\n')

function blocksOf(src: string): ChartBlock[] {
  return layoutChartFull(parse(src), { editing: true }).blocks
}

const lines = (src: string) => src.split('\n')

describe('a lyric line', () => {
  it('splits into words and chord positions, and comes back whole', () => {
    const p = rowParts('Je[G]sus, Tu [C]És')
    expect(p.plain).toBe('Jesus, Tu És')
    expect(p.chords).toEqual([
      { name: 'G', off: 2 },
      { name: 'C', off: 10 },
    ])
    expect(rowJoin(p.plain, p.chords)).toBe('Je[G]sus, Tu [C]És')
  })

  it('moves one chord without disturbing the others', () => {
    expect(moveChord('Je[G]sus, Tu [C]És', 0, 0)).toBe('[G]Jesus, Tu [C]És')
  })

  it('places a new chord at a syllable', () => {
    expect(addChord('Jesus', 2, 'Am')).toBe('Je[Am]sus')
  })

  it('fixing a typo does not drag the chords along', () => {
    // "Jesuss" → "Jesus": the chord after the fix keeps its syllable.
    expect(setLyric('Je[G]suss, Tu [C]És', 'Jesus, Tu És')).toBe('Je[G]sus, Tu [C]És')
  })

  it('leaves the line alone when the words did not change', () => {
    const l = 'Je[G]sus'
    expect(setLyric(l, 'Jesus')).toBe(l)
  })
})

describe('a block and its label', () => {
  it('treats a comment glued above a stanza as that block’s name', () => {
    const bs = blocksOf(CHART)
    const chorus = bs.findIndex((b) => b.kind === 'chorus')
    const sp = blockSpan(bs, chorus)
    expect(sp?.hasLab).toBe(true)
    expect(blockLabel(bs, chorus)).toBe('REFRÃO')
    // The stanza further down has no label of its own.
    const stanza = bs.findIndex((b) => b.kind === 'stanza')
    expect(blockSpan(bs, stanza)?.hasLab).toBe(false)
    expect(blockLabel(bs, stanza)).toBe('Estrofe')
  })

  it('moves the label with the block it names', () => {
    const bs = blocksOf(CHART)
    const chorus = bs.findIndex((b) => b.kind === 'chorus')
    const r = moveBlock(lines(CHART), bs, chorus, bs.length)
    expect(r?.message).toBe('Bloco movido com o rótulo')
    const out = (r as { lines: string[] }).lines.join('\n')
    // Label, `{soc}` envelope and words travel as one piece.
    expect(out).toMatch(/\{c:\(REFRÃO\)\}\n\{soc\}\n\[G\]Uma linha do refrão/)
    expect(out).toMatch(/\[C\]Outra linha do refrão\n\{eoc\}/)
    expect(out.indexOf('Uma estrofe')).toBeLessThan(out.indexOf('REFRÃO'))
    // And the file still has exactly one closed chorus.
    expect(out.match(/\{soc\}/g)).toHaveLength(1)
    expect(out.match(/\{eoc\}/g)).toHaveLength(1)
  })

  it('deletes the label with the block', () => {
    const bs = blocksOf(CHART)
    const chorus = bs.findIndex((b) => b.kind === 'chorus')
    const r = deleteBlock(lines(CHART), bs, chorus)
    expect(r?.lines.join('\n')).not.toContain('REFRÃO')
    expect(r?.lines.join('\n')).not.toContain('Uma linha do refrão')
  })

  it('duplicates a block below itself', () => {
    const bs = blocksOf(CHART)
    const stanza = bs.findIndex((b) => b.kind === 'stanza')
    const r = duplicateBlock(lines(CHART), bs, stanza)
    const out = (r as { lines: string[] }).lines.join('\n')
    expect(out.match(/Uma estrofe qualquer/g)).toHaveLength(2)
  })
})

describe('hiding', () => {
  it('keeps the words in the file and takes them out of the reading', () => {
    const bs = blocksOf(CHART)
    const stanza = bs.findIndex((b) => b.kind === 'stanza')
    const hidden = hideBlock(lines(CHART), bs, stanza)
    const src = (hidden as { lines: string[] }).lines.join('\n')
    expect(src).toContain('#~ [D]Uma estrofe qualquer')

    // Reading drops it; editing shows it as a card.
    const view = parse(src)
    expect(layoutChartFull(view, {}).blocks.some((b) => b.kind === 'hidden')).toBe(false)
    const editBlocks = layoutChartFull(view, { editing: true }).blocks
    const hi = editBlocks.findIndex((b) => b.kind === 'hidden')
    expect(hi).toBeGreaterThanOrEqual(0)

    const back = unhideBlock(src.split('\n'), editBlocks, hi)
    expect(back?.lines.join('\n')).toContain('[D]Uma estrofe qualquer')
    expect(back?.lines.join('\n')).not.toContain('#~')
  })
})

describe('a block with a key of its own', () => {
  it('rewrites the chords and leaves the trace in the file', () => {
    const bs = blocksOf(CHART)
    const stanza = bs.findIndex((b) => b.kind === 'stanza')
    const r = shiftBlock(lines(CHART), bs[stanza] as ChartBlock, 2, false)
    const src = (r as { lines: string[] }).lines.join('\n')
    expect(src).toContain('#^+2')
    expect(src).toContain('[E]Uma estrofe qualquer')
    expect(r?.message).toContain('+2')
  })

  it('sums stacked marks into one, so a reset cannot leave the label lying', () => {
    const bs = blocksOf(CHART)
    const stanza = bs.findIndex((b) => b.kind === 'stanza')
    const once = shiftBlock(lines(CHART), bs[stanza] as ChartBlock, 1, false) as {
      lines: string[]
    }
    const b2 = layoutChartFull(parse(once.lines.join('\n')), { editing: true }).blocks
    const si = b2.findIndex((b) => b.kind === 'stanza')
    const twice = shiftBlock(once.lines, b2[si] as ChartBlock, 1, false) as { lines: string[] }
    const src = twice.lines.join('\n')
    expect(src.match(/#\^/g)).toHaveLength(1)
    expect(src).toContain('#^+2')
    expect(src).toContain('[E]Uma estrofe qualquer')

    // And back to zero the mark disappears entirely.
    const b3 = layoutChartFull(parse(src), { editing: true }).blocks
    const si3 = b3.findIndex((b) => b.kind === 'stanza')
    const ctx = markCtx(twice.lines, b3[si3] as ChartBlock)
    expect(ctx?.shiftTotal).toBe(2)
    const back = shiftBlock(twice.lines, b3[si3] as ChartBlock, -2, false) as { lines: string[] }
    expect(back.lines.join('\n')).not.toContain('#^')
    expect(back.lines.join('\n')).toContain('[D]Uma estrofe qualquer')
  })

  it('writes a capo for one block, and drops it back to the song’s', () => {
    const bs = blocksOf(CHART)
    const stanza = bs.findIndex((b) => b.kind === 'stanza')
    const r = setBlockCapo(lines(CHART), bs[stanza] as ChartBlock, 2, false, 0) as {
      lines: string[]
    }
    expect(r.lines.join('\n')).toContain('#capo:2')

    const b2 = layoutChartFull(parse(r.lines.join('\n')), { editing: true }).blocks
    const si = b2.findIndex((b) => b.kind === 'stanza')
    const dual = toggleBlockDual(r.lines, b2[si] as ChartBlock) as { lines: string[] }
    expect(dual.lines.join('\n')).toContain('#capo:2!')

    const b3 = layoutChartFull(parse(dual.lines.join('\n')), { editing: true }).blocks
    const si3 = b3.findIndex((b) => b.kind === 'stanza')
    const off = setBlockCapo(dual.lines, b3[si3] as ChartBlock, 0, true, 0) as { lines: string[] }
    expect(off.lines.join('\n')).not.toContain('#capo')
  })
})

describe('harmony travels, words stay', () => {
  it('scales the chords onto the other block’s own words', () => {
    const bs = blocksOf(CHART)
    const chorus = bs.findIndex((b) => b.kind === 'chorus')
    const stanza = bs.findIndex((b) => b.kind === 'stanza')
    const clip = copyHarmony(lines(CHART), bs, chorus)
    expect(clip?.rows).toHaveLength(2)

    const r = pasteHarmony(lines(CHART), bs, stanza, clip!) as { lines: string[] }
    const out = r.lines.join('\n')
    expect(out).toContain('Uma estrofe qualquer')
    expect(out).toMatch(/\[G\]Uma estrofe qualquer/)
    // The chorus itself is untouched.
    expect(out).toContain('[G]Uma linha do refrão')
  })
})

describe('inserting', () => {
  it('drops a closed chorus with a blank line on each side', () => {
    const r = insertBlock(lines(CHART), 11, 'chorus')
    const out = r.lines.join('\n')
    expect(out).toContain('{soc}\nNova linha do refrão\n{eoc}')
    expect(r.focusLine).toBe(12)
  })
})

describe('a rehearsal comment', () => {
  it('is rewritten in place, and an empty one is a removal', () => {
    const src = lines(CHART)
    const li = src.indexOf('{c:(REFRÃO)}')
    expect(setComment(src, li, 'PONTE').lines[li]).toBe('{c:(PONTE)}')
    expect(setComment(src, li, '  ').lines.join('\n')).not.toContain('REFRÃO')
  })
})
