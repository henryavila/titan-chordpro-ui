import { describe, expect, it } from 'vitest'
import { layoutChartFull, parse, type ChartLayout, type ChartSeg } from '../../src/core'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

function songSegs(laid: ChartLayout): ChartSeg[] {
  const out: ChartSeg[] = []
  for (const b of laid.blocks) {
    if (b.kind !== 'stanza' && b.kind !== 'chorus') continue
    for (const row of b.rows) out.push(...row.segs)
  }
  return out
}

function chordsOf(laid: ChartLayout): string[] {
  return songSegs(laid).map((s) => s.chord).filter(Boolean)
}

describe('capo dual vs capo sozinho', () => {
  const view = parse(loadFixture(JESUS_1))

  it('dual keeps concert chords and draws the capo shape above them', () => {
    const laid = layoutChartFull(view, { capo: 2, dual: true })
    expect(laid.twin).toBe(true)
    expect(laid.legend?.real).toBe('G')
    expect(laid.legend?.shape).toBe('F')
    expect(laid.legend?.pairs[0]).toEqual({ real: 'G', shape: 'F' })
    const first = songSegs(laid).find((s) => s.chord)
    expect(first).toMatchObject({ chord: 'G', shape: 'F', hasShape: true })
    expect(chordsOf(laid)).toContain('G')
    expect(chordsOf(laid)).toContain('C')
    expect(chordsOf(laid)).not.toContain('F')
  })

  it('lists every distinct song chord as a real→shape pair, without repeats', () => {
    const laid = layoutChartFull(view, { capo: 2, dual: true })
    const pairs = laid.capoPairs
    expect(pairs.length).toBeGreaterThan(4)
    expect(pairs[0]).toEqual({ real: 'G', shape: 'F' })
    expect(pairs.find((p) => p.real === 'C')).toEqual({ real: 'C', shape: 'A#' })
    expect(pairs.find((p) => p.real === 'Em')).toEqual({ real: 'Em', shape: 'Dm' })
    const reals = pairs.map((p) => p.real)
    expect(new Set(reals).size).toBe(reals.length)
    expect(laid.legend?.pairs).toEqual(pairs)
  })

  it('without dual the chart itself becomes the capo shapes — the duo partner is not reading along', () => {
    const dual = layoutChartFull(view, { capo: 2, dual: true })
    const solo = layoutChartFull(view, { capo: 2, dual: false })
    expect(solo.twin).toBe(false)
    expect(solo.legend).toBeNull()
    expect(solo.capoPairs.length).toBeGreaterThan(4)
    expect(solo.capoPairs).toEqual(dual.capoPairs)
    const dualSegs = songSegs(dual)
    const soloSegs = songSegs(solo)
    expect(soloSegs).toHaveLength(dualSegs.length)
    for (let i = 0; i < dualSegs.length; i++) {
      const d = dualSegs[i]!
      const s = soloSegs[i]!
      if (!d.chord) {
        expect(s.chord).toBe('')
        expect(s.hasShape).toBe(false)
        continue
      }
      expect(s.hasShape).toBe(false)
      expect(s.shape).toBe('')
      expect(s.chord).toBe(d.shape)
    }
    expect(chordsOf(solo)[0]).toBe('F')
    expect(chordsOf(dual)).toContain('A')
    expect(chordsOf(solo)).toContain('G')
  })

  it('omitting dual keeps the two-chart map — that is the default when a capo goes on', () => {
    const laid = layoutChartFull(view, { capo: 2 })
    expect(laid.twin).toBe(true)
    expect(laid.legend?.real).toBe('G')
    expect(laid.capoPairs[0]?.shape).toBe('F')
    expect(chordsOf(laid)[0]).toBe('G')
  })

  it('capo 0 never rewrites, even if dual is off', () => {
    const plain = layoutChartFull(view, {})
    const solo = layoutChartFull(view, { capo: 0, dual: false })
    expect(chordsOf(solo)).toEqual(chordsOf(plain))
    expect(solo.twin).toBe(false)
    expect(solo.legend).toBeNull()
  })

  it('transpose plus capo without dual stacks: +2 and capo 2 read as the written names', () => {
    const laid = layoutChartFull(view, { semitones: 2, capo: 2, dual: false })
    expect(laid.twin).toBe(false)
    expect(chordsOf(laid)[0]).toBe('G')
    expect(chordsOf(laid)).toContain('C')
  })

  it('capo 1 without dual drops a single semitone on every chord', () => {
    const dual = layoutChartFull(view, { capo: 1, dual: true })
    const solo = layoutChartFull(view, { capo: 1, dual: false })
    expect(chordsOf(solo)[0]).toBe(songSegs(dual).find((s) => s.chord)?.shape)
    expect(chordsOf(solo)[0]).toBe('F#')
  })

  it('nashville stays in degrees of the sounding key, even with capo and dual off', () => {
    const laid = layoutChartFull(view, { capo: 2, dual: false, lens: 'nashville' })
    expect(laid.twin).toBe(false)
    expect(chordsOf(laid)[0]).toBe('1')
    expect(songSegs(laid).every((s) => !s.hasShape)).toBe(true)
  })

  it('does not rewrite while editing — the source stays the concert chart', () => {
    const laid = layoutChartFull(view, { capo: 2, dual: false, editing: true })
    expect(laid.twin).toBe(false)
    expect(chordsOf(laid)[0]).toBe('G')
    expect(songSegs(laid).every((s) => !s.hasShape)).toBe(true)
  })

  it('#capo:n! on a block rewrites that block to shapes, like song dual off', () => {
    const src = ['{title: T}', '{key: G}', '', '#capo:2!', '[G]hey [C]you', '', '[D]plain'].join('\n')
    const laid = layoutChartFull(parse(src), {})
    const blocks = laid.blocks.filter((b) => b.kind === 'stanza')
    expect(blocks).toHaveLength(2)
    const marked = blocks[0]!
    const rest = blocks[1]!
    if (marked.kind !== 'stanza' || rest.kind !== 'stanza') throw new Error('expected stanzas')
    expect(marked.shapeCapo).toBe(0)
    expect(marked.rows[0]?.segs.map((s) => s.chord)).toEqual(['F', 'A#'])
    expect(marked.rows[0]?.segs.every((s) => !s.hasShape)).toBe(true)
    expect(rest.rows[0]?.segs.map((s) => s.chord)).toEqual(['D'])
  })
})

describe('playable concert / shapeName / capoFret', () => {
  const view = parse(['{title: T}', '{key: A}', '', '[Bm]hey'].join('\n'))

  function firstPlayable(laid: ChartLayout): ChartSeg {
    const s = songSegs(laid).find((x) => x.chord)
    if (!s) throw new Error('expected a playable seg')
    return s
  }

  it('fills concert, shapeName and capoFret on every playable seg', () => {
    const laid = layoutChartFull(view, { capo: 2, dual: true })
    const segs = songSegs(laid).filter((s) => s.chord)
    expect(segs.length).toBeGreaterThan(0)
    for (const s of segs) {
      expect(s.concert).toBeTruthy()
      expect(s.shapeName).toBeTruthy()
      expect(typeof s.capoFret).toBe('number')
    }
  })

  it('capo 2 dual on source Bm yields concert Bm, shapeName Am and capoFret 2', () => {
    const laid = layoutChartFull(view, { capo: 2, dual: true })
    expect(firstPlayable(laid)).toMatchObject({
      chord: 'Bm',
      shape: 'Am',
      concert: 'Bm',
      shapeName: 'Am',
      capoFret: 2,
    })
  })

  it('capo 2 dual off still has capoFret 2 and shapeName Am', () => {
    const laid = layoutChartFull(view, { capo: 2, dual: false })
    expect(laid.twin).toBe(false)
    expect(firstPlayable(laid)).toMatchObject({
      chord: 'Am',
      shape: '',
      hasShape: false,
      concert: 'Bm',
      shapeName: 'Am',
      capoFret: 2,
    })
  })

  it('does not use shapeCapo as the draw source when dual is off', () => {
    const laid = layoutChartFull(view, { capo: 2, dual: false })
    const block = laid.blocks.find((b) => b.kind === 'stanza')
    expect(block && 'shapeCapo' in block ? block.shapeCapo : undefined).toBe(0)
    expect(firstPlayable(laid).capoFret).toBe(2)
    expect(firstPlayable(laid).shapeName).toBe('Am')
  })

  it('nashville changes the chart label only', () => {
    const laid = layoutChartFull(view, { capo: 2, dual: true, lens: 'nashville' })
    const s = firstPlayable(laid)
    expect(s.chord).toBe('2m')
    expect(s.shape).toBe('')
    expect(s.hasShape).toBe(false)
    expect(s).toMatchObject({ concert: 'Bm', shapeName: 'Am', capoFret: 2 })
  })

  it('edit still exposes playable fields even though display stays the source', () => {
    const laid = layoutChartFull(view, { capo: 2, dual: false, editing: true })
    const s = firstPlayable(laid)
    expect(s.chord).toBe('Bm')
    expect(s.shape).toBe('')
    expect(s).toMatchObject({ concert: 'Bm', shapeName: 'Am', capoFret: 2 })
  })

  it('lens letra still drops chords from the reading blocks', () => {
    const laid = layoutChartFull(view, { capo: 2, dual: true, lens: 'letra' })
    const segs = songSegs(laid)
    expect(segs.some((s) => /hey/i.test(s.text))).toBe(true)
    for (const s of segs) {
      expect(s.chord).toBe('')
      expect(s.shape).toBe('')
      expect(s.hasShape).toBe(false)
    }
  })

  it('#capo:2 on a block fills capoFret from that block, not the song', () => {
    const src = ['{title: T}', '{key: A}', '', '#capo:2', '[Bm]hey', '', '[D]plain'].join('\n')
    const laid = layoutChartFull(parse(src), {})
    const blocks = laid.blocks.filter((b) => b.kind === 'stanza')
    expect(blocks).toHaveLength(2)
    const marked = blocks[0]!
    const rest = blocks[1]!
    if (marked.kind !== 'stanza' || rest.kind !== 'stanza') throw new Error('expected stanzas')
    expect(marked.rows[0]?.segs.find((s) => s.chord)).toMatchObject({
      concert: 'Bm',
      shapeName: 'Am',
      capoFret: 2,
    })
    expect(rest.rows[0]?.segs.find((s) => s.chord)).toMatchObject({
      concert: 'D',
      shapeName: 'D',
      capoFret: 0,
    })
  })
})
