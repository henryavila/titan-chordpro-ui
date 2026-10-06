import type { ScoreNote } from '@henryavila/titan-chordpro-ui'
import { drawScore } from '../score-draw'

export type PaintInput = {
  view: 'score' | 'tab' | 'both'
  grand: boolean
  sel: number
  playIdx: number
  narrow: boolean
  notes: ScoreNote[]
  time: string
}

/**
 * Redraw only when the picture changes: the SVG is rebuilt whole, handlers
 * for clicking a note going with it. The engraver draws with explicit colours,
 * so they have to come from the theme the host is in.
 */
export function paintScore(host: HTMLElement, input: PaintInput, sig: string, onPick: (i: number) => void): string {
  const next = [
    input.view,
    input.grand,
    input.sel,
    input.playIdx,
    input.narrow,
    JSON.stringify(input.notes),
    input.time,
    getComputedStyle(host).color,
  ].join('|')
  if (next === sig) return sig
  const cs = getComputedStyle(host)
  const varOf = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  try {
    drawScore(host, input.notes, {
      view: input.view,
      grand: input.grand,
      sel: input.sel,
      playIdx: input.playIdx,
      time: input.time,
      minWidth: input.narrow ? 560 : 700,
      ink: cs.color || varOf('--text', '#EAECF2'),
      accent: varOf('--chord', '#84DFA6'),
      dim: varOf('--muted', '#888F9E'),
      onPick,
    })
    return next
  } catch {
    // Notes still edit through the string grid without the drawing, and the
    // work in progress is not worth losing to a failed render.
    host.replaceChildren()
    return ''
  }
}
