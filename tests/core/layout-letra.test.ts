import { describe, expect, it } from 'vitest'
import { layoutChartFull, parse } from '../../src/core'
import { ELE_VIVE_IMG, ENTREGA_1, JESUS_1, loadFixture } from '../helpers/load-fixture'

const JESUS = JESUS_1
const ENTREGA = ENTREGA_1

function kinds(src: string, lens: 'none' | 'nashville' | 'letra', extra: { editing?: boolean; capo?: number; dual?: boolean } = {}) {
  return layoutChartFull(parse(loadFixture(src)), { lens, ...extra }).blocks.map((b) => b.kind)
}

function songRows(src: string, lens: 'none' | 'nashville' | 'letra') {
  return layoutChartFull(parse(loadFixture(src)), { lens }).blocks.flatMap((b) =>
    b.kind === 'stanza' || b.kind === 'chorus' ? b.rows : [],
  )
}

describe('lens letra — reading projection', () => {
  it('strips every chord from sung rows and keeps the lyric', () => {
    const rows = songRows(JESUS, 'letra')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.some((r) => r.plain.includes('Jesus'))).toBe(true)
    for (const row of rows) {
      for (const seg of row.segs) {
        expect(seg.chord).toBe('')
        expect(seg.shape).toBe('')
        expect(seg.hasShape).toBe(false)
      }
    }
  })

  it('drops rhythm-only and chord-only rows — they leave dead space in the lyric', () => {
    const plains = songRows(JESUS, 'letra').map((r) => r.plain.trim())
    expect(plains.some((t) => t.includes('Jesus'))).toBe(true)
    for (const t of plains) {
      expect(t).not.toMatch(/^[xX/\s]+$/)
      expect(t.length).toBeGreaterThan(0)
    }
  })

  it('keeps a sung line and strips the trailing x/// from the lyric', () => {
    const line = songRows(ENTREGA, 'letra')
      .map((r) => r.plain)
      .find((t) => /Preciso ouvir/.test(t))
    expect(line).toBeDefined()
    expect(line).toMatch(/Preciso ouvir/)
    expect(line).not.toMatch(/[xX]/)
    expect(line).not.toMatch(/\//)
  })

  it('strips beat marks glued to a sung line — slashes, lone x, x///', () => {
    const plains = songRows(JESUS, 'letra').map((r) => r.plain)
    const spring = plains.find((t) => /primavera/.test(t))
    expect(spring).toBeDefined()
    expect(spring).toMatch(/primavera/)
    expect(spring).not.toMatch(/\//)

    const all = plains.join('\n')
    expect(all).not.toMatch(/x\/+/)
    expect(all).not.toMatch(/(^|\s)\/+(\s|$)/)
    expect(all).not.toMatch(/(^|\s)[xX](\s|$)/)
  })

  it('does not eat a hyphen that splits a sung word', () => {
    const plains = songRows(ELE_VIVE_IMG, 'letra').map((r) => r.plain)
    const pala = plains.find((t) => /pala/.test(t) && /vra/.test(t))
    expect(pala).toBeDefined()
    expect(pala).toMatch(/pala/)
    expect(pala).toMatch(/vra/)
  })

  it('drops tab, score and image blocks', () => {
    const withCharts = kinds(ELE_VIVE_IMG, 'none')
    expect(withCharts).toEqual(expect.arrayContaining(['tab', 'score', 'image']))
    const letra = kinds(ELE_VIVE_IMG, 'letra')
    expect(letra).not.toContain('tab')
    expect(letra).not.toContain('score')
    expect(letra).not.toContain('image')
    expect(letra).toEqual(expect.arrayContaining(['stanza']))
  })

  it('leaves rehearsal comments in the reading — hide-comments is a different switch', () => {
    expect(kinds(JESUS, 'letra')).toContain('comment')
  })

  it('does not project in edit: the editor still sees chords, tab and images', () => {
    const rows = layoutChartFull(parse(loadFixture(JESUS)), { lens: 'letra', editing: true }).blocks.flatMap((b) =>
      b.kind === 'stanza' || b.kind === 'chorus' ? b.rows : [],
    )
    expect(rows.some((r) => r.segs.some((s) => s.chord === 'G'))).toBe(true)
    expect(kinds(ELE_VIVE_IMG, 'letra', { editing: true })).toEqual(
      expect.arrayContaining(['tab', 'score', 'image']),
    )
  })

  it('turns the dual capo map off — there is no chord left to map', () => {
    const laid = layoutChartFull(parse(loadFixture(JESUS)), { lens: 'letra', capo: 2, dual: true })
    expect(laid.twin).toBe(false)
    expect(laid.legend).toBeNull()
  })

  it('does not rewrite the source', () => {
    const view = parse(loadFixture(JESUS))
    layoutChartFull(view, { lens: 'letra' })
    expect(view.source).toContain('[G]')
  })
})
