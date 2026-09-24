import { describe, expect, it } from 'vitest'
import {
  drawDiagram,
  parseChordToken,
  resolveDiagram,
  type ChordDefine,
} from '../../src/core/index'
import { parseDefineDirective, transposeDefine } from '../../src/core/define'
import { keyIndex } from '../../src/core/transpose'

const AM_OVERRIDE: ChordDefine = {
  name: 'Am',
  instrument: 'guitar',
  directive: 'define-guitar',
  baseFret: 1,
  frets: ['x', 0, 1, 2, 2, 0],
  fingers: ['x', 0, 1, 3, 2, 0],
}

describe('resolveDiagram', () => {
  it('is exported from src/core/index.ts', () => {
    expect(typeof resolveDiagram).toBe('function')
  })

  it('hits C7M as the maj7 voicing', () => {
    const guitar = resolveDiagram({ token: 'C7M', instrument: 'guitar' })
    expect(guitar.class).toBe('hit')
    if (guitar.class !== 'hit') return
    expect(guitar.source).toBe('dictionary')
    expect(guitar.voicing.frets).toEqual(['x', 3, 2, 0, 0, 0])
    expect(guitar.voicing.frets).toHaveLength(6)

    const piano = resolveDiagram({ token: 'C7M', instrument: 'piano' })
    expect(piano.class).toBe('hit')
    if (piano.class !== 'hit') return
    expect(piano.voicing.keys).toEqual([0, 4, 7, 11])
  })

  it('misses C7+ instead of guessing aug or maj7', () => {
    const r = resolveDiagram({ token: 'C7+', instrument: 'guitar' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('unknown-token')
  })

  it('misses C7+ even when a define uses that name', () => {
    const raw = parseDefineDirective('{define-guitar: C7+ frets x 3 2 1 1 0}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const r = resolveDiagram({ token: 'C7+', instrument: 'guitar', overrides: [raw] })
    expect(r).toEqual({ class: 'miss', reason: 'unknown-token' })
  })

  it('hits Caug when the define name matches and the frets are present', () => {
    expect(parseChordToken('Caug').class).not.toBe('parse')
    const raw = parseDefineDirective('{define-guitar: Caug frets x 3 2 1 1 0}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const r = resolveDiagram({ token: 'Caug', instrument: 'guitar', overrides: [raw] })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('override')
    expect(r.voicing.frets).toEqual(['x', 3, 2, 1, 1, 0])
  })

  it('hits a keys-only Caug define from the leading note, not unknown-token', () => {
    const keysOnly = parseDefineDirective('{define: Caug keys 0 4 8}')
    expect(keysOnly.class).toBe('parse')
    if (keysOnly.class !== 'parse') return
    const hit = resolveDiagram({ token: 'Caug', instrument: 'piano', overrides: [keysOnly] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    expect(hit.source).toBe('override')
    expect(hit.voicing.keys).toEqual([0, 4, 8])
  })

  it('hits Caug frets-plus-keys on piano from the leading note and the keys', () => {
    const raw = parseDefineDirective('{define: Caug frets x 3 2 1 1 0 keys 0 4 8}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(raw.instrument).toBe('piano')
    const hit = resolveDiagram({ token: 'Caug', instrument: 'piano', overrides: [raw] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    expect(hit.source).toBe('override')
    expect(hit.voicing.keys).toEqual([0, 4, 8])
    expect(hit.voicing.keys?.length).toBeGreaterThan(0)
  })

  it('misses a piano define whose name has no root letter', () => {
    const raw = parseDefineDirective('{define: aug keys 0 4 8}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(resolveDiagram({ token: 'aug', instrument: 'piano', overrides: [raw] })).toEqual({
      class: 'miss',
      reason: 'unknown-token',
    })
  })

  it('misses a piano name that contains a quote instead of hitting with no lit keys', () => {
    for (const name of ["C'", 'C"', 'C\u2019']) {
      const raw = parseDefineDirective(`{define: ${name} keys 0 4 7}`)
      expect(raw.class, name).toBe('parse')
      if (raw.class !== 'parse') continue
      expect(resolveDiagram({ token: name, instrument: 'piano', overrides: [raw] }), name).toEqual({
        class: 'miss',
        reason: 'unknown-token',
      })
      const drawn = drawDiagram({ instrument: 'piano', voicing: { keys: raw.keys }, token: name })
      expect(drawn.kind, name).toBe('piano')
      if (drawn.kind !== 'piano') continue
      expect(drawn.lit, name).toEqual([])
    }
  })

  it('misses C7+ on piano even when the define has keys', () => {
    const raw = parseDefineDirective('{define: C7+ keys 0 4 7}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(resolveDiagram({ token: 'C7+', instrument: 'piano', overrides: [raw] })).toEqual({
      class: 'miss',
      reason: 'unknown-token',
    })
  })

  it('reads MIDI keys on an unknown piano name from the leading note', () => {
    const raw = parseDefineDirective('{define: Daug keys 48 52 56}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const hit = resolveDiagram({ token: 'Daug', instrument: 'piano', overrides: [raw] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    expect(hit.voicing.keys).toEqual([10, 2, 6])
  })

  it('prefers a file override over the package dictionary', () => {
    const dict = resolveDiagram({ token: 'Am', instrument: 'guitar' })
    expect(dict.class).toBe('hit')
    if (dict.class !== 'hit') return
    expect(dict.source).toBe('dictionary')
    expect(dict.voicing.frets).toEqual(['x', 0, 2, 2, 1, 0])

    const over = resolveDiagram({
      token: 'Am',
      instrument: 'guitar',
      overrides: [AM_OVERRIDE],
    })
    expect(over.class).toBe('hit')
    if (over.class !== 'hit') return
    expect(over.source).toBe('override')
    expect(over.voicing.frets).toEqual(['x', 0, 1, 2, 2, 0])
    expect(over.voicing.fingers).toEqual(['x', 0, 1, 3, 2, 0])
    expect(over.voicing.frets).not.toEqual(dict.voicing.frets)
  })

  it('matches an override by canonical quality so C7M hits a Cmaj7 define', () => {
    const def: ChordDefine = {
      name: 'Cmaj7',
      instrument: 'guitar',
      directive: 'define-guitar',
      baseFret: 1,
      frets: ['x', 3, 2, 0, 0, 3],
    }
    const r = resolveDiagram({ token: 'C7M', instrument: 'guitar', overrides: [def] })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('override')
    expect(r.voicing.frets).toEqual(['x', 3, 2, 0, 0, 3])
  })

  it('uses the guitar token as shapeName, not the concert lyric', () => {
    const shape = resolveDiagram({ token: 'Am', instrument: 'guitar' })
    const concert = resolveDiagram({ token: 'Bm', instrument: 'guitar' })
    expect(shape.class).toBe('hit')
    expect(concert.class).toBe('hit')
    if (shape.class !== 'hit' || concert.class !== 'hit') return
    expect(shape.voicing.frets).toEqual(['x', 0, 2, 2, 1, 0])
    expect(concert.voicing.frets).not.toEqual(shape.voicing.frets)
  })

  it('uses the piano token as concert', () => {
    const r = resolveDiagram({ token: 'Bm', instrument: 'piano' })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.voicing.keys).toEqual([0, 3, 7])
    expect(r.voicing.frets).toBeUndefined()
  })

  it('does not apply a guitar override to piano', () => {
    const r = resolveDiagram({
      token: 'Am',
      instrument: 'piano',
      overrides: [AM_OVERRIDE],
    })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('dictionary')
    expect(r.voicing.keys).toEqual([0, 3, 7])
  })

  it('returns one voicing per name — the lowest open', () => {
    const c = resolveDiagram({ token: 'C', instrument: 'guitar' })
    expect(c.class).toBe('hit')
    if (c.class !== 'hit') return
    expect(c.voicing.frets).toEqual(['x', 3, 2, 0, 1, 0])
    const again = resolveDiagram({ token: 'C', instrument: 'guitar' })
    expect(again).toEqual(c)
  })

  it('ships ukulele GCEA (four strings) and not baritone', () => {
    const uke = resolveDiagram({ token: 'C', instrument: 'ukulele' })
    expect(uke.class).toBe('hit')
    if (uke.class !== 'hit') return
    expect(uke.voicing.frets).toEqual([0, 0, 0, 3])
    expect(uke.voicing.frets).toHaveLength(4)
  })

  it('classifies quote junk as unknown-token', () => {
    const r = resolveDiagram({ token: 'A4"', instrument: 'guitar' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('unknown-token')
  })

  it('classifies a parsed name with no voicing as no-shape', () => {
    const r = resolveDiagram({ token: 'Cm7(11)', instrument: 'ukulele' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('no-shape')
  })

  it('does not inherit Object.prototype keys as a dictionary hit', () => {
    for (const token of ['CtoString', 'Cconstructor']) {
      const r = resolveDiagram({ token, instrument: 'guitar' })
      expect(r.class, token).toBe('miss')
      if (r.class !== 'miss') continue
      expect(r.reason, token).toBe('unknown-token')
    }
  })

  it('G/B guitar is a miss without a matching bass override', () => {
    const r = resolveDiagram({ token: 'G/B', instrument: 'guitar' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('no-shape')
  })

  it('hits G/B from {define-guitar: G/B ...}', () => {
    const def: ChordDefine = {
      name: 'G/B',
      instrument: 'guitar',
      directive: 'define-guitar',
      baseFret: 1,
      frets: ['x', 2, 0, 0, 0, 3],
    }
    const r = resolveDiagram({ token: 'G/B', instrument: 'guitar', overrides: [def] })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('override')
    expect(r.voicing.frets).toEqual(['x', 2, 0, 0, 0, 3])
  })

  it('does not match G/B against {define-guitar: G}', () => {
    const def: ChordDefine = {
      name: 'G',
      instrument: 'guitar',
      directive: 'define-guitar',
      baseFret: 1,
      frets: [3, 2, 0, 0, 0, 3],
    }
    const r = resolveDiagram({ token: 'G/B', instrument: 'guitar', overrides: [def] })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('no-shape')
  })

  it('reads Am keys 0 3 7 as A C E and 9 0 4 as distances', () => {
    const rel = resolveDiagram({
      token: 'Am',
      instrument: 'piano',
      overrides: [{ name: 'Am', instrument: 'piano', directive: 'define', keys: [0, 3, 7] }],
    })
    expect(rel.class).toBe('hit')
    if (rel.class !== 'hit') return
    expect(rel.source).toBe('override')
    expect(rel.voicing.keys).toEqual([0, 3, 7])
    const dRel = drawDiagram({ instrument: 'piano', voicing: rel.voicing, token: 'Am' })
    expect(dRel.kind).toBe('piano')
    if (dRel.kind !== 'piano') return
    expect(dRel.litNotes).toEqual(['A', 'C', 'E'])

    const dist = resolveDiagram({
      token: 'Am',
      instrument: 'piano',
      overrides: [{ name: 'Am', instrument: 'piano', directive: 'define', keys: [9, 0, 4] }],
    })
    expect(dist.class).toBe('hit')
    if (dist.class !== 'hit') return
    expect(dist.voicing.keys).toEqual([9, 0, 4])
    const dDist = drawDiagram({ instrument: 'piano', voicing: dist.voicing, token: 'Am' })
    expect(dDist.kind).toBe('piano')
    if (dDist.kind !== 'piano') return
    expect(dDist.lit).toEqual([6, 9, 1])
    expect(dDist.litNotes).toEqual(['F#', 'A', 'C#'])
  })

  it('reads 0–17 keys as distances, so 7 0 is not a second spelling', () => {
    const g7 = resolveDiagram({
      token: 'G7sus4',
      instrument: 'piano',
      overrides: [{ name: 'G7sus4', instrument: 'piano', directive: 'define', keys: [0, 5, 10] }],
    })
    expect(g7.class).toBe('hit')
    if (g7.class !== 'hit') return
    expect(g7.voicing.keys).toEqual([0, 5, 10])
    const dG7 = drawDiagram({ instrument: 'piano', voicing: g7.voicing, token: 'G7sus4' })
    expect(dG7.kind).toBe('piano')
    if (dG7.kind !== 'piano') return
    expect(dG7.lit).toEqual([7, 0, 5])
    expect(dG7.litNotes).toEqual(['G', 'C', 'F'])

    const g7dist = resolveDiagram({
      token: 'G7sus4',
      instrument: 'piano',
      overrides: [{ name: 'G7sus4', instrument: 'piano', directive: 'define', keys: [7, 0, 5] }],
    })
    expect(g7dist.class).toBe('hit')
    if (g7dist.class !== 'hit') return
    expect(g7dist.voicing.keys).toEqual([7, 0, 5])
    const d7 = drawDiagram({ instrument: 'piano', voicing: g7dist.voicing, token: 'G7sus4' })
    expect(d7.kind).toBe('piano')
    if (d7.kind !== 'piano') return
    expect(d7.lit).toEqual([2, 7, 0])
    expect(d7.litNotes).toEqual(['D', 'G', 'C'])

    const gsus = resolveDiagram({
      token: 'Gsus4',
      instrument: 'piano',
      overrides: [{ name: 'Gsus4', instrument: 'piano', directive: 'define', keys: [0, 5] }],
    })
    expect(gsus.class).toBe('hit')
    if (gsus.class !== 'hit') return
    expect(gsus.voicing.keys).toEqual([0, 5])
    const dSus = drawDiagram({ instrument: 'piano', voicing: gsus.voicing, token: 'Gsus4' })
    expect(dSus.kind).toBe('piano')
    if (dSus.kind !== 'piano') return
    expect(dSus.litNotes).toEqual(['G', 'C'])

    const gsusDist = resolveDiagram({
      token: 'Gsus4',
      instrument: 'piano',
      overrides: [{ name: 'Gsus4', instrument: 'piano', directive: 'define', keys: [7, 0] }],
    })
    expect(gsusDist.class).toBe('hit')
    if (gsusDist.class !== 'hit') return
    expect(gsusDist.voicing.keys).toEqual([7, 0])
    const ds = drawDiagram({ instrument: 'piano', voicing: gsusDist.voicing, token: 'Gsus4' })
    expect(ds.kind).toBe('piano')
    if (ds.kind !== 'piano') return
    expect(ds.lit).toEqual([2, 7])
    expect(ds.litNotes).toEqual(['D', 'G'])

    const c = resolveDiagram({
      token: 'C',
      instrument: 'piano',
      overrides: [{ name: 'C', instrument: 'piano', directive: 'define', keys: [0, 4, 7] }],
    })
    expect(c.class).toBe('hit')
    if (c.class !== 'hit') return
    expect(c.voicing.keys).toEqual([0, 4, 7])
    const dC = drawDiagram({ instrument: 'piano', voicing: c.voicing, token: 'C' })
    expect(dC.kind).toBe('piano')
    if (dC.kind !== 'piano') return
    expect(dC.litNotes).toEqual(['C', 'E', 'G'])
  })

  it('draws F7sus4 keys 0 5 10 as F A# D#', () => {
    const f7sus4 = resolveDiagram({
      token: 'F7sus4',
      instrument: 'piano',
      overrides: [
        { name: 'F7sus4', instrument: 'piano', directive: 'define', keys: [0, 5, 10] },
      ],
    })
    expect(f7sus4.class).toBe('hit')
    if (f7sus4.class !== 'hit') return
    expect(f7sus4.voicing.keys).toEqual([0, 5, 10])
    const d = drawDiagram({ instrument: 'piano', voicing: f7sus4.voicing, token: 'F7sus4' })
    expect(d.kind).toBe('piano')
    if (d.kind !== 'piano') return
    expect(d.lit).toEqual([5, 10, 3])
    expect(d.litNotes).toEqual(['F', 'A#', 'D#'])
  })

  it('reads D7M(9)/B keys 9 0 11 2 as distances from D', () => {
    const r = resolveDiagram({
      token: 'D7M(9)/B',
      instrument: 'piano',
      overrides: [
        { name: 'D7M(9)/B', instrument: 'piano', directive: 'define', keys: [9, 0, 11, 2] },
      ],
    })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    const d = drawDiagram({ instrument: 'piano', voicing: r.voicing, token: 'D7M(9)/B' })
    expect(d.kind).toBe('piano')
    if (d.kind !== 'piano') return
    expect(d.lit).toEqual([11, 2, 1, 4])
    expect(d.litNotes).toEqual(['B', 'D', 'C#', 'E'])

    const notAbs = resolveDiagram({
      token: 'D7M(9)/B',
      instrument: 'piano',
      overrides: [
        { name: 'D7M(9)/B', instrument: 'piano', directive: 'define', keys: [11, 2, 1, 4] },
      ],
    })
    expect(notAbs.class).toBe('hit')
    if (notAbs.class !== 'hit') return
    const absDraw = drawDiagram({ instrument: 'piano', voicing: notAbs.voicing, token: 'D7M(9)/B' })
    expect(absDraw.kind).toBe('piano')
    if (absDraw.kind !== 'piano') return
    expect(absDraw.lit).toEqual([1, 4, 3, 6])
    expect(absDraw.litNotes).not.toEqual(['B', 'D', 'C#', 'E'])
  })

  it('draws a transposed relative piano define as the new chord', () => {
    const raw = parseDefineDirective('{define: D keys 0 4 7}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const plain = resolveDiagram({ token: 'D', instrument: 'piano', overrides: [raw] })
    expect(plain.class).toBe('hit')
    if (plain.class !== 'hit') return
    const plainDraw = drawDiagram({ instrument: 'piano', voicing: plain.voicing, token: 'D' })
    expect(plainDraw.kind).toBe('piano')
    if (plainDraw.kind !== 'piano') return
    expect(plainDraw.litNotes).toEqual(['D', 'F#', 'A'])

    const shifted = transposeDefine(raw, 2, false)
    expect(shifted).toMatchObject({ name: 'E', keys: [0, 4, 7] })
    if (!shifted) return
    const hit = resolveDiagram({ token: shifted.name, instrument: 'piano', overrides: [shifted] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: shifted.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.litNotes).toEqual(['E', 'G#', 'B'])

    const c = parseDefineDirective('{define: C keys 0 4 7}')
    expect(c.class).toBe('parse')
    if (c.class !== 'parse') return
    const cShift = transposeDefine(c, 2, false)
    expect(cShift).toMatchObject({ name: 'D', keys: [0, 4, 7] })
    if (!cShift) return
    const cHit = resolveDiagram({ token: cShift.name, instrument: 'piano', overrides: [cShift] })
    expect(cHit.class).toBe('hit')
    if (cHit.class !== 'hit') return
    const cDraw = drawDiagram({ instrument: 'piano', voicing: cHit.voicing, token: cShift.name })
    expect(cDraw.kind).toBe('piano')
    if (cDraw.kind !== 'piano') return
    expect(cDraw.litNotes).toEqual(['D', 'F#', 'A'])
  })

  it('draws F7sus4 and its +2 transpose from the same relative reading', () => {
    const raw = parseDefineDirective('{define: F7sus4 keys 0 5 10}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const plain = resolveDiagram({ token: 'F7sus4', instrument: 'piano', overrides: [raw] })
    expect(plain.class).toBe('hit')
    if (plain.class !== 'hit') return
    const plainDraw = drawDiagram({ instrument: 'piano', voicing: plain.voicing, token: 'F7sus4' })
    expect(plainDraw.kind).toBe('piano')
    if (plainDraw.kind !== 'piano') return
    expect(plainDraw.lit).toEqual([5, 10, 3])
    expect(plainDraw.litNotes).toEqual(['F', 'A#', 'D#'])

    const shifted = transposeDefine(raw, 2, false)
    expect(shifted).toMatchObject({ name: 'G7sus4', keys: [0, 5, 10] })
    if (!shifted) return
    const hit = resolveDiagram({ token: shifted.name, instrument: 'piano', overrides: [shifted] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: shifted.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([7, 0, 5])
    expect(draw.litNotes).toEqual(['G', 'C', 'F'])
  })

  it('round-trips Dsus2 keys 0 7 through +3 and back to D A', () => {
    const raw = parseDefineDirective('{define: Dsus2 keys 0 7}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const up = transposeDefine(raw, 3, false)
    expect(up).toMatchObject({ name: 'Fsus2', keys: [0, 7] })
    if (!up) return
    const upHit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(upHit.class).toBe('hit')
    if (upHit.class !== 'hit') return
    const upDraw = drawDiagram({ instrument: 'piano', voicing: upHit.voicing, token: up.name })
    expect(upDraw.kind).toBe('piano')
    if (upDraw.kind !== 'piano') return
    expect(upDraw.lit).toEqual([5, 0])
    expect(upDraw.litNotes).toEqual(['F', 'C'])

    const back = transposeDefine(up, -3, false)
    expect(back).toMatchObject({ name: 'Dsus2', keys: [0, 7] })
    if (!back) return
    const backHit = resolveDiagram({ token: back.name, instrument: 'piano', overrides: [back] })
    expect(backHit.class).toBe('hit')
    if (backHit.class !== 'hit') return
    const backDraw = drawDiagram({ instrument: 'piano', voicing: backHit.voicing, token: back.name })
    expect(backDraw.kind).toBe('piano')
    if (backDraw.kind !== 'piano') return
    expect(backDraw.lit).toEqual([2, 9])
    expect(backDraw.litNotes).toEqual(['D', 'A'])
  })

  it('round-trips Dsus2 keys 0 7 through +5 to G D and back to D A', () => {
    const raw = parseDefineDirective('{define: Dsus2 keys 0 7}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const up = transposeDefine(raw, 5, false)
    expect(up).toMatchObject({ name: 'Gsus2', keys: [0, 7] })
    if (!up) return
    const upHit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(upHit.class).toBe('hit')
    if (upHit.class !== 'hit') return
    const upDraw = drawDiagram({ instrument: 'piano', voicing: upHit.voicing, token: up.name })
    expect(upDraw.kind).toBe('piano')
    if (upDraw.kind !== 'piano') return
    expect(upDraw.lit).toEqual([7, 2])
    expect(upDraw.litNotes).toEqual(['G', 'D'])

    const back = transposeDefine(up, -5, false)
    expect(back).toMatchObject({ name: 'Dsus2', keys: [0, 7] })
    if (!back) return
    const backHit = resolveDiagram({ token: back.name, instrument: 'piano', overrides: [back] })
    expect(backHit.class).toBe('hit')
    if (backHit.class !== 'hit') return
    const backDraw = drawDiagram({ instrument: 'piano', voicing: backHit.voicing, token: back.name })
    expect(backDraw.kind).toBe('piano')
    if (backDraw.kind !== 'piano') return
    expect(backDraw.lit).toEqual([2, 9])
    expect(backDraw.litNotes).toEqual(['D', 'A'])
  })

  it('draws D9 keys 0 4 7 14 as D F# A E', () => {
    const raw = parseDefineDirective('{define: D9 keys 0 4 7 14}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const hit = resolveDiagram({ token: 'D9', instrument: 'piano', overrides: [raw] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: 'D9' })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([2, 6, 9, 4])
    expect(draw.litNotes).toEqual(['D', 'F#', 'A', 'E'])
  })

  it('draws D keys 50 52 as MIDI D and E, not a relative reading', () => {
    const raw = parseDefineDirective('{define: D keys 50 52}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const hit = resolveDiagram({ token: 'D', instrument: 'piano', overrides: [raw] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: 'D' })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([2, 4])
    expect(draw.litNotes).toEqual(['D', 'E'])
  })

  it('reads D keys 12 16 19 and 7 12 16 as distances, not MIDI', () => {
    const triad = parseDefineDirective('{define: D keys 12 16 19}')
    expect(triad.class).toBe('parse')
    if (triad.class !== 'parse') return
    const hit = resolveDiagram({ token: 'D', instrument: 'piano', overrides: [triad] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: 'D' })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([2, 6, 9])
    expect(draw.litNotes).toEqual(['D', 'F#', 'A'])
    expect(draw.litNotes).not.toEqual(['C', 'E', 'G'])

    const up = transposeDefine(triad, 2, false)
    expect(up).toMatchObject({ name: 'E', keys: [12, 16, 19] })
    expect(up?.keys).not.toEqual([26, 30, 33])
    if (!up) return
    const upHit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(upHit.class).toBe('hit')
    if (upHit.class !== 'hit') return
    const upDraw = drawDiagram({ instrument: 'piano', voicing: upHit.voicing, token: up.name })
    expect(upDraw.kind).toBe('piano')
    if (upDraw.kind !== 'piano') return
    expect(upDraw.lit).toEqual([4, 8, 11])
    expect(upDraw.litNotes).toEqual(['E', 'G#', 'B'])

    const fifth = parseDefineDirective('{define: D keys 7 12 16}')
    expect(fifth.class).toBe('parse')
    if (fifth.class !== 'parse') return
    const fifthHit = resolveDiagram({ token: 'D', instrument: 'piano', overrides: [fifth] })
    expect(fifthHit.class).toBe('hit')
    if (fifthHit.class !== 'hit') return
    const fifthDraw = drawDiagram({ instrument: 'piano', voicing: fifthHit.voicing, token: 'D' })
    expect(fifthDraw.kind).toBe('piano')
    if (fifthDraw.kind !== 'piano') return
    expect(fifthDraw.lit).toEqual([9, 2, 6])
    expect(fifthDraw.litNotes).toEqual(['A', 'D', 'F#'])
    expect(new Set(fifthDraw.lit)).toEqual(new Set([2, 9, 6]))
  })

  it('reads D keys 24 28 31 as distances D F# A and keeps them on +2', () => {
    const raw = parseDefineDirective('{define: D keys 24 28 31}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const hit = resolveDiagram({ token: 'D', instrument: 'piano', overrides: [raw] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: 'D' })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.litNotes).toEqual(['D', 'F#', 'A'])

    const up = transposeDefine(raw, 2, false)
    expect(up).toMatchObject({ name: 'E', keys: [24, 28, 31] })
    if (!up) return
    const upHit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(upHit.class).toBe('hit')
    if (upHit.class !== 'hit') return
    const upDraw = drawDiagram({ instrument: 'piano', voicing: upHit.voicing, token: up.name })
    expect(upDraw.kind).toBe('piano')
    if (upDraw.kind !== 'piano') return
    expect(upDraw.litNotes).toEqual(['E', 'G#', 'B'])
  })

  it('reads D keys 19 24 28 as distances A D F#', () => {
    const raw = parseDefineDirective('{define: D keys 19 24 28}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const hit = resolveDiagram({ token: 'D', instrument: 'piano', overrides: [raw] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: 'D' })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([9, 2, 6])
    expect(draw.litNotes).toEqual(['A', 'D', 'F#'])
    expect(transposeDefine(raw, 2, false)).toMatchObject({ name: 'E', keys: [19, 24, 28] })
  })

  it('does not draw a piano diagram for a slash chord without a define', () => {
    const r = resolveDiagram({ token: 'G/B', instrument: 'piano' })
    expect(r).toEqual({ class: 'miss', reason: 'no-shape' })
  })

  it('draws D9 keys 0 4 7 14 transposed +2 as E G# B F#', () => {
    const raw = parseDefineDirective('{define: D9 keys 0 4 7 14}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const up = transposeDefine(raw, 2, false)
    expect(up).toMatchObject({ name: 'E9', keys: [0, 4, 7, 14] })
    if (!up) return
    const hit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: up.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([4, 8, 11, 6])
    expect(draw.litNotes).toEqual(['E', 'G#', 'B', 'F#'])
  })
})

const TUNING = {
  guitar: [4, 9, 2, 7, 11, 4],
  ukulele: [7, 0, 4, 9],
} as const

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/**
 * Intervals from the tonic. 14 sounds as 2 and 17 sounds as 5, so those
 * are already reduced here. A sounding pitch class outside `allowed` is
 * illegal. `required` must be present. The fifth (7) may be omitted when
 * it is allowed. The root may be omitted once `required` is present.
 * Shell (9 and maj9 only): the major third may be omitted when the
 * characteristic seventh and the ninth are both present.
 */
const CHORD_ORACLE: Record<
  string,
  { allowed: number[]; required: number[]; shell?: { seventh: number; ninth: number; third: number } }
> = {
  major: { allowed: [0, 4, 7], required: [4] },
  m: { allowed: [0, 3, 7], required: [3] },
  '5': { allowed: [0, 7], required: [7] },
  '6': { allowed: [0, 4, 7, 9], required: [4, 9] },
  '6add9': { allowed: [0, 4, 7, 9, 2], required: [4, 9, 2] },
  '7': { allowed: [0, 4, 7, 10], required: [4, 10] },
  '9': { allowed: [0, 4, 7, 10, 2], required: [10, 2], shell: { seventh: 10, ninth: 2, third: 4 } },
  add9: { allowed: [0, 4, 7, 2], required: [4, 2] },
  maj7: { allowed: [0, 4, 7, 11], required: [4, 11] },
  maj9: { allowed: [0, 4, 7, 11, 2], required: [11, 2], shell: { seventh: 11, ninth: 2, third: 4 } },
  m6: { allowed: [0, 3, 7, 9], required: [3, 9] },
  m7: { allowed: [0, 3, 7, 10], required: [3, 10] },
  m9: { allowed: [0, 3, 7, 10, 2], required: [3, 10, 2] },
  sus2: { allowed: [0, 2, 7], required: [2] },
  sus4: { allowed: [0, 5, 7], required: [5] },
  '7sus4': { allowed: [0, 5, 7, 10], required: [5, 10] },
  dim: { allowed: [0, 3, 6], required: [3, 6] },
}

const GRID: { quality: string; suffix: string; aliases?: string[] }[] = [
  { quality: 'major', suffix: '' },
  { quality: 'm', suffix: 'm' },
  { quality: '5', suffix: '5' },
  { quality: '6', suffix: '6' },
  { quality: '6add9', suffix: '6(9)' },
  { quality: '7', suffix: '7' },
  { quality: '9', suffix: '7(9)' },
  { quality: 'add9', suffix: '9' },
  { quality: 'maj7', suffix: 'maj7', aliases: ['7M', 'M7'] },
  { quality: 'maj9', suffix: '7M(9)' },
  { quality: 'm6', suffix: 'm6' },
  { quality: 'm7', suffix: 'm7' },
  { quality: 'm9', suffix: 'm9' },
  { quality: 'sus2', suffix: 'sus2', aliases: ['2'] },
  { quality: 'sus4', suffix: 'sus4', aliases: ['4', 'sus'] },
  { quality: '7sus4', suffix: '7sus4', aliases: ['7(4)'] },
  { quality: 'dim', suffix: 'dim', aliases: ['º', '°'] },
]

/** Parser spellings that share a pitch class. E#=F, Fb=E, B#=C, Cb=B. */
const ENHARMONIC: ReadonlyArray<readonly [string, string]> = [
  ['C#', 'Db'],
  ['D#', 'Eb'],
  ['F#', 'Gb'],
  ['G#', 'Ab'],
  ['A#', 'Bb'],
  ['E#', 'F'],
  ['Fb', 'E'],
  ['B#', 'C'],
  ['Cb', 'B'],
]

const M11 = [0, 3, 7, 10, 2, 5] as const

function pitchClasses(instrument: 'guitar' | 'ukulele', frets: Array<number | 'x'>): Set<number> {
  const open = TUNING[instrument]
  const pcs = new Set<number>()
  for (let i = 0; i < open.length; i++) {
    const fret = frets[i]
    if (fret === 'x' || fret === undefined) continue
    pcs.add((open[i]! + fret) % 12)
  }
  return pcs
}

function oracleFailure(quality: string, rootPc: number, sounded: Set<number>): string | null {
  const spec = CHORD_ORACLE[quality]
  if (!spec) return `no oracle for ${quality}`
  const rel = new Set([...sounded].map((pc) => (pc - rootPc + 12) % 12))
  const allowed = new Set(spec.allowed)
  const foreign = [...rel].filter((tone) => !allowed.has(tone))
  if (foreign.length) return `foreign ${foreign.join(',')}`
  const missing = spec.required.filter((tone) => !rel.has(tone))
  if (missing.length) return `missing ${missing.join(',')}`
  if (spec.shell) {
    const shell = rel.has(spec.shell.seventh) && rel.has(spec.shell.ninth)
    if (!shell && !rel.has(spec.shell.third)) return 'missing third'
  }
  if (rel.size === 0) return 'silent'
  return null
}

function dictionaryFrets(
  token: string,
  instrument: 'guitar' | 'ukulele',
): { frets: Array<number | 'x'> } | { error: string } {
  const r = resolveDiagram({ token, instrument })
  if (r.class !== 'hit') return { error: r.reason }
  if (r.source !== 'dictionary') return { error: `source ${r.source}` }
  const frets = r.voicing.frets
  if (!frets?.length) return { error: 'no frets' }
  const want = instrument === 'guitar' ? 6 : 4
  if (frets.length !== want) return { error: `length ${frets.length}` }
  for (const fret of frets) {
    if (fret === 'x') continue
    if (!Number.isInteger(fret) || fret < 0 || fret > 9) return { error: `fret ${String(fret)}` }
  }
  return { frets }
}

describe('dictionary chord identity', () => {
  it('hits every dictionary quality on all 12 roots for guitar and ukulele', () => {
    const failures: string[] = []
    let checked = 0
    for (const instrument of ['guitar', 'ukulele'] as const) {
      for (const root of ROOTS) {
        const rootPc = keyIndex(root)
        if (rootPc === null) {
          failures.push(`${root}: no pitch class`)
          continue
        }
        for (const row of GRID) {
          const token = `${root}${row.suffix}`
          const parsed = parseChordToken(token)
          if (parsed.class !== 'parse' || parsed.quality !== row.quality) {
            failures.push(`${token}: quality ${parsed.class === 'parse' ? parsed.quality : parsed.class}`)
            continue
          }
          checked++
          const got = dictionaryFrets(token, instrument)
          if ('error' in got) {
            failures.push(`${instrument} ${token}: ${got.error}`)
            continue
          }
          const why = oracleFailure(row.quality, rootPc, pitchClasses(instrument, got.frets))
          if (why) failures.push(`${instrument} ${token} ${got.frets.join('')}: ${why}`)
          for (const alias of row.aliases ?? []) {
            const aliasToken = `${root}${alias}`
            const aliasParsed = parseChordToken(aliasToken)
            if (aliasParsed.class !== 'parse' || aliasParsed.quality !== row.quality) {
              failures.push(`${aliasToken}: quality ${aliasParsed.class === 'parse' ? aliasParsed.quality : aliasParsed.class}`)
              continue
            }
            const alt = dictionaryFrets(aliasToken, instrument)
            if ('error' in alt) {
              failures.push(`${instrument} ${aliasToken}: ${alt.error}`)
              continue
            }
            if (alt.frets.join('') !== got.frets.join('')) {
              failures.push(`${instrument} ${aliasToken} ${alt.frets.join('')} !== ${token} ${got.frets.join('')}`)
            }
          }
        }
      }
    }
    expect({ checked, failures }).toEqual({ checked: 17 * 12 * 2, failures: [] })
  })

  it('keeps C9 (add9) distinct from C7(9) (dominant 9)', () => {
    expect(parseChordToken('C9')).toMatchObject({ class: 'parse', quality: 'add9' })
    expect(parseChordToken('C7(9)')).toMatchObject({ class: 'parse', quality: '9' })
    for (const instrument of ['guitar', 'ukulele'] as const) {
      for (const root of ROOTS) {
        const add = dictionaryFrets(`${root}9`, instrument)
        const dom = dictionaryFrets(`${root}7(9)`, instrument)
        expect('error' in add, `${instrument} ${root}9`).toBe(false)
        expect('error' in dom, `${instrument} ${root}7(9)`).toBe(false)
        if ('error' in add || 'error' in dom) continue
        expect(add.frets, `${instrument} ${root}`).not.toEqual(dom.frets)
      }
    }
  })

  it('spells enharmonic roots as the same grip', () => {
    const failures: string[] = []
    for (const instrument of ['guitar', 'ukulele'] as const) {
      for (const [a, b] of ENHARMONIC) {
        for (const row of GRID) {
          const left = dictionaryFrets(`${a}${row.suffix}`, instrument)
          const right = dictionaryFrets(`${b}${row.suffix}`, instrument)
          if ('error' in left) {
            failures.push(`${instrument} ${a}/${b} ${row.quality}: ${left.error}`)
            continue
          }
          if ('error' in right) {
            failures.push(`${instrument} ${a}/${b} ${row.quality}: ${right.error}`)
            continue
          }
          if (left.frets.join('') !== right.frets.join('')) {
            failures.push(`${instrument} ${a}${row.suffix} ${left.frets.join('')} !== ${b}${row.suffix} ${right.frets.join('')}`)
          }
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('records m7(11) as a fretted miss and a piano hit', () => {
    for (const instrument of ['guitar', 'ukulele'] as const) {
      for (const root of ROOTS) {
        const r = resolveDiagram({ token: `${root}m7(11)`, instrument })
        expect(r, `${instrument} ${root}m7(11)`).toEqual({ class: 'miss', reason: 'no-shape' })
      }
    }
    for (const root of ROOTS) {
      const rootPc = keyIndex(root)
      expect(rootPc, root).not.toBeNull()
      if (rootPc === null) continue
      const r = resolveDiagram({ token: `${root}m7(11)`, instrument: 'piano' })
      expect(r.class, root).toBe('hit')
      if (r.class !== 'hit') continue
      expect(r.source).toBe('dictionary')
      const lit = (r.voicing.keys ?? []).map((k) => ((rootPc + k) % 12 + 12) % 12)
      const want = M11.map((iv) => (rootPc + iv) % 12)
      expect(new Set(lit), root).toEqual(new Set(want))
    }
  })

  it('rejects the grips that omit the tone the quality is named for', () => {
    const cmaj9 = resolveDiagram({ token: 'C7M(9)', instrument: 'guitar' })
    expect(cmaj9.class).toBe('hit')
    if (cmaj9.class === 'hit' && cmaj9.voicing.frets) {
      expect(pitchClasses('guitar', cmaj9.voicing.frets).has(11)).toBe(true)
      expect(cmaj9.voicing.frets).not.toEqual(['x', 3, 2, 0, 3, 0])
    }

    const a69 = resolveDiagram({ token: 'A6(9)', instrument: 'guitar' })
    expect(a69.class).toBe('hit')
    if (a69.class === 'hit' && a69.voicing.frets) {
      expect(pitchClasses('guitar', a69.voicing.frets).has(11)).toBe(true)
      expect(a69.voicing.frets).not.toEqual(['x', 0, 2, 2, 2, 2])
    }

    const am7 = resolveDiagram({ token: 'Am7', instrument: 'ukulele' })
    expect(am7.class).toBe('hit')
    if (am7.class === 'hit' && am7.voicing.frets) {
      expect(pitchClasses('ukulele', am7.voicing.frets).has(7)).toBe(true)
    }

    const gdim = resolveDiagram({ token: 'Gdim', instrument: 'ukulele' })
    expect(gdim.class).toBe('hit')
    if (gdim.class === 'hit' && gdim.voicing.frets) {
      expect(gdim.voicing.frets).not.toEqual([0, 2, 3, 2])
    }
  })
})
