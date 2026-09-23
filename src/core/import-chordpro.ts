/**
 * Bringing a chart in: recognise what was pasted or opened, and give back
 * ChordPro. Three origins — a URL, a file, text — all land here; the UI only
 * shows the result.
 *
 * This is the **explicit** path, the one a person starts and sees the outcome
 * of ("converted from OnSong", "already ChordPro"). It is not the same job as
 * `onsong.ts`, which normalises silently inside `parse()` for a host that hands
 * over OnSong as its `source`. That one has to stay conservative because it
 * runs on everything; this one may do more — chorus directives, tabs, section
 * names in Portuguese. `tests/core/import-chordpro.test.ts` pins the two
 * together on the case they share, so they cannot drift apart unnoticed.
 */

import {
  CHART_SOUND_KEYS,
  META_KEYS,
  SONG_META_KEYS,
  canonicalMetaKey,
  chartDocument,
  readMeta,
  replaceChart,
  splitCho,
  writeChartScopedMeta,
  writeMetaOneHeader,
  writeSongScopedMeta,
  type ChartMeta,
  type MetaKey,
} from './charts'
import {
  isLegalStrumPattern,
  parseXStrum,
  patternFromCc,
  repairStrumPattern,
  type StrumPattern,
} from './strum'
import {
  metaFromStrumSet,
  parseXStrumSet,
  type StrumPatternSet,
} from './strum-multi'
import { hasSongDuration } from './timeline'
import { keyIndex, keyRootOf, signedSemitoneDelta, transposeTextChords, usesFlats } from './transpose'

const SECTION =
  /^\s*(intro|introdu(?:ç|c)(?:ã|a)o|verso?|vers[eo]\s*\d*|estrofe\s*\d*|refr(?:ã|a)o|chorus|pr[eé][- ]?chorus|pr[eé][- ]?refr(?:ã|a)o|ponte|bridge|solo|instrumental|interl[uú]dio|final|ending|outro|tag|coda|parte\s*\d*|primeira parte|segunda parte|terceira parte|dedilhado|riff)\s*\d*\s*[:\]]?\s*$/i
const CHORUS = /^(refr(?:ã|a)o|chorus)/i
/** Cifra Club (and plain paste) say Intro; Titan charts say INTRODUÇÃO. */
const INTRO_LABEL = /^(intro|introdu(?:ç|c)(?:ã|a)o)\s*$/i

/** Only a parenthesis around the whole token — not the `(4)` in `D7(4)`. */
function unwrapChord(token: string): string {
  return /^\(.+\)$/.test(token) ? token.slice(1, -1) : token
}

/**
 * Brazilian / Cifra Club names: C7M, D7(4), Em7(11), D7(9/11), C9/E, Eb°.
 */

export function isChord(token: string): boolean {
  const t = unwrapChord(token)
  if (!t || !/^[A-H]/.test(t)) return false
  return /^[A-H](?:#|b)?(?:m(?![aj])|M(?!aj)|maj|min|dim|aug|sus|add|º|°|\+)?(?:\d{1,2})?(?:M|maj)?(?:\([^)]+\))?(?:(?:add|sus|maj|min|dim|aug|no)\d{0,2})?(?:[#b+-]\d{1,2})?(?:\/[A-H](?:#|b)?)?$/.test(
    t,
  )
}

/** A line that is only chord names — an intro, a passing bar, a turnaround. */
export function isChordLine(line: string): boolean {
  const t = line.trim()
  if (!t || t.length > 200) return false
  const toks = t.split(/\s+/)
  if (toks.length > 24) return false
  return toks.every(isChord)
}

const isTabLine = (l: string) =>
  /\|/.test(l) && (l.match(/-/g) || []).length >= 5 && !/[a-z]{4}/i.test(l.replace(/^[eEADGBb]/, ''))

const clean = (s: string) =>
  String(s ?? '')
    .replace(/\r/g, '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+$/gm, '')

/**
 * Chords above the lyric become brackets on the right syllable. The column
 * decides: a chord goes in at the index it was written at, and never before
 * the one that came before it.
 */
function merge(chordLine: string, lyric: string): string {
  const marks: Array<{ name: string; col: number }> = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(chordLine))) marks.push({ name: m[0], col: m.index })
  if (!marks.length) return lyric
  let out = ''
  let cur = 0
  for (const c of marks) {
    const col = Math.max(cur, Math.min(c.col, lyric.length))
    out += lyric.slice(cur, col) + '[' + unwrapChord(c.name) + ']'
    cur = col
  }
  return out + lyric.slice(cur)
}

const chordsOnly = (l: string) =>
  l
    .trim()
    .split(/\s+/)
    .map((c) => '[' + unwrapChord(c) + ']')
    .join(' ')

function sectionName(label: string): string {
  const name = label.replace(/[:\]]\s*$/, '').replace(/^\[/, '').trim()
  return INTRO_LABEL.test(name) ? 'INTRODUÇÃO' : name
}

function sectionDirective(label: string, open: boolean): string {
  const name = sectionName(label)
  return CHORUS.test(name) ? (open ? '{soc}' : '{eoc}') : '{c:' + name + '}'
}

/** Plain body → ChordPro. An intro tab stays a tab: `{sot}`…`{eot}`. */
export function fromPlain(text: string): string {
  const src = clean(text).split('\n')
  const out: string[] = []
  let chorus = false
  let tab: string[] | null = null
  const closeChorus = () => {
    if (chorus) {
      out.push('{eoc}')
      chorus = false
    }
  }
  for (let i = 0; i < src.length; i++) {
    const raw = src[i] ?? ''
    if (isTabLine(raw)) {
      ;(tab = tab || []).push(raw.replace(/\s+$/, ''))
      continue
    }
    if (tab) {
      out.push('{sot}', ...tab, '{eot}')
      tab = null
    }
    const bare = raw.trim()
    if (!bare) {
      // A blank ends the refrain: Cifra Club (and plain cifras) mark the next
      // verse that way, with no [Verso] tag. Leaving {soc} open painted every
      // following line as its own chorus box in the editor.
      closeChorus()
      out.push('')
      continue
    }
    const tagged = bare.match(/^\[([^\]]+)\]\s*(.*)$/)
    if (tagged && !isChord(tagged[1] ?? '')) {
      closeChorus()
      const d = sectionDirective(tagged[1] ?? '', true)
      if (d === '{soc}') {
        chorus = true
        out.push('{soc}')
      } else out.push(d)
      const rest = (tagged[2] ?? '').trim()
      if (rest) {
        if (isChordLine(rest)) out.push(chordsOnly(rest))
        else out.push(rest)
      }
      continue
    }
    const asSection = bare.replace(/^\[(.+)\]$/, '$1')
    if (SECTION.test(asSection) && !isChordLine(bare)) {
      closeChorus()
      const d = sectionDirective(asSection, true)
      if (d === '{soc}') {
        chorus = true
        out.push('{soc}')
      } else out.push(d)
      continue
    }
    if (isChordLine(raw)) {
      const next = src[i + 1]
      if (next && next.trim() && !isChordLine(next) && !isTabLine(next) && !SECTION.test(next.trim())) {
        out.push(merge(raw, next))
        i++
      } else out.push(chordsOnly(raw))
      continue
    }
    out.push(bare)
  }
  if (tab) out.push('{sot}', ...tab, '{eot}')
  closeChorus()
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

const ONSONG_KEYS: Record<string, string> = {
  title: 'title', t: 'title', subtitle: 'subtitle', artist: 'subtitle', author: 'subtitle',
  key: 'key', tempo: 'tempo', bpm: 'tempo', time: 'time', capo: 'capo', duration: 'duration',
}

/**
 * OnSong: `Key: value` header, sections ending in a colon, a body already in
 * brackets — or chords above the lyric, which falls through to `fromPlain`.
 */
export function fromOnSong(text: string): string {
  const src = clean(text).split('\n')
  const head: string[] = []
  const body: string[] = []
  let inHead = true
  let firstSeen = false
  for (const raw of src) {
    const bare = raw.trim()
    if (inHead) {
      if (!bare) {
        if (firstSeen) inHead = false
        continue
      }
      const kv = bare.match(/^([A-Za-zÀ-ú]+)\s*:\s*(.+)$/)
      const key = kv && ONSONG_KEYS[(kv[1] ?? '').toLowerCase()]
      if (key) {
        head.push('{' + key + ':' + (kv?.[2] ?? '').trim() + '}')
        firstSeen = true
        continue
      }
      if (!firstSeen && !kv && !SECTION.test(bare)) {
        head.push('{title:' + bare + '}')
        firstSeen = true
        continue
      }
      // A metadata line we do not carry over.
      if (kv && !key && !SECTION.test(bare)) {
        firstSeen = true
        continue
      }
      inHead = false
    }
    body.push(raw)
  }
  const hasBrackets = /\[[^\]]+\]/.test(body.join('\n'))
  const converted = hasBrackets ? bodyWithSections(body) : fromPlain(body.join('\n'))
  return [head.join('\n'), converted].filter(Boolean).join('\n\n')
}

function bodyWithSections(lines: string[]): string {
  const out: string[] = []
  let chorus = false
  const closeChorus = () => {
    if (chorus) {
      out.push('{eoc}')
      chorus = false
    }
  }
  for (const raw of lines) {
    const bare = raw.trim()
    if (!bare) {
      closeChorus()
      out.push('')
      continue
    }
    const asSection = bare.replace(/^\[(.+)\]$/, '$1')
    if (SECTION.test(asSection)) {
      closeChorus()
      const d = sectionDirective(asSection, true)
      if (d === '{soc}') {
        chorus = true
        out.push('{soc}')
      } else out.push(d)
      continue
    }
    out.push(raw.replace(/\s+$/, ''))
  }
  closeChorus()
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export type ImportFormat = 'vazio' | 'chordpro' | 'onsong' | 'plain' | 'cifraclub'

export function detect(text: string): ImportFormat {
  const t = clean(text)
  if (!t.trim()) return 'vazio'
  if (looksLikeCifraClubHtml(t)) return 'cifraclub'
  if (/\{\s*(title|t|subtitle|st|artist|key|soc|start_of_chorus|c|comment|sot|start_of_tab)\s*:?/i.test(t))
    return 'chordpro'
  if (/^\s*(title|artist|key|tempo|time|flow|ccli|capo)\s*:/im.test(t)) return 'onsong'
  const lines = t.split('\n').filter((l) => l.trim())
  const above = lines.filter(isChordLine).length
  if (/\[[^\]]{1,12}\]/.test(t) && above / Math.max(1, lines.length) < 0.15) return 'chordpro'
  return 'plain'
}

const FORMAT_LABEL: Record<string, string> = {
  chordpro: 'ChordPro',
  onsong: 'OnSong',
  plain: 'acordes sobre a letra',
  cifraclub: 'Cifra Club',
}

export type KeyRewriteOffer = {
  declaredKey: string
  writtenKey: string
  capo: number
}

export type ImportResult = {
  source: string
  format: ImportFormat
  label: string
  /** False when it was already ChordPro and nothing had to be rewritten. */
  changed: boolean
  /** Fake-capo pattern: wait for the musician before calling `rewriteToKey`. */
  keyRewrite?: KeyRewriteOffer
}

export function convert(text: string): ImportResult {
  const fmt = detect(text)
  if (fmt === 'vazio') return { source: '', format: fmt, label: '', changed: false }
  if (fmt === 'cifraclub') {
    const page = fromCifraClubHtml(text)
    if (!page.body.trim()) return { source: '', format: 'vazio', label: '', changed: false }
    const converted = stripLyricDots(fromPlain(page.body))
    const capoN = Math.max(0, Math.min(9, Number(page.capo) || 0))
    const strumMeta = page.strums.length
      ? metaFromStrumSet({ activeIndex: 0, patterns: page.strums })
      : {}
    const meta: ChartMeta = {
      ...readMeta(converted),
      ...(page.title ? { title: page.title } : {}),
      ...(page.subtitle ? { subtitle: page.subtitle } : {}),
      ...(page.key ? { key: page.key } : {}),
      ...(page.tempo ? { tempo: page.tempo } : {}),
      ...(page.time ? { time: page.time } : {}),
      ...(capoN > 0 ? { capo: String(capoN) } : {}),
      ...(page.youtubeId ? { x_youtube: page.youtubeId } : {}),
      ...strumMeta,
    }
    const source = writeMeta(converted, meta)
    const keyRewrite = detectKeyRewrite(source)
    return {
      source,
      format: fmt,
      label: FORMAT_LABEL[fmt] ?? fmt,
      changed: true,
      ...(keyRewrite ? { keyRewrite } : {}),
    }
  }
  const source =
    fmt === 'chordpro' ? clean(text).trim() : fmt === 'onsong' ? fromOnSong(text) : fromPlain(text)
  const keyRewrite = detectKeyRewrite(source)
  return {
    source,
    format: fmt,
    label: FORMAT_LABEL[fmt] ?? fmt,
    changed: fmt !== 'chordpro',
    ...(keyRewrite ? { keyRewrite } : {}),
  }
}

// ----------------------------------------------------------------- metadata

export { META_KEYS, canonicalMetaKey, readMeta }
export type { ChartMeta, MetaKey }

/**
 * Read batida as a pattern set.
 * - Only `{x_strum:}` → 1-pattern set.
 * - `{x_strum_set:}` present → multi; when both exist, active slot mirrors `x_strum`.
 */
export function readStrumPatterns(source: string): StrumPatternSet {
  const meta = readMeta(source)
  const setRaw = String(meta.x_strum_set ?? '').trim()
  const singleRaw = String(meta.x_strum ?? '').trim()
  if (setRaw) {
    const set = parseXStrumSet(setRaw)
    if (set?.patterns.length) {
      const live = singleRaw ? parseXStrum(singleRaw) : null
      if (live) {
        const i = set.activeIndex
        return {
          activeIndex: i,
          patterns: set.patterns.map((p, idx) => (idx === i ? live : p)),
        }
      }
      return set
    }
  }
  if (singleRaw) {
    const p = parseXStrum(singleRaw)
    if (p) return { activeIndex: 0, patterns: [p] }
  }
  return { activeIndex: 0, patterns: [] }
}

/**
 * Persist a pattern set: always writes active `{x_strum:}`; writes
 * `{x_strum_set:}` only when N>1; clears both when empty.
 */
export function writeStrumPatterns(source: string, set: StrumPatternSet): string {
  const cur: ChartMeta = { ...readMeta(source) }
  // Present empty keys still clear; delete would drop them from a two-arg patch.
  cur.x_strum = ''
  cur.x_strum_set = ''
  const fields = metaFromStrumSet(set)
  if (fields.x_strum) cur.x_strum = fields.x_strum
  if (fields.x_strum_set) cur.x_strum_set = fields.x_strum_set
  return writeMeta(source, cur)
}

export type WriteMetaOpts = {
  target?: 'song' | 'chart'
  chartId?: string
}

function songPatchOf(meta: ChartMeta): ChartMeta {
  const patch: ChartMeta = {}
  for (const k of SONG_META_KEYS) {
    if (k === 'x_chart_default') continue
    if (meta[k] !== undefined) patch[k] = meta[k]
  }
  return patch
}

function soundPatchOf(meta: ChartMeta): ChartMeta {
  const patch: ChartMeta = {}
  for (const k of CHART_SOUND_KEYS) {
    if (meta[k] !== undefined) patch[k] = meta[k]
  }
  return patch
}

/**
 * Rewrites meta. Two-arg one-chart still replaces the canonical header.
 * N>1 without `target`: song identity stays in the song header; sound keys
 * on the patch go to the default chart and are not hoisted. Pass `{ target }` to aim.
 */
export function writeMeta(source: string, meta: ChartMeta, opts?: WriteMetaOpts): string {
  if (opts?.target === 'chart') return writeChartScopedMeta(source, meta, opts.chartId)
  if (opts?.target === 'song') return writeSongScopedMeta(source, meta)
  if (!splitCho(source).hasEnvelope) return writeMetaOneHeader(source, meta)
  const song = songPatchOf(meta)
  const sound = soundPatchOf(meta)
  const withSong = Object.keys(song).length ? writeSongScopedMeta(source, song) : source
  if (!Object.keys(sound).length) return withSong
  return writeChartScopedMeta(withSong, sound, splitCho(withSong).defaultId)
}

/**
 * The key the chords actually spell — most frequent root in the body, tabs
 * and scores skipped. `{key:}` is the declared tom; when they disagree, the
 * chart was already transposed on the page.
 */
export function inferWrittenKey(source: string): string | null {
  const counts = new Map<string, number>()
  let tab = false
  let score = false
  for (const raw of String(source ?? '').split('\n')) {
    const d = raw.match(/^\s*\{\s*([a-zA-Z_]+)/)
    const k = (d?.[1] ?? '').toLowerCase()
    if (k === 'sot' || k === 'start_of_tab') {
      tab = true
      continue
    }
    if (k === 'eot' || k === 'end_of_tab') {
      tab = false
      continue
    }
    if (k === 'sos' || k === 'start_of_score') {
      score = true
      continue
    }
    if (k === 'eos' || k === 'end_of_score') {
      score = false
      continue
    }
    if (tab || score || d) continue
    for (const m of raw.matchAll(/\[([A-G](?:#|b)?)(m)?/g)) {
      const tok = (m[1] ?? '') + (m[2] ?? '')
      if (!tok) continue
      counts.set(tok, (counts.get(tok) ?? 0) + 1)
    }
  }
  let best: string | null = null
  let n = 0
  for (const [tok, c] of counts) {
    if (c > n) {
      best = tok
      n = c
    }
  }
  return best
}

/**
 * Fake-capo pattern: `{key:}` is not the written chords, and `{capo:}` is
 * exactly that gap. Import surfaces this for confirmation; the rewrite itself
 * is always `rewriteToKey`.
 */
export function detectKeyRewrite(source: string): KeyRewriteOffer | null {
  const src = String(source ?? '')
  if (!src.trim()) return null
  const meta = readMeta(src)
  const declaredKey = (meta.key ?? '').trim()
  const writtenKey = inferWrittenKey(src)
  const kr = keyRootOf(declaredKey)
  const wr = keyRootOf(writtenKey)
  if (!kr || !wr || keyIndex(kr) === keyIndex(wr)) return null
  const capo = Number(meta.capo) || 0
  const gap = Math.abs(signedSemitoneDelta(wr, kr))
  if (!capo || capo !== gap) return null
  return { declaredKey, writtenKey: writtenKey!, capo }
}

export type RewriteToKeyResult = {
  source: string
  from: string
  to: string
  transpose: number
  changed: boolean
}

/**
 * Move the written chords to `targetKey` and store `{transpose:N}` so the
 * sounding/playing pitch stays where it was. A `{capo:}` that only encoded
 * that same gap is dropped. Does not invent chords — semitone rewrite only.
 * Named charts: only the default chart is rewritten; siblings stay put.
 */
export function rewriteToKey(source: string, targetKey: string): RewriteToKeyResult | null {
  const src = String(source ?? '')
  const split = splitCho(src)
  if (!split.hasEnvelope) return rewriteOneChartToKey(src, targetKey)
  const rewritten = rewriteOneChartToKey(chartDocument(src), targetKey)
  if (!rewritten) return null
  const out = replaceChart(src, split.defaultId, rewritten.source)
  return { ...rewritten, source: out, changed: out !== src }
}

function rewriteOneChartToKey(src: string, targetKey: string): RewriteToKeyResult | null {
  const to = targetKey.trim()
  if (!/^[A-G](?:#|b)?m?$/.test(to)) return null
  const meta = readMeta(src)
  const written = inferWrittenKey(src)
  const fromRoot = keyRootOf(written) || keyRootOf(meta.key)
  const toRoot = keyRootOf(to)
  if (!fromRoot || !toRoot || keyIndex(fromRoot) === null || keyIndex(toRoot) === null) return null

  const delta = signedSemitoneDelta(fromRoot, toRoot)
  const moved = delta ? transposeTextChords(src, delta, usesFlats(to)) : src
  const next: ChartMeta = { ...readMeta(moved), key: to }
  const playing = signedSemitoneDelta(toRoot, fromRoot)
  if (playing) next.transpose = String(playing)
  else delete next.transpose

  const capoN = Number(meta.capo) || Number(next.capo) || 0
  if (capoN && capoN === Math.abs(delta)) delete next.capo

  const out = writeMeta(moved, next)
  return {
    source: out,
    from: written || fromRoot,
    to,
    transpose: playing,
    changed: out !== src,
  }
}

export const MISSING_LABEL: Record<string, string> = {
  title: 'título',
  subtitle: 'artista',
  key: 'tom',
  tempo: 'andamento',
  time: 'compasso',
  duration: 'duração',
}

/** What a chart still needs before it can stand for everyone. Duration is a
 * usable `{duration:}` (m:ss, ≥ 20 s) — the same gate auto-scroll uses. */
export function missingOf(meta: ChartMeta): string[] {
  return (['title', 'key', 'tempo', 'time', 'duration'] as const).filter((k) =>
    k === 'duration' ? !hasSongDuration(meta.duration) : !String(meta[k] ?? '').trim(),
  )
}

// ------------------------------------------------------------------ origins

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

/** The page Cifra Club serves: a <pre data-chord-content> with <b data-chord-name>. */
export function looksLikeCifraClubHtml(text: string): boolean {
  return /data-chord-content|data-chord-name\s*=/.test(text)
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
function stripLyricDots(source: string): string {
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
    (html.match(/data-anchor="--chord-tone"[^>]*>([A-G][#b]?m?)</i) || [])[1] ||
    (html.match(/>\s*Tom:\s*<\/span>\s*<button[^>]*>([A-G][#b]?m?)</i) || [])[1] ||
    extractKeyShape(html) ||
    ''
  const pre = (html.match(/<pre[^>]*data-chord-content[^>]*>([\s\S]*?)<\/pre>/i) || [])[1] ?? ''
  const body = cifraPreToPlain(pre)
  const strums = extractCcStrums(html)
  const tempo = strums[0]?.bpm != null ? String(strums[0].bpm) : ''
  const time = strums[0]?.meter || ''
  const capo = extractCapo(html)
  const youtubeId = extractYoutubeId(html)
  return { body, title, subtitle, key, tempo, time, capo, youtubeId, strums }
}

function htmlChunkToText(chunk: string): string {
  const inner = chunk
    .replace(/<b\b[^>]*data-chord-original-text="([^"]*)"[^>]*>[\s\S]*?<\/b>/gi, '$1')
    .replace(/<b\b[^>]*data-chord-name="([^"]*)"[^>]*>[\s\S]*?<\/b>/gi, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
  return decodeEntities(inner).replace(/\r/g, '').replace(/[ \t]+$/gm, '')
}

/**
 * Cifra Club wraps tablature in `.tabs` / `.tab`. Those blocks repeat the
 * same chords as the rehearsal chart and have no usable bar marks — drop the
 * whole thing (caption, position chords, ASCII strings, "Parte N de M").
 */
function stripCifraClubTabs(pre: string): string {
  return stripDivsByClass(pre, 'tabs')
}

/** Remove every `<div class="… name …">…</div>`, honouring nested divs. */
function stripDivsByClass(html: string, className: string): string {
  const openRe = new RegExp(`<div\\b[^>]*\\bclass=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, 'gi')
  let out = ''
  let cursor = 0
  let m: RegExpExecArray | null
  while ((m = openRe.exec(html))) {
    out += html.slice(cursor, m.index)
    const innerStart = m.index + m[0].length
    const end = findMatchingCloseDiv(html, innerStart)
    if (end < 0) {
      out += m[0]
      cursor = innerStart
      break
    }
    cursor = end + '</div>'.length
    openRe.lastIndex = cursor
  }
  return out + html.slice(cursor)
}

function findMatchingCloseDiv(html: string, from: number): number {
  let depth = 1
  let i = from
  while (i < html.length && depth > 0) {
    const nextOpen = html.toLowerCase().indexOf('<div', i)
    const nextClose = html.toLowerCase().indexOf('</div>', i)
    if (nextClose < 0) return -1
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++
      i = nextOpen + 4
      continue
    }
    depth--
    if (depth === 0) return nextClose
    i = nextClose + 6
  }
  return -1
}

/**
 * Each Cifra Club pair is a `.kvMV`. A naive non-greedy `</div>` stops at the
 * inner `.tabs` close and drops the section label that follows (`[Primeira
 * Parte]`, `[Refrão]`). Walk nested divs. Keep pairs adjacent; a trailing
 * blank in the pair is a real paragraph (intro → verse, verse → refrão).
 */
function cifraPreToPlain(pre: string): string {
  const cleaned = stripCifraClubTabs(pre)
  const parts = extractDivInnersByClass(cleaned, 'kvMV')
  const chunks: string[] = []
  if (parts.length) {
    for (const p of parts) {
      const raw = htmlChunkToText(p)
      const text = raw.replace(/^\n+/, '').replace(/\n+$/, '')
      if (!text) continue
      chunks.push(text)
      const last = text.split('\n').at(-1) ?? ''
      // A trailing blank after [Refrão] would close {soc} before the first
      // refrain line. Keep it only when this pair is a real paragraph.
      if (/\n\s*\n\s*$/.test(raw) && !/^\[[^\]]+\]\s*$/.test(last)) chunks.push('')
    }
  } else {
    chunks.push(htmlChunkToText(cleaned).replace(/^\n+/, '').replace(/\n+$/, ''))
  }
  return chunks.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function extractDivInnersByClass(html: string, className: string): string[] {
  const openRe = new RegExp(`<div\\b[^>]*\\bclass=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, 'gi')
  const parts: string[] = []
  let m: RegExpExecArray | null
  while ((m = openRe.exec(html))) {
    const innerStart = m.index + m[0].length
    const end = findMatchingCloseDiv(html, innerStart)
    if (end < 0) break
    parts.push(html.slice(innerStart, end))
    openRe.lastIndex = end + '</div>'.length
  }
  return parts
}

/**
 * ChordPro → chords above the lyric. Serves the URL fetch: the page a site
 * returns is plain text, so it goes through the real converter, not a shortcut.
 */
export function toPlain(source: string): string {
  const out: string[] = []
  String(source ?? '')
    .split('\n')
    .forEach((l) => {
      const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/)
      if (d) {
        const k = (d[1] ?? '').toLowerCase()
        const v = (d[2] ?? '').trim()
        if (k === 'soc' || k === 'start_of_chorus') out.push('[Refrão]')
        else if (k === 'c' || k === 'comment') out.push('[' + v.replace(/^\(|\)$/g, '') + ']')
        else if (k === 'sot' || k === 'start_of_tab' || k === 'eot' || k === 'end_of_tab') return
        else if (k === 'eoc' || k === 'end_of_chorus') out.push('')
        return
      }
      if (/^#/.test(l)) return
      if (!/\[/.test(l)) {
        out.push(l)
        return
      }
      let lyric = ''
      let chords = ''
      const re = /\[([^\]]*)\]/g
      let last = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(l))) {
        lyric += l.slice(last, m.index)
        while (chords.length < lyric.length) chords += ' '
        if (chords.length > lyric.length) lyric += ' '.repeat(chords.length - lyric.length)
        chords += (m[1] ?? '') + ' '
        last = re.lastIndex
      }
      lyric += l.slice(last)
      if (chords.trim()) out.push(chords.replace(/\s+$/, ''))
      if (lyric.trim()) out.push(lyric.replace(/\s+$/, ''))
    })
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// ---------------------------------------------------- enrich existing charts

const FILL_EMPTY_KEYS: readonly MetaKey[] = [
  'title',
  'subtitle',
  'key',
  'tempo',
  'time',
  'duration',
]

/** Chart body with known meta header lines removed (for body-equality checks). */
export function chartBody(source: string): string {
  return String(source ?? '')
    .split('\n')
    .filter((l) => {
      const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:\s*[^}]*\}\s*$/)
      if (!d) return true
      const k = (d[1] ?? '').toLowerCase()
      return canonicalMetaKey(k) === null
    })
    .join('\n')
    .replace(/^\n+/, '')
}

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
  /** Auto fields: fill-empty + x_strum (keep-local) + x_source. No youtube/capo. */
  patch: ChartMeta
  conflicts: EnrichConflict[]
  youtube: EnrichYoutube | null
  capoWarning: string | null
  /** True when the CC page has no `strummings` payload (toolbar “Batidas” may still show). */
  strumMissing: boolean
  /**
   * When local already has batida and CC brings patterns — patch still omits
   * x_strum (keep-local). UI may offer Manter / Trazer CC.
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
    ...(page.youtubeId ? { x_youtube: page.youtubeId } : {}),
    ...strumMeta,
    ...(opts?.url?.trim() ? { x_source: opts.url.trim() } : {}),
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
  if (!localHasBatida && proposed.x_strum) {
    patch.x_strum = proposed.x_strum
    if (proposed.x_strum_set) patch.x_strum_set = proposed.x_strum_set
  }
  if (proposed.x_source) patch.x_source = proposed.x_source

  const strumConflict: EnrichStrumConflict | null =
    localHasBatida && remoteSet
      ? { local: localSet, remote: remoteSet }
      : null

  const remoteId = String(proposed.x_youtube ?? '').trim()
  const localId = String(local.x_youtube ?? '').trim()
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
      ? `Cifra Club usa capo ${capoN} (formas no site). A cifra local não foi alterada.`
      : null

  return {
    proposed,
    patch,
    conflicts,
    youtube,
    capoWarning,
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
  if (typeof id === 'string' && id.trim()) next.x_youtube = id.trim()

  const strumChoice = choice?.strum ?? 'keep'
  if (proposal.strumConflict && strumChoice !== 'keep') {
    const set = applyCcStrumChoice(proposal.strumConflict, strumChoice)
    delete next.x_strum
    delete next.x_strum_set
    if (set) {
      const fields = metaFromStrumSet(set)
      if (fields.x_strum) next.x_strum = fields.x_strum
      if (fields.x_strum_set) next.x_strum_set = fields.x_strum_set
    }
  }
  return writeMeta(source, next)
}
