/**
 * Core draw model for chord diagrams.
 * Guitar and ukulele share one neck: equal strings, thin gray frets,
 * a nut that ends on the outer strings, a wider black capo labeled CAPO n,
 * and a filled circle on every string that sounds (cipher note + degree).
 * Piano lights concert keys and ignores the capo.
 */

import type { DiagramInstrument, DiagramVoicing } from './resolve-diagram'
import { parseChordToken } from './parse-chord'
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

function drawPiano(voicing: DiagramVoicing, token: string | undefined): PianoDraw {
  const root = pianoRootPc(token)
  const rel = voicing.keys ?? []
  const lit = root == null ? [] : rel.map((k) => (((root + k) % 12) + 12) % 12)
  const litNotes = lit.map((pc) => NOTE[pc] ?? 'C')
  const litSet = new Set(lit)
  const svg = pianoSvg(litSet)
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

function pianoSvg(lit: Set<number>): string {
  const whites = [0, 2, 4, 5, 7, 9, 11]
  const blacks = [1, 3, 6, 8, 10]
  const w = 18
  const h = 72
  const width = whites.length * w
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}">`,
  ]
  whites.forEach((pc, i) => {
    const fill = lit.has(pc) ? 'var(--chord)' : 'var(--beat-rest)'
    parts.push(
      `<rect class="diagram-piano-white" data-pc="${pc}" x="${i * w}" y="0" width="${w}" height="${h}" fill="${fill}" stroke="var(--muted)"/>`,
    )
  })
  const blackX: Record<number, number> = { 1: 12, 3: 30, 6: 66, 8: 84, 10: 102 }
  for (const pc of blacks) {
    const fill = lit.has(pc) ? 'var(--chord)' : '#141820'
    parts.push(
      `<rect class="diagram-piano-black" data-pc="${pc}" x="${blackX[pc]}" y="0" width="12" height="44" fill="${fill}"/>`,
    )
  }
  parts.push('</svg>')
  return parts.join('')
}

export function drawDiagram(opts: DrawDiagramOpts): DiagramDraw {
  const rawCapo = opts.capoFret ?? 0
  const capoFret = Number.isFinite(rawCapo) && rawCapo > 0 ? rawCapo : 0
  if (opts.instrument === 'piano') return drawPiano(opts.voicing, opts.token)
  return drawFrets(opts.instrument, opts.voicing, capoFret, opts.token)
}
