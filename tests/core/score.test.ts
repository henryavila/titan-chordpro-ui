import { describe, expect, it } from 'vitest'
import {
  DEFAULT_META,
  beatsOf,
  beatsPerBar,
  keyOf,
  layout,
  parseScore,
  serialize,
  tabOf,
  toTab,
} from '../../src/core/score'
import type { ScoreNote } from '../../src/core/score'

describe('pitch and fingering', () => {
  it('takes the lowest fret that can play the note', () => {
    // E4 is the open high e, not the 9th fret of B.
    expect(toTab(64)).toEqual({ str: 0, fret: 0 })
    expect(toTab(45)).toEqual({ str: 4, fret: 0 })
    expect(toTab(67)).toEqual({ str: 0, fret: 3 })
  })

  it('gives nothing for a pitch no string reaches', () => {
    expect(toTab(30)).toBeNull()
    expect(toTab(120)).toBeNull()
  })

  it('honours a fingering pinned by hand over the derived one', () => {
    // Same pitch, deliberately fretted higher up the neck.
    expect(tabOf({ midi: 64, dur: 'q' })).toEqual({ str: 0, fret: 0 })
    expect(tabOf({ midi: 64, dur: 'q', str: 1, fret: 5 })).toEqual({ str: 1, fret: 5 })
  })

  it('has no fingering for a rest', () => {
    expect(tabOf({ rest: true, dur: 'q' })).toBeNull()
  })

  it('names a pitch the way VexFlow reads it', () => {
    expect(keyOf(60)).toBe('c/4')
    expect(keyOf(61)).toBe('c#/4')
  })
})

describe('bars', () => {
  it('counts quarter notes, not the numerator', () => {
    expect(beatsPerBar('4/4')).toBe(4)
    expect(beatsPerBar('3/4')).toBe(3)
    expect(beatsPerBar('6/8')).toBe(3)
    expect(beatsPerBar('nonsense')).toBe(4)
  })

  it('splits a figure that would overrun the bar, and ties it', () => {
    // A whole note starting on beat 4 cannot stretch the barline.
    const notes: ScoreNote[] = [
      { midi: 60, dur: 'h' },
      { midi: 62, dur: 'q' },
      { midi: 64, dur: 'w' },
    ]
    const items = layout(notes, 4)
    // The barline falls after beat 4, in the middle of the whole note.
    expect(items.filter((i) => i.kind === 'bar')).toHaveLength(1)
    // It is written as legal figures, tied: one beat to close the bar, then
    // three more — which no single figure spells, so half plus quarter.
    const third = items.filter((i) => i.kind === 'note' && i.i === 2)
    expect(third.map((i) => (i.kind === 'note' ? i.dur : ''))).toEqual(['q', 'h', 'q'])
    expect(third.map((i) => (i.kind === 'note' ? i.tieNext : false))).toEqual([true, true, false])
  })

  it('adds the beats of every figure', () => {
    expect(beatsOf([{ midi: 60, dur: 'h' }, { midi: 62, dur: '8' }])).toBe(2.5)
  })
})

describe('the ChordPro extension', () => {
  it('writes one line per bar, with the head it was given', () => {
    const out = serialize([
      { midi: 62, dur: 'q' },
      { midi: 64, dur: 'q' },
      { midi: 66, dur: 'h' },
    ])
    const lines = out.split('\n')
    expect(lines[0]).toBe('{sos: time=4/4 key=D tempo=92 tuning=EADGBE}')
    expect(lines[1]).toBe('| d4:q e4:q f#4:h |')
    expect(lines[2]).toBe('{eos}')
  })

  it('records a fingering only when it was pinned by hand', () => {
    expect(serialize([{ midi: 64, dur: 'q' }])).toContain('e4:q |')
    expect(serialize([{ midi: 64, dur: 'q', str: 1, fret: 5 }])).toContain('e4:q@2/5')
  })

  it('marks a slide', () => {
    expect(serialize([{ midi: 64, dur: 'q', slide: true }])).toContain('e4:q~s')
  })

  it('reads back exactly what it wrote', () => {
    const notes: ScoreNote[] = [
      { midi: 62, dur: '8' },
      { midi: 64, dur: '8', slide: true },
      { rest: true, dur: 'q' },
      { midi: 67, dur: 'h', str: 0, fret: 3 },
    ]
    const round = parseScore(serialize(notes, { key: 'G', tempo: 72 }))
    expect(round.from).toBe('sos')
    expect(round.meta.key).toBe('G')
    expect(round.meta.tempo).toBe(72)
    expect(round.notes).toEqual([
      { midi: 62, dur: '8', slide: false },
      { midi: 64, dur: '8', slide: true },
      { rest: true, dur: 'q' },
      { midi: 67, dur: 'h', slide: false, str: 0, fret: 3 },
    ])
  })

  it('joins a note the barline had to cut in two', () => {
    // Written as `q~l` + `w`, it comes back as the whole note the musician meant.
    const notes: ScoreNote[] = [{ midi: 60, dur: 'h' }, { midi: 62, dur: 'q' }, { midi: 64, dur: 'w' }]
    const back = parseScore(serialize(notes))
    expect(back.notes.map((n) => n.dur)).toEqual(['h', 'q', 'w'])
  })
})

describe('reading what a chart already holds', () => {
  it('answers "new" for nothing at all', () => {
    const p = parseScore('')
    expect(p.from).toBe('novo')
    expect(p.notes).toHaveLength(0)
    expect(p.meta).toEqual(DEFAULT_META)
  })

  it('imports a legacy text tab as quarter notes', () => {
    const tab = [
      '{sot}',
      'e|--------|',
      'B|--------|',
      'G|--0---2-|',
      'D|--------|',
      'A|--------|',
      'E|-3------|',
      '{eot}',
    ].join('\n')
    const p = parseScore(tab)
    expect(p.from).toBe('tab-texto')
    expect(p.notes).toEqual([
      { midi: 40 + 3, str: 5, fret: 3, dur: 'q' },
      { midi: 55 + 0, str: 2, fret: 0, dur: 'q' },
      { midi: 55 + 2, str: 2, fret: 2, dur: 'q' },
    ])
  })

  it('reads a two-digit fret as one note', () => {
    const tab = ['e|--12--|', 'B|------|', 'G|------|', 'D|------|', 'A|------|', 'E|------|'].join('\n')
    const p = parseScore(tab)
    expect(p.notes).toEqual([{ midi: 64 + 12, str: 0, fret: 12, dur: 'q' }])
  })

  it('keeps the head of a `{sos}` block', () => {
    const p = parseScore('{sos: time=3/4 key=Bb tempo=60 tuning=DADGAD}\n| c4:q |\n{eos}')
    expect(p.meta).toEqual({ time: '3/4', key: 'Bb', tempo: 60, tuning: 'DADGAD' })
  })
})
