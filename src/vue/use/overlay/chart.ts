import {
  ChartEnvelopeError,
  hasChartEnvelope,
  isTuneOp,
  listCharts,
  overlaid,
  parse,
  replaceChart,
  reviewProjection,
  STORE_KEYS,
} from '@henryavila/titan-chordpro-ui'
import type { Overlay, Suggestion } from '@henryavila/titan-chordpro-ui'
import type { WriteMode } from '../../public'

export function activeChartId(file: string, requested: string): string {
  try {
    const charts = listCharts(file)
    if (requested && charts.some((c) => c.id === requested)) return requested
    return charts.find((c) => c.isDefault)?.id || charts[0]?.id || 'default'
  } catch (err) {
    if (err instanceof ChartEnvelopeError) return requested || 'default'
    throw err
  }
}

export function plainFile(file: string): boolean {
  try {
    return !hasChartEnvelope(file)
  } catch (err) {
    if (err instanceof ChartEnvelopeError) return false
    throw err
  }
}

export function chartText(file: string, chartId: string): string {
  try {
    return parse(file, { chartId }).source
  } catch (err) {
    if (err instanceof ChartEnvelopeError) return file
    throw err
  }
}

export function fileWithChart(file: string, chartId: string, doc: string): string {
  if (doc === chartText(file, chartId)) return file
  try {
    return replaceChart(file, chartId, doc)
  } catch (err) {
    if (err instanceof ChartEnvelopeError) return file
    throw err
  }
}

function sugTarget(file: string, songId: string, s: Suggestion): string | null {
  if (s.songId !== songId) return null
  const id = String(s.chartId ?? '').trim()
  try {
    const charts = listCharts(file)
    if (id) return charts.some((c) => c.id === id) ? id : null
    const only = charts[0]?.id ?? 'default'
    if (plainFile(file)) return only === 'default' ? 'default' : null
    return charts.some((c) => c.id === 'default') ? 'default' : null
  } catch (err) {
    if (err instanceof ChartEnvelopeError) return null
    throw err
  }
}

export function queueChartLabel(file: string, songId: string, s: Suggestion): string | null {
  const id = String(s.chartId ?? '').trim()
  if (s.songId !== songId) return id && id !== 'default' ? id : null
  let charts: { id: string; label: string }[] = []
  try {
    charts = listCharts(file)
  } catch (err) {
    if (!(err instanceof ChartEnvelopeError)) throw err
  }
  const slot = id || 'default'
  const only = charts.length < 2 ? charts[0] : undefined
  if (only?.id === slot) return null
  if (!charts.some((c) => c.id === slot)) return id || 'default'
  const hit = charts.find((c) => c.id === slot)
  const label = hit?.label || slot
  return label === 'default' ? null : label
}

export function chartOf(
  file: string,
  songId: string,
  s: Suggestion,
): { id: string; text: string } | { blocked: string } {
  if (s.songId !== songId) return { blocked: 'Abra essa música para aceitar o pedido' }
  const id = sugTarget(file, songId, s)
  if (!id) return { blocked: 'Esta versão não existe mais' }
  return { id, text: chartText(file, id) }
}

export function paintedFile(
  file: string,
  wMode: WriteMode | null,
  showOriginal: boolean,
  chartId: string,
  overlay: Overlay | null,
): string {
  if (wMode === 'persisted' || showOriginal) return file
  const painted = overlaid(chartText(file, chartId), overlay).text
  return fileWithChart(file, chartId, painted)
}

export function songFromOverlayKey(key: string): string {
  const rest = key.startsWith(STORE_KEYS.overlayPrefix) ? key.slice(STORE_KEYS.overlayPrefix.length) : key
  const cut = rest.indexOf(':')
  return cut < 0 ? rest : rest.slice(0, cut)
}

export function sameChartDocument(prev: string, next: string, chartId: string): boolean {
  try {
    return chartText(prev, chartId) === chartText(next, chartId)
  } catch (err) {
    if (err instanceof ChartEnvelopeError) return false
    throw err
  }
}

export type ReviewScreen = {
  missing: boolean
  foreign: boolean
  dirty: boolean
  versionLabel: string | null
  tuneLabel: string | null
  lines: { text: string; struck: boolean; op: boolean }[]
}

export function reviewScreen(input: {
  suggestion: Suggestion | undefined
  file: string
  songId: string
  dirty: (chartId: string) => boolean
}): ReviewScreen | null {
  const s = input.suggestion
  if (!s) return null
  const hit = chartOf(input.file, input.songId, s)
  const versionLabel = queueChartLabel(input.file, input.songId, s)
  if ('blocked' in hit) {
    return {
      missing: hit.blocked.includes('não existe'),
      foreign: hit.blocked.includes('Abra'),
      dirty: hit.blocked.includes('rascunho'),
      versionLabel,
      tuneLabel: null,
      lines: [],
    }
  }
  const painted = reviewProjection(hit.text, s.ops)
  const tune = s.ops.find(isTuneOp)
  const tuneLabel = tune
    ? [`Tom ${tune.transpose > 0 ? '+' : ''}${tune.transpose}`, tune.capo ? `capo ${tune.capo}` : '']
        .filter(Boolean)
        .join(' · ')
    : null
  return {
    missing: false,
    foreign: false,
    dirty: input.dirty(hit.id),
    versionLabel,
    tuneLabel,
    lines: painted.text.split('\n').map((text, i) => ({
      text,
      struck: painted.struck.has(i),
      op: painted.mine.has(i) || painted.struck.has(i),
    })),
  }
}
