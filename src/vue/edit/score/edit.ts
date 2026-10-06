import { BEATS, STR_MIDI, toTab } from '@henryavila/titan-chordpro-ui'
import type { Dur, ScoreNote } from '@henryavila/titan-chordpro-ui'

/** Plain history: every mutation pushes the previous note list. Sixty steps, then the oldest falls off. */
export function remember(hist: ScoreNote[][], notes: ScoreNote[]): ScoreNote[][] {
  return [...hist.slice(-59), notes.map((n) => ({ ...n }))]
}

export function undoNotes(
  hist: ScoreNote[][],
  sel: number,
): { hist: ScoreNote[][]; notes: ScoreNote[]; sel: number } | null {
  const prev = hist[hist.length - 1]
  if (!prev) return null
  return {
    hist: hist.slice(0, -1),
    notes: prev,
    sel: Math.max(0, Math.min(prev.length - 1, sel)),
  }
}

export function patchAt(notes: ScoreNote[], i: number, obj: Partial<ScoreNote>): ScoreNote[] {
  return notes.map((n, j) => (j === i ? { ...n, ...obj } : n))
}

export function clampIndex(sel: number, delta: number, length: number): number {
  return Math.max(0, Math.min(length - 1, sel + delta))
}

export function nudgeAt(notes: ScoreNote[], sel: number, delta: number): ScoreNote[] {
  return notes.map((n, j) => {
    if (j !== sel || n.rest) return n
    const midi = Math.max(40, Math.min(88, (n.midi ?? 60) + delta))
    const t = toTab(midi)
    return { ...n, midi, str: t?.str, fret: t?.fret }
  })
}

export function deleteAt(notes: ScoreNote[], sel: number): { notes: ScoreNote[]; sel: number } | null {
  if (!notes.length) return null
  const next = notes.filter((_, j) => j !== sel)
  return { notes: next, sel: Math.max(0, Math.min(next.length - 1, sel)) }
}

export function durAt(notes: ScoreNote[], sel: number, dur: Dur): ScoreNote[] {
  return notes.map((n, j) => (j === sel ? { ...n, dur } : n))
}

export function slideAt(notes: ScoreNote[], sel: number, slide: boolean): ScoreNote[] {
  return notes.map((n, j) => (j === sel ? { ...n, slide } : n))
}

/**
 * A new note goes in AFTER the selected one, not at the end: you can go back
 * to the first bar and write there without erasing what comes later.
 */
export function insertAfter(notes: ScoreNote[], sel: number, note: ScoreNote): { notes: ScoreNote[]; sel: number } {
  const at = Math.min(notes.length, sel + 1)
  const next = [...notes]
  next.splice(at, 0, note)
  return { notes: next, sel: at }
}

export function indexAtBar(notes: ScoreNote[], bi: number, per: number): number {
  let acc = 0
  let at = 0
  for (let i = 0; i < notes.length; i++) {
    if (acc >= bi * per) {
      at = i
      break
    }
    acc += BEATS[notes[i]?.dur ?? 'q'] ?? 1
    at = i
  }
  return at
}

/**
 * Guitar entry: string plus fret give the pitch. Changing the string of a note
 * that already exists must not touch its figure or its slide. A missing index
 * leaves the list alone — the caller has already stored history.
 */
export function placeFret(
  notes: ScoreNote[],
  sel: number,
  str: number,
  at: number | null,
  dur: Dur,
  slide: boolean,
): { notes: ScoreNote[]; sel: number; beep: number | null; changed: boolean } {
  if (at === null) {
    const placed = insertAfter(notes, sel, {
      midi: STR_MIDI[str] as number,
      fret: 0,
      str,
      dur,
      slide,
    })
    const n = placed.notes[placed.sel]
    return { ...placed, beep: n?.midi != null ? n.midi : null, changed: true }
  }
  const old = notes[at]
  if (!old) return { notes, sel, beep: null, changed: false }
  const fret = typeof old.fret === 'number' ? old.fret : 0
  const next = [...notes]
  const note = { ...old, str, fret, midi: (STR_MIDI[str] as number) + fret, rest: false as const }
  next[at] = note
  return { notes: next, sel: at, beep: note.midi != null ? note.midi : null, changed: true }
}

export function fretPatch(
  note: ScoreNote | undefined,
  f: number,
): { str: number; fret: number; midi: number; rest: false } | null {
  if (!note) return null
  const str = typeof note.str === 'number' ? note.str : (toTab(note.midi ?? 60)?.str ?? 0)
  return { str, fret: f, midi: (STR_MIDI[str] as number) + f, rest: false }
}

/** Two digits in a row on the SAME note make a two-digit fret: 1 then 2 = 12. */
export type DigitMemory = { at: number; sel: number }

export function nextFret(
  memory: DigitMemory,
  sel: number,
  curFret: number,
  key: string,
  now: number,
): { fret: number; memory: DigitMemory } {
  const two = memory.at && memory.sel === sel && now - memory.at < 700 && curFret < 10
  return {
    fret: two ? Math.min(24, curFret * 10 + Number(key)) : Number(key),
    memory: { at: now, sel },
  }
}
