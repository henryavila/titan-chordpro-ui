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
  String(source ?? '')
    .split('\n')
    .forEach((l) => {
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
  const cur: ChartMeta = { ...readMeta(source) }
  delete cur.x_titan_strum
  delete cur.x_titan_strum_set
  const fields = metaFromStrumSet(set)
  if (fields.x_titan_strum) cur.x_titan_strum = fields.x_titan_strum
  if (fields.x_titan_strum_set) cur.x_titan_strum_set = fields.x_titan_strum_set
  return writeMeta(source, cur)
}

/**
 * Rewrites the header: the known keys leave the body and come back on top, in
 * the canonical order. No two `{key:}` lines competing.
 */
export function writeMeta(source: string, meta: ChartMeta): string {
  const body = String(source ?? '')
    .split('\n')
    .filter((l) => {
      const d = l.match(DIR)
      if (!d) return true
      const k = (d[1] ?? '').toLowerCase()
      return canonicalMetaKey(k) === null
    })
  const head = META_KEYS.filter((k) => (meta[k] ?? '').trim()).map(
    (k) => '{' + k + ':' + (meta[k] ?? '').trim() + '}',
  )
  return [head.join('\n'), body.join('\n').replace(/^\n+/, '')].filter(Boolean).join('\n')
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
    .filter((l) => {
      const d = l.match(DIR)
      if (!d) return true
      const k = (d[1] ?? '').toLowerCase()
      return canonicalMetaKey(k) === null
    })
    .join('\n')
    .replace(/^\n+/, '')
}
