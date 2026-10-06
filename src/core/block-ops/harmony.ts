/**
 * Copy one block's chords onto another block's words.
 */

import type { ChartBlock } from '../types'
import { blockLabel, type BlockWrite } from './blocks'
import { rowJoin, rowParts, type ChordRef } from './rows'

export type HarmonyRow = { chords: ChordRef[]; len: number }
export type Harmony = { bi: number; rows: HarmonyRow[]; label: string; lastChord: string }

export function copyHarmony(lines: string[], blocks: ChartBlock[], bi: number): Harmony | null {
  const b = blocks[bi]
  if (!b || (b.kind !== 'stanza' && b.kind !== 'chorus')) return null
  const rows = b.rows.map((r) => {
    const p = rowParts(lines[r.li] ?? '')
    return { chords: p.chords.map((c) => ({ name: c.name, off: c.off })), len: p.plain.length }
  })
  return {
    bi,
    rows,
    label: blockLabel(blocks, bi),
    lastChord: rows[0]?.chords[0]?.name ?? '',
  }
}

/** The harmony lands on another block's words, scaled to their length. */
export function pasteHarmony(
  lines: string[],
  blocks: ChartBlock[],
  bi: number,
  clip: Harmony,
): BlockWrite | null {
  const b = blocks[bi]
  if (!b || (b.kind !== 'stanza' && b.kind !== 'chorus')) return null
  const out = [...lines]
  b.rows.forEach((r, i) => {
    const s = clip.rows[i] ?? clip.rows[clip.rows.length - 1]
    if (!s) return
    const p = rowParts(out[r.li] ?? '')
    const k = s.len || 1
    const chords = s.chords.map((c) => ({
      name: c.name,
      off: Math.round((c.off / k) * p.plain.length),
    }))
    out[r.li] = rowJoin(p.plain, chords)
  })
  return { lines: out, message: 'Harmonia aplicada — letra intacta', sel: null }
}
