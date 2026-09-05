/**
 * Editing a chart by its blocks, on the source text.
 *
 * Every operation here takes the source lines and gives back new ones: the
 * file is the only truth, so a block that was transposed, capoed or hidden
 * says so in the file itself and survives a reload, an undo and a re-parse.
 */

import { transposeToken } from './transpose'
import type { ChartBlock } from './types'

export type ChordRef = { name: string; off: number }
export type RowParts = { plain: string; chords: ChordRef[] }

/** A lyric line split into what is sung and where each chord sits in it. */
export function rowParts(text: string): RowParts {
  let plain = ''
  const chords: ChordRef[] = []
  const re = /\[([^\]]*)\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    plain += text.slice(last, m.index)
    chords.push({ name: m[1] ?? '', off: plain.length })
    last = re.lastIndex
  }
  return { plain: plain + text.slice(last), chords }
}

/** The inverse: put the chords back into the lyric, in order. */
export function rowJoin(plain: string, chords: ChordRef[]): string {
  const list = [...chords].sort((a, b) => a.off - b.off)
  let out = ''
  let at = 0
  for (const c of list) {
    const off = Math.max(0, Math.min(plain.length, Math.round(c.off)))
    out += plain.slice(at, off) + `[${c.name}]`
    at = off
  }
  return out + plain.slice(at)
}

/** Move one chord of a line to a new position in the lyric. */
export function moveChord(line: string, idx: number, off: number): string {
  const p = rowParts(line)
  const c = p.chords[idx]
  if (!c) return line
  const chords = p.chords.map((x, i) => (i === idx ? { ...x, off } : x))
  return rowJoin(p.plain, chords)
}

export function addChord(line: string, off: number, name: string): string {
  const p = rowParts(line)
  return rowJoin(p.plain, [...p.chords, { name, off }])
}

export function removeChord(line: string, idx: number): string {
  const p = rowParts(line)
  if (!p.chords[idx]) return line
  return rowJoin(
    p.plain,
    p.chords.filter((_, i) => i !== idx),
  )
}

export function renameChord(line: string, idx: number, name: string): string {
  const p = rowParts(line)
  if (!p.chords[idx]) return line
  return rowJoin(
    p.plain,
    p.chords.map((c, i) => (i === idx ? { ...c, name } : c)),
  )
}

// ------------------------------------------------------------------ blocks

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

// ------------------------------------------------------- per-block marks

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
    message: on ? 'Duas cifras neste bloco' : 'Só a cifra real neste bloco',
    sel: null,
  }
}

// --------------------------------------------------------- copy harmony

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

// -------------------------------------------------------------- inserting

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
 * Prefix/suffix diff: fixing a typo must not drag the line's chords along.
 * Only what sits inside the changed stretch moves — everything before and
 * after keeps the syllable it was written over.
 */
export function setLyric(line: string, plain: string): string {
  const p = rowParts(line)
  const old = p.plain
  if (plain === old) return line
  let cp = 0
  while (cp < old.length && cp < plain.length && old[cp] === plain[cp]) cp++
  let cs = 0
  while (
    cs < old.length - cp &&
    cs < plain.length - cp &&
    old[old.length - 1 - cs] === plain[plain.length - 1 - cs]
  )
    cs++
  const d = plain.length - old.length
  const chords = p.chords.map((c) => {
    let o = c.off
    if (o >= old.length - cs) o += d
    else if (o > cp) o = Math.min(o, Math.max(cp, plain.length - cs))
    return { name: c.name, off: Math.max(0, Math.min(plain.length, o)) }
  })
  return rowJoin(plain, chords)
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

/** The name a newly placed chord opens with: the chart's own first chord. */
export function lastChordName(source: string): string {
  const m = String(source ?? '').match(/\[([^\]]+)\]/)
  return m ? (m[1] ?? 'C') : 'C'
}
