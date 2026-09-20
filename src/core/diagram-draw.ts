/**
 * Core draw model for chord diagrams. Look is F3 — this ships geometry:
 * capo bar + Capo n, opens at the capo, piano concert keys, fingers 1–4.
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
  let fingersRendered = false

  for (let s = 0; s < strings; s++) {
    const slot = frets[s]
    if (slot === 'x' || slot === undefined) {
      mutes.push(s)
      continue
    }
    if (slot === 0) {
      opens.push(s)
      if (capoFret <= 0) nutOpens.push(s)
      continue
    }
    const relativeFret = slot
    const fret = capoFret + (base - 1) + relativeFret
    const finger = fingerOf(fingers?.[s])
    if (finger != null) fingersRendered = true
    const dot: FretDot = { string: s, fret, relativeFret }
    if (finger != null) dot.finger = finger
    dots.push(dot)
  }

  const hasCapoBar = capoFret > 0
  const capoLabel = hasCapoBar ? `Capo ${capoFret}` : null
  const svg = fretSvg({
    strings,
    capoFret,
    capoLabel,
    mutes,
    opens,
    dots,
    fingersRendered,
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
    dots,
    fingersRendered,
    svg,
  }
}

function fretSvg(opts: {
  strings: number
  capoFret: number
  capoLabel: string | null
  mutes: number[]
  opens: number[]
  dots: FretDot[]
  fingersRendered: boolean
}): string {
  const { strings, capoFret, capoLabel, mutes, opens, dots, fingersRendered } = opts
  const padX = 24
  const padY = 28
  const fretH = 18
  const maxRel = Math.max(4, ...dots.map((d) => d.relativeFret), capoFret)
  const width = padX * 2 + (strings - 1) * 16
  const height = padY + maxRel * fretH + 28
  const xOf = (s: number) => padX + s * 16
  const yOf = (fret: number) => padY + fret * fretH
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
  ]
  parts.push(
    `<rect class="diagram-nut" x="${xOf(0) - 1}" y="${yOf(0) - 2}" width="${(strings - 1) * 16 + 2}" height="3" fill="currentColor"/>`,
  )
  for (let s = 0; s < strings; s++) {
    parts.push(
      `<line class="diagram-string" x1="${xOf(s)}" y1="${yOf(0)}" x2="${xOf(s)}" y2="${yOf(maxRel)}" stroke="currentColor" stroke-width="1"/>`,
    )
  }
  for (let f = 1; f <= maxRel; f++) {
    parts.push(
      `<line class="diagram-fret" x1="${xOf(0)}" y1="${yOf(f)}" x2="${xOf(strings - 1)}" y2="${yOf(f)}" stroke="currentColor" stroke-width="1"/>`,
    )
  }
  if (capoFret > 0 && capoLabel) {
    const y = yOf(capoFret)
    parts.push(
      `<rect class="diagram-capo-bar" x="${xOf(0) - 4}" y="${y - 4}" width="${(strings - 1) * 16 + 8}" height="8" rx="2" fill="currentColor"/>`,
    )
    parts.push(
      `<text class="diagram-capo-label" x="${width / 2}" y="${height - 6}" text-anchor="middle" font-size="11">${escapeXml(capoLabel)}</text>`,
    )
  }
  const muteSet = new Set(mutes)
  const openSet = new Set(opens)
  for (let s = 0; s < strings; s++) {
    const x = xOf(s)
    if (muteSet.has(s)) {
      parts.push(`<text class="diagram-mute" x="${x}" y="${padY - 10}" text-anchor="middle" font-size="11">x</text>`)
    } else if (openSet.has(s)) {
      const y = capoFret > 0 ? yOf(capoFret) : padY - 12
      parts.push(
        `<circle class="diagram-open" cx="${x}" cy="${y}" r="4" fill="none" stroke="currentColor" stroke-width="1"/>`,
      )
    }
  }
  for (const dot of dots) {
    const x = xOf(dot.string)
    const y = yOf(dot.fret) - fretH / 2
    parts.push(`<circle class="diagram-dot" cx="${x}" cy="${y}" r="6" fill="currentColor"/>`)
    if (fingersRendered && dot.finger != null) {
      parts.push(
        `<text class="diagram-finger" x="${x}" y="${y + 3}" text-anchor="middle" font-size="9" fill="#fff">${dot.finger}</text>`,
      )
    }
  }
  parts.push('</svg>')
  return parts.join('')
}

function pianoRootPc(token: string | undefined): number {
  if (!token) return 0
  const parsed = parseChordToken(token)
  if (parsed.class !== 'parse') return 0
  return keyIndex(parsed.root) ?? 0
}

function drawPiano(voicing: DiagramVoicing, token: string | undefined, capoFret: number): PianoDraw {
  const root = pianoRootPc(token)
  const rel = voicing.keys ?? []
  const lit = rel.map((k) => (((root + k) % 12) + 12) % 12)
  const litNotes = lit.map((pc) => NOTE[pc] ?? 'C')
  const litSet = new Set(lit)
  const svg = pianoSvg(litSet)
  return {
    kind: 'piano',
    capoFret,
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
    const fill = lit.has(pc) ? '#333' : '#fff'
    parts.push(
      `<rect class="diagram-piano-white" data-pc="${pc}" x="${i * w}" y="0" width="${w}" height="${h}" fill="${fill}" stroke="#111"/>`,
    )
  })
  const blackX: Record<number, number> = { 1: 12, 3: 30, 6: 66, 8: 84, 10: 102 }
  for (const pc of blacks) {
    const fill = lit.has(pc) ? '#9cf' : '#111'
    parts.push(
      `<rect class="diagram-piano-black" data-pc="${pc}" x="${blackX[pc]}" y="0" width="12" height="44" fill="${fill}"/>`,
    )
  }
  parts.push('</svg>')
  return parts.join('')
}

export function drawDiagram(opts: DrawDiagramOpts): DiagramDraw {
  const capoFret = Math.max(0, opts.capoFret ?? 0)
  if (opts.instrument === 'piano') return drawPiano(opts.voicing, opts.token, capoFret)
  return drawFrets(opts.instrument, opts.voicing, capoFret)
}
