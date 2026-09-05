export type ChordProView = {
  meta: {
    title?: string
    subtitle?: string
    artist?: string
    key?: string
    tempo?: number | string
    time?: string
    duration?: string
    capo?: number
  }
  displayKey: string | null
  transposeSemitones: number
  source: string
  sections: ChordProSection[]
  /** `{soc}` line → its `{eoc}`: what makes a chorus move with its envelope. */
  eocOf: Record<number, number>
}

export type SectionKind =
  | 'verse'
  | 'chorus'
  | 'bridge'
  | 'comment'
  | 'tab'
  | 'instrumental'
  | 'generic'
  | 'note'
  | 'score'

export type ChordProSection = {
  kind: SectionKind
  label?: string
  lines: ChordProLine[]
}

/** Source line span (0-based indices into `source.split('\n')`). */
export type LineSpan = { li0: number; li1: number }

/** Reading lens: how chord names are spelled on the surface. */
export type Lens = 'none' | 'nashville'

/**
 * Marks a block carries in the file, written by the editor and invisible while
 * reading: `#^±n` records a section transpose already applied to the chords,
 * `#capo:n[!]` gives the block a capo of its own (`!` = no dual chart there).
 */
export type BlockMarks = {
  shift: number
  blockCapo: number | null
  blockCapoMap: boolean
}

export type ChordProLine = LineSpan &
  (
    | ({
      type: 'lyrics'
      words: Array<{ chord?: string; lyric: string }>
      /** Line of the `{soc}` this one is inside, when it is inside one. */
      soc: number | null
    } & BlockMarks)
    | { type: 'empty' }
    | { type: 'comment'; text: string }
    | { type: 'tab'; text: string }
    | { type: 'score'; text: string }
    | { type: 'image'; src: string }
    /** `#~` lines: kept in the file, out of the reading surface. */
    | { type: 'hidden'; texts: string[] }
  )

export type ThemeId = 'light' | 'dark' | 'print' | 'default' | 'stage' | 'auto'

export type ViewerAction =
  | { type: 'transpose'; delta: number }
  | { type: 'setTranspose'; semitones: number }
  | { type: 'resetTranspose' }
  | { type: 'setCapo'; capo: number }
  | { type: 'setTheme'; theme: ThemeId }
  | { type: 'setBias'; bias: number }
  | { type: 'setFit'; fit: boolean }
  | { type: 'setSource'; source: string }
  | { type: 'setMode'; mode: 'view' | 'edit' }

export type ViewerState = {
  source: string
  view: ChordProView
  html: string
  theme: ThemeId
  resolvedTheme: 'light' | 'dark' | 'print'
  transposeSemitones: number
  capo: number
  bias: number
  fit: boolean
  mode: 'view' | 'edit'
  displayKey: string | null
}

export type ViewerController = {
  getState: () => ViewerState
  subscribe: (fn: (state: ViewerState) => void) => () => void
  dispatch: (action: ViewerAction) => void
  attachScroll?: (el: HTMLElement) => () => void
}

export type ChartSeg = {
  /** The chord as it sounds — what most of the group plays. */
  chord: string
  /** The shape to fret under a capo, shown above the real chord. */
  shape: string
  hasShape: boolean
  text: string
  tight: boolean
  loose: boolean
}

export type ChartRow = {
  segs: ChartSeg[]
  plain: string
  /** Line in the source this row came from — what a personal edit anchors on. */
  li: number
}

export type TabToken =
  | { kind: 'gap'; text: string }
  | { kind: 'mark'; text: string }
  | { kind: 'bar' }

export type TabStave = {
  label: string
  tokens: TabToken[]
}

/**
 * Musical weight of a block, mined from the source — the auto-scroll clock
 * runs on this, never on pixels. `beats` counted from `x///` strumming marks
 * is exact; everything else is an estimate the timeline calibrates.
 */
export type BlockMusic = {
  /** Beats written as `x///` on the block's lines (0 = none written). */
  beats: number
  /** Bars readable from a tab/score block (0 = none). */
  bars: number
  /** Chord tokens in the block — the fallback "one bar per chord" estimate. */
  chords: number
  /** Sung rows in the block. */
  rows: number
}

export type ChartBlockBody =
  | ({ kind: 'stanza'; rows: ChartRow[] } & SongBlockExtras)
  | ({ kind: 'chorus'; rows: ChartRow[] } & SongBlockExtras)
  | { kind: 'comment'; text: string }
  /** `lis` is where each note sits in the file: blank lines may split them. */
  | { kind: 'note'; items: string[]; lis: number[] }
  | { kind: 'tab'; text: string; staves: TabStave[]; extras: string[] }
  | { kind: 'score'; text: string; scoreKey: string; scoreTempo: string }
  | { kind: 'image'; src: string }
  /** `#~` lines: kept in the file, out of the reading, shown only to an editor. */
  | { kind: 'hidden'; texts: string[] }

export type SongBlockExtras = BlockMarks & {
  /** Capo the shapes of this block are drawn for (0 = no shape row). */
  shapeCapo: number
  /** True when this block sets a capo different from the song's. */
  hasOwnCapo: boolean
}

export type ChartBlock = LineSpan & { music: BlockMusic } & ChartBlockBody

/** What the reading surface needs to explain a capo once, at the top. */
export type CapoLegend = {
  /** First chord of the song, as it sounds. */
  real: string
  /** The same chord as a capo shape. */
  shape: string
}

export type ParseIssue = {
  fatal: boolean
  message: string
}
