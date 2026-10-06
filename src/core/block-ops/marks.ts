/**
 * Per-block transposition and capo, recorded in the file as marks.
 */

import type { ChartBlock } from '../types'
import { transposeToken } from '../transpose'
import type { BlockWrite } from './blocks'

export type MarkCtx = {
  /** First line of the block's body, after its marks. */
  rowLi: number
  /** How far the body sits below where the parser said it did. */
  delta: number
  shiftTotal: number
  capoVal: number | null
  capoMapOn: boolean
  markLis: number[]
}

const isMarkLine = (s: string): boolean => /^#\^[+-]?\d+$/.test(s) || /^#capo:\d+!?$/.test(s)

/**
 * The total must NOT come from the parsed view: between two taps the parse can
 * be one step behind, and the mark would record +1 twice while the chords had
 * already gone up +2. The truth is the file — the marks are read from it.
 *
 * Every contiguous mark counts: older versions stacked `#^`, and a reset that
 * cleared only the top one left the label lying. Here they are summed and
 * rewritten as a single mark, so the file normalises itself.
 */
export function markCtx(lines: string[], block: ChartBlock): MarkCtx | null {
  if (block.kind !== 'stanza' && block.kind !== 'chorus') return null
  const firstRow = block.rows[0]
  if (!firstRow) return null
  let i = firstRow.li
  while (i < lines.length && isMarkLine(String(lines[i] ?? '').trim())) i++
  let j = i - 1
  const shifts: Array<{ n: number; li: number }> = []
  const capos: Array<{ n: number; map: boolean; li: number }> = []
  while (j >= 0) {
    const s = String(lines[j] ?? '').trim()
    const ms = s.match(/^#\^([+-]?\d+)$/)
    if (ms) {
      shifts.push({ n: parseInt(ms[1] ?? '0', 10) || 0, li: j })
      j--
      continue
    }
    const mc = s.match(/^#capo:(\d+)(!?)$/)
    if (mc) {
      capos.push({ n: parseInt(mc[1] ?? '0', 10) || 0, map: mc[2] !== '!', li: j })
      j--
      continue
    }
    break
  }
  const markLis = [...shifts, ...capos].map((x) => x.li).sort((a, b) => a - b)
  return {
    rowLi: i,
    delta: i - firstRow.li,
    shiftTotal: shifts.reduce((a, x) => a + x.n, 0),
    capoVal: capos.length ? (capos[0]?.n ?? null) : null,
    capoMapOn: capos.length ? capos[0]?.map !== false : true,
    markLis,
  }
}

/**
 * Rewrite the block's whole set of marks: the old ones go, and at most one of
 * each is written back, capo before transposition.
 */
export function writeMarks(
  lines: string[],
  ctx: MarkCtx,
  shiftTotal: number,
  capoVal: number | null,
  capoMap: boolean,
): string[] {
  const out = [...lines]
  for (let k = ctx.markLis.length - 1; k >= 0; k--) out.splice(ctx.markLis[k] as number, 1)
  const at = ctx.rowLi - ctx.markLis.length
  const add: string[] = []
  if (capoVal != null) add.push(`#capo:${capoVal}${capoMap === false ? '!' : ''}`)
  if (shiftTotal !== 0) add.push(`#^${shiftTotal > 0 ? '+' : ''}${shiftTotal}`)
  if (add.length) out.splice(at, 0, ...add)
  return out
}

export function shiftLabel(n: number): string {
  return n === 0 ? 'no tom' : `${n > 0 ? '+' : '−'}${Math.abs(n)}`
}

/** Transpose one block and leave the trace of it in the file. */
export function shiftBlock(
  lines: string[],
  block: ChartBlock,
  n: number,
  flats: boolean,
): BlockWrite | null {
  if (block.kind !== 'stanza' && block.kind !== 'chorus') return null
  const ctx = markCtx(lines, block)
  if (!ctx) return null
  const out = [...lines]
  for (const r of block.rows) {
    const li = r.li + ctx.delta
    out[li] = String(out[li] ?? '').replace(
      /\[([^\]]*)\]/g,
      (_, c: string) => `[${transposeToken(c, n, flats)}]`,
    )
  }
  const total = ctx.shiftTotal + n
  return {
    lines: writeMarks(out, ctx, total, ctx.capoVal, ctx.capoMapOn),
    message:
      total === 0
        ? 'Bloco de volta ao tom da música'
        : `Só este bloco mudou de tom (${shiftLabel(total)})`,
    sel: null,
  }
}

/**
 * A capo for one block: `#capo:N` before the stretch. Zero drops the mark and
 * the block goes back to following the song's capo.
 */
export function setBlockCapo(
  lines: string[],
  block: ChartBlock,
  step: number,
  drop: boolean,
  songCapo: number,
): BlockWrite | null {
  if (block.kind !== 'stanza' && block.kind !== 'chorus') return null
  const ctx = markCtx(lines, block)
  if (!ctx) return null
  const cur = ctx.capoVal != null ? ctx.capoVal : songCapo
  const n = Math.max(0, Math.min(11, cur + (step || 0)))
  if (drop && ctx.capoVal == null) return null
  return {
    lines: writeMarks(lines, ctx, ctx.shiftTotal, drop ? null : n, ctx.capoMapOn),
    message: drop
      ? 'Bloco voltou ao capo da música'
      : n === 0
        ? 'Este bloco sem capo'
        : `Capo ${n} só neste bloco`,
    sel: null,
  }
}

/** Two chords in this block, the same switch the song-wide capo map has. */
export function toggleBlockDual(lines: string[], block: ChartBlock): BlockWrite | null {
  if (block.kind !== 'stanza' && block.kind !== 'chorus') return null
  const ctx = markCtx(lines, block)
  if (!ctx || ctx.capoVal == null) return null
  const on = !ctx.capoMapOn
  return {
    lines: writeMarks(lines, ctx, ctx.shiftTotal, ctx.capoVal, on),
    message: on ? 'Duas cifras neste bloco' : 'Formas do capo neste bloco',
    sel: null,
  }
}
