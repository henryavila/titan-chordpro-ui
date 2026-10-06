import type { BlockMarks, ChartSeg, TitanChordproDocument, TitanChordproLine } from '../types'

type WorkBase = { li0: number; li1: number }

export type WorkLine = WorkBase &
  (
    | ({
        kind: 'song'
        inChorus: boolean
        /** Line of the `{soc}` this one is inside, when it is inside one. */
        soc: number | null
        segs: ChartSeg[]
        plain: string
      } & BlockMarks)
    | { kind: 'comment'; text: string }
    | { kind: 'tab'; text: string }
    | { kind: 'score'; text: string }
    | { kind: 'image'; src: string }
    | { kind: 'hidden'; texts: string[] }
    | { kind: 'blank' }
    | { kind: 'note'; items: string[]; lis: number[] }
  )

export function flatten(view: TitanChordproDocument): WorkLine[] {
  const out: WorkLine[] = []
  for (const sec of view.sections) {
    for (const line of sec.lines) out.push(fromLine(line, sec.kind === 'chorus'))
  }
  return out
}

function fromLine(line: TitanChordproLine, inChorus: boolean): WorkLine {
  const span = { li0: line.li0, li1: line.li1 }
  if (line.type === 'empty') return { kind: 'blank', ...span }
  if (line.type === 'comment') return { kind: 'comment', text: line.text, ...span }
  if (line.type === 'tab') return { kind: 'tab', text: line.text, ...span }
  if (line.type === 'score') return { kind: 'score', text: line.text, ...span }
  if (line.type === 'image') return { kind: 'image', src: line.src, ...span }
  if (line.type === 'hidden') return { kind: 'hidden', texts: line.texts, ...span }
  const segs: ChartSeg[] = line.words.map((w) => ({
    chord: w.chord ?? '',
    shape: '',
    hasShape: false,
    text: w.lyric,
    tight: false,
    loose: false,
  }))
  markTight(segs)
  const plain = line.words.map((w) => w.lyric).join('')
  return {
    kind: 'song',
    inChorus,
    soc: line.soc,
    segs,
    plain,
    shift: line.shift,
    blockCapo: line.blockCapo,
    blockCapoMap: line.blockCapoMap,
    ...span,
  }
}

export function markTight(segs: ChartSeg[]): void {
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]
    const nx = segs[i + 1]
    if (!s) continue
    // A chord that lands mid-word must not open a gap in the lyric
    // ("pala vra"): it leaves the flow and sits over the syllable instead.
    s.tight = !!s.chord && /\S$/.test(s.text || '') && !!nx && /^\S/.test(nx.text || '')
    s.loose = !!s.chord && !s.tight
  }
}

/**
 * A comment labels the block below it when a chart/tab follows; otherwise it
 * is a general note about the song — consecutive notes become one panel.
 */
export function groupNotes(lines: WorkLine[]): WorkLine[] {
  const out: WorkLine[] = []
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (!l) continue
    if (l.kind !== 'comment') {
      out.push(l)
      continue
    }
    let general = true
    for (let j = i + 1; j < lines.length; j++) {
      const n = lines[j]
      if (!n || n.kind === 'blank') continue
      general = n.kind === 'comment'
      break
    }
    if (!general) {
      out.push(l)
      continue
    }
    while (out.length && out[out.length - 1]?.kind === 'blank') out.pop()
    const prev = out[out.length - 1]
    if (prev && prev.kind === 'note') {
      prev.items.push(l.text)
      prev.lis.push(l.li0)
      prev.li1 = l.li1
    } else out.push({ kind: 'note', items: [l.text], lis: [l.li0], li0: l.li0, li1: l.li1 })
  }
  return out
}
