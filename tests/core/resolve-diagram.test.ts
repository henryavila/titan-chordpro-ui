import { describe, expect, it } from 'vitest'
import { resolveDiagram, type ChordDefine } from '../../src/core/index'

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
})
