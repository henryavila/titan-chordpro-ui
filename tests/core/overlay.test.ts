import { describe, expect, it } from 'vitest'
import { overlayKey, parseXStrum, writeStrumPatterns } from '../../src/core'
import {
  absorbInto,
  absorbedOp,
  applyOps,
  checkUpdate,
  diffOps,
  diffStrumPattern,
  lcsHunks,
  opCtxNote,
  opLabel,
  overlaid,
  strumReviewFromOp,
  tuneText,
} from '../../src/core/overlay'
import type { Overlay, TuneOp } from '../../src/core/overlay'

const CTX = { transpose: 0, capo: 0 }
const official = ['{title: T}', '{key: G}', '', '[G]linha um', '[C]linha dois', '[D]linha três'].join(
  '\n',
)

describe('lcsHunks', () => {
  it('returns contiguous stretches, not line-by-line noise', () => {
    const a = ['a', 'b', 'c', 'd']
    const b = ['a', 'x', 'y', 'd']
    expect(lcsHunks(a, b)).toEqual([{ ai: 1, aj: 3, bi: 1, bj: 3 }])
  })

  it('finds nothing when the texts match', () => {
    expect(lcsHunks(['a', 'b'], ['a', 'b'])).toEqual([])
  })
})

describe('diffOps', () => {
  it('describes a replaced stretch with its anchor', () => {
    const mine = official.replace('[C]linha dois', '[Am]linha dois')
    const ops = diffOps(official, mine, CTX)
    expect(ops).toHaveLength(1)
    expect(ops[0]?.type).toBe('replace')
    expect(ops[0]?.before).toEqual(['[C]linha dois'])
    expect(ops[0]?.after).toEqual(['[Am]linha dois'])
    expect(ops[0]?.anchor).toBe('[G]linha um')
  })

  it('tells insert and delete apart', () => {
    const added = `${official}\n[E]linha quatro`
    expect(diffOps(official, added, CTX)[0]?.type).toBe('insert')
    const removed = official.split('\n').filter((l) => l !== '[C]linha dois').join('\n')
    expect(diffOps(official, removed, CTX)[0]?.type).toBe('delete')
  })
})

describe('applyOps', () => {
  it('round-trips an edit back onto the official text', () => {
    const mine = official.replace('[C]linha dois', '[Am]linha dois')
    const ops = diffOps(official, mine, CTX)
    const r = applyOps(official, ops)
    expect(r.text).toBe(mine)
    expect(r.failed).toHaveLength(0)
    // The line the op produced is marked as the reader's own.
    expect([...r.mine.values()]).toEqual([ops[0]?.id])
  })

  it('finds its anchor after the official text shifted above it', () => {
    const mine = official.replace('[C]linha dois', '[Am]linha dois')
    const ops = diffOps(official, mine, CTX)
    const shifted = official.replace('{key: G}', '{key: G}\n{tempo: 80}\n{time: 4/4}')
    const r = applyOps(shifted, ops)
    expect(r.failed).toHaveLength(0)
    expect(r.text).toContain('[Am]linha dois')
    expect(r.text).toContain('{tempo: 80}')
  })

  it('reports the op as failed instead of writing in the wrong place', () => {
    const mine = official.replace('[C]linha dois', '[Am]linha dois')
    const ops = diffOps(official, mine, CTX)
    const rewritten = official.replace('[C]linha dois', '[C]outra letra inteira')
    const r = applyOps(rewritten, ops)
    expect(r.failed).toHaveLength(1)
    expect(r.text).toBe(rewritten)
  })

  it('carries a tune op through untouched', () => {
    const tune: TuneOp = { id: 'tune', type: 'tune', transpose: 2, capo: 3, dual: true, ctx: CTX }
    const r = applyOps(official, [tune])
    expect(r.text).toBe(official)
    expect(r.applied).toEqual([tune])
  })
})

describe('absorbing and updating', () => {
  const mine = official.replace('[C]linha dois', '[Am]linha dois')
  const ops = diffOps(official, mine, CTX)
  const overlay: Overlay = { baseVersion: 'v1', ops, at: 0 }

  it('drops an op the official chart adopted', () => {
    const adopted = mine.split('\n')
    expect(absorbedOp(ops[0]!, adopted)).toBe(true)
    expect(absorbedOp(ops[0]!, official.split('\n'))).toBe(false)
    const r = absorbInto(overlay, mine, 'v2')
    expect(r.absorbed).toBe(1)
    expect(r.overlay).toBeNull()
  })

  it('asks item by item when the official version moved', () => {
    const plan = checkUpdate(overlay, official, 'v2')
    expect(plan?.items).toHaveLength(1)
    expect(plan?.items[0]?.ok).toBe(true)
    expect(plan?.pick[ops[0]!.id]).toBe(true)
  })

  it('marks a conflict when the same line changed on both sides', () => {
    const theirs = official.replace('[C]linha dois', '[C]linha dois corrigida')
    const plan = checkUpdate(overlay, theirs, 'v2')
    expect(plan?.items[0]?.ok).toBe(false)
    expect(plan?.items[0]?.conflict).toBe(true)
    expect(plan?.items[0]?.theirs).toContain('corrigida')
    // A conflicting op is not pre-selected: the reader decides.
    expect(plan?.pick[ops[0]!.id]).toBe(false)
  })

  it('says nothing when the version has not moved', () => {
    expect(checkUpdate(overlay, official, 'v1')).toBeNull()
  })
})

describe('overlaid', () => {
  it('leaves the official text alone when there is no overlay', () => {
    const r = overlaid(official, null)
    expect(r.text).toBe(official)
    expect(r.mine).toBeNull()
  })

  it('marks which lines came from the reader', () => {
    const mine = official.replace('[C]linha dois', '[Am]linha dois')
    const r = overlaid(official, { baseVersion: 'v1', ops: diffOps(official, mine, CTX), at: 0 })
    expect(r.text).toBe(mine)
    expect(r.mine?.size).toBe(1)
  })
})

describe('labels', () => {
  it('names an op by its first readable words', () => {
    const mine = official.replace('[C]linha dois', '[Am]linha dois')
    const op = diffOps(official, mine, CTX)[0]!
    expect(opLabel(op)).toBe('Trecho alterado · linha dois')
  })

  it('records the reading context the edit was made in', () => {
    const op = diffOps(official, `${official}\nnova`, { transpose: 2, capo: 3, dual: true })[0]!
    expect(opCtxNote(op)).toBe('Feito lendo +2 semitons · capo 3 · modo dual')
    expect(opCtxNote({ ...op, ctx: CTX })).toBe('')
  })

  it('spells out a pinned key', () => {
    expect(tuneText({ id: 'tune', type: 'tune', transpose: -1, capo: 2, dual: false, ctx: CTX })).toBe(
      '-1 semitons · capo 2',
    )
    expect(tuneText({ id: 'tune', type: 'tune', transpose: 0, capo: 0, dual: false, ctx: CTX })).toBe(
      'tom escrito',
    )
  })
})

const STRUM_CHART = ['{title:T}', '{key:G}', '{c:V}', '[G]oi'].join('\n')
const STRUM = parseXStrum('bpm=90; meter=4/4; grid=8; label=Padrão; pat=DuDu DuDU')!

describe('merge mask includes batida', () => {
  it('diffs a new {x_strum:} as an insert the admin can apply', () => {
    const mine = writeStrumPatterns(STRUM_CHART, { activeIndex: 0, patterns: [STRUM] })
    const ops = diffOps(STRUM_CHART, mine, CTX)
    expect(ops.some((op) => op.after.some((l) => l.includes('{x_strum:')))).toBe(true)
    const r = applyOps(STRUM_CHART, ops)
    expect(r.failed).toHaveLength(0)
    expect(r.text).toContain('{x_strum:')
    expect(r.text).toContain('[G]oi')
    expect(opLabel(ops[0]!)).toBe('Batida nova')
  })

  it('applies a batida insert after the official header grew above the anchor', () => {
    const mine = writeStrumPatterns(STRUM_CHART, { activeIndex: 0, patterns: [STRUM] })
    const ops = diffOps(STRUM_CHART, mine, CTX)
    const shifted = STRUM_CHART.replace('{key:G}', '{key:G}\n{tempo:90}')
    const r = applyOps(shifted, ops)
    expect(r.failed).toHaveLength(0)
    expect(r.text).toContain('{x_strum:')
    expect(r.text).toContain('{tempo:90}')
  })

  it('labels replace and delete of {x_strum:} as batida, not an empty trecho', () => {
    const withStrum = writeStrumPatterns(STRUM_CHART, { activeIndex: 0, patterns: [STRUM] })
    const other = parseXStrum('bpm=100; meter=4/4; grid=8; label=Outro; pat=Dudu Dudu')!
    const changed = writeStrumPatterns(withStrum, { activeIndex: 0, patterns: [other] })
    const replaceOp = diffOps(withStrum, changed, CTX)[0]!
    expect(opLabel(replaceOp)).toBe('Batida alterada')

    const cleared = writeStrumPatterns(withStrum, { activeIndex: 0, patterns: [] })
    const deleteOp = diffOps(withStrum, cleared, CTX)[0]!
    expect(opLabel(deleteOp)).toBe('Batida removida')
  })

  it('keeps the lyric label when the hunk is not a batida directive', () => {
    const mine = official.replace('[C]linha dois', '[Am]linha dois')
    expect(opLabel(diffOps(official, mine, CTX)[0]!)).toBe('Trecho alterado · linha dois')
  })

  it('exposes a visual review of proposed vs previous patterns', () => {
    const mine = writeStrumPatterns(STRUM_CHART, { activeIndex: 0, patterns: [STRUM] })
    const insert = diffOps(STRUM_CHART, mine, CTX)[0]!
    const inserted = strumReviewFromOp(insert)
    expect(inserted?.previous).toEqual([])
    expect(inserted?.proposed[0]?.slots.length).toBe(STRUM.slots.length)
    expect(inserted?.proposed[0]?.label).toBe('Padrão')

    const lyric = diffOps(official, official.replace('[C]linha dois', '[Am]linha dois'), CTX)[0]!
    expect(strumReviewFromOp(lyric)).toBeNull()
  })

  it('marks changed slots on the proposed pattern for the visualizer', () => {
    const withStrum = writeStrumPatterns(STRUM_CHART, { activeIndex: 0, patterns: [STRUM] })
    const other = parseXStrum('bpm=90; meter=4/4; grid=8; label=Padrão; pat=Dudu Dudu')!
    const changed = writeStrumPatterns(withStrum, { activeIndex: 0, patterns: [other] })
    const review = strumReviewFromOp(diffOps(withStrum, changed, CTX)[0]!)
    const d = diffStrumPattern(review?.previous[0], review?.proposed[0])
    expect(d?.pattern.slots.length).toBe(8)
    expect(d?.marks.some((m) => m === 'changed')).toBe(true)
    expect(d?.marks.some((m) => m === 'same')).toBe(true)
    expect(d?.was.some((s) => s != null)).toBe(true)
  })

  it('marks a new batida as added and a removed one as removed', () => {
    const mine = writeStrumPatterns(STRUM_CHART, { activeIndex: 0, patterns: [STRUM] })
    const insert = strumReviewFromOp(diffOps(STRUM_CHART, mine, CTX)[0]!)
    const added = diffStrumPattern(insert?.previous[0], insert?.proposed[0])
    expect(added?.marks.every((m) => m === 'added')).toBe(true)

    const cleared = writeStrumPatterns(mine, { activeIndex: 0, patterns: [] })
    const del = strumReviewFromOp(diffOps(mine, cleared, CTX)[0]!)
    const gone = diffStrumPattern(del?.previous[0], del?.proposed[0])
    expect(gone?.marks.every((m) => m === 'removed')).toBe(true)
  })
})

describe('overlayKey', () => {
  it('names the chart slot and shares default for an omitted id', () => {
    expect(overlayKey('jesus-1', 'oferta')).toBe('cpv:my:jesus-1:oferta')
    expect(overlayKey('jesus-1')).toBe('cpv:my:jesus-1:default')
    expect(overlayKey('jesus-1', 'default')).toBe(overlayKey('jesus-1'))
    expect(overlayKey('jesus-1', '')).toBe(overlayKey('jesus-1'))
  })

  it('encodes a colon in an id and leaves ids without a colon literal', () => {
    expect(overlayKey('jesus-1', 'oferta')).toBe('cpv:my:jesus-1:oferta')
    expect(overlayKey('song')).toBe('cpv:my:song:default')
    expect(overlayKey('song:default')).not.toBe('cpv:my:song:default')
    expect(overlayKey('song:default')).toBe(`cpv:my:${encodeURIComponent('song:default')}:default`)
    expect(overlayKey('jesus-1', 'of:erta')).toBe(`cpv:my:jesus-1:${encodeURIComponent('of:erta')}`)
    expect(overlayKey('song id')).toBe('cpv:my:song id:default')
  })
})
