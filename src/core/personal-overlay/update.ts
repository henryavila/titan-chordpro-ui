import { absorbedOp, applyOps } from './apply'
import { isTuneOp, type Overlay, type OverlayOp } from './model'
import { opCtxNote, opLabel, tuneText } from './review'

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
