/**
 * Multi-pattern batida wire format.
 *
 * Schema (ChordPro-safe, no JSON braces):
 *   {x_titan_strum_set: <activeIndex>|<pattern>|<pattern>|…}
 * Each <pattern> uses the same grammar as `{x_titan_strum:}`:
 *   bpm=N; meter=M; grid=G; label=L; pat=TOKENS
 * Pipe `|` separates the index and patterns. Labels sanitize `|` → `/`
 * and `}` → `)` so the meta line stays ChordPro-safe.
 *
 * The active pattern is stored in `{x_titan_strum:}`.
 * `{x_titan_strum_set:}` stores the full set.
 * When N==1, writers may omit `x_titan_strum_set` and keep only `x_titan_strum`.
 */

import { formatTitanStrum, parseTitanStrum, type StrumPattern } from './strum'

export type StrumPatternSet = {
  activeIndex: number
  patterns: StrumPattern[]
}

function sanitizeLabel(label: string): string {
  return String(label ?? '')
    .replace(/\|/g, '/')
    .replace(/\}/g, ')')
    .replace(/;/g, ',')
}

function patternWire(p: StrumPattern): string {
  return formatTitanStrum({ ...p, label: sanitizeLabel(p.label) })
}

/** Compact encoding: `activeIndex|pattern|pattern|…` — no `{` / `}`. */
export function formatTitanStrumSet(set: StrumPatternSet): string {
  const patterns = set.patterns ?? []
  if (!patterns.length) return ''
  const i = Math.max(0, Math.min(Math.floor(set.activeIndex) || 0, patterns.length - 1))
  return [String(i), ...patterns.map(patternWire)].join('|')
}

export function parseTitanStrumSet(raw: string): StrumPatternSet | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const parts = s.split('|')
  if (parts.length < 2) return null
  const idxRaw = (parts[0] ?? '').trim()
  if (!/^\d+$/.test(idxRaw)) return null
  const patterns: StrumPattern[] = []
  for (const part of parts.slice(1)) {
    const p = parseTitanStrum(part.trim())
    if (!p) return null
    patterns.push(p)
  }
  if (!patterns.length) return null
  const activeIndex = Math.max(0, Math.min(Number(idxRaw), patterns.length - 1))
  return { activeIndex, patterns }
}

/**
 * Meta fields for a set.
 * N==0 → empty; N==1 → only `x_titan_strum`; N>1 → active `x_titan_strum` + `x_titan_strum_set`.
 */
export function metaFromStrumSet(set: StrumPatternSet): {
  x_titan_strum?: string
  x_titan_strum_set?: string
} {
  const patterns = set.patterns ?? []
  if (!patterns.length) return {}
  const i = Math.max(0, Math.min(Math.floor(set.activeIndex) || 0, patterns.length - 1))
  const active = patterns[i]
  if (!active) return {}
  if (patterns.length === 1) return { x_titan_strum: formatTitanStrum(active) }
  return {
    x_titan_strum: formatTitanStrum(active),
    x_titan_strum_set: formatTitanStrumSet({ activeIndex: i, patterns }),
  }
}
