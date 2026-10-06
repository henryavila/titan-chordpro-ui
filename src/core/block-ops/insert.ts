/**
 * New blocks spliced into the source, and a rehearsal comment edited in place.
 */

import type { ChartBlock } from '../types'
import type { BlockWrite } from './blocks'

export type InsertKind = 'lyrics' | 'chorus' | 'comment' | 'tab'

export function insertSnippet(kind: InsertKind): string[] {
  if (kind === 'comment') return ['{c:(NOVA INDICAÇÃO)}']
  if (kind === 'chorus') return ['{soc}', 'Nova linha do refrão', '{eoc}']
  if (kind === 'tab')
    return [
      '{sot}',
      'e|--------|--------|',
      'B|--------|--------|',
      'G|--------|--------|',
      'D|--------|--------|',
      'A|--------|--------|',
      'E|--------|--------|',
      '{eot}',
    ]
  return ['Nova linha da letra']
}

export function insertBlock(
  lines: string[],
  at: number,
  kind: InsertKind,
): BlockWrite & { focusLine: number } {
  const out = [...lines]
  out.splice(at, 0, '', ...insertSnippet(kind), '')
  return { lines: out, message: 'Bloco inserido', sel: null, focusLine: at + 1 }
}

export function insertImage(
  lines: string[],
  blocks: ChartBlock[],
  bi: number | null,
  at: number,
  file: string,
  replace: boolean,
): BlockWrite & { focusLine: number } {
  const out = [...lines]
  const b = bi === null ? undefined : blocks[bi]
  // Replacing (from the block's own bar) and inserting (from the menu) are
  // different intentions: "insert a score" used to overwrite the selected one.
  if (replace && b && b.kind === 'image') {
    out[b.li0] = `{image: ${file}}`
    return { lines: out, message: 'Partitura trocada', sel: bi, focusLine: b.li0 }
  }
  out.splice(at, 0, '', `{image: ${file}}`, '')
  return {
    lines: out,
    message: 'Partitura no fluxo da cifra',
    sel: null,
    focusLine: at + 1,
  }
}

/** Where an insert lands: right after the selected block, or the visible one. */
export function insertAt(blocks: ChartBlock[], bi: number | null, fallbackLines: number): number {
  const b = bi === null ? undefined : blocks[bi]
  if (b) return b.li1 + 1
  return fallbackLines
}

/**
 * A rehearsal comment is editable in place too. An empty one is a removal: the
 * directive would otherwise stay in the file as an empty bullet.
 */
export function setComment(lines: string[], li: number, text: string): BlockWrite {
  const out = [...lines]
  const cur = String(out[li] ?? '')
  const t = String(text ?? '').trim()
  if (!t) {
    out.splice(li, 1)
    return { lines: out, message: 'Comentário removido', sel: null }
  }
  const k = /^\s*\{\s*comment/i.test(cur) ? 'comment' : 'c'
  const paren = /\{\s*(c|comment)\s*:?\s*\(/i.test(cur)
  out[li] = paren ? `{${k}:(${t})}` : `{${k}: ${t}}`
  return { lines: out, message: '', sel: null }
}
