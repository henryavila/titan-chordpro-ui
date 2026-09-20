import { jsPDF } from 'jspdf'
import { layoutChartFull } from '../core/layout'
import { readingWords, type ReadingWord } from '../core/reading-words'
import { accentVars, type AccentProp } from '../core/themes'
import { transposeToken, usesFlats } from '../core/transpose'
import type { CapoLegend, ChartRow, ChordProView } from '../core/types'
import { MONO, registerPdfFonts, SANS } from './fonts'

export type PdfOptions = {
  title?: string
  personal?: boolean
  /** Host chord colour. Paper uses the light swatch — print is a light page. */
  accent?: AccentProp
}

type RGB = readonly [number, number, number]

type Ink = {
  text: RGB
  lyric: RGB
  muted: RGB
  line: RGB
  chord: RGB
  capo: RGB
  wash: RGB
  washLine: RGB
  note: RGB
  white: RGB
}

const W = 595.28
const H = 841.89
const ML = 46
const MR = 46
const MB = 46
const INNER = W - ML - MR

function hexRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ]
}

function mixWhite(c: RGB, a: number): RGB {
  return [
    Math.round(255 * (1 - a) + c[0] * a),
    Math.round(255 * (1 - a) + c[1] * a),
    Math.round(255 * (1 - a) + c[2] * a),
  ]
}

/** Print is a light page, so the chord is the light (AA) swatch of the host accent. */
function paperInk(accent: AccentProp = 'verde'): Ink {
  const hex = accentVars(accent, 'light')['--cpv-chord'] ?? '#17713C'
  const chord = hexRgb(hex)
  return {
    text: [19, 22, 29],
    lyric: [43, 48, 59],
    muted: [91, 98, 112],
    line: [214, 217, 222],
    capo: [125, 132, 144],
    note: [246, 247, 249],
    white: [255, 255, 255],
    chord,
    wash: mixWhite(chord, 0.08),
    washLine: mixWhite(chord, 0.22),
  }
}

const CHORD_PT = 9.8
const LYRIC_PT = 11.1
const SHAPE_PT = 7.3
const CHORD_GAP = 5.6
const SHAPE_SLOT = 10
const CHORD_SLOT = 12.6
const LYRIC_SLOT = 14.6
const ROW_GAP = 5.2

type CellDraw = {
  x: number
  text: string
  chord: string
  shape: string
  hasChord: boolean
  hasShape: boolean
}

type SungLine = {
  cells: CellDraw[]
  h: number
  hasChord: boolean
  hasShape: boolean
  marks: boolean
}

function rgb(doc: jsPDF, c: RGB): void {
  doc.setTextColor(c[0], c[1], c[2])
}

function fill(doc: jsPDF, c: RGB): void {
  doc.setFillColor(c[0], c[1], c[2])
}

function stroke(doc: jsPDF, c: RGB, w = 0.6): void {
  doc.setDrawColor(c[0], c[1], c[2]).setLineWidth(w)
}

function face(doc: jsPDF, font: string, style: 'normal' | 'bold' | 'italic', size: number, color: RGB): void {
  doc.setFont(font, style).setFontSize(size)
  rgb(doc, color)
}

function widthOf(doc: jsPDF, font: string, style: 'normal' | 'bold', size: number, text: string): number {
  if (!text) return 0
  doc.setFont(font, style).setFontSize(size)
  return doc.getTextWidth(text)
}

function isMarkLine(plain: string): boolean {
  const t = plain.trim()
  if (!t) return false
  return /^[xX/\\|.%\-\s¨~'’]+$/.test(t) && /[xX/]/.test(t)
}

function lineHeight(hasChord: boolean, hasShape: boolean): number {
  let h = LYRIC_SLOT + ROW_GAP
  if (hasShape) h += SHAPE_SLOT
  if (hasChord) h += CHORD_SLOT
  return h
}

/**
 * Lyrics keep their natural width so a sentence stays readable. A chord
 * hangs over the letters that follow (it lives on the line above, so it
 * does not paint on them). The line only opens a gap when two chords
 * would otherwise collide.
 */
function layoutWord(
  doc: jsPDF,
  word: ReadingWord,
  marks: boolean,
  startX: number,
  incomingChordEnd: number,
): { cells: CellDraw[]; lyricEnd: number; chordEnd: number; hasChord: boolean; hasShape: boolean } {
  const lyricFont = marks ? MONO : SANS
  const lyricSize = marks ? 10 : LYRIC_PT
  let x = startX
  let chordEnd = incomingChordEnd
  const cells: CellDraw[] = []
  let hasChord = false
  let hasShape = false
  for (const c of word.cells) {
    const lyricW = widthOf(doc, lyricFont, 'normal', lyricSize, c.text)
    const chordW = c.hasChord ? widthOf(doc, MONO, 'bold', CHORD_PT, c.chord) : 0
    const shapeW = c.hasShape ? widthOf(doc, MONO, 'normal', SHAPE_PT, c.shape) : 0
    if ((c.hasChord || c.hasShape) && x < chordEnd) x = chordEnd
    cells.push({
      x,
      text: c.text,
      chord: c.chord,
      shape: c.shape,
      hasChord: c.hasChord,
      hasShape: c.hasShape,
    })
    if (c.hasChord) {
      hasChord = true
      chordEnd = Math.max(chordEnd, x + chordW + CHORD_GAP)
    }
    if (c.hasShape) {
      hasShape = true
      chordEnd = Math.max(chordEnd, x + shapeW + CHORD_GAP)
    }
    x += lyricW
  }
  const tailW = widthOf(doc, lyricFont, 'normal', lyricSize, word.tail)
  return { cells, lyricEnd: x + tailW, chordEnd, hasChord, hasShape }
}

function wrapRow(doc: jsPDF, row: ChartRow, width: number): SungLine[] {
  const marks = isMarkLine(row.plain)
  const words = readingWords(row.segs)
  const out: SungLine[] = []
  let cells: CellDraw[] = []
  let x = 0
  let chordEnd = 0
  let hasChord = false
  let hasShape = false

  const flush = () => {
    if (!cells.length) return
    out.push({ cells, h: lineHeight(hasChord, hasShape), hasChord, hasShape, marks })
    cells = []
    x = 0
    chordEnd = 0
    hasChord = false
    hasShape = false
  }

  for (const word of words) {
    const natural = layoutWord(doc, word, marks, 0, 0)
    if (x > 0 && x + natural.lyricEnd > width) flush()
    const laid = layoutWord(doc, word, marks, x, chordEnd)
    cells.push(...laid.cells)
    x = laid.lyricEnd
    chordEnd = laid.chordEnd
    if (laid.hasChord) hasChord = true
    if (laid.hasShape) hasShape = true
  }
  flush()
  return out
}

function wrapBlock(doc: jsPDF, rows: ChartRow[], width: number): SungLine[] {
  const lines: SungLine[] = []
  for (const row of rows) lines.push(...wrapRow(doc, row, width))
  return lines
}

function drawSungLine(doc: jsPDF, line: SungLine, x0: number, y: number, chorus: boolean, ink: Ink): void {
  let yChord = y
  let yLyric = y
  if (line.hasShape) {
    yChord = y + SHAPE_SLOT
    yLyric = yChord + (line.hasChord ? CHORD_SLOT : 0)
  } else if (line.hasChord) {
    yLyric = y + CHORD_SLOT
  }
  const lyricColor = chorus ? ink.text : ink.lyric
  for (const c of line.cells) {
    const x = x0 + c.x
    if (c.hasShape && c.shape) {
      face(doc, MONO, 'normal', SHAPE_PT, ink.capo)
      doc.text(c.shape, x, y + SHAPE_SLOT - 2)
    }
    if (c.hasChord && c.chord) {
      face(doc, MONO, 'bold', CHORD_PT, ink.chord)
      doc.text(c.chord, x, yChord + CHORD_SLOT - 3)
    }
    if (c.text) {
      if (line.marks) face(doc, MONO, 'normal', 10, ink.lyric)
      else face(doc, SANS, 'normal', LYRIC_PT, lyricColor)
      doc.text(c.text, x, yLyric + LYRIC_SLOT - 4)
    }
  }
}

function keyNoteOf(view: ChordProView): string {
  const meta = view.meta
  const flats = usesFlats(meta.key)
  if (view.displayKey) return `Tom ${view.displayKey}`
  if (meta.key) return `Tom ${transposeToken(meta.key, view.transposeSemitones, flats)}`
  return ''
}

function metaBits(view: ChordProView): string[] {
  const meta = view.meta
  const bits: string[] = []
  if (meta.tempo) bits.push(`${meta.tempo} BPM`)
  if (meta.time) bits.push(String(meta.time))
  if (meta.duration) bits.push(String(meta.duration).trim())
  return bits
}

function rounded(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, style: 'F' | 'S' | 'FD'): void {
  doc.roundedRect(x, y, w, h, r, r, style)
}

export async function renderPdf(view: ChordProView, opts: PdfOptions = {}): Promise<Uint8Array> {
  const meta = view.meta
  const { blocks, legend } = layoutChartFull(view, { capo: 0 })
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  registerPdfFonts(doc)
  const INK = paperInk(opts.accent)

  const title = opts.title ?? meta.title ?? 'Sem título'
  const sub = [meta.subtitle, meta.artist].filter(Boolean).join(' · ')
  const keyNote = keyNoteOf(view)
  const bits = metaBits(view)
  const personal = !!opts.personal

  doc.setProperties({
    title,
    subject: keyNote || 'Cifra',
    author: meta.artist || meta.subtitle || '',
    creator: '@henryavila/titan-chordpro-ui',
    keywords: personal ? 'versão pessoal' : 'cifra',
  })

  let y = 0
  let page = 0
  const R = W - MR

  const paintChrome = () => {
    fill(doc, INK.chord)
    doc.rect(0, 0, W, 3.2, 'F')
  }

  const contentTop = (first: boolean): number => {
    if (!first) {
      face(doc, SANS, 'normal', 8.5, INK.muted)
      doc.text(title, ML, 28)
      if (keyNote) {
        face(doc, MONO, 'bold', 8, INK.chord)
        doc.text(keyNote, R, 28, { align: 'right' })
      }
      stroke(doc, INK.line, 0.5)
      doc.line(ML, 36, R, 36)
      return 50
    }

    let top = 38
    const pill = keyNote
    let pillW = 0
    if (pill) {
      face(doc, MONO, 'bold', 8.2, INK.white)
      pillW = doc.getTextWidth(pill) + 16
    }
    const titleMax = INNER - (pillW ? pillW + 16 : 0)
    face(doc, SANS, 'bold', 20, INK.text)
    const titleLines = doc.splitTextToSize(title, titleMax) as string[]
    for (const line of titleLines) {
      doc.text(line, ML, top + 14)
      top += 22
    }
    if (pill) {
      const ph = 16
      const px = R - pillW
      const py = 32
      fill(doc, INK.chord)
      rounded(doc, px, py, pillW, ph, 4, 'F')
      face(doc, MONO, 'bold', 8.2, INK.white)
      doc.text(pill, px + 8, py + 11)
    }
    if (personal) {
      const label = 'versão pessoal'
      face(doc, SANS, 'bold', 7.2, INK.muted)
      const lw = doc.getTextWidth(label) + 12
      const px = R - lw
      const py = pill ? 52 : 32
      stroke(doc, INK.line, 0.7)
      rounded(doc, px, py, lw, 13, 3.5, 'S')
      doc.text(label, px + 6, py + 9.5)
      top = Math.max(top, py + 20)
    }
    if (sub) {
      face(doc, SANS, 'normal', 10, INK.muted)
      doc.text(sub, ML, top + 2)
      top += 16
    }
    if (bits.length) {
      face(doc, SANS, 'normal', 8.5, INK.muted)
      doc.text(bits.join('   ·   '), ML, top + 2)
      top += 14
    }
    top += 8
    stroke(doc, INK.line, 0.5)
    doc.line(ML, top, R, top)
    return top + 18
  }

  const nextPage = () => {
    if (page) doc.addPage()
    page++
    paintChrome()
    y = contentTop(page === 1)
  }

  const room = (h: number) => {
    if (y + h > H - MB) nextPage()
  }

  const drawLegend = (leg: CapoLegend) => {
    const h = 28
    room(h + 10)
    fill(doc, INK.note)
    stroke(doc, INK.line, 0.5)
    rounded(doc, ML, y, INNER, h, 7, 'FD')
    face(doc, MONO, 'bold', 11, INK.capo)
    doc.text(leg.shape, ML + 14, y + 18)
    face(doc, SANS, 'normal', 8, INK.muted)
    doc.text('forma', ML + 14 + widthOf(doc, MONO, 'bold', 11, leg.shape) + 8, y + 17)
    stroke(doc, INK.line, 0.5)
    const mid = ML + INNER * 0.42
    doc.line(mid, y + 7, mid, y + h - 7)
    face(doc, MONO, 'bold', 11, INK.chord)
    doc.text(leg.real, mid + 14, y + 18)
    face(doc, SANS, 'normal', 8, INK.muted)
    doc.text('soa', mid + 14 + widthOf(doc, MONO, 'bold', 11, leg.real) + 8, y + 17)
    y += h + 16
  }

  const drawComment = (text: string) => {
    room(20)
    const label = text.trim().toUpperCase()
    fill(doc, INK.chord)
    doc.circle(ML + 2.4, y - 1.6, 2.2, 'F')
    face(doc, SANS, 'bold', 8, INK.muted)
    doc.text(label, ML + 12, y, { charSpace: 0.55 })
    const tw = widthOf(doc, SANS, 'bold', 8, label) + label.length * 0.55
    stroke(doc, INK.line, 0.45)
    const x0 = ML + 12 + tw + 8
    if (x0 < R - 8) doc.line(x0, y - 2.4, R, y - 2.4)
    y += 16
  }

  const drawNote = (items: string[]) => {
    const body = items.join('\n')
    face(doc, MONO, 'normal', 9.4, INK.muted)
    const lines = doc.splitTextToSize(body, INNER - 28) as string[]
    const h = 28 + lines.length * 13
    room(h + 8)
    fill(doc, INK.note)
    stroke(doc, INK.line, 0.5)
    rounded(doc, ML, y, INNER, h, 8, 'FD')
    fill(doc, INK.chord)
    doc.rect(ML + 14, y + 12, 12, 1.4, 'F')
    face(doc, SANS, 'bold', 7.4, INK.muted)
    doc.text('EXECUÇÃO', ML + 30, y + 15, { charSpace: 0.7 })
    face(doc, MONO, 'normal', 9.4, INK.muted)
    doc.text(lines, ML + 14, y + 32)
    y += h + 14
  }

  const drawFigure = (kind: string, text: string) => {
    const raw = text.replace(/^\n+|\n+$/g, '').split('\n')
    const wide = raw.reduce((a, t) => Math.max(a, t.length), 0)
    let fs = 8.2
    if (wide > 0) fs = Math.max(5.6, Math.min(8.2, (INNER - 28) / (wide * 0.62)))
    const lh = fs * 1.28
    const h = 26 + raw.length * lh + 12
    if (y + h > H - MB && h <= H - 90) nextPage()
    room(Math.min(h, 40))
    const top = y
    fill(doc, INK.note)
    stroke(doc, INK.line, 0.5)
    rounded(doc, ML, top, INNER, h, 8, 'FD')
    face(doc, MONO, 'bold', 7.2, INK.chord)
    doc.text(kind, ML + 14, top + 16, { charSpace: 0.8 })
    face(doc, MONO, 'normal', fs, INK.text)
    let ty = top + 32
    for (const t of raw) {
      if (ty > H - MB - 8) {
        break
      }
      doc.text(t, ML + 14, ty)
      ty += lh
    }
    y = top + h + 14
  }

  const drawWash = (top: number, bottom: number) => {
    if (bottom <= top) return
    fill(doc, INK.wash)
    stroke(doc, INK.washLine, 0.6)
    rounded(doc, ML, top, INNER, bottom - top, 8, 'FD')
    stroke(doc, INK.chord, 2.4)
    doc.setLineCap('round')
    const barX = ML + 2.2
    const barTop = top + 10
    const barBot = bottom - 10
    if (barBot > barTop) doc.line(barX, barTop, barX, barBot)
    doc.setLineCap('butt')
  }

  const drawSung = (lines: SungLine[], chorus: boolean, x0: number) => {
    if (chorus) {
      let i = 0
      while (i < lines.length) {
        const padTop = 10
        const padBot = 10
        let avail = H - MB - y
        if (avail < lines[i]!.h + padTop + padBot) {
          nextPage()
          avail = H - MB - y
        }
        let n = 0
        let h = padTop + padBot
        while (i + n < lines.length) {
          const lh = lines[i + n]!.h
          if (h + lh > avail && n > 0) break
          h += lh
          n++
        }
        const top = y
        drawWash(top, top + h)
        let cy = top + padTop
        for (let k = 0; k < n; k++) {
          const line = lines[i + k]!
          drawSungLine(doc, line, x0, cy, true, INK)
          cy += line.h
        }
        y = top + h + 8
        i += n
      }
      y += 4
      return
    }
    for (const line of lines) {
      room(line.h)
      drawSungLine(doc, line, x0, y, false, INK)
      y += line.h
    }
    y += 8
  }

  const drawTag = (label: string) => {
    room(18)
    face(doc, SANS, 'bold', 7.2, INK.muted)
    const tw = doc.getTextWidth(label) + 12
    stroke(doc, INK.line, 0.6)
    fill(doc, INK.note)
    rounded(doc, ML, y - 8, tw, 14, 4, 'FD')
    doc.text(label, ML + 6, y + 2)
    y += 12
  }

  nextPage()
  if (legend) drawLegend(legend)

  for (const block of blocks) {
    if (block.kind === 'comment') {
      drawComment(block.text)
      continue
    }
    if (block.kind === 'note') {
      drawNote(block.items)
      continue
    }
    if (block.kind === 'tab') {
      drawFigure('TAB', block.text)
      continue
    }
    if (block.kind === 'score') {
      drawFigure('PARTITURA', block.text)
      continue
    }
    if (block.kind !== 'stanza' && block.kind !== 'chorus') continue
    if (block.hasOwnCapo) drawTag(`capo ${block.blockCapo ?? 0} neste bloco`)
    const chorus = block.kind === 'chorus'
    const x0 = ML + (chorus ? 14 : 0)
    const width = INNER - (chorus ? 24 : 0)
    drawSung(wrapBlock(doc, block.rows, width), chorus, x0)
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    stroke(doc, INK.line, 0.45)
    doc.line(ML, H - 34, R, H - 34)
    const pager = `${i}  /  ${pages}`
    face(doc, MONO, 'normal', 8, INK.muted)
    const pagerW = doc.getTextWidth(pager)
    face(doc, SANS, 'normal', 8, INK.muted)
    let foot = title
    const max = INNER - pagerW - 16
    while (foot.length > 1 && doc.getTextWidth(foot) > max) foot = foot.slice(0, -1)
    if (foot !== title) foot = `${foot.trimEnd().slice(0, -1)}…`
    doc.text(foot, ML, H - 20)
    face(doc, MONO, 'normal', 8, INK.muted)
    doc.text(pager, R, H - 20, { align: 'right' })
  }

  return new Uint8Array(doc.output('arraybuffer'))
}
