import { BEATS, DEMO, NAMES, PT, STR_LBL, parseScore, scoreLayout as layout, tabOf } from '@henryavila/titan-chordpro-ui'
import type { ScoreMeta, ScoreNote } from '@henryavila/titan-chordpro-ui'

export function openScore(source: string): { notes: ScoreNote[]; meta: ScoreMeta; imported: number | null } {
  const parsed = parseScore(source)
  return {
    notes: parsed.notes.length ? parsed.notes : source ? [] : DEMO.map((n) => ({ ...n })),
    meta: { ...parsed.meta },
    imported: parsed.from === 'tab-texto' ? parsed.notes.length : null,
  }
}

export function metaLine(meta: ScoreMeta, guitar: boolean): string {
  return (
    `${meta.time} · ${meta.tempo} BPM · tom de ${meta.key}` +
    (guitar ? ` · afinação ${meta.tuning}` : '')
  )
}

export function filledBeats(notes: ScoreNote[]): number {
  return notes.reduce((a, n) => a + (BEATS[n.dur] ?? 1), 0)
}

export type BeatMark = { full: boolean; part: boolean }
export type BarChip = { bi: number; label: string; on: boolean; beats: BeatMark[] }

export function barStrip(notes: ScoreNote[], sel: number, perBar: number, filled: number): {
  bars: BarChip[]
  closed: boolean
  fillStatus: string
  atLabel: string
} {
  const beforeBeats = notes.slice(0, sel).reduce((a, n) => a + (BEATS[n.dur] ?? 1), 0)
  const curBar = Math.floor(beforeBeats / perBar)
  const bars = Array.from({ length: Math.max(1, Math.ceil(filled / perBar)) }, (_, bi) => ({
    bi,
    label: String(bi + 1),
    on: bi === curBar,
    beats: Array.from({ length: perBar }, (_, t) => ({
      full: filled >= bi * perBar + t + 1,
      part: filled > bi * perBar + t,
    })),
  }))
  const closed = Math.abs(filled % perBar) < 0.001
  const fillStatus = closed
    ? 'compasso fechado'
    : `${Math.round((filled % perBar) * 100) / 100} de ${perBar} tempos`
  const cur = notes[sel]
  const atLabel = cur
    ? `compasso ${curBar + 1} · tempo ${Math.round((beforeBeats % perBar) * 4) / 4 + 1}`
    : ''
  return { bars, closed, fillStatus, atLabel }
}

export type TabCell = {
  bar: boolean
  w: string
  txt: string
  aria: string
  on: boolean
  selected: boolean
  playing: boolean
  at: number | null
  str: number
  ci: number
}

export type StringRow = { label: string; cells: TabCell[] }

/** The tab grid: one row per string, one cell per column of the layout. */
export function stringRows(notes: ScoreNote[], perBar: number, sel: number, playIdx: number): StringRow[] {
  const cols = layout(notes, perBar)
  return STR_LBL.map((label, s) => ({
    label,
    cells: cols
      .map((c, ci): TabCell => {
        if (c.kind === 'bar') {
          return {
            bar: true,
            w: '3px',
            txt: '',
            aria: 'Barra de compasso',
            on: false,
            selected: false,
            playing: false,
            at: null,
            str: s,
            ci,
          }
        }
        const pos = tabOf(c.n)
        const on = !!(pos && pos.str === s)
        return {
          bar: false,
          w: '34px',
          txt: on && pos ? String(pos.fret) : '',
          on,
          selected: c.i === sel,
          playing: c.i === playIdx,
          aria: `Corda ${label}, coluna ${ci + 1}${on && pos ? `, casa ${pos.fret}` : ', vazia'}`,
          at: c.i,
          str: s,
          ci,
        }
      })
      .concat([
        {
          bar: false,
          w: '34px',
          txt: '+',
          on: false,
          selected: false,
          playing: false,
          aria: `Nova nota na corda ${label}`,
          at: null,
          str: s,
          ci: -1,
        },
      ]),
  }))
}

export type WhiteKey = { label: string; aria: string; midi: number; on: boolean }
export type BlackKey = { left: string; aria: string; midi: number; on: boolean }

export function pianoKeys(oct: number, curMidi: number | undefined): { whites: WhiteKey[]; blacks: BlackKey[] } {
  const base = oct * 12 + 12
  const whites: WhiteKey[] = []
  const blacks: BlackKey[] = []
  const wPat = [0, 2, 4, 5, 7, 9, 11]
  for (let k = 0; k < 15; k++) {
    const oc = Math.floor(k / 7)
    const i = k % 7
    const midi = base + oc * 12 + (wPat[i] as number)
    const nm = NAMES[midi % 12] as string
    whites.push({
      label: PT[nm] ?? nm,
      aria: `${PT[nm] ?? nm} ${Math.floor(midi / 12) - 1}`,
      midi,
      on: curMidi === midi,
    })
    if (i !== 2 && i !== 6 && k < 14) {
      const bm = midi + 1
      blacks.push({
        left: `${k * 40 + 27}px`,
        aria: `${PT[nm] ?? nm} sustenido`,
        midi: bm,
        on: curMidi === bm,
      })
    }
  }
  return { whites, blacks }
}

export function tabHint(note: ScoreNote | undefined): string {
  const pos = note ? tabOf(note) : null
  return pos ? `no violão: corda ${STR_LBL[pos.str]}, casa ${pos.fret}` : ''
}

export function keyHint(guitar: boolean): string {
  return guitar
    ? '0–12 digita a casa · ←/→ anda · Backspace apaga'
    : '←/→ anda · ↑/↓ move a altura · Backspace apaga'
}

export function emptyHint(guitar: boolean): string {
  return guitar
    ? 'Toque numa corda abaixo para escrever a primeira nota'
    : 'Escolha a figura e toque uma tecla para começar'
}
