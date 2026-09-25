import { chartDocument, notationBlockCloser } from './charts'
import { looksLikeOnSong, normalizeOnSong } from './onsong'
import { semitoneDelta, transposeTextChords, transposeToken, usesFlats } from './transpose'
import type { ChordProLine, ChordProSection, ChordProView, SectionKind } from './types'

type RawLine = { li0: number; li1: number } & (
  | {
      kind: 'lyrics'
      inChorus: boolean
      /** Line of the `{soc}` this lyric is inside, when it is inside one. */
      soc: number | null
      words: Array<{ chord?: string; lyric: string }>
      plain: string
      /** `#^±n` written above the block — the trace of a section transpose. */
      shift: number
      /** `#capo:n` written above the block (null = follows the song capo). */
      blockCapo: number | null
      /** `#capo:n!` asks for the real chord only in this block. */
      blockCapoMap: boolean
    }
  | { kind: 'comment'; text: string }
  | { kind: 'tab'; text: string }
  | { kind: 'score'; text: string }
  | { kind: 'image'; src: string }
  | { kind: 'hidden'; texts: string[] }
  | { kind: 'empty' }
)

const DIR = /^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/
/** `#~ …` — hidden by the editor, still in the file. */
const HIDDEN = /^#~ ?(.*)$/
/** `#^+2` — section transpose already applied to the chords below. */
const MARK_SHIFT = /^#\^([+-]?\d+)\s*$/
/** `#capo:3` / `#capo:3!` — capo for this block only (`!` = shapes only, no dual). */
const MARK_CAPO = /^#capo:(\d+)(!?)\s*$/

function splitLyricLine(raw: string): Array<{ chord?: string; lyric: string }> {
  const words: Array<{ chord?: string; lyric: string }> = []
  const re = /\[([^\]]*)\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(raw))) {
    if (m.index > last) words.push({ lyric: raw.slice(last, m.index) })
    last = re.lastIndex
    const next = raw.indexOf('[', last)
    const lyric = raw.slice(last, next === -1 ? undefined : next)
    words.push({ chord: m[1], lyric })
    last = next === -1 ? raw.length : next
  }
  if (last < raw.length) words.push({ lyric: raw.slice(last) })
  if (words.length === 0) words.push({ lyric: raw })
  return words
}

/** First chart fence at or after `from`. An unclosed tab or score does not cover it. */
function nextUncoveredChartFence(raws: readonly string[], from: number): number {
  for (let j = from; j < raws.length; j++) {
    const name = ((raws[j] ?? '').match(DIR)?.[1] ?? '').toLowerCase()
    if (name === 'start_of_x_chart' || name === 'end_of_x_chart') return j
  }
  return -1
}

function parseRaw(src: string): {
  meta: ChordProView['meta']
  lines: RawLine[]
  /** `{soc}` line → the `{eoc}` line that closes it. */
  eocOf: Record<number, number>
} {
  const meta: ChordProView['meta'] = {}
  const lines: RawLine[] = []
  const raws = src.split('\n')
  let chorus = false
  let socLi: number | null = null
  const eocOf: Record<number, number> = {}
  let pendShift = 0
  let pendCapo: number | null = null
  let pendCapoMap = true

  for (let li = 0; li < raws.length; li++) {
    const raw = raws[li] ?? ''
    const d = raw.match(DIR)

    // Same closer as readMeta. `{eot}` inside a finished score is not the tab closer.
    if (d && /^(sos|start_of_score|sot|start_of_tab)$/i.test(d[1] ?? '')) {
      const isTab = /^(sot|start_of_tab)$/i.test(d[1] ?? '')
      let close = notationBlockCloser(raws, li, isTab ? 'tab' : 'score', 0)
      // No `{eot}`/`{eos}`: a stray chart fence still ends the block. It is not tab text.
      if (!close) {
        const fence = nextUncoveredChartFence(raws, li + 1)
        if (fence >= 0) close = { at: fence, boundary: true }
      }
      const boundary = close?.boundary === true
      const cut = close ? close.at : -1
      if (isTab) {
        const bodyEnd = close ? cut : raws.length
        lines.push({
          kind: 'tab',
          text: raws.slice(li + 1, bodyEnd).join('\n'),
          li0: li,
          // A chart fence ends the block. It is not a line of the tab.
          li1: !close ? raws.length - 1 : boundary ? Math.max(li, cut - 1) : cut,
        })
      } else {
        const bodyEnd = !close ? raws.length : boundary ? cut : cut + 1
        lines.push({
          kind: 'score',
          text: raws.slice(li, bodyEnd).join('\n'),
          li0: li,
          li1: !close ? raws.length - 1 : boundary ? Math.max(li, cut - 1) : cut,
        })
      }
      if (!close) li = raws.length
      else if (boundary) li = cut - 1
      else li = cut
      continue
    }

    // Marks are ChordPro comments: invisible while reading, and they travel
    // with the block when it moves. They stack, so they add up.
    const shm = raw.match(MARK_SHIFT)
    if (shm) {
      pendShift += Number.parseInt(shm[1] ?? '0', 10) || 0
      continue
    }
    const cpm = raw.match(MARK_CAPO)
    if (cpm) {
      pendCapo = Math.max(0, Math.min(11, Number.parseInt(cpm[1] ?? '0', 10) || 0))
      pendCapoMap = cpm[2] !== '!'
      continue
    }
    const hid = raw.match(HIDDEN)
    if (hid) {
      const prev = lines[lines.length - 1]
      if (prev && prev.kind === 'hidden' && prev.li1 === li - 1) {
        prev.texts.push(hid[1] ?? '')
        prev.li1 = li
      } else lines.push({ kind: 'hidden', texts: [hid[1] ?? ''], li0: li, li1: li })
      continue
    }

    if (d) {
      const k = (d[1] ?? '').toLowerCase()
      const v = (d[2] ?? '').trim()
      if (k === 'soc' || k === 'start_of_chorus') {
        chorus = true
        socLi = li
        continue
      }
      if (k === 'eoc' || k === 'end_of_chorus') {
        // Where this chorus closes, so a block operation carries the envelope.
        if (socLi !== null) eocOf[socLi] = li
        chorus = false
        socLi = null
        continue
      }
      if (k === 'image' || k === 'img') {
        lines.push({ kind: 'image', src: v, li0: li, li1: li })
        continue
      }
      if (k === 'c' || k === 'comment') {
        const inner = v.match(/^\((.*)\)$/)
        lines.push({ kind: 'comment', text: (inner?.[1] ?? v).trim(), li0: li, li1: li })
        continue
      }
      if (k === 'title' || k === 't') meta.title = v
      else if (k === 'subtitle' || k === 'st') meta.subtitle = v
      else if (k === 'artist' || k === 'composer') meta.artist = v
      else if (k === 'key') meta.key = v
      else if (k === 'tempo') meta.tempo = /^\d+$/.test(v) ? Number(v) : v
      else if (k === 'time') meta.time = v
      else if (k === 'duration') meta.duration = v
      else if (k === 'capo') meta.capo = Number(v) || 0
      else if (k === 'transpose') {
        // A later `{transpose:0}` or empty `{transpose:}` clears the earlier offset.
        const n = Number(v)
        if (n === 0) meta.transpose = 0
        else if (Number.isFinite(n)) meta.transpose = n
      }
      continue
    }

    if (!raw.trim()) {
      lines.push({ kind: 'empty', li0: li, li1: li })
      continue
    }

    lines.push({
      kind: 'lyrics',
      inChorus: chorus,
      soc: socLi,
      words: splitLyricLine(raw),
      plain: raw.replace(/\[[^\]]*\]/g, ''),
      shift: pendShift,
      blockCapo: pendCapo,
      blockCapoMap: pendCapoMap,
      li0: li,
      li1: li,
    })
    pendShift = 0
    pendCapo = null
    pendCapoMap = true
  }

  return { meta, lines, eocOf }
}

function toSections(raw: RawLine[]): ChordProSection[] {
  const sections: ChordProSection[] = []
  let current: ChordProSection | null = null

  const flush = () => {
    if (current) sections.push(current)
    current = null
  }
  const solo = (kind: SectionKind, line: ChordProLine, label?: string) => {
    flush()
    sections.push({ kind, label, lines: [line] })
  }

  for (const line of raw) {
    const span = { li0: line.li0, li1: line.li1 }
    if (line.kind === 'comment') {
      solo('comment', { type: 'comment', text: line.text, ...span })
      continue
    }
    if (line.kind === 'tab') {
      solo('tab', { type: 'tab', text: line.text, ...span })
      continue
    }
    if (line.kind === 'score') {
      solo('generic', { type: 'score', text: line.text, ...span }, 'score')
      continue
    }
    if (line.kind === 'image') {
      solo('generic', { type: 'image', src: line.src, ...span }, 'image')
      continue
    }
    if (line.kind === 'hidden') {
      solo('generic', { type: 'hidden', texts: line.texts, ...span }, 'hidden')
      continue
    }
    if (line.kind === 'empty') {
      if (current) current.lines.push({ type: 'empty', ...span })
      else sections.push({ kind: 'generic', lines: [{ type: 'empty', ...span }] })
      continue
    }
    const kind: SectionKind = line.inChorus ? 'chorus' : 'verse'
    if (current && current.kind !== kind) flush()
    const cur: ChordProSection = current ?? { kind, lines: [] }
    current = cur
    cur.lines.push({
      type: 'lyrics',
      words: line.words,
      soc: line.soc,
      shift: line.shift,
      blockCapo: line.blockCapo,
      blockCapoMap: line.blockCapoMap,
      ...span,
    })
  }
  flush()
  return sections
}

function applyShape(view: ChordProView, semis: number): ChordProView {
  if (!semis) {
    return { ...view, transposeSemitones: 0, displayKey: view.meta.key ?? null }
  }
  const flats = usesFlats(view.meta.key)
  const sections = view.sections.map((sec) => ({
    ...sec,
    lines: sec.lines.map((line): ChordProLine => {
      if (line.type === 'lyrics') {
        return {
          ...line,
          words: line.words.map((w) => ({
            lyric: w.lyric,
            chord: w.chord ? transposeToken(w.chord, semis, flats) : undefined,
          })),
        }
      }
      if (line.type === 'comment') {
        return { ...line, text: transposeTextChords(line.text, semis, flats) }
      }
      return line
    }),
  }))
  const displayKey = view.meta.key ? transposeToken(view.meta.key, semis, flats) : null
  return { ...view, sections, transposeSemitones: semis, displayKey }
}

/**
 * Charts arrive from Windows editors and cloud drives with CRLF endings. A
 * trailing `\r` is invisible on screen but real to every regex — `.` never
 * matches it — so line endings are normalised once, here, and `view.source`
 * is the normalised text every line index refers to.
 */
function normalizeEol(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

/**
 * The text every line index in a parsed view refers to. A host source may be
 * CRLF, or OnSong that gets rewritten on the way in; anything that anchors on
 * line numbers — the editor, a personal overlay — has to work in this space.
 */
export function normalizeSource(source: string): string {
  const text = normalizeEol(source ?? '')
  return looksLikeOnSong(text) ? normalizeOnSong(text) : text
}

export type ParseOpts = {
  /** Named chart inside an N>1 envelope. Absent → file default / implicit `default`. */
  chartId?: string
}

export function parse(source: string, opts?: ParseOpts): ChordProView {
  const text = normalizeEol(source ?? '')
  const sliced = chartDocument(text, opts?.chartId)
  const normalized = looksLikeOnSong(sliced) ? normalizeOnSong(sliced) : sliced
  const { meta, lines, eocOf } = parseRaw(normalized)
  return {
    meta,
    displayKey: meta.key ?? null,
    transposeSemitones: 0,
    source: normalized,
    sections: toSections(lines),
    eocOf,
  }
}

export function transpose(view: ChordProView, semitones: number): ChordProView {
  return applyShape(parse(view.source), semitones)
}

export function setKey(view: ChordProView, targetKey: string): ChordProView {
  const from = view.meta.key
  if (!from) throw new Error('setKey requires a source key')
  return transpose(view, semitoneDelta(from, targetKey))
}
