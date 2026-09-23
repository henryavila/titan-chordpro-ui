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

const CHART_ALIAS: Record<string, string> = {
  x_audio: 'x_audio_sung',
  x_audio_cantado: 'x_audio_sung',
}

/** One-header order. Two-arg `writeMeta` on a file with no envelope emits this. */
export const META_KEYS = [
  'title',
  'subtitle',
  'artist',
  'key',
  'transpose',
  'tempo',
  'time',
  'duration',
  'capo',
  'x_source',
  'x_youtube',
  'x_chart_default',
  'x_audio_sung',
  'x_audio_playback',
  'x_audio_art',
  'x_audio_art_w',
  'x_audio_art_h',
  'x_strum',
  'x_strum_set',
] as const
export type MetaKey = (typeof META_KEYS)[number]
export type ChartMeta = Partial<Record<MetaKey, string>>

/** Portuguese / short names still in files. Canonical key wins when both exist. */
const META_ALIAS: Record<string, MetaKey> = {
  t: 'title',
  st: 'subtitle',
  x_origem: 'x_source',
  x_audio: 'x_audio_sung',
  x_audio_cantado: 'x_audio_sung',
}

export type MetaPatch = { [key: string]: string | undefined }

export type FileChart = {
  id: string
  label: string | null
  /** Lines strictly between `{start_of_x_chart}` and `{end_of_x_chart}`. */
  inner: string
  /** 0-based index of `{start_of_x_chart}`. */
  startLi: number
  /** 0-based index of `{end_of_x_chart}`, or `raws.length` if the block is open. */
  endLi: number
}

export type SplitCho = {
  hasEnvelope: boolean
  /** Text before the first `{start_of_x_chart}`. Whole file when there is none. */
  header: string
  charts: FileChart[]
  defaultId: string
  raws: string[]
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

export function chartSoundKey(name: string): string | null {
  const k = name.toLowerCase()
  if ((CHART_SOUND_KEYS as readonly string[]).includes(k)) return k
  return CHART_ALIAS[k] ?? null
}

export function canonicalMetaKey(k: string): MetaKey | null {
  const lower = k.toLowerCase()
  if ((META_KEYS as readonly string[]).includes(lower)) return lower as MetaKey
  return META_ALIAS[lower] ?? null
}

function readMetaLines(source: string): ChartMeta {
  const meta: ChartMeta = {}
  String(source ?? '')
    .split('\n')
    .forEach((l) => {
      const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:\s*([^}]*)\}\s*$/)
      if (!d) return
      const k = (d[1] ?? '').toLowerCase()
      const v = (d[2] ?? '').trim()
      const canon = canonicalMetaKey(k)
      if (!canon) return
      const exact = (META_KEYS as readonly string[]).includes(k)
      if (exact || meta[canon] === undefined) meta[canon] = v
    })
  return meta
}

/**
 * No envelope: the whole file, same as before.
 * With `{start_of_x_chart}`: song identity plus the default chart only.
 * A later sibling `{key:}` or audio line must not win.
 */
export function readMeta(source: string): ChartMeta {
  const text = String(source ?? '')
  if (!splitCho(text).hasEnvelope) return readMetaLines(text)
  return readMetaLines(chartDocument(text))
}

export function splitCho(source: string): SplitCho {
  const text = String(source ?? '').replace(/\r\n?/g, '\n')
  const raws = text.split('\n')
  const charts: FileChart[] = []
  let cur: { id: string; label: string | null; inner: string[]; startLi: number } | null = null

  const flush = (endLi: number) => {
    if (!cur) return
    charts.push({
      id: cur.id,
      label: cur.label,
      inner: cur.inner.join('\n'),
      startLi: cur.startLi,
      endLi,
    })
    cur = null
  }

  for (let li = 0; li < raws.length; li++) {
    const raw = raws[li] ?? ''
    const d = dirOf(raw)
    if (d?.name === 'start_of_x_chart') {
      flush(li)
      cur = isChartId(d.value) ? { id: d.value, label: null, inner: [], startLi: li } : null
      continue
    }
    if (d?.name === 'end_of_x_chart') {
      flush(li)
      continue
    }
    if (cur) {
      if (d?.name === 'x_chart_label' && cur.label === null && d.value) cur.label = d.value
      cur.inner.push(raw)
    }
  }
  flush(raws.length)

  if (charts.length === 0) {
    return {
      hasEnvelope: false,
      header: text,
      charts: [{ id: 'default', label: null, inner: text, startLi: 0, endLi: raws.length }],
      defaultId: 'default',
      raws,
    }
  }

  const header = raws.slice(0, charts[0]!.startLi).join('\n')
  let defaultFromHeader: string | null = null
  for (const line of header.split('\n')) {
    const d = dirOf(line)
    if (d?.name === 'x_chart_default' && isChartId(d.value)) defaultFromHeader = d.value
  }
  const named = defaultFromHeader && charts.some((c) => c.id === defaultFromHeader) ? defaultFromHeader : charts[0]!.id
  return { hasEnvelope: true, header, charts, defaultId: named, raws }
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

function linesOf(text: string): string[] {
  if (!text) return []
  return text.split('\n')
}

function readKeyed(text: string, which: 'song' | 'chart'): Record<string, string> {
  const out: Record<string, string> = {}
  const keys = which === 'song' ? SONG_META_KEYS : CHART_SOUND_KEYS
  const resolve = which === 'song' ? songMetaKey : chartSoundKey
  for (const line of text.split('\n')) {
    const d = dirOf(line)
    if (!d) continue
    const canon = resolve(d.name)
    if (!canon) continue
    const exact = (keys as readonly string[]).includes(d.name)
    if (exact || out[canon] === undefined) out[canon] = d.value
  }
  return out
}

function applyPatch(cur: Record<string, string>, patch: MetaPatch, keys: readonly string[]): Record<string, string> {
  const next = { ...cur }
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(patch, k)) continue
    const v = (patch[k] ?? '').trim()
    if (v) next[k] = v
    else delete next[k]
  }
  return next
}

function formatKeys(keys: readonly string[], meta: Record<string, string>): string {
  return keys
    .filter((k) => (meta[k] ?? '').trim())
    .map((k) => '{' + k + ':' + (meta[k] ?? '').trim() + '}')
    .join('\n')
}

function spliceInner(raws: string[], chart: FileChart, inner: string): string[] {
  const from = chart.startLi + 1
  return [...raws.slice(0, from), ...linesOf(inner), ...raws.slice(chart.endLi)]
}

/**
 * One-chart header rewrite: known keys leave the body and come back on top, in
 * the canonical order. No two `{key:}` lines competing.
 */
export function writeMetaOneHeader(source: string, meta: ChartMeta): string {
  // A patch that omits `{x_chart_default}` must not drop a line already in the file.
  const setsDefault = Object.prototype.hasOwnProperty.call(meta, 'x_chart_default')
  const body = String(source ?? '')
    .split('\n')
    .filter((l) => {
      const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:\s*[^}]*\}\s*$/)
      if (!d) return true
      const k = (d[1] ?? '').toLowerCase()
      if (k === 'x_chart_default' && !setsDefault) return true
      return canonicalMetaKey(k) === null
    })
  const head = META_KEYS.filter((k) => (meta[k] ?? '').trim()).map(
    (k) => '{' + k + ':' + (meta[k] ?? '').trim() + '}',
  )
  return [head.join('\n'), body.join('\n').replace(/^\n+/, '')].filter(Boolean).join('\n')
}

/** Implicit chart id when the file has no `{start_of_x_chart}`. */
function isImplicitChartId(chartId: string | undefined): boolean {
  const id = String(chartId ?? '').trim()
  return id === '' || id === 'default'
}

function writeFlatScoped(source: string, patch: MetaPatch, keys: readonly string[]): string {
  const next: ChartMeta = { ...readMeta(source) }
  for (const k of keys) {
    if (!(META_KEYS as readonly string[]).includes(k)) continue
    if (!Object.prototype.hasOwnProperty.call(patch, k)) continue
    const key = k as MetaKey
    const v = (patch[k] ?? '').trim()
    if (v) next[key] = v
    else delete next[key]
  }
  return writeMetaOneHeader(source, next)
}

/** Rewrite song-header keys; never strip `{key:}` / `{duration:}` from chart blocks. */
export function writeSongScopedMeta(source: string, patch: MetaPatch): string {
  const split = splitCho(source)
  if (!split.hasEnvelope) return writeFlatScoped(source, patch, SONG_META_KEYS)
  const first = split.charts[0]!
  const headerLines = split.raws.slice(0, first.startLi)
  const next = applyPatch(readKeyed(headerLines.join('\n'), 'song'), patch, SONG_META_KEYS)
  const rest = headerLines
    .filter((line) => {
      const d = dirOf(line)
      return !d || songMetaKey(d.name) === null
    })
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')
  const head = formatKeys(SONG_META_KEYS, next)
  const header = [head, rest].filter((s) => s.length > 0).join('\n')
  const tail = split.raws.slice(first.startLi).join('\n')
  return [header, tail].filter((s) => s.length > 0).join('\n')
}

function rewriteChartInner(inner: string, patch: MetaPatch): string {
  const labelLines: string[] = []
  const rest: string[] = []
  for (const line of inner.split('\n')) {
    const d = dirOf(line)
    if (d?.name === 'x_chart_label') {
      labelLines.push(line)
      continue
    }
    if (d && chartSoundKey(d.name)) continue
    rest.push(line)
  }
  while (rest.length && !rest[0]!.trim()) rest.shift()
  const next = applyPatch(readKeyed(inner, 'chart'), patch, CHART_SOUND_KEYS)
  const head = formatKeys(CHART_SOUND_KEYS, next)
  return [labelLines.join('\n'), head, rest.join('\n')].filter((s) => s.length > 0).join('\n')
}

/** Rewrite sound keys inside one named chart; sibling blocks stay put. */
export function writeChartScopedMeta(source: string, patch: MetaPatch, chartId?: string): string {
  const split = splitCho(source)
  if (!split.hasEnvelope) {
    if (!isImplicitChartId(chartId)) return String(source ?? '')
    return writeFlatScoped(source, patch, CHART_SOUND_KEYS)
  }
  const id = chartId && split.charts.some((c) => c.id === chartId) ? chartId : null
  if (!id) return String(source ?? '')
  const chart = split.charts.find((c) => c.id === id)
  if (!chart) return String(source ?? '')
  return spliceInner(split.raws, chart, rewriteChartInner(chart.inner, patch)).join('\n')
}

/**
 * Song-identity keys from a one-chart document. A missing title, subtitle,
 * artist, x_source, or x_youtube clears that header field. `{x_chart_default}`
 * is never in the patch, so omitting it does not remove the song header value.
 */
function songIdentityPatch(document: string): MetaPatch {
  const present = readKeyed(document, 'song')
  const patch: MetaPatch = {}
  for (const key of SONG_META_KEYS) {
    if (key === 'x_chart_default') continue
    patch[key] = present[key] ?? ''
  }
  return patch
}

/**
 * Splice a one-chart document back into the named envelope block.
 * Song identity in the document replaces the song header, including deletions.
 * The sibling chart stays.
 */
export function replaceChart(file: string, chartId: string, doc: string): string {
  const src = String(file ?? '').replace(/\r\n?/g, '\n')
  const document = String(doc ?? '').replace(/\r\n?/g, '\n')
  const split = splitCho(src)
  if (!split.hasEnvelope) {
    if (!isImplicitChartId(chartId)) return src
    return document
  }
  const chart = split.charts.find((c) => c.id === chartId)
  if (!chart) return src

  const body: string[] = []
  for (const line of document.split('\n')) {
    const d = dirOf(line)
    if (d && songMetaKey(d.name)) continue
    if (d && isEnvelopeName(d.name)) continue
    body.push(line)
  }
  while (body.length && !body[0]!.trim()) body.shift()

  const hasLabel = body.some((line) => dirOf(line)?.name === 'x_chart_label')
  const labelLine = !hasLabel && chart.label ? `{x_chart_label:${chart.label}}` : null
  const inner = [labelLine, body.join('\n')].filter((s) => s && s.length > 0).join('\n')
  const spliced = spliceInner(split.raws, chart, inner).join('\n')
  return writeSongScopedMeta(spliced, songIdentityPatch(document))
}

/**
 * Write a chart document back. No envelope: `default` replaces the file.
 * With an envelope: only the default chart changes; the sibling stays.
 */
export function commitChartDocument(file: string, document: string): string {
  return replaceChart(file, splitCho(file).defaultId, document)
}
