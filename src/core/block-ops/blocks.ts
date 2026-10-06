/**
 * A label and its stanza move, hide, and duplicate as one unit.
 */

import type { ChartBlock } from '../types'

export type BlockSpan = {
  /** First block of the unit — the label, when the block has one. */
  first: number
  last: number
  li0: number
  li1: number
  hasLab: boolean
}

const isBody = (b: ChartBlock | undefined): boolean =>
  !!b && (b.kind === 'stanza' || b.kind === 'chorus')

/**
 * A label and its stanza are one unit. A `{c:(REFRÃO)}` glued to the line above
 * is that block's name: moving the stanza without it left the label pointing at
 * the wrong music, and deleting left a label with no body.
 */
export function blockSpan(blocks: ChartBlock[], bi: number): BlockSpan | null {
  const b = blocks[bi]
  if (!b) return null
  const lab = blocks[bi - 1]
  const hasLab =
    b.kind !== 'comment' &&
    b.kind !== 'note' &&
    !!lab &&
    lab.kind === 'comment' &&
    lab.li1 === b.li0 - 1
  return {
    first: hasLab ? bi - 1 : bi,
    last: bi,
    li0: hasLab && lab ? lab.li0 : b.li0,
    li1: b.li1,
    hasLab,
  }
}

/** Index of the block after the unit starting at `bi` — its label skipped. */
export function groupAfter(blocks: ChartBlock[], bi: number): number {
  const b = blocks[bi]
  if (!b) return bi + 1
  if (b.kind === 'comment') {
    const sp = blockSpan(blocks, bi + 1)
    if (sp?.hasLab) return bi + 2
  }
  return bi + 1
}

/** What the selection toolbar calls this block. */
export function blockLabel(blocks: ChartBlock[], bi: number): string {
  const b = blocks[bi]
  if (!b) return ''
  if (b.kind === 'comment') return b.text
  for (let i = bi - 1; i >= 0; i--) {
    const prev = blocks[i]
    if (!prev) break
    if (prev.kind === 'comment') return prev.text
    if (isBody(prev) || prev.kind === 'tab') break
  }
  if (b.kind === 'chorus') return 'Refrão'
  if (b.kind === 'stanza') return 'Estrofe'
  if (b.kind === 'tab') return 'TAB'
  if (b.kind === 'image' || b.kind === 'score') return 'Partitura'
  if (b.kind === 'note') return 'Execução'
  return 'Bloco'
}

export type BlockWrite = { lines: string[]; message: string; sel: number | null }

export function moveBlock(
  lines: string[],
  blocks: ChartBlock[],
  from: number,
  to: number,
): BlockWrite | null {
  const sp = blockSpan(blocks, from)
  if (!sp || to === sp.first || to === from + 1) return null
  const seg = lines.slice(sp.li0, sp.li1 + 1)
  // Dropping between a label and its body would split the two: anchor on the label.
  const tsp = to < blocks.length ? blockSpan(blocks, to) : null
  const at = tsp?.hasLab && to !== tsp.first ? tsp.first : to
  const target = blocks[at]
  const anchor = at >= blocks.length || !target ? lines.length : target.li0
  const rest = [...lines.slice(0, sp.li0), ...lines.slice(sp.li1 + 1)]
  let ins = anchor > sp.li1 ? anchor - seg.length : anchor
  ins = Math.max(0, Math.min(rest.length, ins))
  const add = [...seg]
  if (rest[ins] !== '') add.push('')
  rest.splice(ins, 0, ...add)
  const shift = sp.last - sp.first
  return {
    lines: rest,
    message: sp.hasLab ? 'Bloco movido com o rótulo' : 'Bloco movido',
    sel: (at > from ? at - 1 - shift : at) + shift,
  }
}

export function deleteBlock(lines: string[], blocks: ChartBlock[], bi: number): BlockWrite | null {
  const sp = blockSpan(blocks, bi)
  if (!sp) return null
  const out = [...lines]
  out.splice(sp.li0, sp.li1 - sp.li0 + 1)
  return {
    lines: out,
    message: sp.hasLab
      ? 'Bloco e rótulo removidos — dá para desfazer'
      : 'Bloco removido — dá para desfazer',
    sel: null,
  }
}

/**
 * Hidden, not deleted: `#~` keeps the words in the file for whoever needs them
 * back, and takes them out of the reading.
 */
export function hideBlock(lines: string[], blocks: ChartBlock[], bi: number): BlockWrite | null {
  const sp = blockSpan(blocks, bi)
  const b = blocks[bi]
  if (!sp || !b || b.kind === 'hidden') return null
  const out = [...lines]
  for (let i = sp.li0; i <= sp.li1; i++) {
    const cur = String(out[i] ?? '')
    out[i] = cur.trim() ? `#~ ${cur}` : '#~'
  }
  return {
    lines: out,
    message: sp.hasLab
      ? 'Bloco e rótulo fora da leitura — dá para reexibir'
      : 'Bloco fora da leitura — dá para reexibir',
    sel: null,
  }
}

export function unhideBlock(lines: string[], blocks: ChartBlock[], bi: number): BlockWrite | null {
  const b = blocks[bi]
  if (!b || b.kind !== 'hidden') return null
  const out = [...lines]
  for (let i = b.li0; i <= b.li1; i++) out[i] = String(out[i] ?? '').replace(/^#~ ?/, '')
  return { lines: out, message: 'Bloco de volta na leitura', sel: null }
}

export function duplicateBlock(
  lines: string[],
  blocks: ChartBlock[],
  bi: number,
): (BlockWrite & { focusLine: number }) | null {
  const sp = blockSpan(blocks, bi)
  if (!sp) return null
  const out = [...lines]
  const seg = out.slice(sp.li0, sp.li1 + 1)
  out.splice(sp.li1 + 1, 0, '', ...seg)
  return {
    lines: out,
    message: 'Bloco duplicado',
    sel: null,
    focusLine: sp.li1 + 2 + (sp.hasLab ? 1 : 0),
  }
}
