/**
 * Personal edits over an official chart.
 *
 * Storing the whole text would freeze the chart: a correction made by the
 * person in charge would never reach anyone who personalised it. Each
 * adjustment is instead an operation anchored on the original lines — so it
 * can be reverted one by one, and reapplied on top of a new version.
 */

import { canonicalMetaKey, readMeta, readStrumPatterns } from './import-chordpro'
import type { StrumPattern, StrumSlot } from './strum'
import { keyRootOf, signedSemitoneDelta } from './transpose'

export type ReadingCtx = {
  /** Semitones the reader was transposed by when the edit was made. */
  transpose: number
  capo: number
  dual?: boolean
}

export type TextOp = {
  id: string
  type: 'insert' | 'delete' | 'replace'
  /** Line index in the official text where the hunk started. */
  at: number
  /** The line above the hunk — the anchor the reapply searches for. */
  anchor: string
  anchorHash: string
  before: string[]
  after: string[]
  ctx: ReadingCtx
}

/** A key and capo the reader pinned to this chart. */
export type TuneOp = {
  id: 'tune'
  type: 'tune'
  transpose: number
  capo: number
  dual: boolean
  ctx: ReadingCtx
}

export type OverlayOp = TextOp | TuneOp

export type Overlay = {
  /** Official version these ops were written against. */
  baseVersion: string
  ops: OverlayOp[]
  at: number
}

export function isTuneOp(op: OverlayOp): op is TuneOp {
  return op.type === 'tune'
}

export function hashText(s: string): string {
  let h = 0
  const t = String(s)
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export type Hunk = { ai: number; aj: number; bi: number; bj: number }

/**
 * Line LCS: small enough for a chart, and it returns contiguous stretches —
 * an adjustment in the musician's head is one stretch, not N lines.
 */
export function lcsHunks(a: string[], b: string[]): Hunk[] {
  const n = a.length
  const m = b.length
  const dp: Int32Array[] = []
  for (let i = 0; i <= n; i++) dp.push(new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const row = dp[i] as Int32Array
      const next = dp[i + 1] as Int32Array
      row[j] = a[i] === b[j] ? (next[j + 1] ?? 0) + 1 : Math.max(next[j] ?? 0, row[j + 1] ?? 0)
    }
  }
  const hunks: Hunk[] = []
  let i = 0
  let j = 0
  let cur: Hunk | null = null
  const flush = () => {
    if (cur) {
      hunks.push(cur)
      cur = null
    }
  }
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      flush()
      i++
      j++
      continue
    }
    if (!cur) cur = { ai: i, aj: i, bi: j, bj: j }
    const row = dp[i] as Int32Array
    const next = dp[i + 1] as Int32Array
    if (j < m && (i >= n || (row[j + 1] ?? 0) >= (next[j] ?? 0))) {
      j++
      cur.bj = j
    } else {
      i++
      cur.aj = i
    }
  }
  flush()
  return hunks
}

function chordsOf(src: string): string[] {
  return [...String(src).matchAll(/\[([^\]]+)\]/g)].map((m) => m[1] ?? '').filter(Boolean)
}

function tokenDelta(from: string, to: string): number | null {
  const a = from.split('/')
  const b = to.split('/')
  if (a.length !== b.length) return null
  let k: number | null = null
  for (let i = 0; i < a.length; i++) {
    const ra = keyRootOf(a[i])
    const rb = keyRootOf(b[i])
    if (!ra || !rb) return null
    if ((a[i] ?? '').slice(ra.length) !== (b[i] ?? '').slice(rb.length)) return null
    const d = signedSemitoneDelta(ra, rb)
    if (k == null) k = d
    else if (k !== d) return null
  }
  return k
}

function isHeaderMetaLine(line: string): boolean {
  const d = String(line).match(/^\s*\{\s*([a-zA-Z_]+)\s*:/)
  if (!d) return false
  return canonicalMetaKey(d[1] ?? '') != null
}

/** Body identity ignoring header meta and the pitch of chord tokens. */
function bodyMask(src: string): string {
  return String(src)
    .split('\n')
    .filter((l) => !isHeaderMetaLine(l) && l.trim() !== '')
    .map((l) => l.replace(/\[[^\]]*\]/g, '[]'))
    .join('\n')
}

function uniformChordDelta(oldSrc: string, newSrc: string): number | null {
  const a = chordsOf(oldSrc)
  const b = chordsOf(newSrc)
  if (a.length < 2 || a.length !== b.length) return null
  let k: number | null = null
  for (let i = 0; i < a.length; i++) {
    const d = tokenDelta(a[i] ?? '', b[i] ?? '')
    if (d == null) return null
    if (k == null) k = d
    else if (k !== d) return null
  }
  return k
}

/**
 * A whole-chart rewrite (fake-capo / transpose every token by the same k,
 * lyrics untouched) is one suggestion, not one op per sung line. Comments
 * and blank lines would otherwise split the LCS into N trechos.
 */
function isUniformChartRewrite(oldSrc: string, newSrc: string): boolean {
  if (bodyMask(oldSrc) !== bodyMask(newSrc)) return false
  const k = uniformChordDelta(oldSrc, newSrc)
  return k != null && k !== 0
}

export function diffOps(oldSrc: string, newSrc: string, ctx: ReadingCtx): TextOp[] {
  const a = String(oldSrc).split('\n')
  const b = String(newSrc).split('\n')
  const hunks = isUniformChartRewrite(oldSrc, newSrc)
    ? [{ ai: 0, aj: a.length, bi: 0, bj: b.length }]
    : lcsHunks(a, b)
  return hunks.map((h, k) => {
    const before = a.slice(h.ai, h.aj)
    const after = b.slice(h.bi, h.bj)
    const anchor = h.ai > 0 ? (a[h.ai - 1] ?? '') : ''
    return {
      id: `op${k}-${hashText(`${before.join('\n')}→${after.join('\n')}`)}`,
      type: !before.length ? 'insert' : !after.length ? 'delete' : 'replace',
      at: h.ai,
      anchor,
      anchorHash: hashText(anchor),
      before,
      after,
      ctx,
    }
  })
}

export type ApplyResult = {
  text: string
  applied: OverlayOp[]
  failed: OverlayOp[]
  /** Line index in the result → id of the op that put it there. */
  mine: Map<number, string>
}

/**
 * Reapply: the anchor is the original content, not the line number — the
 * search starts at the old index and fans out, so a change above does not
 * shift anything.
 */
export function applyOps(src: string, ops: OverlayOp[]): ApplyResult {
  const arr = String(src).split('\n')
  const applied: OverlayOp[] = []
  const failed: OverlayOp[] = []
  const mine = new Map<number, string>()

  const findRun = (run: string[], near: number): number => {
    if (!run.length) return -1
    const eq = (i: number) => run.every((t, k) => arr[i + k] === t)
    const max = arr.length
    for (let d = 0; d <= max; d++) {
      for (const i of d === 0 ? [near] : [near + d, near - d]) {
        if (i >= 0 && i + run.length <= max && eq(i)) return i
      }
    }
    return -1
  }

  for (const op of ops) {
    if (isTuneOp(op)) {
      applied.push(op)
      continue
    }
    if (op.type === 'insert') {
      let at = op.at
      if (op.anchor) {
        const k = findRun([op.anchor], Math.max(0, op.at - 1))
        if (k < 0) {
          failed.push(op)
          continue
        }
        at = k + 1
      }
      arr.splice(at, 0, ...op.after)
      for (let k = 0; k < op.after.length; k++) mine.set(at + k, op.id)
      applied.push(op)
      continue
    }
    const k = findRun(op.before, op.at)
    if (k < 0) {
      failed.push(op)
      continue
    }
    arr.splice(k, op.before.length, ...op.after)
    for (let x = 0; x < op.after.length; x++) mine.set(k + x, op.id)
    applied.push(op)
  }
  return { text: arr.join('\n'), applied, failed, mine }
}

export function hasRun(lines: string[], run: string[]): boolean {
  if (!run || !run.length) return false
  for (let i = 0; i + run.length <= lines.length; i++) {
    let ok = true
    for (let k = 0; k < run.length; k++) {
      if (lines[i + k] !== run[k]) {
        ok = false
        break
      }
    }
    if (ok) return true
  }
  return false
}

/**
 * An adjustment the person in charge accepted has become official: it leaves
 * the overlay instead of staying marked as personal — otherwise the musician
 * sees a conflict with themselves.
 */
export function absorbedOp(op: OverlayOp, lines: string[]): boolean {
  if (isTuneOp(op)) return false
  if (op.type === 'delete') return !hasRun(lines, op.before)
  return hasRun(lines, op.after) && !hasRun(lines, op.before)
}

export function tuneText(op: TuneOp): string {
  const bits: string[] = []
  if (op.transpose) bits.push(`${op.transpose > 0 ? '+' : ''}${op.transpose} semitons`)
  if (op.capo) bits.push(`capo ${op.capo}`)
  if (op.dual) bits.push('modo dual')
  return bits.join(' · ') || 'tom escrito'
}

function isStrumDirective(line: string): boolean {
  return /^\s*\{\s*x_strum(?:_set)?\s*:/i.test(line)
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

export function opLabel(op: OverlayOp): string {
  if (isTuneOp(op)) return 'Tom e capo fixos'
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

export type UpdateItem = {
  id: string
  op: OverlayOp
  /** The op still fits the new official text. */
  ok: boolean
  label: string
  note: string
  mine: string
  theirs: string
  conflict: boolean
}

export type UpdatePlan = { items: UpdateItem[]; pick: Record<string, boolean> }

/** The official chart changed: ask, item by item, before touching anything. */
export function checkUpdate(
  overlay: Overlay | null,
  official: string,
  officialVersion: string,
): UpdatePlan | null {
  if (!overlay || !overlay.ops.length || overlay.baseVersion === officialVersion) return null
  const lines = String(official).split('\n')
  const items: UpdateItem[] = overlay.ops.map((op) => {
    const ok = !applyOps(official, [op]).failed.length
    const near = isTuneOp(op)
      ? []
      : lines.slice(op.at, op.at + Math.max(1, op.before.length))
    return {
      id: op.id,
      op,
      ok,
      label: opLabel(op),
      note: opCtxNote(op),
      mine: isTuneOp(op) ? tuneText(op) : op.after.join(' / ') || '—',
      theirs: near.join(' / ') || '—',
      conflict: !ok && !isTuneOp(op) && op.type === 'replace',
    }
  })
  const pick: Record<string, boolean> = {}
  for (const it of items) pick[it.id] = it.ok
  return { items, pick }
}

/**
 * Drop ops the official text already absorbed. Returns the surviving overlay
 * and how many were absorbed, so the reader can be told.
 */
export function absorbInto(
  overlay: Overlay | null,
  official: string,
  officialVersion: string,
): { overlay: Overlay | null; absorbed: number } {
  if (!overlay || overlay.baseVersion === officialVersion) return { overlay, absorbed: 0 }
  const lines = String(official).split('\n')
  const kept = overlay.ops.filter((op) => !absorbedOp(op, lines))
  const absorbed = overlay.ops.length - kept.length
  if (!absorbed) return { overlay, absorbed: 0 }
  return { overlay: kept.length ? { ...overlay, ops: kept } : null, absorbed }
}

/** Apply an overlay to the official text; `mine` marks the lines it produced. */
export function overlaid(
  official: string,
  overlay: Overlay | null,
): { text: string; mine: Map<number, string> | null; failed: OverlayOp[] } {
  if (!overlay || !overlay.ops.length) return { text: official, mine: null, failed: [] }
  const r = applyOps(official, overlay.ops)
  return { text: r.text, mine: r.mine, failed: r.failed }
}

export type SuggestionStatus = 'pending' | 'accepted' | 'refused' | 'partial'

/** An op archived after admin accept/refuse — kept for musician status UI. */
export type ResolvedOp = OverlayOp & { disposition: 'accepted' | 'refused' }

/** A suggestion sent to whoever owns the official chart. */
export type Suggestion = {
  id: string
  songId: string
  title: string
  at: number
  baseVersion: string
  /** Still-open ops waiting for review. */
  ops: OverlayOp[]
  /** Ops already accepted or refused (not deleted). */
  resolvedOps?: ResolvedOp[]
  /** Default `pending` on create. */
  status?: SuggestionStatus
  /** Opaque host-scoped actor id (no auth in the package). */
  actorKey?: string
  /** Display name the musician typed when sending — shown on the review screen. */
  actorName?: string
}
