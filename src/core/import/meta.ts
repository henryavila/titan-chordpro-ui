import {
  hasChartEnvelope,
  splitCho,
  writeChartScopedMeta,
  writeMetaOneHeader,
  notationMask,
  writeSongScopedMeta,
} from '../charts'
import { DIR } from '../define'
import { parseTitanStrum } from '../strum'
import { metaFromStrumSet, parseTitanStrumSet, type StrumPatternSet } from '../strum-multi'
import { hasSongDuration } from '../timeline'

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
  'x_titan_source',
  'x_titan_youtube',
  'x_titan_audio_sung',
  'x_titan_audio_playback',
  'x_titan_audio_art',
  'x_titan_audio_art_w',
  'x_titan_audio_art_h',
  'x_titan_strum',
  'x_titan_strum_set',
] as const
export type MetaKey = (typeof META_KEYS)[number]
export type ChartMeta = Partial<Record<MetaKey, string>>

/** Standard ChordPro short names. Canonical key wins when both exist. */
const META_ALIAS: Record<string, MetaKey> = {
  t: 'title',
  st: 'subtitle',
}

export function canonicalMetaKey(k: string): MetaKey | null {
  const lower = k.toLowerCase()
  if ((META_KEYS as readonly string[]).includes(lower)) return lower as MetaKey
  return META_ALIAS[lower] ?? null
}

export function readMeta(source: string): ChartMeta {
  const meta: ChartMeta = {}
  const lines = String(source ?? '').split('\n')
  const inside = notationMask(lines)
  lines.forEach((l, i) => {
      if (inside[i]) return
      const d = l.match(DIR)
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
 * Read batida as a pattern set.
 * - Only `{x_titan_strum:}` → 1-pattern set.
 * - `{x_titan_strum_set:}` present → multi; when both exist, active slot mirrors `x_titan_strum`.
 */
export function readStrumPatterns(source: string): StrumPatternSet {
  const meta = readMeta(source)
  const setRaw = String(meta.x_titan_strum_set ?? '').trim()
  const singleRaw = String(meta.x_titan_strum ?? '').trim()
  if (setRaw) {
    const set = parseTitanStrumSet(setRaw)
    if (set?.patterns.length) {
      const live = singleRaw ? parseTitanStrum(singleRaw) : null
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
    const p = parseTitanStrum(singleRaw)
    if (p) return { activeIndex: 0, patterns: [p] }
  }
  return { activeIndex: 0, patterns: [] }
}

/**
 * Persist a pattern set: always writes active `{x_titan_strum:}`; writes
 * `{x_titan_strum_set:}` only when N>1; clears both when empty.
 */
export function writeStrumPatterns(source: string, set: StrumPatternSet): string {
  const fields = metaFromStrumSet(set)
  const patch: ChartMeta = {}
  if (fields.x_titan_strum) patch.x_titan_strum = fields.x_titan_strum
  else patch.x_titan_strum = ''
  if (fields.x_titan_strum_set) patch.x_titan_strum_set = fields.x_titan_strum_set
  else patch.x_titan_strum_set = ''
  if (hasChartEnvelope(source)) return writeChartScopedMeta(source, patch)
  const cur: ChartMeta = { ...readMeta(source) }
  if (patch.x_titan_strum) cur.x_titan_strum = patch.x_titan_strum
  else delete cur.x_titan_strum
  if (patch.x_titan_strum_set) cur.x_titan_strum_set = patch.x_titan_strum_set
  else delete cur.x_titan_strum_set
  return writeMeta(source, cur)
}

/** A body line: not a directive, or a directive that is not canonical meta. */
function keepsBodyLine(l: string): boolean {
  const d = l.match(DIR)
  if (!d) return true
  const k = (d[1] ?? '').toLowerCase()
  return canonicalMetaKey(k) === null
}

/**
 * Rewrites the header: the known keys leave the body and come back on top, in
 * the canonical order. No two `{key:}` lines competing.
 */
export type WriteMetaOpts = {
  target?: 'song' | 'chart'
  chartId?: string
}

const SONG_PATCH_KEYS = [
  'title',
  'subtitle',
  'artist',
  'x_titan_source',
  'x_titan_youtube',
  'x_chart_default',
] as const

function canonicalPatch(meta: ChartMeta): ChartMeta {
  const out: ChartMeta = {}
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) continue
    const canon = canonicalMetaKey(key)
    if (!canon || out[canon] !== undefined) continue
    out[canon] = value
  }
  return out
}

/**
 * Rewrites meta. One chart: the canonical header.
 * Several charts: song keys and sound keys stay on their chart. A sibling is not rewritten.
 */
function withChartDefault(patch: ChartMeta, meta: ChartMeta): ChartMeta {
  if (!Object.prototype.hasOwnProperty.call(meta, 'x_chart_default')) return patch
  return {
    ...patch,
    x_chart_default: String((meta as ChartMeta & { x_chart_default?: string }).x_chart_default ?? ''),
  }
}

export function writeMeta(source: string, meta: ChartMeta, opts?: WriteMetaOpts): string {
  const patch = withChartDefault(canonicalPatch(meta), meta)
  if (opts?.target === 'chart') return writeChartScopedMeta(source, patch, opts.chartId)
  if (opts?.target === 'song') return writeSongScopedMeta(source, patch)
  if (hasChartEnvelope(source)) {
    const song: ChartMeta = {}
    const sound: ChartMeta = {}
    for (const [key, value] of Object.entries(patch)) {
      if ((SONG_PATCH_KEYS as readonly string[]).includes(key)) song[key as MetaKey] = value
      else sound[key as MetaKey] = value
    }
    const withSong = Object.keys(song).length ? writeSongScopedMeta(source, song) : source
    if (!Object.keys(sound).length) return withSong
    return writeChartScopedMeta(withSong, sound, splitCho(source).defaultId)
  }
  return writeMetaOneHeader(source, patch)
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

/** Chart body with known meta header lines removed (for body-equality checks). */
export function chartBody(source: string): string {
  return String(source ?? '')
    .split('\n')
    .filter(keepsBodyLine)
    .join('\n')
    .replace(/^\n+/, '')
}
