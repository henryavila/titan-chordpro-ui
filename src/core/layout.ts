import { isPlayedLine, lineBeats } from './timeline'
import {
  keyRootOf,
  nashvilleToken,
  transposeTextChords,
  transposeToken,
  usesFlats,
} from './transpose'
import type {
  BlockMarks,
  BlockMusic,
  CapoChordPair,
  CapoLegend,
  ChartBlock,
  ChartBlockBody,
  ChartRow,
  ChartSeg,
  ChordProLine,
  ChordProView,
  Lens,
  LineSpan,
  TabStave,
} from './types'

type WorkBase = { li0: number; li1: number }

type WorkLine = WorkBase &
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

function flatten(view: ChordProView): WorkLine[] {
  const out: WorkLine[] = []
  for (const sec of view.sections) {
    for (const line of sec.lines) out.push(fromLine(line, sec.kind === 'chorus'))
  }
  return out
}

function fromLine(line: ChordProLine, inChorus: boolean): WorkLine {
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
function groupNotes(lines: WorkLine[]): WorkLine[] {
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

type ChartBlockDraft = LineSpan & ChartBlockBody

/**
 * Consecutive verse/chorus lines form one closed block, so near-identical
 * repeats do not blur together while reading. A block inherits the marks
 * written above its first line.
 */
function groupChorus(lines: WorkLine[], eocOf: Record<number, number>): ChartBlockDraft[] {
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

/**
 * Tab text becomes a stave: each string is a continuous rule broken by the
 * fret numbers; a `|` inside the bar becomes a vertical divider.
 */
export function buildTab(text: string): { staves: TabStave[]; extras: string[] } {
  const raw = String(text || '')
    .replace(/^\n+|\n+$/g, '')
    .split('\n')
  const std = ['e', 'B', 'G', 'D', 'A', 'E']
  const bass = ['G', 'D', 'A', 'E']
  const isStave = (r: string) => /-{2,}/.test(r)
  const total = raw.filter(isStave).length
  const staves: TabStave[] = []
  const extras: string[] = []
  let i = 0
  for (const r of raw) {
    if (!isStave(r)) {
      if (r.trim()) extras.push(r.trim())
      continue
    }
    const m = r.match(/^\s*([A-Ga-g][#b]?)?\s*\|?(.*)$/)
    const label =
      (m && m[1]) || (total === 6 ? std[i] : total === 4 ? bass[i] : String(i + 1)) || String(i + 1)
    const body = (m ? m[2] : r)?.replace(/\|+\s*$/, '') ?? ''
    const tokens: TabStave['tokens'] = []
    for (const part of body.match(/-+|\|+|[^-|]+/g) || []) {
      if (part[0] === '-') tokens.push({ kind: 'gap', text: part.replace(/-/g, ' ') })
      else if (part[0] === '|') tokens.push({ kind: 'bar' })
      else tokens.push({ kind: 'mark', text: part })
    }
    staves.push({ label, tokens })
    i++
  }
  if (!staves.length) {
    return { staves: [], extras: raw.filter((r) => r.trim()) }
  }
  return { staves, extras }
}

/** Musical weight of a block — see {@link BlockMusic}. */
function musicOf(block: ChartBlockDraft, srcLines: string[]): BlockMusic {
  let chords = 0
  for (let i = block.li0; i <= block.li1; i++) {
    chords += ((srcLines[i] ?? '').match(/\[[^\]]*\]/g) || []).length
  }
  let bars = 0
  if (block.kind === 'score') {
    // A written score counts its bar lines: `| … |` — two pipes per bar.
    bars = Math.round((String(block.text).match(/\|/g) || []).length / 2)
  } else if (block.kind === 'tab') {
    const st = block.staves[0]
    bars = st ? st.tokens.filter((t) => t.kind === 'bar').length : 0
  }
  // Row by row, because a block mixes the two: the marks on a played line are
  // that line's whole time, the marks trailing a sung line are only its tail.
  // Counting them together made one `[Am]x///` shrink a whole verse to a beat.
  let beats = 0
  let tail = 0
  let rows = 0
  if (block.kind === 'stanza' || block.kind === 'chorus') {
    for (const row of block.rows) {
      const raw = srcLines[row.li] ?? ''
      const n = lineBeats(raw)
      if (isPlayedLine(raw)) beats += n
      else {
        rows++
        tail += n
      }
    }
  }
  return { beats, tail, bars, chords, rows }
}

export type LayoutOpts = {
  /** Global transpose, in semitones (defaults to the view's own). */
  semitones?: number
  /** Capo of the song. */
  capo?: number
  /**
   * Dual (default): concert chord on the lyric, capo shape above.
   * `false`: rewrite the chart to the capo shapes — the reader is alone.
   */
  dual?: boolean
  /** Reading lens: chord spelling, or lyrics-only. */
  lens?: Lens
  /** Editing: no capo shapes and no lens — you do not edit a projection. */
  editing?: boolean
}

export type ChartLayout = {
  blocks: ChartBlock[]
  /**
   * True when at least one block shows a shape row — the chart then needs the
   * taller chord lane, and the auto-scroll a longer page.
   */
  twin: boolean
  /**
   * Distinct song chords as capo shapes vs sounding names (first appearance).
   * Present whenever a song capo is on — dual or not — so the tone sheet can
   * preview the progression. Empty when there is no capo or nothing to map.
   */
  capoPairs: CapoChordPair[]
  /** Dual-mode legend bar: same pairs, plus the first as `real` / `shape`. */
  legend: CapoLegend | null
  /** True when some block carries a capo of its own. */
  anyBlockCapo: boolean
}

/**
 * A row with nothing to sing: empty, chords only, or rhythm marks (`x///`).
 * Under the lyrics-only lens those rows become dead space in the middle of
 * the lyric and drop out of the reading — the file is unchanged.
 * Production quirks `/_`, `/-`, `x...` count as rhythm residue too.
 */
function noLyricRow(row: ChartRow): boolean {
  const t = row.segs.map((s) => s.text).join('').trim()
  if (!t) return true
  return /^[xX/\\|.%\-\s¨~'’_.]+$/.test(t) && /[xX/]/.test(t)
}

const isLetter = (c: string): boolean => /\p{L}/u.test(c)

/**
 * The x/// convention, after the anchoring chord is gone: `x` is the head of
 * the time; `/` is a beat that is not. A slash inside a word (`cami/nhar`) and
 * a hyphen (`pala-vra`) stay. After chords are stripped, marks often sit
 * against the previous lyric (`razão.[E]//` → `razão.//`, `Amém[G]x` → `Amémx`)
 * — those still count. Residue `/_`, `/-`, `x...` from production charts is
 * part of the mark run, not lyric.
 */
function isBeatMarkAt(s: string, i: number): boolean {
  const c = s[i]
  if (c !== 'x' && c !== 'X' && c !== '/') return false
  const prev = i > 0 ? (s[i - 1] as string) : ' '
  const next = i + 1 < s.length ? (s[i + 1] as string) : ''
  // Syllable break inside a sung word — never a clock mark.
  if (c === '/' && isLetter(prev) && isLetter(next)) return false
  // Mark run may end in production residue: /_  /-  x...  x.
  const nextOk =
    next === '' ||
    next === '/' ||
    next === 'x' ||
    next === 'X' ||
    next === '_' ||
    next === '-' ||
    next === '.' ||
    /\s/.test(next)
  if (!nextOk) return false
  if (c === 'x' || c === 'X') {
    // Letter x inside a word (Exaltado): next is a letter → already rejected.
    // Head after space/punct, or glued after a lyric once the chord left
    // (Amémx, Oh!x///): next is end, /, or residue.
    if (/\s/.test(prev) || prev === '/' || prev === 'x' || prev === 'X') return true
    if (isLetter(prev)) {
      return next === '/' || next === '' || next === '_' || next === '-' || next === '.'
    }
    // After punctuation / start of leftover text.
    return true
  }
  // `/` — word-internal already excluded; everything else is a beat.
  return true
}

function stripBeatMarks(text: string): string {
  const s = String(text ?? '')
  let out = ''
  for (let i = 0; i < s.length; ) {
    if (isBeatMarkAt(s, i)) {
      i++
      // Consume residue glued to the run (/_ /- x... x.).
      while (i < s.length && (s[i] === '_' || s[i] === '-')) i++
      if (s.slice(i, i + 3) === '...') i += 3
      else if (s[i] === '.' && (i + 1 >= s.length || /\s/.test(s[i + 1]!))) i++
      continue
    }
    out += s[i]
    i++
  }
  return out.replace(/[ \t]{2,}/g, ' ').replace(/^ +| +$/g, '')
}

/**
 * Text that sat under/after a chord: a leading clock run is never lyric.
 * Stripping here — before join — stops `amigo[Em]//` from becoming `amigo/`.
 */
function stripChordClock(text: string): string {
  return String(text ?? '').replace(
    /^[ \t]*(?:[xX][/xX]*|\/+)[_.\-]*(?:\.\.\.)?/,
    '',
  )
}

function stripChords(row: ChartRow): ChartRow {
  const joined = row.segs.map((s) => (s.chord ? stripChordClock(s.text) : s.text)).join('')
  const plain = stripBeatMarks(joined)
  const segs: ChartSeg[] = plain
    ? [{ chord: '', shape: '', hasShape: false, text: plain, tight: false, loose: false }]
    : []
  return { ...row, segs, plain }
}

/**
 * Lyrics-only reading: chords, tab, score and images leave the surface.
 * Rhythm-only / chord-only rows go with them, and beat marks (`x///`, `/`, a
 * lone `x`) are stripped from the lines that remain. Comments stay — hiding
 * those is a separate switch.
 */
function lyricsOnlyBlocks(blocks: ChartBlock[]): ChartBlock[] {
  const out: ChartBlock[] = []
  for (const b of blocks) {
    if (b.kind === 'tab' || b.kind === 'score' || b.kind === 'image') continue
    if (b.kind !== 'stanza' && b.kind !== 'chorus') {
      out.push(b)
      continue
    }
    const rows = b.rows.filter((r) => !noLyricRow(r)).map(stripChords).filter((r) => r.plain.length > 0)
    if (!rows.length) continue
    out.push({ ...b, rows, shapeCapo: 0 })
  }
  return out
}

export function layoutChart(view: ChordProView, opts: LayoutOpts = {}): ChartBlock[] {
  return layoutChartFull(view, opts).blocks
}

/**
 * Dual capo keeps concert names on the lyric and draws the fret shape above —
 * two people, one sheet. Capo without dual is the capo player alone: the
 * chart itself is rewritten to the shapes they fret. The sounding key does
 * not change.
 */
export function layoutChartFull(view: ChordProView, opts: LayoutOpts = {}): ChartLayout {
  const semis = opts.semitones ?? view.transposeSemitones
  const capo = Math.max(0, opts.capo ?? 0)
  const editing = !!opts.editing
  const flats = usesFlats(view.meta.key)
  const keyRoot = keyRootOf(view.meta.key)
  const nash = !editing && opts.lens === 'nashville' && !!keyRoot
  const srcLines = String(view.source ?? '').split('\n')

  const drafts = groupChorus(groupNotes(flatten(view)), view.eocOf ?? {})

  // Song or `#capo:n` fret — the draw source. Edit/Nashville still need this;
  // they only zero the *display* projection (`capoReadOf`), not the playable fields.
  const playableCapoOf = (marks: BlockMarks): { fret: number; dual: boolean } => {
    const own = marks.blockCapo != null
    const fret = own ? (marks.blockCapo ?? 0) : capo
    if (fret <= 0) return { fret: 0, dual: false }
    const dual = own ? marks.blockCapoMap !== false : opts.dual !== false
    return { fret, dual }
  }

  // A capo chosen for ONE block follows that block's own dual mark (`#capo:n`
  // vs `#capo:n!`). The song-wide switch only applies when the block has none.
  const capoReadOf = (marks: BlockMarks): { fret: number; dual: boolean } => {
    if (editing || nash) return { fret: 0, dual: false }
    return playableCapoOf(marks)
  }

  const nashRoot = transposeToken(keyRoot, semis, flats)
  const display = (chord: string, read: { fret: number; dual: boolean }): { name: string; shape: string } => {
    if (!chord) return { name: chord, shape: '' }
    if (nash) {
      return { name: nashvilleToken(transposeToken(chord, semis, flats), nashRoot), shape: '' }
    }
    const real = semis ? transposeToken(chord, semis, flats) : chord
    if (read.fret <= 0) return { name: real, shape: '' }
    const shape = transposeToken(chord, semis - read.fret, flats)
    if (!read.dual) return { name: shape, shape: '' }
    return { name: real, shape }
  }

  let anyBlockCapo = false
  let twin = false
  const all: ChartBlock[] = drafts.map((draft): ChartBlock => {
    const music = musicOf(draft, srcLines)
    if (draft.kind === 'comment') {
      return { ...draft, text: transposeTextChords(draft.text, semis, flats), music }
    }
    if (draft.kind !== 'stanza' && draft.kind !== 'chorus') return { ...draft, music }

    const read = capoReadOf(draft)
    const playable = playableCapoOf(draft)
    const shapeCapo = read.dual ? read.fret : 0
    if (draft.blockCapo != null && draft.blockCapo > 0) anyBlockCapo = true
    if (shapeCapo > 0) twin = true
    const rows: ChartRow[] = draft.rows.map((row) => {
      const segs = row.segs.map((s): ChartSeg => {
        const d = display(s.chord, read)
        const concert = s.chord ? (semis ? transposeToken(s.chord, semis, flats) : s.chord) : ''
        const shapeName =
          s.chord && playable.fret > 0
            ? transposeToken(s.chord, semis - playable.fret, flats)
            : concert
        return {
          ...s,
          chord: d.name,
          shape: d.shape,
          hasShape: !!d.shape,
          concert,
          shapeName,
          capoFret: playable.fret,
        }
      })
      markTight(segs)
      return { ...row, segs }
    })
    return {
      ...draft,
      rows,
      shapeCapo,
      hasOwnCapo: draft.blockCapo != null && draft.blockCapo !== capo,
      music,
    }
  })

  // Distinct chords of the song, in first-appearance order — the tone sheet
  // and the dual legend both need the real progression, not just the key.
  let capoPairs: CapoChordPair[] = []
  if (!editing && !nash && capo > 0) {
    const seen = new Set<string>()
    for (const b of drafts) {
      if (b.kind !== 'stanza' && b.kind !== 'chorus') continue
      for (const row of b.rows) {
        for (const s of row.segs) {
          if (!s.chord) continue
          const real = transposeToken(s.chord, semis, flats)
          if (seen.has(real)) continue
          seen.add(real)
          capoPairs.push({
            real,
            shape: transposeToken(s.chord, semis - capo, flats),
          })
        }
      }
    }
  }

  let legend: CapoLegend | null = null
  if (capoPairs.length && opts.dual !== false) {
    const first = capoPairs[0]!
    legend = { real: first.real, shape: first.shape, pairs: capoPairs }
  }

  // Out of the reading, present to the editor: that is the whole point of `#~`.
  const lyricsOnly = !editing && opts.lens === 'letra'
  if (lyricsOnly) {
    twin = false
    legend = null
    capoPairs = []
  }
  const visible = editing ? all : all.filter((b) => b.kind !== 'hidden')
  const blocks = lyricsOnly ? lyricsOnlyBlocks(visible) : visible
  return { blocks, twin, capoPairs, legend, anyBlockCapo }
}

export function maxPlainChars(blocks: ChartBlock[]): number {
  let max = 0
  for (const b of blocks) {
    if (b.kind === 'stanza' || b.kind === 'chorus') {
      for (const r of b.rows) max = Math.max(max, r.plain.length)
    }
  }
  return max
}

export function fitFactor(width: number, maxChars: number, base: number, fit: boolean): number {
  if (!fit || maxChars <= 0) return 1
  const avail = Math.min(width, 880) - 56
  return Math.max(0.68, Math.min(1.25, avail / (maxChars * base * 0.485)))
}

export function typeScale(
  bias: number,
  fit: boolean,
  width: number,
  maxChars: number,
  twin = false,
  /**
   * Reading lens. `letra` is a vocal surface: at most one blank line between
   * blocks, tighter row pad — not the cifra’s rehearsal gap with chords gone.
   */
  lens: Lens = 'none',
) {
  const base = 18 + bias * 1.7
  const factor = fitFactor(width, maxChars, base, fit)
  const lyric = base * factor
  const chord = lyric * 1.18
  const tab = Math.max(9.5, Math.min(14, lyric * 0.62))
  // The dual chart needs a second chord lane above the line.
  const lane = twin ? 2.55 : 1.4
  const letra = lens === 'letra'
  return {
    lyricPx: `${lyric.toFixed(1)}px`,
    chordPx: `${chord.toFixed(1)}px`,
    shapePx: `${chord.toFixed(1)}px`,
    chordBox: `${(chord * lane).toFixed(1)}px`,
    /** Lane height for a block that shows no shape row. */
    chordBoxPlain: `${(chord * 1.4).toFixed(1)}px`,
    tabPx: `${tab.toFixed(1)}px`,
    tabLabelPx: `${(tab * 0.85).toFixed(1)}px`,
    tabRow: `${(tab * 1.8).toFixed(1)}px`,
    rowPad: letra ? (fit ? '2px' : '3px') : fit ? '3px' : '6px',
    // Cifra: room for the chord lane between boxes. Letra: exactly one blank
    // line (same px as lyricPx — Math.round would overshoot on fractional sizes).
    blockGap: letra
      ? `${lyric.toFixed(1)}px`
      : `${Math.round(lyric * (fit ? 2.1 : 2.6))}px`,
    /** Average pixel height of one bar — the auto-scroll fallback pace. */
    barPx: Math.max(18, lyric * 1.15 + chord * lane + (fit ? 6 : 12)),
  }
}

/**
 * Typography the editing surface needs on top of the reading one. A row in
 * edit mode is syllables you can measure with chord pills floating above them,
 * so the line box has to carry a lane the pills live in — hence a line-height
 * far taller than the lyric itself.
 */
export function editTypeScale(bias: number, compact: boolean) {
  const lyric = 18 + bias * 1.7
  const chord = lyric * 1.18
  return {
    /** Height of the pill lane above the first visual line of a row. */
    pillLane: '29px',
    // The thumb needs a bigger target than the mouse does.
    pillH: compact ? '30px' : '23px',
    editLineH: `${Math.round(lyric * 1.15 + (compact ? 62 : 52))}px`,
    chordEditPx: `${Math.max(11, Math.min(15, chord * 0.62)).toFixed(1)}px`,
  }
}
