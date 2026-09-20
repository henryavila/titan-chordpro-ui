import { describe, expect, it } from 'vitest'
import {
  parse,
  parseDefineDirective,
  serializeDefine,
} from '../../src/core/index'
import { DIR } from '../../src/core/define'

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
