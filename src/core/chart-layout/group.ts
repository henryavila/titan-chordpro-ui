import type { ChartBlockBody, LineSpan } from '../types'
import { buildTab } from './tab'
import type { WorkLine } from './work'

export type ChartBlockDraft = LineSpan & ChartBlockBody

/**
 * Consecutive verse/chorus lines form one closed block, so near-identical
 * repeats do not blur together while reading. A block inherits the marks
 * written above its first line.
 */
export function groupChorus(lines: WorkLine[], eocOf: Record<number, number>): ChartBlockDraft[] {
  const out: ChartBlockDraft[] = []
  /** Index of each opened chorus block → the `{soc}` line it came from. */
  const soc = new Map<number, number | null>()
  let open: (ChartBlockDraft & { kind: 'stanza' | 'chorus' }) | null = null
  for (const l of lines) {
    if (l.kind === 'blank') {
      open = null
      continue
    }
    if (l.kind === 'song') {
      const kind = l.inChorus ? 'chorus' : 'stanza'
      if (open && open.kind === kind) {
        open.rows.push({ segs: l.segs, plain: l.plain, li: l.li0 })
        open.li1 = l.li1
        continue
      }
      soc.set(out.length, l.soc)
      const body = {
        rows: [{ segs: l.segs, plain: l.plain, li: l.li0 }],
        li0: l.li0,
        li1: l.li1,
        shift: l.shift,
        blockCapo: l.blockCapo,
        blockCapoMap: l.blockCapoMap,
        // Filled in by `layoutChartFull`, which knows the capo and the lens.
        shapeCapo: 0,
        hasOwnCapo: false,
      }
      const next: ChartBlockDraft & { kind: 'stanza' | 'chorus' } =
        kind === 'chorus' ? { kind: 'chorus', ...body } : { kind: 'stanza', ...body }
      open = next
      out.push(next)
      continue
    }
    open = null
    const span = { li0: l.li0, li1: l.li1 }
    if (l.kind === 'note') out.push({ kind: 'note', items: l.items, lis: l.lis, ...span })
    else if (l.kind === 'comment') out.push({ kind: 'comment', text: l.text, ...span })
    else if (l.kind === 'tab') out.push({ kind: 'tab', text: l.text, ...buildTab(l.text), ...span })
    else if (l.kind === 'score')
      out.push({
        kind: 'score',
        text: l.text,
        scoreKey: (l.text.match(/key=([A-G][#b]?)/) || [])[1] ?? '',
        scoreTempo: (l.text.match(/tempo=(\d+)/) || [])[1] ?? '',
        ...span,
      })
    else if (l.kind === 'image') out.push({ kind: 'image', src: l.src, ...span })
    // A hidden block stays in the list: reading filters it out, editing shows
    // it as a card with the way back.
    else if (l.kind === 'hidden') out.push({ kind: 'hidden', texts: l.texts, ...span })
  }

  // A chorus written as `{soc}…{eoc}` owns its envelope: without this the block
  // spans only the sung lines, and moving or deleting it leaves the directives
  // behind — an unclosed chorus in the file. Only a chorus that came out whole
  // from one `{soc}` is expanded: a blank line splits it into two blocks, and
  // neither of them may claim the pair.
  const owners = new Map<number, number>()
  for (const v of soc.values()) if (v != null) owners.set(v, (owners.get(v) ?? 0) + 1)
  for (const [bi, v] of soc) {
    if (v == null || owners.get(v) !== 1) continue
    const end = eocOf[v]
    if (end == null) continue
    const b = out[bi]
    if (!b) continue
    b.li0 = v
    b.li1 = end
  }
  return out
}
