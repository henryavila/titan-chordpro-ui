import { describe, expect, it } from 'vitest'
import { drawDiagram, exportCho, parse, resolveDiagram, serializeDefine, transpose } from '../../src/core/index'
import { loadFixture } from '../helpers/load-fixture'

const BARRED_F =
  '{title:X}\n{key:C}\n{define-guitar: F base-fret 1 frets 1 3 3 2 1 1 fingers 1 3 4 2 1 1}\n[F]oi'

/** Export writes `{transpose:N}` and keeps the body. The live view applies N. */
function liveExport(src: string, n: number) {
  const out = exportCho(src, { semitones: n })
  expect(out).toMatch(new RegExp(`\\{transpose:${n}\\}`))
  return { out, view: transpose(parse(out), n) }
}

describe('exportCho keeps define directives', () => {
  it('still contains {define-guitar:} from the source', () => {
    const src = loadFixture('define-roundtrip.cho')
    expect(src).toMatch(/\{define-guitar:/)
    const out = exportCho(src)
    expect(out).toMatch(/\{define-guitar:/)
    expect(out).toContain('[G]')
  })

  it('keeps an open-string guitar define in the file; the live view drops it', () => {
    const src = loadFixture('define-roundtrip.cho')
    expect(src).toMatch(/\{define-guitar:\s*G\b[^}]*frets 3 2 0 0 0 3/)
    const { out, view } = liveExport(src, 2)
    expect(out).toContain('[G]')
    expect(out).toMatch(/\{define-guitar:\s*G\b/)
    expect(view.defines).toEqual([])
  })

  it('keeps a barred guitar define in the original name; the live view bumps it', () => {
    const { out, view } = liveExport(BARRED_F, 2)
    expect(out).toMatch(/\{define-guitar:\s*F\b/)
    expect(out).toContain('base-fret 1')
    expect(out).toMatch(/\[F\]/)
    expect(view.defines).toHaveLength(1)
    expect(serializeDefine(view.defines[0]!)).toBe(
      '{define-guitar: G base-fret 3 frets 1 3 3 2 1 1 fingers 1 3 4 2 1 1}',
    )
  })

  it('keeps piano define names in the file; the live view shifts the name', () => {
    const src = '{title:X}\n{key:C}\n{define: C keys 0 4 7}\n[C]oi'
    const { out, view } = liveExport(src, 2)
    expect(out).toContain('{define: C keys 0 4 7}')
    expect(out).toMatch(/\[C\]/)
    expect(view.defines[0]).toMatchObject({ name: 'D', keys: [0, 4, 7] })
  })

  it('keeps an open-string ukulele define in the file; the live view drops it', () => {
    const src = '{title:X}\n{key:C}\n{define-ukulele: C base-fret 1 frets 0 0 0 3}\n[C]oi'
    const { out, view } = liveExport(src, 2)
    expect(out).toMatch(/\{define-ukulele:/)
    expect(out).toMatch(/\[C\]/)
    expect(view.defines).toEqual([])
  })

  it('exports a one-line Dsus2 chart at +5 that still draws G and D', () => {
    const source = '{define: Dsus2 keys 0 7}'
    const { view } = liveExport(source, 5)
    expect(view.defines).toHaveLength(1)
    const def = view.defines[0]
    expect(def).toMatchObject({ name: 'Gsus2', keys: [0, 7] })
    if (!def) return
    const hit = resolveDiagram({ token: def.name, instrument: 'piano', overrides: view.defines })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: def.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([7, 2])
    expect(draw.litNotes).toEqual(['G', 'D'])
  })

  it('agrees with transpose() on the live view defines', () => {
    const src = loadFixture('define-roundtrip.cho')
    const view = transpose(parse(src), 2)
    const { view: fromExport } = liveExport(src, 2)
    expect(view.defines).toEqual(fromExport.defines)
    expect(view.defines).toEqual([])

    const barred = transpose(parse(BARRED_F), 2)
    const { view: barredLive } = liveExport(BARRED_F, 2)
    expect(barred.defines).toHaveLength(1)
    expect(serializeDefine(barred.defines[0]!)).toBe(
      '{define-guitar: G base-fret 3 frets 1 3 3 2 1 1 fingers 1 3 4 2 1 1}',
    )
    expect(barred.defines).toEqual(barredLive.defines)
  })
})
