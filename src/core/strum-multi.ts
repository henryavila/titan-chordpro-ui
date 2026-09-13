/**
 * Multi-pattern batida wire format.
 *
 * Schema (ChordPro-safe, no JSON braces):
 *   {x_strum_set: <activeIndex>|<pattern>|<pattern>|…}
 * Each <pattern> uses the same grammar as `{x_strum:}`:
 *   bpm=N; meter=M; grid=G; label=L; pat=TOKENS
 * Pipe `|` separates the index and patterns. Labels sanitize `|` → `/`
 * and `}` → `)` so the meta line stays ChordPro-safe.
 *
 * Blast radius: legacy readers that only know `{x_strum:}` still see the
 * active pattern. `{x_strum_set:}` is additive for multi-aware clients.
 * When N==1, writers may omit `x_strum_set` and keep only `x_strum`.
 */

import { formatXStrum, parseXStrum, type StrumPattern } from './strum'

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
  return formatXStrum({ ...p, label: sanitizeLabel(p.label) })
}

/** Compact encoding: `activeIndex|pattern|pattern|…` — no `{` / `}`. */
export function formatXStrumSet(set: StrumPatternSet): string {
  const patterns = set.patterns ?? []
  if (!patterns.length) return ''
  const i = Math.max(0, Math.min(Math.floor(set.activeIndex) || 0, patterns.length - 1))
  return [String(i), ...patterns.map(patternWire)].join('|')
}

export function parseXStrumSet(raw: string): StrumPatternSet | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const parts = s.split('|')
  if (parts.length < 2) return null
  const idxRaw = (parts[0] ?? '').trim()
  if (!/^\d+$/.test(idxRaw)) return null
  const patterns: StrumPattern[] = []
  for (const part of parts.slice(1)) {
    const p = parseXStrum(part.trim())
    if (!p) return null
    patterns.push(p)
  }
  if (!patterns.length) return null
  const activeIndex = Math.max(0, Math.min(Number(idxRaw), patterns.length - 1))
  return { activeIndex, patterns }
}

/**
 * Meta fields for a set.
 * N==0 → empty; N==1 → only `x_strum`; N>1 → active `x_strum` + `x_strum_set`.
 */
export function metaFromStrumSet(set: StrumPatternSet): {
  x_strum?: string
  x_strum_set?: string
} {
  const patterns = set.patterns ?? []
  if (!patterns.length) return {}
  const i = Math.max(0, Math.min(Math.floor(set.activeIndex) || 0, patterns.length - 1))
  const active = patterns[i]
  if (!active) return {}
  if (patterns.length === 1) return { x_strum: formatXStrum(active) }
  return {
    x_strum: formatXStrum(active),
    x_strum_set: formatXStrumSet({ activeIndex: i, patterns }),
  }
}
