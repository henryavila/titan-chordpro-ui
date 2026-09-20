import { describe, expect, it } from 'vitest'
import { exportCho, parse, serializeDefine, transpose } from '../../src/core/index'
import { loadFixture } from '../helpers/load-fixture'

const BARRED_F =
  '{title:X}\n{key:C}\n{define-guitar: F base-fret 1 frets 1 3 3 2 1 1 fingers 1 3 4 2 1 1}\n[F]oi'

describe('exportCho keeps define directives', () => {
  it('still contains {define-guitar:} from the source', () => {
    const src = loadFixture('define-roundtrip.cho')
    expect(src).toMatch(/\{define-guitar:/)
    const out = exportCho(src)
    expect(out).toMatch(/\{define-guitar:/)
    expect(out).toContain('[G]')
  })

  it('omits an open-string guitar define instead of relabelling the G shape as A', () => {
    const src = loadFixture('define-roundtrip.cho')
    expect(src).toMatch(/\{define-guitar:\s*G\b[^}]*frets 3 2 0 0 0 3/)
    const out = exportCho(src, { semitones: 2 })
    expect(out).toMatch(/\[A\]/)
    expect(out).toMatch(/\[D\]/)
    expect(out).toMatch(/\[E\]/)
    expect(out).not.toMatch(/\{define-guitar:\s*G\b/)
    expect(out).not.toMatch(/\{define-guitar:\s*A\b/)
    expect(out).not.toMatch(/\{define-guitar:[^}]*frets 3 2 0 0 0 3/)
  })

  it('bumps base-fret on a fully-fretted guitar define and rewrites the name', () => {
    const out = exportCho(BARRED_F, { semitones: 2 })
    expect(out).toMatch(/\{define-guitar:\s*G\b/)
    expect(out).toContain('base-fret 3')
    expect(out).toContain('frets 1 3 3 2 1 1')
    expect(out).toContain('fingers 1 3 4 2 1 1')
    expect(out).toMatch(/\[G\]/)
  })

  it('rewrites piano define names and shifts keys as pitch-classes', () => {
    const src = '{title:X}\n{key:C}\n{define: C keys 0 4 7}\n[C]oi'
    const out = exportCho(src, { semitones: 2 })
    expect(out).toContain('{define: D keys 2 6 9}')
    expect(out).toMatch(/\[D\]/)
  })

  it('omits an open-string ukulele define from transposed export', () => {
    const src = '{title:X}\n{key:C}\n{define-ukulele: C base-fret 1 frets 0 0 0 3}\n[C]oi'
    const out = exportCho(src, { semitones: 2 })
    expect(out).not.toMatch(/\{define-ukulele:/)
    expect(out).toMatch(/\[D\]/)
  })

  it('agrees with transpose() on view.defines', () => {
    const src = loadFixture('define-roundtrip.cho')
    const view = transpose(parse(src), 2)
    const out = exportCho(src, { semitones: 2 })
    expect(view.defines).toEqual(parse(out).defines)
    expect(view.defines).toEqual([])

    const barred = transpose(parse(BARRED_F), 2)
    const barredOut = exportCho(BARRED_F, { semitones: 2 })
    expect(barred.defines).toHaveLength(1)
    expect(serializeDefine(barred.defines[0]!)).toBe(
      '{define-guitar: G base-fret 3 frets 1 3 3 2 1 1 fingers 1 3 4 2 1 1}',
    )
    expect(barred.defines).toEqual(parse(barredOut).defines)
  })
})
