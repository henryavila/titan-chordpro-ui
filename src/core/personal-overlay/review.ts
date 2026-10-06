import { readMeta, readStrumPatterns } from '../import-chordpro'
import { readScoreReference, type ScoreReference } from '../score-reference'
import type { StrumPattern, StrumSlot } from '../strum'
import { isUniformChartRewrite } from './diff'
import { isTuneOp, type OverlayOp, type TuneOp } from './model'

export function tuneText(op: TuneOp): string {
  const bits: string[] = []
  if (op.transpose) bits.push(`${op.transpose > 0 ? '+' : ''}${op.transpose} semitons`)
  if (op.capo) bits.push(`capo ${op.capo}`)
  if (op.dual) bits.push('modo dual')
  return bits.join(' · ') || 'tom escrito'
}

function isStrumDirective(line: string): boolean {
  return /^\s*\{\s*x_titan_strum(?:_set)?\s*:/i.test(line)
}

function isDirectiveLine(line: string): boolean {
  return /^\s*\{[^}]+\}\s*$/.test(line)
}

export type StrumReview = {
  previous: StrumPattern[]
  proposed: StrumPattern[]
}

export type StrumSlotMark = 'same' | 'changed' | 'added' | 'removed'

export function slotsLookSame(a: StrumSlot, b: StrumSlot): boolean {
  return a.dir === b.dir && a.contact === b.contact && (a.essence ?? null) === (b.essence ?? null)
}

/**
 * Slot-level visual diff for the batida strip. Displays the proposed
 * pattern (or the previous one when it was removed) with a mark per cell.
 */
export function diffStrumPattern(
  previous: StrumPattern | null | undefined,
  proposed: StrumPattern | null | undefined,
): { pattern: StrumPattern; marks: StrumSlotMark[]; was: Array<StrumSlot | null> } | null {
  if (!proposed && !previous) return null
  if (!proposed && previous) {
    return {
      pattern: previous,
      marks: previous.slots.map(() => 'removed'),
      was: previous.slots.map(() => null),
    }
  }
  const next = proposed!
  const prevSlots = previous?.slots ?? []
  const marks: StrumSlotMark[] = []
  const was: Array<StrumSlot | null> = []
  for (let i = 0; i < next.slots.length; i++) {
    const before = prevSlots[i]
    const after = next.slots[i]!
    if (!previous || before == null) {
      marks.push('added')
      was.push(null)
      continue
    }
    if (slotsLookSame(before, after)) {
      marks.push('same')
      was.push(null)
      continue
    }
    marks.push('changed')
    was.push(before)
  }
  return { pattern: next, marks, was }
}

function patternsFromLines(lines: string[]): StrumPattern[] {
  const set = readStrumPatterns(lines.filter(isStrumDirective).join('\n'))
  return set.patterns
}

/** Visual review payload for a batida op — empty when the hunk has no strum. */
export function strumReviewFromOp(op: OverlayOp): StrumReview | null {
  if (isTuneOp(op)) return null
  const previous = op.type === 'insert' ? [] : patternsFromLines(op.before)
  const proposed = op.type === 'delete' ? [] : patternsFromLines(op.after)
  if (!previous.length && !proposed.length) return null
  return { previous, proposed }
}

/** A score edit is a visual before/after pair, not raw ChordPro for review. */
export function scoreReviewsFromOp(op: OverlayOp): Array<{ previous: ScoreReference | null; proposed: ScoreReference | null }> {
  if (isTuneOp(op)) return []
  const find = (lines: string[]): ScoreReference[] => {
    const refs: ScoreReference[] = []
    for (const line of lines) {
      try {
        const ref = readScoreReference(line)
        if (ref) refs.push(ref)
      } catch { /* malformed text remains in the ordinary diff */ }
    }
    return refs
  }
  const previous = find(op.before)
  const proposed = find(op.after)
  return Array.from({ length: Math.max(previous.length, proposed.length) }, (_, i) => ({
    previous: previous[i] ?? null,
    proposed: proposed[i] ?? null,
  }))
}

export function scoreReviewFromOp(op: OverlayOp): { previous: ScoreReference | null; proposed: ScoreReference | null } | null {
  return scoreReviewsFromOp(op)[0] ?? null
}

export function proposedScoreSources(ops: OverlayOp[]): string[] {
  const sources = new Set<string>()
  for (const op of ops) {
    for (const review of scoreReviewsFromOp(op)) if (review.proposed) sources.add(review.proposed.src)
  }
  return [...sources]
}

export function opLabel(op: OverlayOp): string {
  if (isTuneOp(op)) return 'Tom e capo fixos'
  const score = scoreReviewFromOp(op)
  if (score) {
    const name = score.proposed?.name ?? score.previous?.name ?? 'Solo'
    return `${op.type === 'insert' ? 'Solo novo' : op.type === 'delete' ? 'Solo removido' : 'Solo alterado'} · ${name}`
  }
  if (
    !isTuneOp(op) &&
    op.type === 'replace' &&
    isUniformChartRewrite(op.before.join('\n'), op.after.join('\n'))
  ) {
    const key = (readMeta(op.after.join('\n')).key ?? '').trim()
    return key ? `Cifra reescrita no tom ${key}` : 'Cifra reescrita'
  }
  const hunk = op.type === 'delete' ? op.before : [...op.before, ...op.after]
  const meaningful = hunk.filter((t) => String(t).trim())
  const hasBatida = meaningful.some(isStrumDirective)
  if (hasBatida && meaningful.every((l) => isDirectiveLine(l) || isStrumDirective(l))) {
    if (op.type === 'insert') return 'Batida nova'
    if (op.type === 'delete') return 'Batida removida'
    return 'Batida alterada'
  }
  const src = op.type === 'delete' ? op.before : op.after
  const first = src.filter((t) => String(t).trim())[0] ?? ''
  const txt = String(first)
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\{[^}]*\}/g, '')
    .trim()
  const kind =
    op.type === 'insert' ? 'Trecho novo' : op.type === 'delete' ? 'Trecho removido' : 'Trecho alterado'
  if (hasBatida) return `${kind} · Batida`
  return kind + (txt ? ` · ${txt.slice(0, 32)}` : '')
}

/**
 * The adjustment was made against what was on screen: keeping the reading
 * context is what tells you whether the typed text holds in the written key.
 */
export function opCtxNote(op: OverlayOp): string {
  const c = op.ctx || { transpose: 0, capo: 0 }
  const bits: string[] = []
  if (c.transpose) bits.push(`lendo ${c.transpose > 0 ? '+' : ''}${c.transpose} semitons`)
  if (c.capo) bits.push(`capo ${c.capo}`)
  if (c.dual) bits.push('modo dual')
  return bits.length ? `Feito ${bits.join(' · ')}` : ''
}
