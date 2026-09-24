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

  it('shifts piano keys and wraps pitch-classes 0–11', () => {
    const r = parseDefineDirective(PIANO_C)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({ name: 'D', keys: [2, 6, 9] })
    const b = parseDefineDirective('{define: B keys 11 3 6}')
    expect(b.class).toBe('parse')
    if (b.class !== 'parse') return
    expect(transposeDefine(b, 1, false)).toMatchObject({ name: 'C', keys: [0, 4, 7] })
  })

  it('adds n without wrapping keys outside 0–11', () => {
    const r = parseDefineDirective('{define: C keys 48 52 55}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({ name: 'D', keys: [50, 54, 57] })
  })

  it('stores shifted sounding pitch classes for a relative piano spelling', () => {
    const r = parseDefineDirective('{define: D keys 0 4 7}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({ name: 'E', keys: [4, 8, 11] })
  })

  it('stores the sounding classes of a relative tie, not the shifted intervals', () => {
    const r = parseDefineDirective('{define: F7sus4 keys 0 5 10}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({ name: 'G7sus4', keys: [7, 0, 5] })
  })

  it('round-trips a relative sus2 through absolute pitch classes', () => {
    const r = parseDefineDirective('{define: Dsus2 keys 0 7}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const up = transposeDefine(r, 3, false)
    expect(up).toMatchObject({ name: 'Fsus2', keys: [5, 0] })
    if (!up) return
    expect(transposeDefine(up, -3, false)).toMatchObject({ name: 'Dsus2', keys: [2, 9] })
  })

  it('stores relative keys when absolute classes would be re-read on Gsus2', () => {
    const r = parseDefineDirective('{define: Dsus2 keys 0 7}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const up = transposeDefine(r, 5, false)
    expect(up).toMatchObject({ name: 'Gsus2', keys: [0, 7] })
    if (!up) return
    expect(transposeDefine(up, -5, false)).toMatchObject({ name: 'Dsus2', keys: [2, 9] })
  })

  it('stores absolute MIDI keys when C keys 0 2 do not round-trip on D', () => {
    const line = '{define: C keys 0 2}'
    const raw = parseDefineDirective(line)
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(() => transposeDefine(raw, 2, false)).not.toThrow()
    expect(transposeDefine(raw, 2, false)).toMatchObject({ name: 'D', keys: [62, 64] })

    const src = `${line}\n[C]`
    expect(() => transpose(parse(src), 2)).not.toThrow()
    expect(transpose(parse(src), 2).defines).toMatchObject([{ name: 'D', keys: [62, 64] }])
    expect(() => exportCho(src, { semitones: 2 })).not.toThrow()
    const out = exportCho(src, { semitones: 2 })
    const exported = parse(out).defines[0]
    expect(exported).toMatchObject({ name: 'D', keys: [62, 64] })
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
    expect(back).toMatchObject({ name: 'C', keys: [60, 62] })
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

  it('keeps D keys 62 64 at or above 60 after a -60 transpose', () => {
    const raw = parseDefineDirective('{define: D keys 62 64}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(() => transposeDefine(raw, -60, false)).not.toThrow()
    const shifted = transposeDefine(raw, -60, false)
    expect(shifted).toMatchObject({ name: 'D', keys: [62, 64] })
    expect(shifted?.keys?.every((k) => k >= 60)).toBe(true)
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
    const r = rewriteToKey(src, 'G')
    expect(r).not.toBeNull()
    expect(r!.source).toMatch(/\{define-guitar:\s*G\b/)
    expect(r!.source).toContain('base-fret 3')
    expect(r!.source).toMatch(/\[G\]/)
  })
})

