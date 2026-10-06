/**
 * An adjustment anchored on the official lines, and the suggestion that
 * carries a set of them to whoever owns the chart.
 */

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

export type ScoreAttachment = {
  /** The source reference this file belongs to, before any review promotion. */
  src: string
  filename: string
  contentType?: string
  /** Original Guitar Pro/MusicXML bytes, base64 for JSON queues and APIs. */
  base64: string
}

export type SuggestionStatus = 'pending' | 'accepted' | 'refused' | 'partial'

/** An op archived after admin accept/refuse — kept for musician status UI. */
export type ResolvedOp = OverlayOp & { disposition: 'accepted' | 'refused' }

/** A suggestion sent to whoever owns the official chart. */
export type Suggestion = {
  id: string
  songId: string
  /**
   * Chart the ops were diffed against. A one-chart file uses `default`.
   * Absent on a row written before chart ids: those ops apply to the implicit
   * `default` chart, including after that file grows an envelope around it.
   */
  chartId?: string
  title: string
  at: number
  baseVersion: string
  /** Still-open ops waiting for review. */
  ops: OverlayOp[]
  /** Original files used by proposed score excerpts. Persist with the suggestion. */
  scoreAttachments?: ScoreAttachment[]
  /** Ops already accepted or refused (not deleted). */
  resolvedOps?: ResolvedOp[]
  /** Default `pending` on create. */
  status?: SuggestionStatus
  /** Opaque host-scoped actor id (no auth in the package). */
  actorKey?: string
  /** Display name the musician typed when sending — shown on the review screen. */
  actorName?: string
}
