import {
  applyOps,
  isTuneOp,
  proposedScoreSources,
  readScoreReference,
  writeScoreReference,
} from '@henryavila/titan-chordpro-ui'
import type { OverlayOp, ResolvedOp, Suggestion, SuggestionStatus } from '@henryavila/titan-chordpro-ui'
import { fromBase64 } from './codec'
import { sugStatus } from './status'

export type AcceptedNotice = {
  id: string
  songId: string
  opIds: string[]
  status: SuggestionStatus
  officialText: string
}

export type RefusedNotice = {
  id: string
  songId: string
  opIds: string[]
  status: SuggestionStatus
}

type ScoreUpload = (file: File) => Promise<{ ref: string }>

export async function promoteScoreFiles(
  s: Suggestion,
  ops: OverlayOp[],
  uploadScore: () => ScoreUpload | undefined,
): Promise<OverlayOp[]> {
  const attachments = s.scoreAttachments ?? []
  if (!attachments.length) return ops
  const needed = new Set(ops.flatMap((op) => proposedScoreSources([op])))
  const remap = new Map<string, string>()
  for (const asset of attachments) {
    if (!needed.has(asset.src)) continue
    const upload = uploadScore()
    if (!upload) throw new Error('O responsável precisa poder guardar o arquivo do solo.')
    const file = new File([new Uint8Array(fromBase64(asset.base64)).buffer], asset.filename, {
      type: asset.contentType || 'application/octet-stream',
    })
    const result = await upload(file)
    if (!result.ref?.trim()) throw new Error('Não foi possível guardar o arquivo do solo.')
    remap.set(asset.src, result.ref.trim())
  }
  if (!remap.size) return ops
  return ops.map((op) => {
    if (isTuneOp(op)) return op
    return {
      ...op,
      after: op.after.map((line) => {
        try {
          const score = readScoreReference(line)
          const src = score && remap.get(score.src)
          return score && src ? writeScoreReference({ ...score, src }) : line
        } catch {
          return line
        }
      }),
    }
  })
}

export type ReviewHost = {
  busy: () => boolean
  setBusy: (v: boolean) => void
  sugId: () => string | null
  setSugId: (id: string | null) => void
  all: () => Suggestion[]
  write: (list: Suggestion[]) => void
  official: () => string
  /**
   * The chart document this suggestion may change. Absent → the whole official
   * file, which is the one-chart case main already reviewed.
   */
  chartOf?: (
    s: Suggestion,
  ) => { id: string; text: string } | { blocked: string }
  /** Splice one chart document back into the official file. */
  splice?: (file: string, chartId: string, doc: string) => string
  dirty?: (chartId: string) => boolean
  toast: (msg: string) => void
  upload: () => ScoreUpload | undefined
  setOfficial: (text: string, reconcile?: boolean) => void
  onAccepted?: (p: AcceptedNotice) => void
  onRefused?: (p: RefusedNotice) => void
}

function archiveOp(s: Suggestion, opId: string, disposition: 'accepted' | 'refused'): Suggestion {
  const op = s.ops.find((o) => o.id === opId)
  if (!op) return s
  const resolved: ResolvedOp = { ...op, disposition }
  return {
    ...s,
    ops: s.ops.filter((o) => o.id !== opId),
    resolvedOps: [...(s.resolvedOps ?? []), resolved],
  }
}

function patchSug(host: ReviewHost, sugId: string, next: Suggestion): Suggestion {
  const status = sugStatus(next)
  const patched = { ...next, status }
  host.write(host.all().map((x) => (x.id === sugId ? patched : x)))
  if (!patched.ops.length) host.setSugId(null)
  return patched
}

/**
 * Accepting writes the official text and bumps the version: anyone holding an
 * overlay meets the update dialog on their next read. Ops are archived, not deleted.
 */
function reviewBase(
  host: ReviewHost,
  s: Suggestion,
): { id: string | null; text: string } | { blocked: string } {
  if (!host.chartOf) return { id: null, text: host.official() }
  const hit = host.chartOf(s)
  if ('blocked' in hit) return hit
  if (host.dirty?.(hit.id)) {
    return { blocked: 'Salve ou descarte o rascunho desta versão antes de aceitar' }
  }
  return { id: hit.id, text: hit.text }
}

function publishedFile(host: ReviewHost, id: string | null, doc: string): string {
  if (!id || !host.splice) return doc
  return host.splice(host.official(), id, doc)
}

export async function acceptQueuedOp(host: ReviewHost, opId: string): Promise<void> {
  if (host.busy()) return
  const sugId = host.sugId()
  if (!sugId) return
  const s = host.all().find((x) => x.id === sugId)
  const op = s?.ops.find((o) => o.id === opId)
  if (!s || !op) return
  const base = reviewBase(host, s)
  if ('blocked' in base) {
    host.toast(base.blocked)
    return
  }
  if (applyOps(base.text, [op]).failed.length) {
    host.toast('Este ajuste não encaixa mais na cifra atual')
    return
  }
  host.setBusy(true)
  let acceptedOp: OverlayOp
  try {
    acceptedOp = (await promoteScoreFiles(s, [op], host.upload))[0]!
  } catch (e) {
    host.toast(e instanceof Error ? e.message : 'Não foi possível guardar o solo.')
    host.setBusy(false)
    return
  }
  const r = applyOps(base.text, [acceptedOp])
  if (r.failed.length) {
    host.toast('Este ajuste não encaixa mais na cifra atual')
    host.setBusy(false)
    return
  }
  const next = archiveOp(
    { ...s, ops: s.ops.map((o) => (o.id === opId ? acceptedOp : o)) },
    opId,
    'accepted',
  )
  const patched = patchSug(host, sugId, next)
  const full = publishedFile(host, base.id, r.text)
  host.toast('Aceito — já vale para todos')
  if (!isTuneOp(op)) host.setOfficial(full, true)
  try {
    host.onAccepted?.({
      id: sugId,
      songId: s.songId,
      opIds: [opId],
      status: patched.status ?? 'accepted',
      officialText: isTuneOp(op) ? host.official() : full,
    })
  } catch {
    /* host failure */
  }
  host.setBusy(false)
}

export function refuseQueuedOp(host: ReviewHost, opId: string): void {
  const sugId = host.sugId()
  if (!sugId) return
  const s = host.all().find((x) => x.id === sugId)
  if (!s?.ops.some((o) => o.id === opId)) return
  const patched = patchSug(host, sugId, archiveOp(s, opId, 'refused'))
  host.toast('Recusado')
  try {
    host.onRefused?.({
      id: sugId,
      songId: s.songId,
      opIds: [opId],
      status: patched.status ?? 'refused',
    })
  } catch {
    /* host failure */
  }
}

/** Accept every op that still fits — one apply + one save-content bump. */
export async function acceptQueuedBatch(host: ReviewHost): Promise<void> {
  if (host.busy()) return
  const sugId = host.sugId()
  if (!sugId) return
  const s = host.all().find((x) => x.id === sugId)
  if (!s?.ops.length) return
  const base = reviewBase(host, s)
  if ('blocked' in base) {
    host.toast(base.blocked)
    return
  }
  const applies = s.ops.filter((op) => !applyOps(base.text, [op]).failed.length)
  if (!applies.length) {
    host.toast('Nenhum ajuste encaixa na cifra atual')
    return
  }
  const preflight = applyOps(base.text, applies)
  const ready = applies.filter((op) => !preflight.failed.some((failed) => failed.id === op.id))
  host.setBusy(true)
  let promoted: OverlayOp[]
  try {
    promoted = await promoteScoreFiles(s, ready, host.upload)
  } catch (e) {
    host.toast(e instanceof Error ? e.message : 'Não foi possível guardar o solo.')
    host.setBusy(false)
    return
  }
  const r = applyOps(base.text, promoted)
  const okIds = new Set(
    promoted.filter((op) => !r.failed.some((f) => f.id === op.id)).map((o) => o.id),
  )
  let next = { ...s, ops: s.ops.map((op) => promoted.find((p) => p.id === op.id) ?? op) }
  for (const op of s.ops) {
    if (okIds.has(op.id)) next = archiveOp(next, op.id, 'accepted')
  }
  const patched = patchSug(host, sugId, next)
  const wroteText = [...okIds].some((id) => {
    const op = promoted.find((item) => item.id === id)
    return op != null && !isTuneOp(op)
  })
  const full = publishedFile(host, base.id, r.text)
  if (wroteText) host.setOfficial(full, true)
  host.toast(`Aceitos ${okIds.size} ajuste${okIds.size === 1 ? '' : 's'}`)
  try {
    host.onAccepted?.({
      id: sugId,
      songId: s.songId,
      opIds: [...okIds],
      status: patched.status ?? 'accepted',
      officialText: wroteText ? full : host.official(),
    })
  } catch {
    /* host failure */
  }
  host.setBusy(false)
}

export function refuseQueuedBatch(host: ReviewHost): void {
  const sugId = host.sugId()
  if (!sugId) return
  const s = host.all().find((x) => x.id === sugId)
  if (!s?.ops.length) return
  const ids = s.ops.map((o) => o.id)
  let next = s
  for (const id of ids) next = archiveOp(next, id, 'refused')
  const patched = patchSug(host, sugId, next)
  host.toast('Pedido recusado')
  try {
    host.onRefused?.({
      id: sugId,
      songId: s.songId,
      opIds: ids,
      status: patched.status ?? 'refused',
    })
  } catch {
    /* host failure */
  }
}
