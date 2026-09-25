import { describe, expect, it } from 'vitest'
import {
  META_KEYS,
  drawDiagram,
  exportCho,
  parse,
  parseDefineDirective,
  resolveDiagram,
  rewriteToKey,
  serializeDefine,
  setKey,
  transpose,
  writeDefines,
  writeMeta,
} from '../../src/core/index'
import { DIR, transposeDefine } from '../../src/core/define'
import { loadFixture } from '../helpers/load-fixture'

/** Export writes `{transpose:N}`; the live view is what the músico sees. */
function liveExport(src: string, n: number) {
  return transpose(parse(exportCho(src, { semitones: n })), n)
}

const GUITAR_AM =
  '{define-guitar: Am base-fret 1 frets x 0 2 2 1 0 fingers x 0 2 3 1 0}'
const UKE_C =
  '{define-ukulele: C base-fret 1 frets 0 0 0 3 fingers 0 0 0 3}'
const PIANO_C = '{define: C keys 0 4 7}'
const GENERIC_GUITAR = '{define: G base-fret 1 frets 3 2 0 0 0 3}'
const GENERIC_UKE = '{define: C frets 0 0 0 3}'

describe('DIR hyphenated define keys', () => {
  it('accepts define-guitar and define-ukulele as full keys', () => {
    const guitar = GUITAR_AM.match(DIR)
    expect(guitar?.[1]?.toLowerCase()).toBe('define-guitar')
    expect(guitar?.[2]?.trim().startsWith('Am')).toBe(true)

    const uke = UKE_C.match(DIR)
    expect(uke?.[1]?.toLowerCase()).toBe('define-ukulele')
    expect(uke?.[2]?.trim().startsWith('C')).toBe(true)

    const generic = PIANO_C.match(DIR)
    expect(generic?.[1]?.toLowerCase()).toBe('define')
  })
})

describe('parseDefineDirective', () => {
  it('reads frets, fingers, and base-fret on define-guitar', () => {
    const r = parseDefineDirective(GUITAR_AM)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.name).toBe('Am')
    expect(r.instrument).toBe('guitar')
    expect(r.directive).toBe('define-guitar')
    expect(r.baseFret).toBe(1)
    expect(r.frets).toEqual(['x', 0, 2, 2, 1, 0])
    expect(r.fingers).toEqual(['x', 0, 2, 3, 1, 0])
  })

  it('reads frets and fingers on define-ukulele', () => {
    const r = parseDefineDirective(UKE_C)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.name).toBe('C')
    expect(r.instrument).toBe('ukulele')
    expect(r.directive).toBe('define-ukulele')
    expect(r.frets).toEqual([0, 0, 0, 3])
    expect(r.fingers).toEqual([0, 0, 0, 3])
  })

  it('reads piano keys on generic define', () => {
    const r = parseDefineDirective(PIANO_C)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.name).toBe('C')
    expect(r.instrument).toBe('piano')
    expect(r.keys).toEqual([0, 4, 7])
    expect(r.frets).toBeUndefined()
  })

  it('infers guitar from 6 frets on generic define', () => {
    const r = parseDefineDirective(GENERIC_GUITAR)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.instrument).toBe('guitar')
    expect(r.directive).toBe('define')
    expect(r.frets).toHaveLength(6)
  })

  it('infers ukulele from 4 frets on generic define', () => {
    const r = parseDefineDirective(GENERIC_UKE)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.instrument).toBe('ukulele')
    expect(r.frets).toHaveLength(4)
  })

  it('keeps keys and guitar voicing on a mixed generic define', () => {
    const raw = '{define: C base-fret 1 frets 3 2 0 0 0 3 keys 0 4 7}'
    const r = parseDefineDirective(raw)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.instrument).toBe('piano')
    expect(r.directive).toBe('define')
    expect(r.frets).toEqual([3, 2, 0, 0, 0, 3])
    expect(r.baseFret).toBe(1)
    expect(r.keys).toEqual([0, 4, 7])
    const out = serializeDefine(r)
    expect(out).toContain('frets 3 2 0 0 0 3')
    expect(out).toContain('keys 0 4 7')
    expect(out).toContain('base-fret 1')
    expect(parseDefineDirective(out).class).toBe('parse')
  })

  it('treats unknown fret arity as miss', () => {
    expect(parseDefineDirective('{define: Am frets 0 1 2}').class).toBe('miss')
    expect(parseDefineDirective('{define: Am frets 0 1 2 3 4}').class).toBe('miss')
    expect(parseDefineDirective('{define: Am}').class).toBe('miss')
    expect(parseDefineDirective('{define: Am base-fret 1}').class).toBe('miss')
  })

  it('misses define-guitar without six frets', () => {
    expect(parseDefineDirective('{define-guitar: Am keys 0 4 7}').class).toBe('miss')
    expect(parseDefineDirective('{define-guitar: Am frets 0 0 0 3}').class).toBe('miss')
  })
})

describe('serializeDefine', () => {
  it('emits ChordPro text that round-trips', () => {
    const r = parseDefineDirective(GUITAR_AM)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const out = serializeDefine(r)
    expect(out).toMatch(/^\{define-guitar:\s/)
    expect(out).toContain('Am')
    expect(out).toContain('base-fret 1')
    expect(out).toContain('frets x 0 2 2 1 0')
    expect(out).toContain('fingers x 0 2 3 1 0')
    expect(parseDefineDirective(out)).toEqual(r)
  })

  it('emits piano keys on generic define', () => {
    const r = parseDefineDirective(PIANO_C)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const out = serializeDefine(r)
    expect(out).toBe('{define: C keys 0 4 7}')
  })
})

describe('parse() exposes defines', () => {
  it('collects hyphenated defines and keeps them out of lyrics', () => {
    const src = `{title:X}\n${GUITAR_AM}\n[Am]oi`
    const view = parse(src)
    expect(view.defines).toHaveLength(1)
    expect(view.defines[0]).toMatchObject({ name: 'Am', instrument: 'guitar' })
    const lyrics = view.sections.flatMap((s) => s.lines).filter((l) => l.type === 'lyrics')
    expect(lyrics).toHaveLength(1)
    if (lyrics[0]?.type !== 'lyrics') return
    expect(lyrics[0].words.some((w) => /define/.test(w.lyric))).toBe(false)
    expect(lyrics[0].words.some((w) => w.chord === 'Am')).toBe(true)
  })

  it('is exported from src/core/index.ts', () => {
    expect(typeof parseDefineDirective).toBe('function')
    expect(typeof serializeDefine).toBe('function')
  })
})

describe('writeDefines', () => {
  it('places the define block after META_KEYS header and before lyrics', () => {
    const r = parseDefineDirective(GUITAR_AM)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const src = '{title:X}\n{key:G}\n\n[G]letra\n{c:(nota)}'
    const out = writeDefines(src, [r])
    const lines = out.split('\n')
    const keyAt = lines.findIndex((l) => l.startsWith('{key:'))
    const defAt = lines.findIndex((l) => l.startsWith('{define-guitar:'))
    const lyricAt = lines.findIndex((l) => l.includes('[G]letra'))
    expect(defAt).toBeGreaterThan(keyAt)
    expect(lyricAt).toBeGreaterThan(defAt)
    expect(out).toContain('{title:X}')
    expect(out.match(/\{define-guitar:/g)).toHaveLength(1)
  })

  it('replaces existing define lines instead of stacking them', () => {
    const r = parseDefineDirective(GUITAR_AM)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const src = `{title:X}\n${UKE_C}\n[G]letra`
    const out = writeDefines(src, [r])
    expect(out).toContain('{define-guitar:')
    expect(out).not.toContain('{define-ukulele:')
  })
})

describe('writeMeta keeps defines', () => {
  it('leaves define lines in place and does not list them in META_KEYS', () => {
    const src = `{title:X}\n{key:G}\n${GUITAR_AM}\n[Am]oi`
    const out = writeMeta(src, { title: 'Y', key: 'G' })
    expect(out).toContain('{define-guitar:')
    expect(out).toContain('Am')
    expect(out).toContain('[Am]oi')
    expect(out).toContain('{title:Y}')
    expect(META_KEYS as readonly string[]).not.toContain('define')
    expect(META_KEYS as readonly string[]).not.toContain('define-guitar')
    expect(META_KEYS as readonly string[]).not.toContain('define-ukulele')
  })
})

describe('fixtures/define-roundtrip.cho', () => {
  it('has at least one {define-guitar:} used in tests', () => {
    const src = loadFixture('define-roundtrip.cho')
    expect(src).toMatch(/\{define-guitar:/)
    const view = parse(src)
    expect(view.defines.some((d) => d.instrument === 'guitar')).toBe(true)
  })
})

describe('transposeDefine', () => {
  it('returns null when any guitar fret is open', () => {
    const r = parseDefineDirective(GENERIC_GUITAR)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toBeNull()
  })

  it('bumps base-fret when every slot is fretted or muted', () => {
    const r = parseDefineDirective('{define-guitar: F base-fret 1 frets 1 3 3 2 1 1}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({
      name: 'G',
      baseFret: 3,
      frets: [1, 3, 3, 2, 1, 1],
    })
  })

  it('drops a barred guitar define whose base-fret would fall below 1', () => {
    const r = parseDefineDirective('{define-guitar: F base-fret 1 frets 1 3 3 2 1 1}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, -1, false)).toBeNull()
  })

  it('keeps 0–17 piano keys as distances from the root', () => {
    const r = parseDefineDirective(PIANO_C)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const up = transposeDefine(r, 2, false)
    expect(up).toMatchObject({ name: 'D', keys: [0, 4, 7] })
    if (!up) return
    const hit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: up.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([2, 6, 9])
    expect(draw.litNotes).toEqual(['D', 'F#', 'A'])

    const b = parseDefineDirective('{define: B keys 0 4 7}')
    expect(b.class).toBe('parse')
    if (b.class !== 'parse') return
    const bUp = transposeDefine(b, 1, false)
    expect(bUp).toMatchObject({ name: 'C', keys: [0, 4, 7] })
    if (!bUp) return
    const bHit = resolveDiagram({ token: bUp.name, instrument: 'piano', overrides: [bUp] })
    expect(bHit.class).toBe('hit')
    if (bHit.class !== 'hit') return
    const bDraw = drawDiagram({ instrument: 'piano', voicing: bHit.voicing, token: bUp.name })
    expect(bDraw.kind).toBe('piano')
    if (bDraw.kind !== 'piano') return
    expect(bDraw.lit).toEqual([0, 4, 7])
    expect(bDraw.litNotes).toEqual(['C', 'E', 'G'])

    const spelled = parseDefineDirective('{define: B keys 11 3 6}')
    expect(spelled.class).toBe('parse')
    if (spelled.class !== 'parse') return
    expect(transposeDefine(spelled, 1, false)).toMatchObject({ name: 'C', keys: [11, 3, 6] })
    const spelledHit = resolveDiagram({ token: 'B', instrument: 'piano', overrides: [spelled] })
    expect(spelledHit.class).toBe('hit')
    if (spelledHit.class !== 'hit') return
    const spelledDraw = drawDiagram({ instrument: 'piano', voicing: spelledHit.voicing, token: 'B' })
    expect(spelledDraw.kind).toBe('piano')
    if (spelledDraw.kind !== 'piano') return
    expect(spelledDraw.lit).toEqual([10, 2, 5])
    expect(spelledDraw.litNotes).toEqual(['A#', 'D', 'F'])
  })

  it('adds n without wrapping keys outside 0–11', () => {
    const r = parseDefineDirective('{define: C keys 48 52 55}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({ name: 'D', keys: [50, 54, 57] })
  })

  it('keeps D major distances when the name moves to E', () => {
    const r = parseDefineDirective('{define: D keys 0 4 7}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const up = transposeDefine(r, 2, false)
    expect(up).toMatchObject({ name: 'E', keys: [0, 4, 7] })
    if (!up) return
    const hit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: up.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([4, 8, 11])
    expect(draw.litNotes).toEqual(['E', 'G#', 'B'])
  })

  it('keeps F7sus4 distances when the name moves to G7sus4', () => {
    const r = parseDefineDirective('{define: F7sus4 keys 0 5 10}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const plain = resolveDiagram({ token: 'F7sus4', instrument: 'piano', overrides: [r] })
    expect(plain.class).toBe('hit')
    if (plain.class !== 'hit') return
    const plainDraw = drawDiagram({ instrument: 'piano', voicing: plain.voicing, token: 'F7sus4' })
    expect(plainDraw.kind).toBe('piano')
    if (plainDraw.kind !== 'piano') return
    expect(plainDraw.lit).toEqual([5, 10, 3])
    expect(plainDraw.litNotes).toEqual(['F', 'A#', 'D#'])
    const up = transposeDefine(r, 2, false)
    expect(up).toMatchObject({ name: 'G7sus4', keys: [0, 5, 10] })
    if (!up) return
    const hit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: up.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([7, 0, 5])
    expect(draw.litNotes).toEqual(['G', 'C', 'F'])
  })

  it('keeps Dsus2 distances through +3 and back', () => {
    const r = parseDefineDirective('{define: Dsus2 keys 0 7}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const up = transposeDefine(r, 3, false)
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

  it('keeps Dsus2 distances through +5 and back', () => {
    const r = parseDefineDirective('{define: Dsus2 keys 0 7}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const up = transposeDefine(r, 5, false)
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

  it('keeps C keys 0 2 as distances through transpose and export', () => {
    const line = '{define: C keys 0 2}'
    const raw = parseDefineDirective(line)
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(() => transposeDefine(raw, 2, false)).not.toThrow()
    expect(transposeDefine(raw, 2, false)).toMatchObject({ name: 'D', keys: [0, 2] })

    const src = `${line}\n[C]`
    expect(() => transpose(parse(src), 2)).not.toThrow()
    expect(transpose(parse(src), 2).defines).toMatchObject([{ name: 'D', keys: [0, 2] }])
    expect(() => exportCho(src, { semitones: 2 })).not.toThrow()
    const exported = liveExport(src, 2).defines[0]
    expect(exported).toMatchObject({ name: 'D', keys: [0, 2] })
    if (!exported) return
    const hit = resolveDiagram({ token: exported.name, instrument: 'piano', overrides: [exported] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: exported.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([2, 4])
    expect(draw.litNotes).toEqual(['D', 'E'])

    const back = transposeDefine(exported, -2, false)
    expect(back).toMatchObject({ name: 'C', keys: [0, 2] })
    if (!back) return
    const backHit = resolveDiagram({ token: back.name, instrument: 'piano', overrides: [back] })
    expect(backHit.class).toBe('hit')
    if (backHit.class !== 'hit') return
    const backDraw = drawDiagram({ instrument: 'piano', voicing: backHit.voicing, token: back.name })
    expect(backDraw.kind).toBe('piano')
    if (backDraw.kind !== 'piano') return
    expect(backDraw.lit).toEqual([0, 2])
    expect(backDraw.litNotes).toEqual(['C', 'D'])
  })

  it('keeps D keys 62 64 at or above 48 after a -60 transpose and still draws D E', () => {
    const raw = parseDefineDirective('{define: D keys 62 64}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(() => transposeDefine(raw, -60, false)).not.toThrow()
    const shifted = transposeDefine(raw, -60, false)
    expect(shifted).toMatchObject({ name: 'D', keys: [50, 52] })
    expect(shifted?.keys).not.toEqual([26, 28])
    expect(shifted?.keys?.every((k) => k >= 48)).toBe(true)
    if (!shifted) return
    const hit = resolveDiagram({ token: shifted.name, instrument: 'piano', overrides: [shifted] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: shifted.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([2, 4])
    expect(draw.litNotes).toEqual(['D', 'E'])
  })

  it('keeps the ninth interval when D9 keys 0 4 7 14 move to E9', () => {
    const line = '{define: D9 keys 0 4 7 14}'
    const raw = parseDefineDirective(line)
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const plain = resolveDiagram({ token: 'D9', instrument: 'piano', overrides: [raw] })
    expect(plain.class).toBe('hit')
    if (plain.class !== 'hit') return
    const plainDraw = drawDiagram({ instrument: 'piano', voicing: plain.voicing, token: 'D9' })
    expect(plainDraw.kind).toBe('piano')
    if (plainDraw.kind !== 'piano') return
    expect(plainDraw.lit).toEqual([2, 6, 9, 4])
    expect(plainDraw.litNotes).toEqual(['D', 'F#', 'A', 'E'])
    expect(() => transposeDefine(raw, 2, false)).not.toThrow()
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

    const src = `${line}\n[D9]`
    expect(() => exportCho(src, { semitones: 2 })).not.toThrow()
    const exported = liveExport(src, 2).defines[0]
    expect(exported).toMatchObject({ name: 'E9', keys: [0, 4, 7, 14] })
  })

  it('adds n to MIDI keys 48 50 and draws the shifted classes', () => {
    const raw = parseDefineDirective('{define: C keys 48 50}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const up = transposeDefine(raw, 2, false)
    expect(up).toMatchObject({ name: 'D', keys: [50, 52] })
    if (!up) return
    const hit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: up.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([2, 4])
    expect(draw.litNotes).toEqual(['D', 'E'])
  })

  it('keeps wide MIDI spacing when C keys 60 64 79 move by 2', () => {
    const raw = parseDefineDirective('{define: C keys 60 64 79}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const up = transposeDefine(raw, 2, false)
    expect(up).toMatchObject({ name: 'D', keys: [62, 66, 81] })
    if (!up) return
    expect(transposeDefine(up, -2, false)).toMatchObject({ name: 'C', keys: [60, 64, 79] })
  })

  it('keeps piano keys when open frets cannot move', () => {
    const raw = parseDefineDirective('{define: D frets x 0 0 2 3 2 keys 0 4 7}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(raw.frets).toEqual(['x', 0, 0, 2, 3, 2])
    expect(() => transposeDefine(raw, 2, false)).not.toThrow()
    const up = transposeDefine(raw, 2, false)
    expect(up).toMatchObject({ name: 'E', keys: [0, 4, 7] })
    expect(up?.frets).toBeUndefined()
    if (!up) return
    expect(serializeDefine(up)).toBe('{define: E keys 0 4 7}')
    const hit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: up.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.litNotes).toEqual(['E', 'G#', 'B'])
  })

  it('serializes dropped guitar frets as a parsable piano define', () => {
    const line = '{define-guitar: D frets x 0 0 2 3 2 keys 0 4 7}'
    const raw = parseDefineDirective(line)
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(raw.instrument).toBe('guitar')
    expect(() => transposeDefine(raw, 2, false)).not.toThrow()
    const up = transposeDefine(raw, 2, false)
    expect(up).toMatchObject({
      name: 'E',
      instrument: 'piano',
      directive: 'define',
      keys: [0, 4, 7],
    })
    expect(up?.frets).toBeUndefined()
    expect(up?.directive).not.toBe('define-guitar')
    if (!up) return
    expect(serializeDefine(up)).toBe('{define: E keys 0 4 7}')
    const again = parseDefineDirective(serializeDefine(up))
    expect(again.class).toBe('parse')
    if (again.class !== 'parse') return
    expect(again).toMatchObject({ instrument: 'piano', directive: 'define', keys: [0, 4, 7] })

    const src = `${line}\n[D]`
    expect(() => transpose(parse(src), 2)).not.toThrow()
    expect(() => exportCho(src, { semitones: 2 })).not.toThrow()
    const live = liveExport(src, 2)
    expect(live.defines[0]).toMatchObject({
      name: 'E',
      instrument: 'piano',
      directive: 'define',
      keys: [0, 4, 7],
    })
    expect(live.defines[0]?.frets).toBeUndefined()
    expect(transpose(parse(src), 2).defines).toEqual(live.defines)
  })

  it('serializes dropped ukulele frets as a parsable piano define', () => {
    const line = '{define-ukulele: C frets 0 0 0 3 keys 0 4 7}'
    const raw = parseDefineDirective(line)
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(() => transposeDefine(raw, 2, false)).not.toThrow()
    const up = transposeDefine(raw, 2, false)
    expect(up).toMatchObject({
      name: 'D',
      instrument: 'piano',
      directive: 'define',
      keys: [0, 4, 7],
    })
    expect(up?.frets).toBeUndefined()
    if (!up) return
    expect(serializeDefine(up)).toBe('{define: D keys 0 4 7}')
    expect(parseDefineDirective(serializeDefine(up)).class).toBe('parse')
    expect(liveExport(`${line}\n[C]`, 2).defines[0]).toMatchObject({
      name: 'D',
      keys: [0, 4, 7],
      instrument: 'piano',
      directive: 'define',
    })
  })

  it('keeps define-guitar when barred frets still move', () => {
    const raw = parseDefineDirective('{define-guitar: F base-fret 1 frets 1 3 3 2 1 1 keys 0 4 7}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const up = transposeDefine(raw, 2, false)
    expect(up).toMatchObject({
      name: 'G',
      instrument: 'guitar',
      directive: 'define-guitar',
      baseFret: 3,
      frets: [1, 3, 3, 2, 1, 1],
      keys: [0, 4, 7],
    })
    if (!up) return
    expect(serializeDefine(up)).toBe(
      '{define-guitar: G base-fret 3 frets 1 3 3 2 1 1 keys 0 4 7}',
    )
    expect(parseDefineDirective(serializeDefine(up)).class).toBe('parse')
  })

  it('keeps piano keys when a barred shape would fall below fret 1', () => {
    const raw = parseDefineDirective('{define-guitar: F base-fret 1 frets 1 3 3 2 1 1 keys 0 4 7}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(() => transposeDefine(raw, -1, false)).not.toThrow()
    const down = transposeDefine(raw, -1, false)
    expect(down).toMatchObject({
      name: 'E',
      instrument: 'piano',
      directive: 'define',
      keys: [0, 4, 7],
    })
    expect(down?.frets).toBeUndefined()
    if (!down) return
    expect(serializeDefine(down)).toBe('{define: E keys 0 4 7}')
  })

  it('does not turn distances above 17 into MIDI when guitar frets are dropped', () => {
    const raw = parseDefineDirective('{define-guitar: D frets x 0 0 2 3 2 keys 24 28 31}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(transposeDefine(raw, 2, false)).toMatchObject({
      name: 'E',
      instrument: 'piano',
      directive: 'define',
      keys: [24, 28, 31],
    })
  })

  it('still adds n to MIDI keys when guitar frets are dropped', () => {
    const raw = parseDefineDirective('{define-guitar: C frets x 0 0 2 3 2 keys 48 52 55}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(transposeDefine(raw, 2, false)).toMatchObject({
      name: 'D',
      instrument: 'piano',
      directive: 'define',
      keys: [50, 54, 57],
    })
  })

  it('does not throw when a key list is longer than 32', () => {
    const distances = Array.from({ length: 40 }, () => 0)
    const distanceLine = `{define: C keys ${distances.join(' ')}}`
    const distance = parseDefineDirective(distanceLine)
    expect(distance.class).toBe('parse')
    if (distance.class !== 'parse') return
    expect(() => transposeDefine(distance, 2, false)).not.toThrow()
    expect(transposeDefine(distance, 2, false)?.keys).toEqual(distances)

    const midi = Array.from({ length: 40 }, () => 60)
    const midiRaw = parseDefineDirective(`{define: D keys ${midi.join(' ')}}`)
    expect(midiRaw.class).toBe('parse')
    if (midiRaw.class !== 'parse') return
    expect(() => transposeDefine(midiRaw, -60, false)).not.toThrow()
    const shifted = transposeDefine(midiRaw, -60, false)
    expect(shifted?.keys).toEqual(Array.from({ length: 40 }, () => 48))
    expect(shifted?.keys?.every((k) => k >= 48)).toBe(true)
  })

  it('keeps a key above 17 as a distance when another key is in 0–17', () => {
    const raw = parseDefineDirective('{define: D keys 12 16 19}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const plain = resolveDiagram({ token: 'D', instrument: 'piano', overrides: [raw] })
    expect(plain.class).toBe('hit')
    if (plain.class !== 'hit') return
    const plainDraw = drawDiagram({ instrument: 'piano', voicing: plain.voicing, token: 'D' })
    expect(plainDraw.kind).toBe('piano')
    if (plainDraw.kind !== 'piano') return
    expect(plainDraw.lit).toEqual([2, 6, 9])
    expect(plainDraw.litNotes).toEqual(['D', 'F#', 'A'])
    expect(plainDraw.litNotes).not.toEqual(['C', 'E', 'G'])

    expect(() => transposeDefine(raw, 2, false)).not.toThrow()
    const up = transposeDefine(raw, 2, false)
    expect(up).toMatchObject({ name: 'E', keys: [12, 16, 19] })
    expect(up?.keys).not.toEqual([26, 30, 33])
    if (!up) return
    expect(serializeDefine(up)).toBe('{define: E keys 12 16 19}')
    const hit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: up.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([4, 8, 11])
    expect(draw.litNotes).toEqual(['E', 'G#', 'B'])

    const fifth = parseDefineDirective('{define: D keys 7 12 16}')
    expect(fifth.class).toBe('parse')
    if (fifth.class !== 'parse') return
    expect(transposeDefine(fifth, 2, false)).toMatchObject({ name: 'E', keys: [7, 12, 16] })
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

  it('does not let dropped guitar frets shadow an existing piano define', () => {
    const guitar = '{define-guitar: D frets x 0 0 2 3 2 keys 0 4 7}'
    const piano = '{define: D keys 0 7}'
    const src = `${guitar}\n${piano}\n[D]`
    const defines = liveExport(src, 2).defines
    expect(defines).toHaveLength(1)
    expect(defines[0]).toMatchObject({
      name: 'E',
      instrument: 'piano',
      directive: 'define',
      keys: [0, 7],
    })
    const hit = resolveDiagram({ token: 'E', instrument: 'piano', overrides: defines })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    expect(hit.voicing.keys).toEqual([0, 7])
    expect(transpose(parse(src), 2).defines).toEqual(defines)

    const alone = liveExport(`${guitar}\n[D]`, 2).defines
    expect(alone[0]).toMatchObject({ name: 'E', keys: [0, 4, 7] })
  })

  it('still emits dropped guitar frets when the piano define is a different chord', () => {
    const src = '{define-guitar: D frets x 0 0 2 3 2 keys 0 4 7}\n{define: C keys 0 7}\n[D]'
    const defines = liveExport(src, 2).defines
    expect(defines.map((d) => [d.name, d.keys])).toEqual([
      ['E', [0, 4, 7]],
      ['D', [0, 7]],
    ])
    expect(transpose(parse(src), 2).defines).toEqual(defines)
  })

  it('keeps a define that already has keys when open frets drop', () => {
    const src = '{define: D frets x 0 0 2 3 2 keys 0 4 7}\n{define: D keys 0 7}\n[D]'
    const defines = liveExport(src, 2).defines
    expect(defines.map((d) => d.keys)).toEqual([
      [0, 4, 7],
      [0, 7],
    ])
    expect(transpose(parse(src), 2).defines).toEqual(defines)
    const hit = resolveDiagram({ token: 'E', instrument: 'piano', overrides: defines })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    expect(hit.voicing.keys).toEqual([0, 4, 7])
  })

  it('drops the stringed line when the piano define is written first', () => {
    const src = '{define: D keys 0 7}\n{define-guitar: D frets x 0 0 2 3 2 keys 0 4 7}\n[D]'
    const defines = liveExport(src, 2).defines
    expect(defines).toHaveLength(1)
    expect(defines[0]).toMatchObject({ keys: [0, 7] })
  })

  it('drops a converted ukulele define that would hide a piano define', () => {
    const src = '{define-ukulele: C frets 0 0 0 3 keys 0 4 7}\n{define: C keys 0 7}\n[C]'
    const defines = liveExport(src, 2).defines
    expect(defines).toHaveLength(1)
    expect(defines[0]).toMatchObject({ name: 'D', keys: [0, 7] })
  })

  it('drops a converted guitar alias that would hide a piano define', () => {
    const src =
      '{define-guitar: Cmaj7 frets x 0 0 2 3 2 keys 0 4 7 11}\n{define: C7M keys 0 4 7 11}'
    const defines = liveExport(src, 2).defines
    expect(defines).toHaveLength(1)
    expect(defines[0]).toMatchObject({ name: 'D7M', keys: [0, 4, 7, 11] })
    expect(transpose(parse(src), 2).defines).toEqual(defines)

    const flipped =
      '{define-guitar: C7M frets x 0 0 2 3 2 keys 0 4 7 11}\n{define: Cmaj7 keys 0 4 7 11}'
    const flippedDefines = liveExport(flipped, 2).defines
    expect(flippedDefines).toHaveLength(1)
    expect(flippedDefines[0]).toMatchObject({ name: 'Dmaj7', keys: [0, 4, 7, 11] })
  })

  it('transposes defines inside tab and score without the outside collision', () => {
    const blocks = [
      ['{start_of_tab}', '{end_of_tab}'],
      ['{sot}', '{eot}'],
      ['{start_of_score}', '{end_of_score}'],
      ['{sos}', '{eos}'],
    ] as const
    for (const [open, close] of blocks) {
      const src = [
        '{define-guitar: D frets x 0 0 2 3 2 keys 0 4 7}',
        open,
        '{define: D keys 0 7}',
        close,
        '[D]',
      ].join('\n')
      const defines = liveExport(src, 2).defines
      expect(defines, open).toHaveLength(1)
      expect(defines[0], open).toMatchObject({ name: 'E', keys: [0, 4, 7] })
      expect(transpose(parse(src), 2).defines, open).toEqual(defines)
    }

    const insideGuitar = [
      '{define: D keys 0 7}',
      '{start_of_tab}',
      '{define-guitar: D frets x 0 0 2 3 2 keys 0 4 7}',
      '{end_of_tab}',
      '{start_of_score}',
      '{define-ukulele: D frets 0 0 0 3 keys 0 4 7}',
      '{end_of_score}',
      '[D]',
    ].join('\n')
    const kept = liveExport(insideGuitar, 2).defines
    expect(kept).toHaveLength(1)
    expect(kept[0]).toMatchObject({ name: 'E', keys: [0, 7] })
    expect(transpose(parse(insideGuitar), 2).defines).toEqual(kept)
  })
})

describe('transpose/setKey apply the same define rewrite as export', () => {
  it('drops the open-G override from view.defines', () => {
    const src = loadFixture('define-roundtrip.cho')
    const view = parse(src)
    expect(view.defines).toHaveLength(1)
    expect(transpose(view, 2).defines).toEqual([])
    expect(setKey(view, 'A').defines).toEqual([])
  })
})

describe('rewriteToKey rewrites define lines before writeMeta', () => {
  it('omits an open-string guitar define', () => {
    const src = '{title:X}\n{key:G}\n{define-guitar: G base-fret 1 frets 3 2 0 0 0 3}\n[G]oi'
    const r = rewriteToKey(src, 'A')
    expect(r).not.toBeNull()
    expect(r!.source).not.toMatch(/\{define-guitar:/)
    expect(r!.source).toMatch(/\[A\]/)
    expect(r!.source).toMatch(/\{key:A\}/)
  })

  it('bumps a barred guitar define with the same delta as the body', () => {
    const src = '{title:X}\n{key:C}\n{define-guitar: F base-fret 1 frets 1 3 3 2 1 1}\n[F]oi'
    const r = rewriteToKey(src, 'D')
    expect(r).not.toBeNull()
    expect(r!.source).toMatch(/\{key:D\}/)
    expect(r!.source).toMatch(/\{transpose:-2\}/)
    expect(r!.source).toMatch(/\{define-guitar:\s*G\b/)
    expect(r!.source).toContain('base-fret 3')
    expect(r!.source).toMatch(/\[G\]/)
  })
})

