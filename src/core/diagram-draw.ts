/**
 * Core draw model for chord diagrams.
 * Guitar and ukulele share one neck: equal strings, thin gray frets,
 * a nut that ends on the outer strings, a wider black capo labeled CAPO n,
 * and a filled circle on every string that sounds (cipher note + degree).
 * Piano lights concert keys and ignores the capo.
 */

import type { DiagramInstrument, DiagramVoicing, PianoTone } from './resolve-diagram'
import { parseChordToken } from './parse-chord'
import { pianoDegreeFor } from './piano-voicing'
import { keyIndex } from './transpose'

export type FretDot = {
  string: number
  /** Absolute fret from the nut (open-at-capo sits on `capoFret`). */
  fret: number
  /** Fret in the hand shape (0 = open). */
  relativeFret: number
  finger?: number
}

export type FretDraw = {
  kind: 'frets'
  instrument: 'guitar' | 'ukulele'
  strings: 6 | 4
  tuning: 'EADGBE' | 'GCEA'
  capoFret: number
  capoLabel: string | null
  hasCapoBar: boolean
  mutes: number[]
  opens: number[]
  /** Strings that ring at the nut — empty when a capo is on. */
  nutOpens: number[]
  dots: FretDot[]
  fingersRendered: boolean
  svg: string
}

export type PianoDraw = {
  kind: 'piano'
  capoFret: number
  capoLabel: null
  hasCapoBar: false
  /** Pitch classes 0–11 that light (concert). */
  lit: number[]
  litNotes: string[]
  svg: string
}

export type DiagramDraw = FretDraw | PianoDraw

export type DrawDiagramOpts = {
  instrument: DiagramInstrument
  voicing: DiagramVoicing
  capoFret?: number
  /** Concert token — piano uses this so capo never shifts the keys. */
  token?: string
}

const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const DEGREE = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', '#5', '6', 'b7', '7'] as const
/** String 0 is the left side: guitar low E, ukulele G. */
const OPEN_PC = {
  guitar: [4, 9, 2, 7, 11, 4],
  ukulele: [7, 0, 4, 9],
} as const

/** Neck window. A fret of 10000 or hundreds of nines must not draw a line each. */
const FRET_LINE_CAP = 24

export const DIAGRAM_GEOMETRY = {
  padX: 36,
  padY: 40,
  fretH: 40,
  stringGap: 28,
  dotR: 10,
  nutH: 4,
  fretBarH: 2,
  capoH: 8,
  capoOver: 10,
  stringW: 1.25,
  ink: 'currentColor',
  fret: 'currentColor',
  paper: 'var(--canvas)',
} as const

const G = DIAGRAM_GEOMETRY

function fingerOf(slot: number | 'x' | undefined): number | undefined {
  if (typeof slot !== 'number') return undefined
  if (slot < 1 || slot > 4) return undefined
  return slot
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function drawFrets(
  instrument: 'guitar' | 'ukulele',
  voicing: DiagramVoicing,
  capoFret: number,
  token: string | undefined,
): FretDraw {
  const strings = instrument === 'guitar' ? 6 : 4
  const tuning = instrument === 'guitar' ? 'EADGBE' : 'GCEA'
  const frets = voicing.frets ?? []
  const fingers = voicing.fingers
  const base = Math.max(1, voicing.baseFret ?? 1)
  const mutes: number[] = []
  const opens: number[] = []
  const nutOpens: number[] = []
  const dots: FretDot[] = []

  for (let s = 0; s < strings; s++) {
    const slot = frets[s]
    if (slot === 'x' || slot === undefined) {
      mutes.push(s)
      continue
    }
    if (slot === 0) {
      // Open at a capo past the cap is not an open string at the nut.
      if (capoFret > FRET_LINE_CAP) {
        mutes.push(s)
        continue
      }
      opens.push(s)
      if (capoFret <= 0) nutOpens.push(s)
      continue
    }
    const relativeFret = slot
    const fret = capoFret + (base - 1) + relativeFret
    // Above the cap: mute. Not a blank string, and not a dot on fret 24.
    if (!fretOnNeck(fret)) {
      mutes.push(s)
      continue
    }
    const finger = fingerOf(fingers?.[s])
    const dot: FretDot = { string: s, fret, relativeFret }
    if (finger != null) dot.finger = finger
    dots.push(dot)
  }

  const drawnDots = dots.filter((dot) => fretOnNeck(dot.fret))
  const hasCapoBar = fretOnNeck(capoFret)
  const capoLabel = hasCapoBar ? `CAPO ${capoFret}` : null
  const fingersRendered = drawnDots.some((dot) => dot.finger != null)
  const svg = fretSvg({
    strings,
    tuning,
    capoFret: hasCapoBar ? capoFret : 0,
    capoLabel,
    mutes,
    opens,
    dots: drawnDots,
    token,
    bassIgnored: voicing.bassIgnored,
  })

  return {
    kind: 'frets',
    instrument,
    strings,
    tuning,
    capoFret,
    capoLabel,
    hasCapoBar,
    mutes,
    opens,
    nutOpens,
    dots: drawnDots,
    fingersRendered,
    svg,
  }
}

/** Fret that has a line on the neck. Above the cap is not drawable. */
function fretOnNeck(fret: number): boolean {
  return Number.isFinite(fret) && fret >= 1 && fret <= FRET_LINE_CAP
}

/** Highest fret line to paint. Frets above the cap do not extend the neck. */
function fretSpan(capoFret: number, dots: readonly FretDot[]): number {
  let max = 4
  if (fretOnNeck(capoFret) && capoFret > max) max = capoFret
  for (let i = 0; i < dots.length; i++) {
    const fret = dots[i]?.fret ?? 0
    if (fretOnNeck(fret) && fret > max) max = fret
  }
  return max
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12
}

function fretSvg(opts: {
  strings: number
  tuning: 'EADGBE' | 'GCEA'
  capoFret: number
  capoLabel: string | null
  mutes: number[]
  opens: number[]
  dots: FretDot[]
  token: string | undefined
  bassIgnored?: string
}): string {
  const { strings, tuning, capoFret, capoLabel, mutes, opens, dots, token, bassIgnored } = opts
  const span = fretSpan(capoFret, dots)
  const openPc = tuning === 'EADGBE' ? OPEN_PC.guitar : OPEN_PC.ukulele
  const root = pianoRootPc(token)
  const degreeRoot = root == null ? null : mod12(root + capoFret)
  const xOf = (s: number) => G.padX + s * G.stringGap
  const yOf = (fret: number) => G.padY + fret * G.fretH
  const spanX = (strings - 1) * G.stringGap
  const width = G.padX + spanX + G.padX + 56
  const caption = bassIgnored ? `baixo em ${bassIgnored} ignorado` : ''
  const height = G.padY + span * G.fretH + 16 + (caption ? 22 : 0)
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
  ]
  const muteSet = new Set(mutes)
  for (let s = 0; s < strings; s++) {
    const fade = muteSet.has(s) ? ' opacity="0.28"' : ''
    parts.push(
      `<line class="diagram-string" data-string="${s}" x1="${xOf(s)}" y1="${yOf(0)}" x2="${xOf(s)}" y2="${yOf(span)}" stroke="${G.ink}" stroke-width="${G.stringW}"${fade}/>`,
    )
  }
  for (let f = 1; f <= span; f++) {
    const y = yOf(f) - G.fretBarH / 2
    parts.push(
      `<rect class="diagram-fret" x="${xOf(0)}" y="${y}" width="${spanX}" height="${G.fretBarH}" rx="1" fill="${G.fret}" opacity="0.72"/>`,
    )
  }
  parts.push(
    `<rect class="diagram-nut" x="${xOf(0)}" y="${yOf(0) - G.nutH / 2}" width="${spanX}" height="${G.nutH}" rx="1" fill="${G.ink}"/>`,
  )
  if (capoFret > 0 && capoLabel && fretOnNeck(capoFret) && capoFret <= span) {
    const center = yOf(capoFret) - G.fretH / 2
    const y = center - G.capoH / 2
    parts.push(
      `<rect class="diagram-capo-bar" x="${xOf(0) - G.capoOver}" y="${y}" width="${spanX + G.capoOver * 2}" height="${G.capoH}" rx="2" fill="${G.ink}"/>`,
    )
    parts.push(
      `<text class="diagram-capo-label" x="${xOf(strings - 1) + G.capoOver + 8}" y="${center + 3}" font-size="7" font-weight="500" fill="var(--muted)">${escapeXml(capoLabel)}</text>`,
    )
  }
  const fingerFrets = new Set<number>()
  for (const dot of dots) {
    if (!fretOnNeck(dot.fret) || dot.fret > span) continue
    if (capoFret > 0 && dot.fret === capoFret) continue
    fingerFrets.add(dot.fret)
  }
  const labelX = xOf(strings - 1) + G.capoOver + 8
  for (const fret of [...fingerFrets].sort((a, b) => a - b)) {
    const center = yOf(fret) - G.fretH / 2
    parts.push(
      `<text class="diagram-fret-no" data-fret="${fret}" x="${labelX}" y="${center + 3}" font-size="7" font-weight="500" fill="var(--muted)">${fret}</text>`,
    )
  }
  for (const s of mutes) {
    parts.push(
      `<text class="diagram-mute" data-string="${s}" x="${xOf(s)}" y="${yOf(0) - 14}" text-anchor="middle" font-size="11" fill="${G.ink}" opacity="0.4">×</text>`,
    )
  }
  const paint = (s: number, cy: number, absoluteFret: number) => {
    const pc = mod12((openPc[s] ?? 0) + absoluteFret)
    const note = NOTE[pc] ?? 'C'
    const degree = degreeRoot == null ? null : DEGREE[mod12(pc - degreeRoot)]
    const x = xOf(s)
    const degreeAttr = degree ? ` data-degree="${degree}"` : ''
    parts.push(
      `<circle class="diagram-dot" data-string="${s}" data-fret="${absoluteFret}" data-note="${note}"${degreeAttr} cx="${x}" cy="${cy}" r="${G.dotR}" fill="${G.ink}"/>`,
    )
    parts.push(
      `<text class="diagram-dot-note" x="${x}" y="${cy + 1}" text-anchor="middle" font-size="8" font-weight="650" fill="${G.paper}">${note}</text>`,
    )
    if (degree) {
      parts.push(
        `<text class="diagram-degree" x="${x}" y="${cy + 8}" text-anchor="middle" font-size="6" fill="${G.paper}" opacity="0.72">${degree}</text>`,
      )
    }
  }
  for (const s of opens) {
    if (capoFret > 0 && fretOnNeck(capoFret) && capoFret <= span) {
      paint(s, yOf(capoFret) - G.fretH / 2, capoFret)
    } else if (capoFret <= 0) {
      paint(s, yOf(0) - G.dotR - 8, 0)
    }
  }
  for (const dot of dots) {
    if (!fretOnNeck(dot.fret) || dot.fret > span) continue
    paint(dot.string, yOf(dot.fret) - G.fretH / 2, dot.fret)
  }
  if (caption) {
    parts.push(
      `<text class="diagram-bass-ignored" x="${width / 2}" y="${height - 6}" text-anchor="middle" font-size="11" fill="var(--muted)">${escapeXml(caption)}</text>`,
    )
  }
  parts.push('</svg>')
  return parts.join('')
}

function pianoRootPc(token: string | undefined): number | null {
  if (!token) return null
  const parsed = parseChordToken(token)
  if (parsed.class === 'parse') return keyIndex(parsed.root)
  // `Caug` does not parse, but the leading note still roots a {define}.
  // A bare `+` (`C+`) does not.
  if (token.includes('+')) return null
  return keyIndex(token)
}

const WHITE_W = 18
const WHITE_H = 72
const BLACK_W = 12
const BLACK_H = 44
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11]
/** Unlit accidental. Lit keys overlay `var(--chord)` on the key’s own paper. */
const PIANO_BLACK_FILL = '#141820'
/** Chord over the light white key — a lighter wash of the theme colour. */
const PIANO_WHITE_LIT_OPACITY = 0.5
/** Chord over the black key — a darker wash of the same colour. */
const PIANO_BLACK_LIT_OPACITY = 0.22
/** Degree label. The accidental size is the source; white keys match it. */
const PIANO_DEGREE_SIZE = 8

function isWhitePc(pc: number): boolean {
  return WHITE_PCS.includes(pc)
}

function whiteOrdinal(midi: number): number {
  const pc = mod12(midi)
  const oct = Math.floor(midi / 12)
  const at = WHITE_PCS.indexOf(pc)
  if (at >= 0) return oct * 7 + at
  return whiteOrdinal(midi - 1)
}

function drawPiano(voicing: DiagramVoicing, token: string | undefined): PianoDraw {
  const tones = voicing.pianoTones
  if (tones?.length) return drawPianoTones(tones)
  const root = pianoRootPc(token)
  const rel = voicing.keys ?? []
  const lit = root == null ? [] : rel.map((k) => mod12(root + k))
  const litNotes = lit.map((pc) => NOTE[pc] ?? 'C')
  const degrees = new Map<number, string>()
  if (root != null) {
    for (const k of rel) {
      const pc = mod12(root + k)
      if (!degrees.has(pc) || k >= 12) degrees.set(pc, pianoDegreeFor(k))
    }
  }
  const svg = pianoOctaveSvg(new Set(lit), degrees)
  return pianoDraw(lit, litNotes, svg)
}

function pianoDraw(lit: number[], litNotes: string[], svg: string): PianoDraw {
  return {
    kind: 'piano',
    capoFret: 0,
    capoLabel: null,
    hasCapoBar: false,
    lit,
    litNotes,
    svg,
  }
}

function degreeText(
  x: number,
  y: number,
  size: number,
  degree: string,
  midi: number,
  pc: number,
  ink: string,
): string {
  return `<text class="diagram-piano-degree" data-midi="${midi}" data-pc="${pc}" data-degree="${escapeXml(degree)}" x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="650" fill="${ink}">${escapeXml(degree)}</text>`
}

function midiAttr(midi: number | undefined): string {
  return midi == null ? '' : ` data-midi="${midi}"`
}

function whiteKeySvg(opts: {
  pc: number
  midi?: number
  x: number
  on: boolean
  lowest: boolean
}): string {
  const midi = midiAttr(opts.midi)
  const lowest = opts.lowest ? ' data-lowest="true"' : ''
  const base = `<rect class="diagram-piano-white" data-pc="${opts.pc}"${midi}${lowest} x="${opts.x}" y="0" width="${WHITE_W}" height="${WHITE_H}" fill="var(--beat-rest)" stroke="var(--muted)"/>`
  if (!opts.on) return base
  return `${base}<rect class="diagram-piano-white-on" data-pc="${opts.pc}"${midi} x="${opts.x}" y="0" width="${WHITE_W}" height="${WHITE_H}" fill="var(--chord)" fill-opacity="${PIANO_WHITE_LIT_OPACITY}" stroke="var(--muted)"/>`
}

function blackKeySvg(opts: {
  pc: number
  midi?: number
  x: number
  on: boolean
  lowest: boolean
}): string {
  const midi = midiAttr(opts.midi)
  const lowest = opts.lowest ? ' data-lowest="true"' : ''
  const base = `<rect class="diagram-piano-black" data-pc="${opts.pc}"${midi}${lowest} x="${opts.x}" y="0" width="${BLACK_W}" height="${BLACK_H}" fill="${PIANO_BLACK_FILL}"/>`
  if (!opts.on) return base
  return `${base}<rect class="diagram-piano-black-on" data-pc="${opts.pc}"${midi} x="${opts.x}" y="0" width="${BLACK_W}" height="${BLACK_H}" fill="var(--chord)" fill-opacity="${PIANO_BLACK_LIT_OPACITY}"/>`
}

/** One C-to-B octave. Used when a `{define}` names keys and not a close voicing. */
function pianoOctaveSvg(lit: Set<number>, degrees: Map<number, string>): string {
  const whites = WHITE_PCS
  const blacks = [1, 3, 6, 8, 10]
  const width = whites.length * WHITE_W
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${WHITE_H}" width="${width}" height="${WHITE_H}">`,
  ]
  whites.forEach((pc, i) => {
    const x = i * WHITE_W
    parts.push(whiteKeySvg({ pc, x, on: lit.has(pc), lowest: false }))
    const degree = degrees.get(pc)
    if (degree) parts.push(degreeText(x + WHITE_W / 2, WHITE_H - 8, PIANO_DEGREE_SIZE, degree, pc, pc, 'var(--beat-rest-ink)'))
  })
  const blackX: Record<number, number> = { 1: 12, 3: 30, 6: 66, 8: 84, 10: 102 }
  for (const pc of blacks) {
    const x = blackX[pc] ?? 0
    parts.push(blackKeySvg({ pc, x, on: lit.has(pc), lowest: false }))
    const degree = degrees.get(pc)
    if (degree) parts.push(degreeText(x + BLACK_W / 2, BLACK_H - 8, PIANO_DEGREE_SIZE, degree, pc, pc, 'var(--beat-rest)'))
  }
  parts.push('</svg>')
  return parts.join('')
}

/** C, F, or B. Those are the only whites that start a 2+3 or 3+2 black-key run. */
function snapWhiteToLegal(midi: number, dir: 1 | -1): number {
  let w = midi
  while (!isWhitePc(mod12(w))) w += dir
  while (mod12(w) !== 0 && mod12(w) !== 5 && mod12(w) !== 11) w += dir
  return w
}

/**
 * A real piano slice: starts and ends on C, F, or B so the black keys
 * stay in groups of 2 and 3. The bass is the lowest *sounding* note;
 * an unlit white may sit to its left so F# is not torn off the F# G# A# group.
 */
function drawPianoTones(tones: readonly PianoTone[]): PianoDraw {
  const ordered = [...tones].sort((a, b) => a.midi - b.midi)
  const low = ordered[0]?.midi ?? 60
  const high = ordered[ordered.length - 1]?.midi ?? low
  const litMidi = new Set(ordered.map((tone) => tone.midi))
  const degreeAt = new Map(ordered.map((tone) => [tone.midi, tone.degree]))
  const firstWhite = snapWhiteToLegal(low, -1)
  let lastWhite = snapWhiteToLegal(high, 1)
  const octave = firstWhite + 12
  if (lastWhite < octave) lastWhite = octave
  const origin = whiteOrdinal(firstWhite)
  const whites: number[] = []
  for (let midi = firstWhite; midi <= lastWhite; midi++) {
    if (isWhitePc(mod12(midi))) whites.push(midi)
  }
  let width = whites.length * WHITE_W
  const blackX = (midi: number) => (whiteOrdinal(midi - 1) - origin) * WHITE_W + WHITE_W - BLACK_W / 2
  const blacks: number[] = []
  for (let midi = firstWhite + 1; midi < lastWhite; midi++) {
    if (isWhitePc(mod12(midi))) continue
    blacks.push(midi)
    const right = blackX(midi) + BLACK_W
    if (right > width) width = right
  }
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${WHITE_H}" width="${width}" height="${WHITE_H}">`,
  ]
  for (const midi of whites) {
    const pc = mod12(midi)
    const on = litMidi.has(midi)
    const x = (whiteOrdinal(midi) - origin) * WHITE_W
    parts.push(whiteKeySvg({ pc, midi, x, on, lowest: midi === low }))
    const degree = degreeAt.get(midi)
    if (degree) parts.push(degreeText(x + WHITE_W / 2, WHITE_H - 8, PIANO_DEGREE_SIZE, degree, midi, pc, 'var(--beat-rest-ink)'))
  }
  for (const midi of blacks) {
    const pc = mod12(midi)
    const on = litMidi.has(midi)
    const x = blackX(midi)
    parts.push(blackKeySvg({ pc, midi, x, on, lowest: midi === low }))
    const degree = degreeAt.get(midi)
    if (degree) parts.push(degreeText(x + BLACK_W / 2, BLACK_H - 8, PIANO_DEGREE_SIZE, degree, midi, pc, 'var(--beat-rest)'))
  }
  parts.push('</svg>')
  const lit = ordered.map((tone) => mod12(tone.midi))
  const litNotes = lit.map((pc) => NOTE[pc] ?? 'C')
  return pianoDraw(lit, litNotes, parts.join(''))
}

export function drawDiagram(opts: DrawDiagramOpts): DiagramDraw {
  const rawCapo = opts.capoFret ?? 0
  const capoFret = Number.isFinite(rawCapo) && rawCapo > 0 ? rawCapo : 0
  if (opts.instrument === 'piano') return drawPiano(opts.voicing, opts.token)
  return drawFrets(opts.instrument, opts.voicing, capoFret, opts.token)
}
