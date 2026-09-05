/**
 * One model for score and tablature, shared by the editor and the reading
 * surface. What is stored is always pitch + figure; string and fret are
 * derived, and only written down when the fingering was pinned by hand.
 */

export const STR_MIDI = [64, 59, 55, 50, 45, 40] as const
export const STR_LBL = ['e', 'B', 'G', 'D', 'A', 'E'] as const
export const NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'] as const
export const PT: Record<string, string> = {
  c: 'Dó',
  d: 'Ré',
  e: 'Mi',
  f: 'Fá',
  g: 'Sol',
  a: 'Lá',
  b: 'Si',
}

export type Dur = 'w' | 'h' | 'q' | '8' | '16'
export const BEATS: Record<string, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 }
export const DUR_OF: Record<string, Dur> = { 4: 'w', 2: 'h', 1: 'q', 0.5: '8', 0.25: '16' }

/**
 * The figures are drawn (head + stem + flags): the Unicode glyphs for a whole
 * and a half note are missing from the system fonts and came out as tofu.
 */
export const DURS = [
  { d: 'w' as Dur, b: 4, name: 'Semibreve', hollow: true, stem: false, flags: 0 },
  { d: 'h' as Dur, b: 2, name: 'Mínima', hollow: true, stem: true, flags: 0 },
  { d: 'q' as Dur, b: 1, name: 'Semínima', hollow: false, stem: true, flags: 0 },
  { d: '8' as Dur, b: 0.5, name: 'Colcheia', hollow: false, stem: true, flags: 1 },
  { d: '16' as Dur, b: 0.25, name: 'Semicolcheia', hollow: false, stem: true, flags: 2 },
]

export type ScoreNote = {
  /** Absolute pitch. A rest has none. */
  midi?: number
  dur: Dur
  rest?: boolean
  slide?: boolean
  /** Fingering pinned by hand: 0 = high e. Otherwise it is derived. */
  str?: number
  fret?: number
}

export type ScoreMeta = { time: string; key: string; tempo: number; tuning: string }

export const DEFAULT_META: ScoreMeta = { time: '4/4', key: 'D', tempo: 92, tuning: 'EADGBE' }

/** The starter phrase a brand-new score opens with, so the staff is never blank. */
export const DEMO: ScoreNote[] = [
  { midi: 62, dur: '8' },
  { midi: 64, dur: '8' },
  { midi: 67, dur: 'q' },
  { midi: 69, dur: '8', slide: true },
  { midi: 71, dur: '8' },
  { midi: 67, dur: 'h' },
  { midi: 62, dur: 'q' },
  { midi: 64, dur: 'q' },
]

export type TabPos = { str: number; fret: number }

/** The lowest fret that can play this pitch — the shape a hand actually takes. */
export function toTab(midi: number): TabPos | null {
  let best: TabPos | null = null
  for (let s = 0; s < 6; s++) {
    const fret = midi - (STR_MIDI[s] as number)
    if (fret < 0 || fret > 15) continue
    if (!best || fret < best.fret) best = { str: s, fret }
  }
  return best
}

export function tabOf(n: ScoreNote | undefined): TabPos | null {
  if (!n || n.rest) return null
  if (typeof n.str === 'number') return { str: n.str, fret: n.fret ?? 0 }
  return typeof n.midi === 'number' ? toTab(n.midi) : null
}

export function beatsOf(notes: ScoreNote[]): number {
  return notes.reduce((a, n) => a + (BEATS[n.dur] ?? 1), 0)
}

export function keyOf(midi: number): string {
  return `${NAMES[midi % 12]}/${Math.floor(midi / 12) - 1}`
}

export function beatsPerBar(time: string | undefined): number {
  const m = String(time ?? '4/4').match(/^(\d+)\s*\/\s*(\d+)$/)
  if (!m) return 4
  return (Number(m[1]) * 4) / Number(m[2])
}

/**
 * A figure longer than what is left of the bar does not stretch the barline:
 * it is split into legal figures and tied, so the bar always falls on the beat.
 */
function decompose(beats: number): number[] {
  const out: number[] = []
  let r = Math.round(beats * 4)
  for (const q of [16, 8, 4, 2, 1]) while (r >= q) {
    out.push(q / 4)
    r -= q
  }
  return out
}

export type LayoutItem =
  | { kind: 'note'; i: number; n: ScoreNote; dur: Dur; tieNext: boolean }
  | { kind: 'bar' }

/** The note stream cut into bars — what both the staff and the tab draw from. */
export function layout(notes: ScoreNote[], perBar?: number): LayoutItem[] {
  const bar = perBar || 4
  const items: LayoutItem[] = []
  let acc = 0
  notes.forEach((n, i) => {
    let left = BEATS[n.dur] ?? 1
    const frags: number[] = []
    let a = acc
    while (left > 0.0001) {
      const take = Math.min(left, bar - (a % bar))
      for (const p of decompose(take)) frags.push(p)
      a += take
      left -= take
    }
    frags.forEach((p, k) => {
      items.push({ kind: 'note', i, n, dur: DUR_OF[p] ?? 'q', tieNext: k < frags.length - 1 })
      acc += p
      if (Math.abs(acc % bar) < 0.001) items.push({ kind: 'bar' })
    })
  })
  return items
}

/**
 * A ChordPro extension: one line per bar, pitch:figure, `~s` a slide, `r` a
 * rest, `@string/fret` only when the fingering was pinned by hand, `~l` a tie.
 */
export function serialize(notes: ScoreNote[], meta?: Partial<ScoreMeta>): string {
  const m = { ...DEFAULT_META, ...(meta ?? {}) }
  const head = `{sos: time=${m.time} key=${m.key} tempo=${m.tempo} tuning=${m.tuning}}`
  const perBar = beatsPerBar(m.time)
  const lines: string[] = []
  let bar: string[] = []
  for (const it of layout(notes, perBar)) {
    if (it.kind === 'bar') {
      if (bar.length) {
        lines.push(`| ${bar.join(' ')} |`)
        bar = []
      }
      continue
    }
    const n = it.n
    if (n.rest) {
      bar.push(`r:${it.dur}`)
      continue
    }
    const midi = n.midi ?? 60
    let tok = `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}:${it.dur}`
    if (n.slide) tok += '~s'
    if (typeof n.str === 'number') tok += `@${n.str + 1}/${n.fret ?? 0}`
    if (it.tieNext) tok += '~l'
    bar.push(tok)
  }
  if (bar.length) lines.push(`| ${bar.join(' ')} |`)
  return `${head}\n${lines.join('\n')}\n{eos}`
}

function midiOf(name: string, oct: number): number {
  const i = (NAMES as readonly string[]).indexOf(name.toLowerCase())
  return i < 0 ? 60 : (oct + 1) * 12 + i
}

export type ParsedScore = {
  meta: ScoreMeta
  notes: ScoreNote[]
  /** Where the notes came from: a `{sos}` block, legacy text tab, or nothing. */
  from: 'sos' | 'tab-texto' | 'vazio' | 'novo'
}

/** Reads the `{sos}` form, a legacy text tab (`{sot}`), or nothing at all. */
export function parseScore(text: string | null | undefined): ParsedScore {
  const src = String(text ?? '').trim()
  if (!src) return { meta: { ...DEFAULT_META }, notes: [], from: 'novo' }
  if (/\{\s*sos\b/i.test(src)) return parseSos(src)
  return parseAscii(src)
}

function parseSos(src: string): ParsedScore {
  const meta = { ...DEFAULT_META }
  const notes: ScoreNote[] = []
  const head = src.match(/\{\s*sos\s*:?([^}]*)\}/i)
  if (head) {
    const kv = head[1] ?? ''
    const g = (k: string): string | null => {
      const m = kv.match(new RegExp(`${k}\\s*=\\s*([^\\s}]+)`))
      return m ? (m[1] ?? null) : null
    }
    meta.time = g('time') ?? meta.time
    meta.key = g('key') ?? meta.key
    meta.tempo = Number(g('tempo')) || meta.tempo
    meta.tuning = g('tuning') ?? meta.tuning
  }
  let pendTie = false
  /** Beats gathered so far on the note the ties are putting back together. */
  let tieAcc = 0
  for (const raw of src.split('\n')) {
    const line = raw.trim()
    if (!line || /^\{/.test(line)) continue
    for (const tok of line.replace(/\|/g, ' ').trim().split(/\s+/)) {
      if (!tok) continue
      const rest = tok.match(/^r:(\w+)$/i)
      if (rest) {
        notes.push({ rest: true, dur: (rest[1] as Dur) ?? 'q' })
        continue
      }
      const m = tok.match(/^([a-g]#?)(-?\d+):(\w+)((?:~[sl])*)(?:@(\d)\/(\d+))?$/i)
      if (!m) continue
      const midi = midiOf(m[1] ?? 'c', Number(m[2]))
      const flags = m[4] ?? ''
      const n: ScoreNote = { midi, dur: (m[3] as Dur) ?? 'q', slide: flags.includes('s') }
      if (m[5]) {
        n.str = Number(m[5]) - 1
        n.fret = Number(m[6])
      }
      // A tie across a barline is a fragment of the same sound: it adds back
      // into one note, so editing sees the figure the musician wrote. The
      // running total is kept apart from the figure, because a chain can pass
      // through a length no single figure spells (q+h is three beats): summing
      // pairwise dropped those beats and a whole note came back a half.
      const prev = notes[notes.length - 1]
      if (pendTie && prev && prev.midi === n.midi) {
        tieAcc += BEATS[n.dur] ?? 1
        prev.dur = DUR_OF[tieAcc] ?? prev.dur
        pendTie = flags.includes('l')
        continue
      }
      pendTie = flags.includes('l')
      tieAcc = BEATS[n.dur] ?? 1
      notes.push(n)
    }
  }
  return { meta, notes, from: 'sos' }
}

/**
 * The old text tab: every column with a digit becomes a quarter note. The
 * rhythm is lost (the text never had one) — the figure is fixed in the editor.
 */
function parseAscii(src: string): ParsedScore {
  const rows = src.split('\n').filter((r) => /-{2,}/.test(r))
  if (!rows.length) return { meta: { ...DEFAULT_META }, notes: [], from: 'vazio' }
  const bodies = rows.slice(0, 6).map((r) => r.replace(/^\s*[eBGDAE]?\s*\|?/, ''))
  const width = Math.max(...bodies.map((b) => b.length))
  const notes: ScoreNote[] = []
  for (let c = 0; c < width; c++) {
    for (let s = 0; s < bodies.length; s++) {
      const body = bodies[s] as string
      const ch = body[c]
      if (!/[0-9]/.test(ch ?? '')) continue
      let fret = Number(ch)
      const nxt = body[c + 1]
      if (/[0-9]/.test(nxt ?? '')) {
        fret = fret * 10 + Number(nxt)
        bodies[s] = `${body.slice(0, c + 1)}-${body.slice(c + 2)}`
      }
      const str = Math.min(5, s)
      notes.push({ midi: (STR_MIDI[str] as number) + fret, str, fret, dur: 'q' })
      break
    }
  }
  return { meta: { ...DEFAULT_META }, notes, from: 'tab-texto' }
}
