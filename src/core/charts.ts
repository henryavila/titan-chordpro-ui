/**
 * Named charts in one song file. `{start_of_x_chart: id}` … `{end_of_x_chart}`.
 * No pair = one implicit chart `id=default`. `{new_song}` is not used.
 * N>1: the file is only those blocks (blank lines between them are allowed).
 * Title, artist, key, duration, and audio live inside the block that owns them.
 */

/** The file has chart blocks plus some other top-level text, or a bad default marker. */
export class ChartEnvelopeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ChartEnvelopeError'
  }
}

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
    // `{x_chart_default}` inside tab or score is notation, not a header value.
    if (where === 'in' && d.name === 'x_chart_default') continue
    const exact = (META_KEYS as readonly string[]).includes(d.name)
    if (exact || meta[canon] === undefined) meta[canon] = d.value
  }
  return meta
}

/**
 * No pair: the whole file, same as before.
 * With chart blocks: the chart that opens, read from inside that block.
 * A sibling key or title must not win. Outside text is refused.
 */
export function readMeta(source: string): ChartMeta {
  const text = String(source ?? '')
  if (!splitCho(text).hasEnvelope) return readMetaLines(text)
  return readMetaLines(chartDocument(text))
}

type OpenChart = {
  id: string
  label: string | null
  inner: string[]
  startLi: number
  /** `{x_chart_default}` outside tab and score names this chart. */
  selfDefault: boolean
  /** `{x_chart_default}` outside tab and score names some other id. */
  foreignDefault: boolean
}

export function splitCho(source: string): SplitCho {
  const text = String(source ?? '').replace(/\r\n?/g, '\n')
  const raws = text.split('\n')
  const charts: FileChart[] = []
  const flags: { selfDefault: boolean; foreignDefault: boolean }[] = []
  let cur: OpenChart | null = null

  const flush = (endLi: number) => {
    if (!cur) return
    charts.push({
      id: cur.id,
      label: cur.label,
      inner: cur.inner.join('\n'),
      startLi: cur.startLi,
      endLi,
    })
    flags.push({ selfDefault: cur.selfDefault, foreignDefault: cur.foreignDefault })
    cur = null
  }

  // Notation state resets on a chart fence. An open tab must not hide the next chart.
  let block = { tab: false, score: false }
  let seenChart = false
  let outside = false

  for (let li = 0; li < raws.length; li++) {
    const raw = raws[li] ?? ''
    const d = dirOf(raw)
    if (d?.name === 'start_of_x_chart' || d?.name === 'end_of_x_chart') {
      block = { tab: false, score: false }
      if (d.name === 'start_of_x_chart') {
        seenChart = true
        flush(li)
        if (!isChartId(d.value)) {
          outside = true
          continue
        }
        cur = {
          id: d.value,
          label: null,
          inner: [],
          startLi: li,
          selfDefault: false,
          foreignDefault: false,
        }
        continue
      }
      if (cur) flush(li)
      else if (seenChart) outside = true
      continue
    }
    const inNotation = d ? stepBlock(d.name, block) === 'in' : block.tab || block.score
    if (!cur) {
      if (raw.trim() !== '') outside = true
      continue
    }
    // Inside tab or score the line is notation: not this chart's title, label, or default.
    if (!inNotation && d?.name === 'x_chart_label' && cur.label === null && d.value) cur.label = d.value
    if (!inNotation && d?.name === 'x_chart_default') {
      if (d.value === cur.id) cur.selfDefault = true
      else cur.foreignDefault = true
    }
    cur.inner.push(raw)
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

  if (outside) throw new ChartEnvelopeError('chart file has text outside chart blocks')
  if (flags.some((f) => f.foreignDefault)) {
    throw new ChartEnvelopeError('x_chart_default names a different chart')
  }
  const selves = flags.filter((f) => f.selfDefault).length
  if (selves > 1) throw new ChartEnvelopeError('more than one chart marks itself default')
  const selfAt = flags.findIndex((f) => f.selfDefault)
  const header = raws.slice(0, charts[0]!.startLi).join('\n')
  const named = selfAt >= 0 ? charts[selfAt]!.id : charts[0]!.id
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

export function resolveChartId(source: string, chartId?: string): string {
  const split = splitCho(source)
  if (chartId && split.charts.some((c) => c.id === chartId)) return chartId
  return split.defaultId
}

/**
 * The chart that opens, or `chartId` when that block exists.
 * No pair: the whole file. N>1: that block's own text, fences not included.
 * Title and artist are already inside the block. No sibling body.
 */
export function chartDocument(source: string, chartId?: string): string {
  const split = splitCho(source)
  if (!split.hasEnvelope) return split.header
  const id = resolveChartId(source, chartId)
  const chart = split.charts.find((c) => c.id === id) ?? split.charts[0]!
  return chart.inner
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
    // A name inside tab or score is notation. Do not copy it out.
    if (stepBlock(d.name, block) === 'in') continue
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

function metaTrim(value: string | undefined): string {
  return (value ?? '').trim()
}

/**
 * One-chart files only. N>1 does not use this: a key in the patch is the field
 * to change, and the value is not compared to decide whether it was copied.
 *
 * Each key is classified on its own. A value that differs from `readMeta`,
 * including `''`, is an edit. A value that still equals `readMeta` is a copy
 * when another identity key is also in the patch, or when a sound edit is the
 * only change and the header already shows that value. A sound edit does not
 * cancel an identity edit whose header value differs. One named identity key,
 * with no other edit, is applied even when it equals `readMeta`.
 */
export function copiedIdentityKeys(source: string, patch: MetaPatch): Set<string> {
  const read = readMeta(source)
  const header = headerCanonicalIdentity(source)
  const touched = PARSE_IDENTITY_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(patch, key))
  const identityEdits = touched.filter((key) => metaTrim(patch[key]) !== metaTrim(read[key]))
  let soundDiffers = false
  for (const key of META_KEYS) {
    if ((PARSE_IDENTITY_KEYS as readonly string[]).includes(key)) continue
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
    if (metaTrim(patch[key]) !== metaTrim(read[key])) {
      soundDiffers = true
      break
    }
  }
  const copies = new Set<string>()
  for (const key of touched) {
    const patchVal = metaTrim(patch[key])
    if (patchVal !== metaTrim(read[key])) continue
    if (identityEdits.length > 0 || touched.length > 1) {
      copies.add(key)
      continue
    }
    if (soundDiffers) {
      const headerVal = metaTrim(header[key])
      if (headerVal !== '' && headerVal !== patchVal) continue
      copies.add(key)
    }
  }
  return copies
}

/**
 * Header lines this patch must not replace.
 * `copyKeys` are identity fields still equal to `readMeta` that the caller
 * did not ask to change. A key the caller edited is applied.
 */
function patchIdentityKeep(
  source: string,
  patch: MetaPatch,
  appliedKeys: readonly string[],
  copyKeys: ReadonlySet<string>,
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
    if (!copyKeys.has(key)) continue
    if (metaTrim(patch[key]) !== metaTrim(read[key])) continue
    keep.add(key)
  }
  return keep
}

function writeFlatScoped(
  source: string,
  patch: MetaPatch,
  keys: readonly string[],
  copyKeys: ReadonlySet<string> = new Set(),
): string {
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
  const keep = patchIdentityKeep(source, patch, keys, copyKeys)
  for (const key of keep) delete next[key as MetaKey]
  return writeMetaOneHeader(source, next, keep)
}

export type SongMetaWriteOpts = { copyKeys?: ReadonlySet<string> }

const CHART_IDENTITY_KEYS = ['title', 'subtitle', 'artist', 'x_source', 'x_youtube'] as const

/** Change identity lines in one chart. Sound lines and notation stay put. */
function patchIdentityInPlace(inner: string, patch: MetaPatch): string {
  const wanted = new Map<string, string>()
  for (const key of CHART_IDENTITY_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
    wanted.set(key, (patch[key] ?? '').trim())
  }
  if (!wanted.size) return inner
  const lines = inner.length ? inner.split('\n') : []
  const block = { tab: false, score: false }
  const replaced = new Set<string>()
  const out: string[] = []
  for (const line of lines) {
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
    if (!ident || !wanted.has(ident)) {
      out.push(line)
      continue
    }
    if (replaced.has(ident)) continue
    replaced.add(ident)
    const value = wanted.get(ident) ?? ''
    if (value) out.push('{' + ident + ':' + value + '}')
  }
  const missing: string[] = []
  for (const [ident, value] of wanted) {
    if (replaced.has(ident) || !value) continue
    missing.push('{' + ident + ':' + value + '}')
  }
  if (!missing.length) return out.join('\n')
  return [...missing, ...out].join('\n')
}

function notationInside(lines: string[]): boolean[] {
  const block = { tab: false, score: false }
  return lines.map((line) => {
    const d = dirOf(line)
    if (!d) return block.tab || block.score
    return stepBlock(d.name, block) === 'in'
  })
}

function stripDefaultMarkers(inner: string): string {
  if (!inner) return ''
  const lines = inner.split('\n')
  const inside = notationInside(lines)
  return lines
    .filter((line, i) => inside[i] || dirOf(line)?.name !== 'x_chart_default')
    .join('\n')
}

function withSelfMarker(inner: string, id: string): string {
  const stripped = stripDefaultMarkers(inner)
  const marker = '{x_chart_default:' + id + '}'
  return stripped ? marker + '\n' + stripped : marker
}

function withChartInners(split: SplitCho, inners: string[]): string {
  let raws = split.raws
  for (let i = split.charts.length - 1; i >= 0; i--) {
    const next = inners[i] ?? ''
    if (next === split.charts[i]!.inner) continue
    raws = spliceInner(raws, split.charts[i]!, next)
  }
  return raws.join('\n')
}

/**
 * N>1 write. One chart, only the keys in `allowed` that the patch names.
 * No shared header. `{x_chart_default}` moves the self-marker; other fields
 * stay on `chartId` (the chart that was open, or the chart the caller named).
 */
function writeEnvelopeMeta(
  split: SplitCho,
  patch: MetaPatch,
  allowed: readonly string[],
  chartId: string,
): string {
  const index = split.charts.findIndex((c) => c.id === chartId)
  if (index < 0) return split.raws.join('\n')
  const inners = split.charts.map((c) => c.inner)
  const songPatch: MetaPatch = {}
  const soundPatch: MetaPatch = {}
  for (const key of allowed) {
    if (key === 'x_chart_default') continue
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
    if ((CHART_IDENTITY_KEYS as readonly string[]).includes(key)) songPatch[key] = patch[key]
    else if ((CHART_SOUND_KEYS as readonly string[]).includes(key)) soundPatch[key] = patch[key]
  }
  const current = inners[index] ?? ''
  let next = current
  if (Object.keys(songPatch).length) next = patchIdentityInPlace(next, songPatch)
  if (Object.keys(soundPatch).length) next = rewriteChartInner(next, soundPatch)
  inners[index] = next
  if (
    (allowed as readonly string[]).includes('x_chart_default') &&
    Object.prototype.hasOwnProperty.call(patch, 'x_chart_default')
  ) {
    const raw = (patch.x_chart_default ?? '').trim()
    if (!raw) {
      for (let i = 0; i < inners.length; i++) inners[i] = stripDefaultMarkers(inners[i] ?? '')
    } else if (!split.charts.some((c) => c.id === raw)) {
      throw new ChartEnvelopeError('x_chart_default names a different chart')
    } else {
      for (let i = 0; i < inners.length; i++) {
        const id = split.charts[i]!.id
        inners[i] = id === raw ? withSelfMarker(inners[i] ?? '', id) : stripDefaultMarkers(inners[i] ?? '')
      }
    }
  }
  return withChartInners(split, inners)
}

/** Rewrite song-header keys on a one-chart file. N>1 patches the open chart only. */
export function writeSongScopedMeta(source: string, patch: MetaPatch, opts?: SongMetaWriteOpts): string {
  const copyKeys = opts?.copyKeys ?? new Set<string>()
  const split = splitCho(source)
  if (!split.hasEnvelope) return writeFlatScoped(source, patch, SONG_META_KEYS, copyKeys)
  return writeEnvelopeMeta(split, patch, SONG_META_KEYS, split.defaultId)
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
  const inside = notationInside(lines)
  const labelLines: string[] = []
  const rest: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const d = dirOf(line)
    // Notation stays on its line. Do not hoist a label or a sound key out of it.
    if (inside[i]) {
      rest.push(line)
      continue
    }
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

function outsideNamedLines(inner: string, name: string): string[] {
  if (!inner) return []
  const lines = inner.split('\n')
  const inside = notationInside(lines)
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    if (inside[i]) continue
    const line = lines[i] ?? ''
    if (dirOf(line)?.name === name) out.push(line)
  }
  return out
}

/**
 * The document replaces that chart. Title bytes stay as written.
 * A label or self-marker omitted from the document stays on the chart.
 * A marker that names another chart is not written in. Notation stays.
 * The sibling block is not rewritten.
 */
function chartInnerFromDocument(chart: FileChart, document: string): string {
  const lines = document.length ? document.split('\n') : []
  const inside = notationInside(lines)
  const body = lines.filter((line, i) => {
    if (inside[i]) return true
    const d = dirOf(line)
    if (!d || d.name !== 'x_chart_default') return true
    return d.value === chart.id
  })
  let text = body.join('\n')
  if (!outsideNamedLines(text, 'x_chart_label').length) {
    const labels = outsideNamedLines(chart.inner, 'x_chart_label')
    if (labels.length) text = [...labels, text].filter((s) => s.length > 0).join('\n')
  }
  if (!outsideNamedLines(text, 'x_chart_default').length) {
    const marker = outsideNamedLines(chart.inner, 'x_chart_default').find((line) => dirOf(line)?.value === chart.id)
    if (marker) text = [marker, text].filter((s) => s.length > 0).join('\n')
  }
  return text
}

/**
 * Splice a chart document back into one block.
 * No pair: `default` or an empty id replaces the file.
 * N>1: that block only. There is no shared header to update.
 */
export function replaceChart(file: string, chartId: string, doc: string): string {
  const src = String(file ?? '').replace(/\r\n?/g, '\n')
  const document = String(doc ?? '').replace(/\r\n?/g, '\n')
  const split = splitCho(src)
  if (!split.hasEnvelope) {
    if (!isImplicitChartId(chartId)) return src
    return document
  }
  const index = split.charts.findIndex((c) => c.id === chartId)
  if (index < 0) return src
  const chart = split.charts[index]!
  const inners = split.charts.map((c) => c.inner)
  inners[index] = chartInnerFromDocument(chart, document)
  return withChartInners(split, inners)
}

/**
 * Write a chart document back. No envelope: `default` replaces the file.
 * With an envelope: only the default chart changes; the sibling stays.
 */
export function commitChartDocument(file: string, document: string): string {
  return replaceChart(file, splitCho(file).defaultId, document)
}
