import type { SlideSourceLine } from '../core/lyrics-for-slides'

export type SlidePlan = {
  lines: readonly string[]
  auxText: string
}

export type SlideLayoutConfig = {
  targetMaxCharsPerLine?: number
  hardMaxCharsPerLine?: number
  maxLinesPerSlide?: number
  /** Two independent chart rows share a slide only when both are this short. */
  packMaxCharsPerLine?: number
}

const TARGET = 28
const HARD = 34
const MAX_LINES = 2
const PACK = 22
const MIN_PHRASE = 12

const WEAK = new Set([
  'a',
  'o',
  'as',
  'os',
  'um',
  'uma',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'e',
  'que',
  'nao',
  'não',
  'ao',
  'à',
  'às',
  'aos',
])

/**
 * Congregation slides from the chart’s own lines.
 *
 * The cifra already wrote the phrasing. We never glue two source rows into
 * one slide line (that is the ASR planner’s job, and we do not need it).
 * A mid-line capital the author used to pack two phrases splits once the
 * row is past the projector target (not only the hard wrap). Otherwise a
 * 33-character couplet stays one line, the next row joins it, and the
 * congregation reads four phrases. Independent rows share a slide only
 * when both are short. Title-case words inside a short phrase stay put.
 */
export function planSlides(rows: SlideSourceLine[], cfg: SlideLayoutConfig = {}): SlidePlan[] {
  const target = cfg.targetMaxCharsPerLine ?? TARGET
  const hard = cfg.hardMaxCharsPerLine ?? HARD
  const maxLines = cfg.maxLinesPerSlide ?? MAX_LINES
  const packMax = cfg.packMaxCharsPerLine ?? PACK
  if (maxLines < 1) throw new Error('maxLinesPerSlide must be >= 1')

  const sections: SlideSourceLine[][] = []
  for (const row of rows) {
    const last = sections[sections.length - 1]
    if (!last || last[0]!.sectionIndex !== row.sectionIndex) sections.push([row])
    else last.push(row)
  }

  const slides: SlidePlan[] = []
  for (const section of sections) {
    slides.push(...packSection(section, target, hard, maxLines, packMax))
  }
  return collapseRepeated(slides)
}

function packSection(
  rows: SlideSourceLine[],
  target: number,
  hard: number,
  maxLines: number,
  packMax: number,
): SlidePlan[] {
  const slides: SlidePlan[] = []
  let i = 0
  while (i < rows.length) {
    const parts = splitSourceLine(rows[i]!.text, target, hard)
    if (parts.length > 1) {
      for (let p = 0; p < parts.length; p += maxLines) {
        slides.push({ lines: parts.slice(p, p + maxLines), auxText: '' })
      }
      i += 1
      continue
    }

    const group = [parts[0]!]
    let j = i + 1
    while (group.length < maxLines && j < rows.length) {
      const next = splitSourceLine(rows[j]!.text, target, hard)
      if (next.length !== 1) break
      if (!canPack(group[group.length - 1]!, next[0]!, packMax)) break
      group.push(next[0]!)
      j += 1
    }
    slides.push({ lines: group, auxText: '' })
    i = j
  }
  return slides
}

function canPack(a: string, b: string, packMax: number): boolean {
  return a.length <= packMax && b.length <= packMax
}

function splitSourceLine(text: string, target: number, hard: number): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.length <= target) return [trimmed]

  const breaks = phraseBreaks(trimmed)
  if (breaks.length) {
    const mid = trimmed.length / 2
    let best = breaks[0]!
    let bestDist = Math.abs(best - mid)
    for (const at of breaks) {
      const dist = Math.abs(at - mid)
      if (dist < bestDist) {
        best = at
        bestDist = dist
      }
    }
    const left = trimmed.slice(0, best).trim()
    const right = trimmed.slice(best + 1).trim()
    if (left && right) {
      return [
        ...splitSourceLine(left, target, hard),
        ...splitSourceLine(right, target, hard),
      ]
    }
  }
  if (trimmed.length <= hard) return [trimmed]
  return wrapLine(trimmed, target, hard)
}

function phraseBreaks(text: string): number[] {
  const out: number[] = []
  const re = / (\p{Lu})/gu
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const at = m.index
    const left = text.slice(0, at).trim()
    const right = text.slice(at + 1).trim()
    if (left.length >= MIN_PHRASE && right.length >= MIN_PHRASE) out.push(at)
  }
  return out
}

function wrapLine(text: string, target: number, hard: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const lines: string[] = []
  let cur: string[] = []
  const width = (ws: string[]) => ws.join(' ').length

  const flush = () => {
    if (!cur.length) return
    if (cur.length > 1 && isWeak(cur[cur.length - 1]!)) {
      const weak = cur.pop()!
      lines.push(cur.join(' '))
      cur = [weak]
      return
    }
    lines.push(cur.join(' '))
    cur = []
  }

  for (const word of words) {
    const next = [...cur, word]
    const n = width(next)
    if (!cur.length) {
      cur = next
      continue
    }
    if (n <= target) {
      cur = next
      continue
    }
    if (n <= hard && isWeak(cur[cur.length - 1]!)) {
      cur = next
      continue
    }
    flush()
    cur = cur.length ? [...cur, word] : [word]
  }
  if (cur.length) lines.push(cur.join(' '))
  return lines
}

function isWeak(word: string): boolean {
  return WEAK.has(word.replace(/[.,;:!?]+$/g, '').toLowerCase())
}

function collapseRepeated(slides: SlidePlan[]): SlidePlan[] {
  const out: SlidePlan[] = []
  let i = 0
  while (i < slides.length) {
    const current = slides[i]!
    if (current.auxText) {
      out.push(current)
      i += 1
      continue
    }
    const key = current.lines.join('\n')
    let count = 1
    let j = i + 1
    while (j < slides.length && !slides[j]!.auxText && slides[j]!.lines.join('\n') === key) {
      count += 1
      j += 1
    }
    if (count === 1) out.push(current)
    else out.push({ lines: current.lines, auxText: `(${count}x)` })
    i = j
  }
  return out
}
