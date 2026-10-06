import {
  isLegalStrumPattern,
  patternFromCc,
  repairStrumPattern,
  type StrumPattern,
} from '../strum'
import { metaFromStrumSet, type StrumPatternSet } from '../strum-multi'
import { detectKeyRewrite, type KeyRewriteOffer } from './key-rewrite'
import {
  readMeta,
  readStrumPatterns,
  writeMeta,
  type ChartMeta,
  type MetaKey,
} from './meta'
import { isChordLine, isTabLine } from './chord-line'
import { stripPlainCifraClubTabs } from './cifraclub-tabs'
import { SECTION } from './plain'

export function titleFromUrl(url: string): { title: string; subtitle: string } {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    const slug = parts[parts.length - 1] || ''
    const artist = parts.length > 1 ? (parts[parts.length - 2] ?? '') : ''
    const nice = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return { title: nice(slug), subtitle: nice(artist) }
  } catch {
    return { title: '', subtitle: '' }
  }
}

export const SUPPORTED_HOSTS = ['cifraclub.com.br', 'www.cifraclub.com.br']

export function hostOk(url: string): boolean {
  try {
    return SUPPORTED_HOSTS.includes(new URL(url).hostname)
  } catch {
    return false
  }
}

/**
 * A Cifra Club page. The attributes are a fast path; the chart itself is
 * recognized by its text (section labels, chord lines, a lyric), so a
 * redesign that renames every class still counts.
 */
export function looksLikeCifraClubHtml(text: string): boolean {
  if (/data-chord-content|data-chord-name\s*=/.test(text)) return true
  if (!/<\w+[\s>/]/i.test(text)) return false
  return chartScore(markupToText(extractChartHtml(text))) > 0
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
}

/**
 * Cifra Club plants `.` in the lyric at the attack of the chord (`f.az`,
 * `uni.ao`). Merge first (columns still match), then drop the dots from the
 * words — never from `[G9]` / `{c:…}`.
 */
export function stripLyricDots(source: string): string {
  return source
    .split('\n')
    .map((line) => {
      if (/^\s*\{/.test(line)) return line
      return line.replace(/\[([^\]]*)\]|\./g, (m, chord: string | undefined) =>
        chord !== undefined ? '[' + chord + ']' : '',
      )
    })
    .join('\n')
}

export type CifraClubPage = {
  body: string
  title: string
  subtitle: string
  key: string
  tempo: string
  time: string
  capo: string
  youtubeId: string
  strums: StrumPattern[]
}

/**
 * Next.js flight embeds songData with `\"` escapes. Turn those into real
 * quotes so ordinary JSON walking works. Only used for metadata extraction.
 */
function flightJsonView(html: string): string {
  return String(html ?? '').replace(/\\"/g, '"')
}

/**
 * Read a JSON value that starts at `from` in `text`. Understands strings with
 * escapes so nested `{` / `[` inside `"…"` do not break the walk.
 */
function readJsonValue(text: string, from: number): { value: unknown; end: number } | null {
  let i = from
  while (i < text.length && /\s/.test(text[i] ?? '')) i++
  const start = i
  const ch = text[i]
  if (ch === '"' || ch === "'") {
    const quote = ch
    i++
    let out = ''
    while (i < text.length) {
      const c = text[i++]
      if (c === '\\') {
        const n = text[i++]
        if (n === 'n') out += '\n'
        else if (n === 't') out += '\t'
        else if (n === '"' || n === "'" || n === '\\' || n === '/') out += n ?? ''
        else if (n === 'u' && i + 3 < text.length) {
          out += String.fromCharCode(parseInt(text.slice(i, i + 4), 16))
          i += 4
        } else out += n ?? ''
        continue
      }
      if (c === quote) break
      out += c
    }
    return { value: out, end: i }
  }
  if (ch === '{' || ch === '[') {
    const open = ch
    const close = ch === '{' ? '}' : ']'
    let depth = 0
    let inStr = false
    let esc = false
    for (; i < text.length; i++) {
      const c = text[i]
      if (inStr) {
        if (esc) esc = false
        else if (c === '\\') esc = true
        else if (c === '"') inStr = false
        continue
      }
      if (c === '"') {
        inStr = true
        continue
      }
      if (c === open) depth++
      else if (c === close) {
        depth--
        if (depth === 0) {
          i++
          try {
            return { value: JSON.parse(text.slice(start, i)), end: i }
          } catch {
            return null
          }
        }
      }
    }
    return null
  }
  const lit = text.slice(i).match(/^(true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/)
  if (lit) return { value: JSON.parse(lit[1]!), end: i + lit[1]!.length }
  return null
}

/** Find `"key":` and parse the following JSON value (on a flight-normalized view). */
function jsonAfterKey(view: string, key: string): unknown {
  const re = new RegExp(`"${key}"\\s*:`)
  const m = re.exec(view)
  if (!m) return undefined
  const got = readJsonValue(view, m.index + m[0].length)
  return got?.value
}

function extractCcStrums(html: string): StrumPattern[] {
  const view = flightJsonView(html)
  const raw = jsonAfterKey(view, 'strummings')
  if (!Array.isArray(raw)) return []
  const out: StrumPattern[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const pattern = Array.isArray(o.pattern) ? o.pattern.map((n) => Number(n) || 0) : []
    if (!pattern.length) continue
    const ts = Array.isArray(o.timeSignature) ? o.timeSignature.map(String) : []
    const bpm = typeof o.bpm === 'number' ? o.bpm : Number(o.bpm) || null
    const label = typeof o.section === 'string' ? o.section : 'Padrão'
    const built = patternFromCc(pattern, ts, bpm, label)
    // Hand physics: adequar fase ↓↑ (preserva contato/essência); rejeitar se
    // ainda for ilegal (ex. grid ímpar que não fecha o loop).
    const fixed = repairStrumPattern(built)
    if (!isLegalStrumPattern(fixed)) continue
    out.push(fixed)
  }
  return out
}

function extractYoutubeId(html: string): string {
  const view = flightJsonView(html)
  // Clip lives on metadata.youtubeID; videoLesson also has one — take the id
  // that appears before "videoLesson" when both are present.
  const cut = view.search(/"videoLesson"/)
  const head = cut >= 0 ? view.slice(0, cut) : view
  const m = head.match(/"youtubeID"\s*:\s*"([A-Za-z0-9_-]{11})"/)
  return m?.[1] ?? ''
}

function extractCapo(html: string): string {
  const view = flightJsonView(html)
  const cfg = jsonAfterKey(view, 'config')
  if (cfg && typeof cfg === 'object' && cfg !== null && 'capo' in cfg) {
    const n = Number((cfg as { capo: unknown }).capo)
    if (Number.isFinite(n) && n >= 0) return String(Math.min(9, Math.floor(n)))
  }
  const m = view.match(/"capo"\s*:\s*(\d+)/)
  return m?.[1] ?? '0'
}

function extractKeyShape(html: string): string {
  const view = flightJsonView(html)
  const cfg = jsonAfterKey(view, 'config')
  if (cfg && typeof cfg === 'object' && cfg !== null && 'keyShape' in cfg) {
    const k = String((cfg as { keyShape: unknown }).keyShape ?? '').trim()
    if (/^[A-G][#b]?m?$/.test(k)) return k
  }
  return ''
}

export function fromCifraClubHtml(html: string): CifraClubPage {
  const title =
    (html.match(/"@type":"MusicComposition","name":"([^"]+)"/) || [])[1]?.trim() ||
    (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [])[1]?.trim() ||
    ''
  const subtitle =
    (html.match(/"byArtist"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/) || [])[1]?.trim() ||
    (html.match(/<a href="\/[^"/]+\/"[^>]*>\s*<h2[^>]*>([^<]+)<\/h2>/i) || [])[1]?.trim() ||
    (html.match(/<a href="\/[^"/]+\/">([^<]+)<\/a>/i) || [])[1]?.trim() ||
    ''
  const key =
    (html.match(/data-anchor="--chord-tone"[^>]*>\s*([A-G][#b]?m?)\s*</i) || [])[1] ||
    (html.match(/>\s*Tom:\s*<\/span>\s*<button[^>]*>([A-G][#b]?m?)</i) || [])[1] ||
    (html.match(/\bTom:\s*([A-G][#b]?m?)\b/) || [])[1] ||
    extractKeyShape(html) ||
    ''
  const body = cifraPreToPlain(extractChartHtml(html))
  const strums = extractCcStrums(html)
  const tempo = strums[0]?.bpm != null ? String(strums[0].bpm) : ''
  const time = strums[0]?.meter || ''
  const capo = extractCapo(html)
  const youtubeId = extractYoutubeId(html)
  return { body, title, subtitle, key, tempo, time, capo, youtubeId, strums }
}

const BLOCK_TAG = 'div|p|pre|section|article|li|ul|ol|table|tr|td|th|header|footer|nav|main|figure|blockquote|h[1-6]'

function isSectionOnlyLine(line: string): boolean {
  const bare = line.trim()
  const inner = bare.replace(/^\[(.+)\]$/, '$1')
  return SECTION.test(inner) && !isChordLine(bare)
}

/**
 * Tags carry the chord token when the attribute is there; otherwise the
 * visible text is the token. Newlines that only indent a block tag are
 * markup. Newlines next to the words, and spaces between chords, stay.
 */
function markupToText(html: string): string {
  let s = String(html ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(new RegExp(`(<(?:${BLOCK_TAG})\\b[^>]*>)[ \\t]*\\n+[ \\t]*`, 'gi'), '$1')
  s = s.replace(new RegExp(`[ \\t]*\\n+[ \\t]*(<(?:${BLOCK_TAG})\\b)`, 'gi'), '$1')
  s = s.replace(new RegExp(`(</(?:${BLOCK_TAG})>)[ \\t]*\\n+[ \\t]*`, 'gi'), '$1')
  s = s.replace(
    /<([a-zA-Z][\w:-]*)\b[^>]*\bdata-chord-original-text="([^"]*)"[^>]*>[\s\S]*?<\/\1>/gi,
    '$2',
  )
  s = s.replace(/<[^>]+>/g, '')
  return decodeEntities(s).replace(/\r/g, '').replace(/[ \t]+$/gm, '')
}

/** A `[Refrão]` with a blank under it would close the chorus before its first line. */
function dropBlanksAfterSection(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i] ?? '')
    if (!isSectionOnlyLine(lines[i] ?? '')) continue
    while (i + 1 < lines.length && !(lines[i + 1] ?? '').trim()) i++
  }
  return out.join('\n')
}

function chartSignals(text: string): { hits: number; lines: number; lyric: boolean } {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  let hits = 0
  let lyric = false
  for (const l of lines) {
    if (isChordLine(l) || isTabLine(l)) {
      hits++
      continue
    }
    if (isSectionOnlyLine(l) || /^\[[^\]]+\]/.test(l)) {
      hits++
      lyric = true
      continue
    }
    if (/[A-Za-zÀ-ÿ]{3}/.test(l)) lyric = true
  }
  return { hits, lines: lines.length, lyric }
}

/**
 * How many chart lines this text has. A chord menu has no lyric, so it
 * scores 0. The whole page is mostly chrome, so a low share of chart
 * lines scores 0. The cifra itself has the most hits.
 */
function chartScore(text: string): number {
  const s = chartSignals(text)
  if (!s.lyric || s.hits < 1 || s.lines < 2) return 0
  if (s.hits / s.lines < 0.15) return 0
  return s.hits
}

const VOID_TAG = /^(?:br|img|hr|meta|link|input|source|wbr|col|base|area)$/i

function elementInners(html: string): string[] {
  const src = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  const out: string[] = []
  const stack: number[] = []
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)\b[^>]*\/?>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    if (m[0].startsWith('<!--')) continue
    if (m[1]) {
      const start = stack.pop()
      if (start == null) continue
      out.push(src.slice(start, m.index))
      continue
    }
    const name = m[2] ?? ''
    if (VOID_TAG.test(name) || m[0].endsWith('/>')) continue
    stack.push(m.index + m[0].length)
  }
  return out
}

/** `<pre>` bodies, including a page whose last tag was cut off mid-attribute. */
function preInners(html: string): string[] {
  const src = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  return [...src.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi)].map((m) => m[1] ?? '')
}

/**
 * The region whose text is a chart: section labels and chord lines, not the
 * page around it and not the tab staff alone. Class names are not consulted.
 */
function extractChartHtml(html: string): string {
  let best = ''
  let bestScore = 0
  for (const inner of [...elementInners(html), ...preInners(html)]) {
    const score = chartScore(markupToText(inner))
    if (score > bestScore || (score === bestScore && best.length > 0 && inner.length < best.length)) {
      best = inner
      bestScore = score
    }
  }
  return bestScore > 0 ? best : ''
}

function cifraPreToPlain(fragment: string): string {
  const text = dropBlanksAfterSection(markupToText(fragment))
  return stripPlainCifraClubTabs(text.replace(/\n{3,}/g, '\n\n').trim())
}

const FILL_EMPTY_KEYS: readonly MetaKey[] = [
  'title',
  'subtitle',
  'key',
  'tempo',
  'time',
  'duration',
]

export function youtubeWatchUrl(id: string): string {
  const v = String(id ?? '').trim()
  return v ? `https://www.youtube.com/watch?v=${v}` : ''
}

export function youtubeEmbedUrl(id: string): string {
  const v = String(id ?? '').trim()
  return v ? `https://www.youtube.com/embed/${v}` : ''
}

export type EnrichConflict = { key: MetaKey; local: string; remote: string }

export type EnrichYoutube = {
  songTitle: string
  localId: string
  remoteId: string
  localUrl: string
  remoteUrl: string
}

export type EnrichStrumConflict = {
  local: StrumPatternSet
  remote: StrumPatternSet
}

/** Explicit batida choice when local and CC both have patterns. Default keep. */
export type CcStrumChoice = 'keep' | 'replace' | 'replace-with-local-copy'

/**
 * Meta-only proposal from a Cifra Club page. Never touches the chord body,
 * never calls convert/fromPlain, never applies capo.
 */
export type EnrichProposal = {
  proposed: ChartMeta
  /** Auto fields: fill-empty + x_titan_strum (keep-local) + x_titan_source. No youtube/capo. */
  patch: ChartMeta
  conflicts: EnrichConflict[]
  youtube: EnrichYoutube | null
  capoWarning: string | null
  /** Same rewrite card as import, when the probe (local body + CC tom/capo) mismatches. */
  keyRewrite: KeyRewriteOffer | null
  /** True when the CC page has no `strummings` payload (toolbar “Batidas” may still show). */
  strumMissing: boolean
  /**
   * When local already has batida and CC brings patterns — patch still omits
   * x_titan_strum (keep-local). UI may offer Manter / Trazer CC.
   */
  strumConflict: EnrichStrumConflict | null
}

function localCopyLabel(label: string): string {
  const base = String(label ?? '').trim() || 'Batida'
  return /local/i.test(base) ? base : `${base} (local)`
}

/**
 * Resolve an explicit Manter / Trazer CC batida choice.
 * - keep → null (caller leaves local alone)
 * - replace → CC set as-is (active 0)
 * - replace-with-local-copy → CC patterns + named copy of previous local active
 */
export function applyCcStrumChoice(
  conflict: EnrichStrumConflict,
  choice: CcStrumChoice,
): StrumPatternSet | null {
  if (choice === 'keep') return null
  const remote = {
    activeIndex: 0,
    patterns: [...conflict.remote.patterns],
  }
  if (choice === 'replace') return remote
  const localActive =
    conflict.local.patterns[conflict.local.activeIndex] ?? conflict.local.patterns[0]
  if (!localActive) return remote
  return {
    activeIndex: 0,
    patterns: [...remote.patterns, { ...localActive, label: localCopyLabel(localActive.label) }],
  }
}

/** Trazer CC: named copy when local or remote is multi; plain replace for 1↔1. */
export function trazerCcStrumChoice(conflict: EnrichStrumConflict): CcStrumChoice {
  if (conflict.local.patterns.length > 1 || conflict.remote.patterns.length > 1) {
    return 'replace-with-local-copy'
  }
  return 'replace'
}

export function proposeCifraClubEnrich(
  source: string,
  html: string,
  opts?: { url?: string },
): EnrichProposal {
  const page = fromCifraClubHtml(html)
  const local = readMeta(source)
  const remoteSet: StrumPatternSet | null = page.strums.length
    ? { activeIndex: 0, patterns: page.strums }
    : null
  const strumMeta = remoteSet ? metaFromStrumSet(remoteSet) : {}
  const proposed: ChartMeta = {
    ...(page.title ? { title: page.title } : {}),
    ...(page.subtitle ? { subtitle: page.subtitle } : {}),
    ...(page.key ? { key: page.key } : {}),
    ...(page.tempo ? { tempo: page.tempo } : {}),
    ...(page.time ? { time: page.time } : {}),
    ...(page.youtubeId ? { x_titan_youtube: page.youtubeId } : {}),
    ...strumMeta,
    ...(opts?.url?.trim() ? { x_titan_source: opts.url.trim() } : {}),
  }

  const patch: ChartMeta = {}
  const conflicts: EnrichConflict[] = []
  for (const k of FILL_EMPTY_KEYS) {
    const remote = String(proposed[k] ?? '').trim()
    if (!remote) continue
    const loc = String(local[k] ?? '').trim()
    if (!loc) patch[k] = remote
    else if (loc !== remote) conflicts.push({ key: k, local: loc, remote })
  }
  // Batida: keep-local — only fill when the chart has no batida yet.
  const localSet = readStrumPatterns(source)
  const localHasBatida = localSet.patterns.length > 0
  if (!localHasBatida && proposed.x_titan_strum) {
    patch.x_titan_strum = proposed.x_titan_strum
    if (proposed.x_titan_strum_set) patch.x_titan_strum_set = proposed.x_titan_strum_set
  }
  if (proposed.x_titan_source) patch.x_titan_source = proposed.x_titan_source

  const strumConflict: EnrichStrumConflict | null =
    localHasBatida && remoteSet
      ? { local: localSet, remote: remoteSet }
      : null

  const remoteId = String(proposed.x_titan_youtube ?? '').trim()
  const localId = String(local.x_titan_youtube ?? '').trim()
  const songTitle =
    String(local.title ?? '').trim() || String(page.title ?? '').trim() || 'Música'
  const youtube: EnrichYoutube | null = remoteId
    ? {
        songTitle,
        localId,
        remoteId,
        localUrl: youtubeWatchUrl(localId),
        remoteUrl: youtubeWatchUrl(remoteId),
      }
    : null

  const capoN = Math.max(0, Math.min(9, Number(page.capo) || 0))
  const capoWarning =
    capoN > 0
      ? `Cifra sugere capo ${capoN}`
      : null
  const probeMeta: ChartMeta = {
    ...local,
    ...(page.key ? { key: page.key } : {}),
    ...(capoN > 0 ? { capo: String(capoN) } : {}),
  }
  const keyRewrite =
    detectKeyRewrite(source) ?? detectKeyRewrite(writeMeta(source, probeMeta))

  return {
    proposed,
    patch,
    conflicts,
    youtube,
    capoWarning,
    keyRewrite,
    strumMissing: page.strums.length === 0,
    strumConflict,
  }
}

/** Alias used in the research contract — same as proposeCifraClubEnrich. */
export const enrichMetaFromCifraClubHtml = proposeCifraClubEnrich

/**
 * Apply an enrich proposal. `youtubeId` is written only when provided (ask
 * always). Capo is never taken from the proposal. Batida defaults to keep-local;
 * pass `strum: 'replace' | 'replace-with-local-copy'` for Trazer CC.
 */
export function applyCifraClubEnrich(
  source: string,
  proposal: EnrichProposal,
  choice?: { youtubeId?: string | null; strum?: CcStrumChoice },
): string {
  const next: ChartMeta = { ...readMeta(source), ...proposal.patch }
  const id = choice?.youtubeId
  if (typeof id === 'string' && id.trim()) next.x_titan_youtube = id.trim()

  const strumChoice = choice?.strum ?? 'keep'
  if (proposal.strumConflict && strumChoice !== 'keep') {
    const set = applyCcStrumChoice(proposal.strumConflict, strumChoice)
    delete next.x_titan_strum
    delete next.x_titan_strum_set
    if (set) {
      const fields = metaFromStrumSet(set)
      if (fields.x_titan_strum) next.x_titan_strum = fields.x_titan_strum
      if (fields.x_titan_strum_set) next.x_titan_strum_set = fields.x_titan_strum_set
    }
  }
  return writeMeta(source, next)
}
