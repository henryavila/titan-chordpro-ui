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
  composer: 'artist',
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

/** Song identity `readMeta` can store. `{composer:}` is artist; `{x_chart_default}` is not. */
function songIdentityMetaKey(name: string): MetaKey | null {
  const song = songMetaKey(name)
  if (!song || song === 'x_chart_default') return null
  return (META_KEYS as readonly string[]).includes(song) ? (song as MetaKey) : null
}

function readMetaLines(source: string): ChartMeta {
  const meta: ChartMeta = {}
  const block = { tab: false, score: false }
  for (const l of String(source ?? '').split('\n')) {
    const d = dirOf(l)
    if (!d) continue
    const where = stepBlock(d.name, block)
    // A name inside tab or score is notation, not the song credit.
    if (where === 'in' && songIdentityMetaKey(d.name)) continue
    // Raw song identity may omit the colon (`{title Uma}`) or use `{composer:}`.
    // Sound keys still need a colon, so `{key C}` is not a second header key.
    const colonForm = /^\s*\{\s*[a-zA-Z_]+\s*:/.test(l)
    const ident = songIdentityMetaKey(d.name)
    if (!colonForm && !ident) continue
    const canon = canonicalMetaKey(d.name) ?? ident
    if (!canon) continue
    const exact = (META_KEYS as readonly string[]).includes(d.name)
    if (exact || meta[canon] === undefined) meta[canon] = d.value
  }
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
  const block = { tab: false, score: false }
  const out: string[] = []
  for (const line of header.split('\n')) {
    const d = dirOf(line)
    if (!d) continue
    // The block stays in the file. The chart document must not see its names
    // without the tab or score fences, or they become the song credit.
    if (stepBlock(d.name, block) === 'in') continue
    const canon = songMetaKey(d.name)
    if (canon !== null && canon !== 'x_chart_default') out.push(line)
  }
  return out.join('\n')
}

function chartDocBody(inner: string): string {
  const block = { tab: false, score: false }
  return inner
    .split('\n')
    .filter((line) => {
      const d = dirOf(line)
      if (!d) return true
      // Identity and `{x_chart_default}` inside tab or score are notation.
      // Filtering them out would make a later save delete the line.
      if (stepBlock(d.name, block) === 'in') return true
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
  const block = { tab: false, score: false }
  for (const line of text.split('\n')) {
    const d = dirOf(line)
    if (!d) continue
    // A credit inside tab or score stays on that line. `{x_chart_default}` there
    // is still the file selector: do not copy it out, or a subtitle save would
    // emit a second one and the tab copy would win or disappear.
    if (which === 'song' && stepBlock(d.name, block) === 'in' && songMetaKey(d.name)) continue
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
export function writeMetaOneHeader(
  source: string,
  meta: ChartMeta,
  keepIdentity?: ReadonlySet<string>,
): string {
  const keep = keepIdentity ?? roundTripIdentityKeep(source, meta)
  // A patch that omits `{x_chart_default}` must not drop a line already in the file.
  const setsDefault = Object.prototype.hasOwnProperty.call(meta, 'x_chart_default')
  const lines = String(source ?? '').split('\n')
  const dropBlank = blanksOnlyBetweenLeadingSoundKeys(lines)
  const block = { tab: false, score: false }
  const body = lines.filter((l, i) => {
      if (dropBlank[i]) return false
      const parsed = dirOf(l)
      if (!parsed) return true
      const where = stepBlock(parsed.name, block)
      // A credit inside tab or score is not the song header. Leave it there.
      if (where === 'in' && songIdentityMetaKey(parsed.name)) return true
      // parse uses the last title, subtitle, or artist outside tab and score.
      // An unrelated save keeps those lines, including a later short alias.
      if (identityLineKept(parsed.name, keep)) return true
      const colonForm = /^\s*\{\s*[a-zA-Z_]+\s*:/.test(l)
      if (!colonForm) {
        // `{transpose 2}` stays. `{title Uma}` does not: readMeta still accepts it.
        return songIdentityMetaKey(parsed.name) === null
      }
      if (parsed.name === 'x_chart_default' && !setsDefault) return true
      return canonicalMetaKey(parsed.name) === null
    })
  const head = META_KEYS.filter((k) => {
    if (keep.has(k)) return false
    return (meta[k] ?? '').trim()
  }).map((k) => '{' + k + ':' + (meta[k] ?? '').trim() + '}')
  return [head.join('\n'), body.join('\n').replace(/^\n+/, '')].filter(Boolean).join('\n')
}

/** Implicit chart id when the file has no `{start_of_x_chart}`. */
function isImplicitChartId(chartId: string | undefined): boolean {
  const id = String(chartId ?? '').trim()
  return id === '' || id === 'default'
}

const PARSE_IDENTITY_KEYS = ['title', 'subtitle', 'artist'] as const
type ParseIdentityKey = (typeof PARSE_IDENTITY_KEYS)[number]

function identityLineKept(name: string, keep: ReadonlySet<string>): boolean {
  const ident = songIdentityMetaKey(name)
  return ident !== null && keep.has(ident)
}

type BlockEdge = 'tab-open' | 'tab-close' | 'score-open' | 'score-close'

function blockEdge(name: string): BlockEdge | null {
  if (name === 'sot' || name === 'start_of_tab') return 'tab-open'
  if (name === 'eot' || name === 'end_of_tab') return 'tab-close'
  if (name === 'sos' || name === 'start_of_score') return 'score-open'
  if (name === 'eos' || name === 'end_of_score') return 'score-close'
  return null
}

/** Opening line is `out`. Lines inside the block, including the close, are `in`. */
function stepBlock(name: string, block: { tab: boolean; score: boolean }): 'in' | 'out' {
  const edge = blockEdge(name)
  if (block.tab) {
    if (edge === 'tab-close') block.tab = false
    return 'in'
  }
  if (block.score) {
    if (edge === 'score-close') block.score = false
    return 'in'
  }
  if (edge === 'tab-open') {
    block.tab = true
    return 'out'
  }
  if (edge === 'score-open') {
    block.score = true
    return 'out'
  }
  return 'out'
}

/**
 * Last title, subtitle, and artist outside tab and score.
 * Credits inside `{start_of_tab}` / `{sot}` or `{start_of_score}` / `{sos}` are not the song.
 */
function visibleIdentityIn(text: string): Partial<Record<ParseIdentityKey, string>> {
  const out: Partial<Record<ParseIdentityKey, string>> = {}
  const block = { tab: false, score: false }
  for (const line of text.split('\n')) {
    const d = dirOf(line)
    if (!d) continue
    if (stepBlock(d.name, block) === 'in') continue
    const ident = songIdentityMetaKey(d.name)
    if (ident === 'title' || ident === 'subtitle' || ident === 'artist') out[ident] = d.value
  }
  return out
}

function visibleParseIdentity(source: string): Partial<Record<ParseIdentityKey, string>> {
  return visibleIdentityIn(chartDocument(source))
}

function identityDisagreements(
  read: ChartMeta,
  visible: Partial<Record<ParseIdentityKey, string>>,
): Set<ParseIdentityKey> {
  const out = new Set<ParseIdentityKey>()
  for (const key of PARSE_IDENTITY_KEYS) {
    if ((read[key] ?? '').trim() !== (visible[key] ?? '').trim()) out.add(key)
  }
  return out
}

/** `readMeta` prefers an earlier exact key. `parse` uses the last alias outside tab and score. */
function parseIdentityDisagreements(source: string): Set<ParseIdentityKey> {
  return identityDisagreements(readMeta(source), visibleParseIdentity(source))
}

/**
 * Song header only. `{artist:}` inside the default chart must not count:
 * a sibling with no artist of its own still parses the header's later alias.
 */
function headerIdentityDisagreements(source: string): Set<ParseIdentityKey> {
  const header = splitCho(source).header
  return identityDisagreements(readMetaLines(header), visibleIdentityIn(header))
}

/** Identity keys on a `readMeta` copy that `parse` does not show. Flat echo path. */
function roundTripIdentityKeep(source: string, meta: ChartMeta): Set<string> {
  const read = readMeta(source)
  const keep = new Set<string>()
  for (const key of parseIdentityDisagreements(source)) {
    if (!Object.prototype.hasOwnProperty.call(meta, key)) continue
    if ((meta[key] ?? '').trim() === (read[key] ?? '').trim()) keep.add(key)
  }
  return keep
}

/** Song header only, not the chart body. Exact `{title:}` wins over a later alias. */
function headerCanonicalIdentity(source: string): ChartMeta {
  const split = splitCho(source)
  return readMetaLines(split.hasEnvelope ? split.header : String(source ?? ''))
}

/**
 * True when `patch` is a `readMeta` spread, not a sparse edit.
 * `{title:Second}` against a header `{title:First}` is an edit: `readMeta`
 * already returns Second from the default chart, and preserveEcho must not
 * swallow it. A spread that only adds `{subtitle}` must not apply the copied
 * artist. A non-identity field (key, audio) marks the same spread.
 */
export function patchEchoesReadMeta(source: string, patch: MetaPatch): boolean {
  const read = readMeta(source)
  for (const key of META_KEYS) {
    if ((read[key] ?? '').trim() === '') continue
    if (!Object.prototype.hasOwnProperty.call(patch, key)) return false
  }
  for (const key of META_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
    // A sound or source field, even cleared to '', means the caller copied
    // readMeta and then edited that field. An empty clear still counts.
    if ((PARSE_IDENTITY_KEYS as readonly string[]).includes(key)) continue
    return true
  }
  const header = headerCanonicalIdentity(source)
  for (const key of PARSE_IDENTITY_KEYS) {
    if ((read[key] ?? '').trim() === '') continue
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
    const headerVal = (header[key] ?? '').trim()
    // No header value: the copy came from the chart body. Do not promote it.
    // A header value that differs (First vs the chart's Second) is the edit.
    if (headerVal !== '' && headerVal !== (patch[key] ?? '').trim()) return false
  }
  return true
}

/**
 * Header lines this patch must not replace.
 * A key the caller named is applied, even when the value equals `readMeta`.
 * `preserveEcho` is the separate signal that the caller copied `readMeta`
 * and did not ask to change that key.
 */
function patchIdentityKeep(
  source: string,
  patch: MetaPatch,
  appliedKeys: readonly string[],
  preserveEcho: boolean,
): Set<string> {
  const read = readMeta(source)
  const disagree = headerIdentityDisagreements(source)
  const keep = new Set<string>()
  for (const key of PARSE_IDENTITY_KEYS) {
    const seen = appliedKeys.includes(key) && Object.prototype.hasOwnProperty.call(patch, key)
    if (!seen) {
      if (disagree.has(key)) keep.add(key)
      continue
    }
    if (!preserveEcho) continue
    if ((patch[key] ?? '').trim() !== (read[key] ?? '').trim()) continue
    keep.add(key)
  }
  return keep
}

function appliedIdentityKeys(
  patch: MetaPatch,
  keep: ReadonlySet<string>,
  keys: readonly string[],
): Set<ParseIdentityKey> {
  const out = new Set<ParseIdentityKey>()
  for (const key of PARSE_IDENTITY_KEYS) {
    if (!keys.includes(key)) continue
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
    if (keep.has(key)) continue
    out.add(key)
  }
  return out
}

/** Drop applied identity aliases. Lines inside tab or score stay. */
function stripSongIdentity(inner: string, keys: ReadonlySet<string>): string {
  const block = { tab: false, score: false }
  const out: string[] = []
  for (const line of inner.split('\n')) {
    const d = dirOf(line)
    if (!d) {
      out.push(line)
      continue
    }
    if (stepBlock(d.name, block) === 'in') {
      out.push(line)
      continue
    }
    const ident = songIdentityMetaKey(d.name)
    if (ident && keys.has(ident)) continue
    out.push(line)
  }
  return out.join('\n')
}

function keepSongHeaderLine(line: string, block: { tab: boolean; score: boolean }, keep: ReadonlySet<string>): boolean {
  const d = dirOf(line)
  if (!d) return true
  const where = stepBlock(d.name, block)
  // `{x_chart_default}` inside a header tab is the selector, not a credit.
  // Song-meta lines are normally rewritten at the top; this one must stay.
  if (where === 'in' && (songIdentityMetaKey(d.name) || songMetaKey(d.name) === 'x_chart_default')) return true
  if (identityLineKept(d.name, keep)) return true
  return songMetaKey(d.name) === null
}

function writeFlatScoped(source: string, patch: MetaPatch, keys: readonly string[], preserveEcho = false): string {
  const next: ChartMeta = { ...readMeta(source) }
  for (const k of keys) {
    if (!(META_KEYS as readonly string[]).includes(k)) continue
    if (!Object.prototype.hasOwnProperty.call(patch, k)) continue
    const key = k as MetaKey
    const v = (patch[k] ?? '').trim()
    if (v) next[key] = v
    // Deleting an explicit empty `{x_chart_default}` looks like an omit, and
    // writeMetaOneHeader then keeps the line already in the file.
    else if (key === 'x_chart_default') next[key] = ''
    else delete next[key]
  }
  const keep = patchIdentityKeep(source, patch, keys, preserveEcho)
  for (const key of keep) delete next[key as MetaKey]
  return writeMetaOneHeader(source, next, keep)
}

export type SongMetaWriteOpts = { preserveEcho?: boolean }

/** Rewrite song-header keys; never strip `{key:}` / `{duration:}` from chart blocks. */
export function writeSongScopedMeta(source: string, patch: MetaPatch, opts?: SongMetaWriteOpts): string {
  const preserveEcho = opts?.preserveEcho === true
  const split = splitCho(source)
  if (!split.hasEnvelope) return writeFlatScoped(source, patch, SONG_META_KEYS, preserveEcho)
  const first = split.charts[0]!
  const headerLines = split.raws.slice(0, first.startLi)
  const keep = patchIdentityKeep(source, patch, SONG_META_KEYS, preserveEcho)
  const next = applyPatch(readKeyed(headerLines.join('\n'), 'song'), patch, SONG_META_KEYS)
  for (const key of keep) delete next[key]
  const applied = appliedIdentityKeys(patch, keep, SONG_META_KEYS)
  let raws = split.raws
  if (applied.size) {
    const chart = split.charts.find((c) => c.id === split.defaultId)
    if (chart) raws = spliceInner(raws, chart, stripSongIdentity(chart.inner, applied))
  }
  const block = { tab: false, score: false }
  const rest = headerLines
    .filter((line) => keepSongHeaderLine(line, block, keep))
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')
  const head = formatKeys(SONG_META_KEYS, next)
  const header = [head, rest].filter((s) => s.length > 0).join('\n')
  const tail = raws.slice(first.startLi).join('\n')
  return [header, tail].filter((s) => s.length > 0).join('\n')
}

/** A lyric, `{image:}`, or `{img:}` starts the body. `{c:}` and `{comment:}` do not. */
function lineStartsChartBody(directive: { name: string } | null): boolean {
  if (!directive) return true
  return directive.name === 'image' || directive.name === 'img'
}

/**
 * Blanks that sit only between leading sound keys.
 * Each non-blank line is classified once. Neighbour indexes are one forward
 * pass and one backward pass, so a long directive is not parsed again per blank.
 * A blank stays once a lyric or an image outside tab and score has started.
 * `{image:}` inside `{sot}` / `{start_of_tab}` or score does not start the body.
 */
function blanksOnlyBetweenLeadingSoundKeys(lines: string[]): boolean[] {
  const n = lines.length
  const prev = new Array<number>(n)
  const next = new Array<number>(n)
  const bodyBefore = new Array<boolean>(n)
  const isSound = new Array<boolean>(n)
  let lastNonBlank = -1
  let seenBody = false
  const block = { tab: false, score: false }
  for (let i = 0; i < n; i++) {
    prev[i] = lastNonBlank
    bodyBefore[i] = seenBody
    const line = lines[i] ?? ''
    if (line.trim() === '') continue
    lastNonBlank = i
    const directive = dirOf(line)
    if (directive) {
      if (stepBlock(directive.name, block) === 'in') continue
    } else if (block.tab || block.score) {
      // A staff or score row is notation, not the lyric that starts the body.
      continue
    }
    isSound[i] = !!(directive && chartSoundKey(directive.name))
    if (lineStartsChartBody(directive)) seenBody = true
  }
  lastNonBlank = n
  for (let i = n - 1; i >= 0; i--) {
    next[i] = lastNonBlank
    if ((lines[i] ?? '').trim() !== '') lastNonBlank = i
  }
  const drop = new Array<boolean>(n).fill(false)
  for (let i = 0; i < n; i++) {
    if ((lines[i] ?? '').trim() !== '' || bodyBefore[i]) continue
    const beforeAt = prev[i] ?? -1
    const afterAt = next[i] ?? n
    if (beforeAt < 0 || afterAt >= n) continue
    drop[i] = isSound[beforeAt] === true && isSound[afterAt] === true
  }
  return drop
}

function rewriteChartInner(inner: string, patch: MetaPatch): string {
  const lines = inner.split('\n')
  const dropBlank = blanksOnlyBetweenLeadingSoundKeys(lines)
  const labelLines: string[] = []
  const rest: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const d = dirOf(line)
    if (d?.name === 'x_chart_label') {
      labelLines.push(line)
      continue
    }
    if (d && chartSoundKey(d.name)) continue
    // A blank under the label is content. A blank only between leading sound
    // keys is not: regrouping those keys must not drop it onto the lyric.
    if (dropBlank[i]) continue
    rest.push(line)
  }
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
 * Song-identity lines from a chart document, raw. `dirOf` trims values, so a
 * trailing space in `{title:Uma }` only survives if the line itself is copied.
 * An empty `{title:}` is present. A missing key is not.
 */
function rawSongIdentityLines(document: string): Map<string, string> {
  const out = new Map<string, string>()
  const block = { tab: false, score: false }
  for (const line of document.split('\n')) {
    const d = dirOf(line)
    if (!d) continue
    // `{t:}` / `{composer:}` inside tab or score is notation, not the header.
    if (stepBlock(d.name, block) === 'in') continue
    const canon = songMetaKey(d.name)
    if (!canon || canon === 'x_chart_default') continue
    const exact = (SONG_META_KEYS as readonly string[]).includes(d.name)
    if (exact || !out.has(canon)) out.set(canon, line)
  }
  return out
}

/**
 * Copy song-identity lines onto the header in place. Omitted keys are removed.
 * Comments, `{x_chart_default}`, and the blank line before the first chart stay.
 */
function applyRawSongIdentity(raws: string[], headerEnd: number, document: string): string[] {
  const wanted = rawSongIdentityLines(document)
  const seen = new Set<string>()
  const nextHeader: string[] = []
  const block = { tab: false, score: false }
  for (const line of raws.slice(0, headerEnd)) {
    const d = dirOf(line)
    // The chart document does not carry names that live inside tab or score.
    // Leaving them out is not a request to delete the notation.
    if (d && stepBlock(d.name, block) === 'in') {
      nextHeader.push(line)
      continue
    }
    const canon = d ? songMetaKey(d.name) : null
    if (!canon || canon === 'x_chart_default') {
      nextHeader.push(line)
      continue
    }
    if (seen.has(canon)) continue
    seen.add(canon)
    const raw = wanted.get(canon)
    if (raw === undefined) continue
    nextHeader.push(raw)
  }
  const missing: string[] = []
  for (const key of SONG_META_KEYS) {
    if (key === 'x_chart_default') continue
    if (wanted.has(key) && !seen.has(key)) missing.push(wanted.get(key)!)
  }
  if (missing.length) {
    let at = nextHeader.length
    while (at > 0 && nextHeader[at - 1]!.trim() === '') at--
    nextHeader.splice(at, 0, ...missing)
  }
  return [...nextHeader, ...raws.slice(headerEnd)]
}

/**
 * Splice a one-chart document back into the named envelope block.
 * Song identity is copied raw (trailing space and empty `{title:}` stay).
 * A missing title, subtitle, artist, x_source, or x_youtube clears that field.
 * `{x_chart_default}` is left as it stands. The sibling chart stays.
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
  const block = { tab: false, score: false }
  for (const line of document.split('\n')) {
    const d = dirOf(line)
    // Notation keeps its own title, artist, composer, and lyricist lines.
    // Omitting them from the song header is not a request to delete them.
    if (d && stepBlock(d.name, block) === 'in') {
      body.push(line)
      continue
    }
    if (d && songMetaKey(d.name)) continue
    if (d && isEnvelopeName(d.name)) continue
    body.push(line)
  }
  // A blank line at the top of the chart body is content. Do not strip it.

  const hasLabel = body.some((line) => dirOf(line)?.name === 'x_chart_label')
  const labelLine = !hasLabel && chart.label ? `{x_chart_label:${chart.label}}` : null
  const inner = [labelLine, body.join('\n')].filter((s) => s && s.length > 0).join('\n')
  const spliced = spliceInner(split.raws, chart, inner)
  return applyRawSongIdentity(spliced, split.charts[0]!.startLi, document).join('\n')
}

/**
 * Write a chart document back. No envelope: `default` replaces the file.
 * With an envelope: only the default chart changes; the sibling stays.
 */
export function commitChartDocument(file: string, document: string): string {
  return replaceChart(file, splitCho(file).defaultId, document)
}
