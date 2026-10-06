import {
  applyOps,
  formatTitanStrum,
  isScoreReference,
  isTuneOp,
  OFFLINE_SUGGEST_TOAST,
  opCtxNote,
  opLabel,
  proposedScoreSources,
  readScoreReference,
  readStrumPatterns,
  scoreReviewsFromOp,
  strumReviewFromOp,
  tuneText,
  writeScoreReference,
} from '@henryavila/titan-chordpro-ui'
import type {
  ChartStore,
  Overlay,
  OverlayOp,
  ResolvedOp,
  ScoreAttachment,
  ScoreReference,
  StrumPattern,
  StrumReview,
  Suggestion,
  SuggestionStatus,
} from '@henryavila/titan-chordpro-ui'
import { fromBase64, scoreFilename, toBase64 } from './codec'
import type { OpCard } from './mine'
import { saveActorName } from './persist'

export type QueueRow = { key: string; label: string; hint: string; actor?: string }
export type QueueOpCard = OpCard & {
  fits: boolean
  warn: string
  strum: StrumReview | null
  scores: Array<{ previous: ScoreReference | null; proposed: ScoreReference | null; attachment?: ScoreAttachment }>
}

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

export function sugStatus(s: Suggestion): SuggestionStatus {
  const open = s.ops.length
  const accepted = (s.resolvedOps ?? []).filter((o) => o.disposition === 'accepted').length
  const refused = (s.resolvedOps ?? []).filter((o) => o.disposition === 'refused').length
  if (open > 0) return accepted > 0 || refused > 0 ? 'partial' : 'pending'
  if (accepted > 0 && refused > 0) return 'partial'
  if (accepted > 0) return 'accepted'
  if (refused > 0) return 'refused'
  return 'pending'
}

export function isOpenForAdmin(s: Suggestion): boolean {
  const st = sugStatus(s)
  return st === 'pending' || (st === 'partial' && s.ops.length > 0)
}

export function openSuggestions(all: Suggestion[]): Suggestion[] {
  return all.filter(isOpenForAdmin)
}

export function suggestionsForReader(
  all: Suggestion[],
  songId: string,
  actorKey: string | undefined,
): Suggestion[] {
  return all.filter((s) => {
    if (s.songId !== songId) return false
    if (actorKey) return s.actorKey === actorKey
    return true
  })
}

export function suggestButtonLabel(sending: boolean, confirming: boolean): string {
  return sending ? 'Enviando…' : confirming ? 'Confirmar — enviar' : 'Sugerir alteração ao responsável'
}

function queueGroupKey(s: Suggestion, chart: string | null): string {
  const id = String(s.chartId ?? '').trim()
  return chart ? `${s.songId}\u001f${id || 'default'}` : s.songId
}

export function songQueueRows(
  open: Suggestion[],
  labelOf?: (s: Suggestion) => string | null,
): QueueRow[] {
  const by = new Map<string, { title: string; chart: string | null; pedidos: number; ajustes: number }>()
  for (const s of open) {
    const chart = labelOf?.(s) ?? null
    const key = queueGroupKey(s, chart)
    const e = by.get(key) ?? { title: s.title, chart, pedidos: 0, ajustes: 0 }
    e.pedidos += 1
    e.ajustes += s.ops.length
    by.set(key, e)
  }
  return [...by.entries()].map(([key, e]) => ({
    key,
    label: e.chart ? `${e.title} · ${e.chart}` : e.title,
    hint: `${e.pedidos} ${e.pedidos === 1 ? 'pedido' : 'pedidos'} · ${e.ajustes} ${e.ajustes === 1 ? 'ajuste' : 'ajustes'}`,
  }))
}

export function requestQueueRows(
  open: Suggestion[],
  songId: string | null,
  labelOf?: (s: Suggestion) => string | null,
): QueueRow[] {
  if (!songId) return []
  return open
    .filter((s) => queueGroupKey(s, labelOf?.(s) ?? null) === songId)
    .map((s) => {
      const when = new Date(s.at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
      const who = String(s.actorName ?? '').trim()
      return {
        key: s.id,
        label: who || when,
        hint: who
          ? `${when} · ${s.ops.length} ${s.ops.length === 1 ? 'ajuste' : 'ajustes'}`
          : `${s.ops.length} ${s.ops.length === 1 ? 'ajuste' : 'ajustes'} · base ${s.baseVersion}`,
        actor: who || undefined,
      }
    })
}

export function opQueueCards(s: Suggestion | undefined, officialText: string): QueueOpCard[] {
  if (!s) return []
  return s.ops.map((op) => {
    const fits = !applyOps(officialText, [op]).failed.length
    const scores = scoreReviewsFromOp(op)
    return {
      id: op.id,
      label: opLabel(op),
      note: opCtxNote(op),
      from:
        isTuneOp(op) || op.type === 'insert'
          ? '—'
          : op.before.filter((line) => !isScoreReference(line)).join(' / ').slice(0, 90) || '—',
      to: isTuneOp(op)
        ? tuneText(op)
        : op.type === 'delete'
          ? '—'
          : op.after.filter((line) => !isScoreReference(line)).join(' / ').slice(0, 90) || '—',
      fits,
      warn: fits ? '' : 'Não encaixa mais na cifra atual',
      strum: strumReviewFromOp(op),
      scores: scores.map((score) => ({
        ...score,
        attachment: s.scoreAttachments?.find((a) => a.src === score.proposed?.src),
      })),
    }
  })
}

export function queueActorName(s: Suggestion | undefined): string {
  return String(s?.actorName ?? '').trim()
}

export function batchPreviewOf(
  s: Suggestion | undefined,
  officialText: string,
): { text: string; count: number; conflicts: number } | null {
  if (!s?.ops.length) return null
  const applies = s.ops.filter((op) => !applyOps(officialText, [op]).failed.length)
  if (!applies.length) return { text: officialText, count: 0, conflicts: s.ops.length }
  const r = applyOps(officialText, applies)
  return {
    text: r.text,
    count: applies.length - r.failed.length,
    conflicts: s.ops.length - (applies.length - r.failed.length),
  }
}

export function previewStrumChange(
  previewText: string | undefined,
  officialText: string,
): StrumPattern[] | null {
  if (!previewText) return null
  const proposed = readStrumPatterns(previewText)
  const current = readStrumPatterns(officialText)
  const sameBatida =
    proposed.activeIndex === current.activeIndex &&
    proposed.patterns.length === current.patterns.length &&
    proposed.patterns.every((p, i) => formatTitanStrum(p) === formatTitanStrum(current.patterns[i]!))
  // The preview text still carries the chart's batida when the request
  // only rewrote lyrics. The strip at the top of the batch is the change.
  if (sameBatida) return null
  return proposed.patterns.length ? proposed.patterns : null
}

export function officialStrumPatterns(officialText: string): StrumPattern[] {
  return readStrumPatterns(officialText).patterns
}

export function queueHeading(sugId: string | null, actor: string, songId: string | null): string {
  if (sugId) return actor ? `Pedido de ${actor}` : 'Ajustes do pedido'
  return songId ? 'Pedidos desta cifra' : 'Cifras com pedidos'
}

export function enterQueue(deps: {
  setRoute: (route: 'song' | 'queue') => void
  setSong: (id: string | null) => void
  setSug: (id: string | null) => void
  setMyPanel: (open: boolean) => void
}): void {
  deps.setRoute('queue')
  deps.setSong(null)
  deps.setSug(null)
  deps.setMyPanel(false)
}

export function leaveQueue(deps: {
  setRoute: (route: 'song' | 'queue') => void
  setSong: (id: string | null) => void
  setSug: (id: string | null) => void
}): void {
  deps.setRoute('song')
  deps.setSong(null)
  deps.setSug(null)
}

export function backQueue(deps: {
  sug: string | null
  setSug: (id: string | null) => void
  setSong: (id: string | null) => void
}): void {
  if (deps.sug) deps.setSug(null)
  else deps.setSong(null)
}

export type SuggestHost = {
  sending: () => boolean
  setSending: (v: boolean) => void
  overlay: () => Overlay | null
  actorName: () => string
  setNameNeeded: (v: boolean) => void
  confirming: () => boolean
  setConfirming: (v: boolean) => void
  armConfirm: () => void
  disarmConfirm: () => void
  songId: () => string
  /** Chart the open overlay was diffed against. Omitted on a file with no slot. */
  chartId?: () => string | undefined
  title: () => string
  version: () => string
  actorKey: () => string | undefined
  store: ChartStore
  loadScoreAsset: () =>
    | ((src: string) => Promise<{ bytes: Uint8Array; contentType?: string; filename?: string }>)
    | undefined
  persist: () => ((s: Suggestion) => Promise<void>) | undefined
  /** When persist needs the network and this is false, do not POST. */
  online?: () => boolean
  all: () => Suggestion[]
  write: (list: Suggestion[]) => void
  closePanel: () => void
  toast: (msg: string) => void
  onCreated?: (s: Suggestion) => void
}

export async function sendSuggestion(host: SuggestHost): Promise<void> {
  if (host.sending()) return
  const ov = host.overlay()
  if (!ov?.ops.length) return
  const name = host.actorName().trim()
  if (!name) {
    host.setNameNeeded(true)
    host.setConfirming(false)
    host.toast('O nome é obrigatório para enviar')
    return
  }
  host.setNameNeeded(false)
  if (host.persist() && host.online?.() === false) {
    host.toast(OFFLINE_SUGGEST_TOAST)
    return
  }
  if (!host.confirming()) {
    host.armConfirm()
    return
  }
  host.disarmConfirm()
  saveActorName(host.store, name)
  const created: Suggestion = {
    id: `s${Date.now()}`,
    songId: host.songId(),
    ...(host.chartId?.() ? { chartId: host.chartId() } : {}),
    title: host.title() || host.songId(),
    at: Date.now(),
    baseVersion: host.version(),
    ops: ov.ops,
    resolvedOps: [],
    status: 'pending',
    actorKey: host.actorKey(),
    actorName: name,
  }
  host.setSending(true)
  try {
    const sources = proposedScoreSources(ov.ops)
    if (sources.length) {
      if (!host.loadScoreAsset()) throw new Error('Arquivo do solo indisponível')
      created.scoreAttachments = await Promise.all(
        sources.map(async (src) => {
          const asset = await host.loadScoreAsset()!(src)
          if (!asset.bytes.length) throw new Error('Arquivo do solo vazio')
          return {
            src,
            filename: asset.filename || scoreFilename(src),
            contentType: asset.contentType,
            base64: toBase64(asset.bytes),
          }
        }),
      )
    }
  } catch {
    host.setSending(false)
    host.toast('Não foi possível anexar o arquivo do solo. Tente de novo.')
    return
  }
  const persist = host.persist()
  if (!persist) {
    host.write([...host.all(), created])
    try {
      host.onCreated?.(created)
    } catch {
      /* host notify */
    }
    host.closePanel()
    host.toast('Sugestão enviada')
    host.setSending(false)
    return
  }
  try {
    const result: unknown = persist(created)
    if (
      result == null ||
      typeof result !== 'object' ||
      typeof (result as { then?: unknown }).then !== 'function'
    ) {
      console.error(
        '[titan-chordpro-ui] persistSuggestion must return a Promise (return the POST). A void return is not an ack.',
      )
      throw new Error('persistSuggestion must return a Promise')
    }
    await result
    host.write([...host.all(), created])
    try {
      host.onCreated?.(created)
    } catch {
      /* host notify */
    }
    host.closePanel()
    host.toast('Sugestão enviada')
  } catch {
    host.toast('Não foi possível enviar. Tente de novo.')
  } finally {
    host.setSending(false)
  }
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
