import {
  applyOps,
  formatTitanStrum,
  isScoreReference,
  isTuneOp,
  OFFLINE_SUGGEST_TOAST,
  opCtxNote,
  opLabel,
  proposedScoreSources,
  readStrumPatterns,
  scoreReviewsFromOp,
  strumReviewFromOp,
  tuneText,
} from '@henryavila/titan-chordpro-ui'
import type {
  ChartStore,
  Overlay,
  ScoreAttachment,
  ScoreReference,
  StrumPattern,
  StrumReview,
  Suggestion,
} from '@henryavila/titan-chordpro-ui'
import { scoreFilename, toBase64 } from './codec'
import type { OpCard } from './mine'
import { saveActorName } from './persist'

export {
  acceptQueuedBatch,
  acceptQueuedOp,
  promoteScoreFiles,
  refuseQueuedBatch,
  refuseQueuedOp,
} from './review'
export type { AcceptedNotice, RefusedNotice, ReviewHost } from './review'
export { isOpenForAdmin, openSuggestions, sugStatus, suggestionsForReader } from './status'

export type QueueRow = { key: string; label: string; hint: string; actor?: string }
export type QueueOpCard = OpCard & {
  fits: boolean
  warn: string
  strum: StrumReview | null
  scores: Array<{ previous: ScoreReference | null; proposed: ScoreReference | null; attachment?: ScoreAttachment }>
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
