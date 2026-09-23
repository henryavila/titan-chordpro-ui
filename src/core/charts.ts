/**
 * Named charts in one song file. `{start_of_x_chart: id}` … `{end_of_x_chart}`.
 * No envelope = one implicit chart `id=default`. `{new_song}` is not used.
 */

export type ChartInfo = {
  id: string
  label: string
  isDefault: boolean
}

/** Identity of the song — lives above the first chart envelope. */
export const SONG_META_KEYS = [
  'title',
  'subtitle',
  'artist',
  'x_source',
  'x_youtube',
  'x_chart_default',
] as const

/** Sound of one chart — lives inside the envelope (or the whole file when N=1). */
export const CHART_SOUND_KEYS = [
  'key',
  'transpose',
  'tempo',
  'time',
  'duration',
  'capo',
  'x_audio_sung',
  'x_audio_playback',
  'x_audio_art',
  'x_audio_art_w',
  'x_audio_art_h',
  'x_strum',
  'x_strum_set',
] as const

const DIR = /^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/
/** chartId slug from the design: `[a-z0-9_][a-z0-9_-]{0,63}`. */
const CHART_ID = /^[a-z0-9_][a-z0-9_-]{0,63}$/

const SONG_ALIAS: Record<string, string> = {
  t: 'title',
  st: 'subtitle',
  composer: 'artist',
  x_origem: 'x_source',
}

export type FileChart = {
  id: string
  label: string | null
  /** Lines strictly between `{start_of_x_chart}` and `{end_of_x_chart}`. */
  inner: string
}

export type SplitCho = {
  hasEnvelope: boolean
  /** Text before the first `{start_of_x_chart}`. Whole file when there is none. */
  header: string
  charts: FileChart[]
  defaultId: string
}

function dirOf(line: string): { name: string; value: string } | null {
  const m = line.match(DIR)
  if (!m) return null
  return { name: (m[1] ?? '').toLowerCase(), value: (m[2] ?? '').trim() }
}

function isChartId(id: string): boolean {
  return CHART_ID.test(id)
}

export function songMetaKey(name: string): string | null {
  const k = name.toLowerCase()
  if ((SONG_META_KEYS as readonly string[]).includes(k)) return k
  return SONG_ALIAS[k] ?? null
}

export function splitCho(source: string): SplitCho {
  const text = String(source ?? '').replace(/\r\n?/g, '\n')
  const raws = text.split('\n')
  const header: string[] = []
  const charts: FileChart[] = []
  let defaultFromHeader: string | null = null
  let cur: { id: string; label: string | null; inner: string[] } | null = null

  const flush = () => {
    if (!cur) return
    charts.push({ id: cur.id, label: cur.label, inner: cur.inner.join('\n') })
    cur = null
  }

  for (const raw of raws) {
    const d = dirOf(raw)
    if (d?.name === 'start_of_x_chart') {
      flush()
      cur = isChartId(d.value) ? { id: d.value, label: null, inner: [] } : null
      continue
    }
    if (d?.name === 'end_of_x_chart') {
      flush()
      continue
    }
    if (cur) {
      if (d?.name === 'x_chart_label' && cur.label === null && d.value) cur.label = d.value
      cur.inner.push(raw)
      continue
    }
    if (d?.name === 'x_chart_default' && isChartId(d.value)) defaultFromHeader = d.value
    header.push(raw)
  }
  flush()

  if (charts.length === 0) {
    return { hasEnvelope: false, header: text, charts: [{ id: 'default', label: null, inner: text }], defaultId: 'default' }
  }

  const named = defaultFromHeader && charts.some((c) => c.id === defaultFromHeader) ? defaultFromHeader : charts[0]!.id
  return { hasEnvelope: true, header: header.join('\n'), charts, defaultId: named }
}

export function listCharts(source: string): ChartInfo[] {
  const split = splitCho(source)
  return split.charts.map((c) => ({
    id: c.id,
    label: (c.label && c.label.trim()) || c.id,
    isDefault: c.id === split.defaultId,
  }))
}

function isEnvelopeName(name: string): boolean {
  return (
    name === 'start_of_x_chart' ||
    name === 'end_of_x_chart' ||
    name === 'x_chart_label' ||
    name === 'x_chart_default'
  )
}

function songIdentityHeader(header: string): string {
  return header
    .split('\n')
    .filter((line) => {
      const d = dirOf(line)
      if (!d) return false
      const canon = songMetaKey(d.name)
      return canon !== null && canon !== 'x_chart_default'
    })
    .join('\n')
}

function chartDocBody(inner: string): string {
  return inner
    .split('\n')
    .filter((line) => {
      const d = dirOf(line)
      if (!d) return true
      return !isEnvelopeName(d.name)
    })
    .join('\n')
}

export function resolveChartId(source: string, chartId?: string): string {
  const split = splitCho(source)
  if (chartId && split.charts.some((c) => c.id === chartId)) return chartId
  return split.defaultId
}

/**
 * One-chart ChordPro: song title/artist plus that chart's sound and body.
 * No sibling charts, no envelope directives. File without envelope is unchanged.
 */
export function chartDocument(source: string, chartId?: string): string {
  const split = splitCho(source)
  if (!split.hasEnvelope) return split.header
  const id = resolveChartId(source, chartId)
  const chart = split.charts.find((c) => c.id === id) ?? split.charts[0]!
  const identity = songIdentityHeader(split.header)
  const body = chartDocBody(chart.inner)
  return [identity, body].filter((s) => s.length > 0).join('\n')
}
