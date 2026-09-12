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

/** Tiny charts that reproduce production leaks — expected values from MARCAS-X. */
function letraPlains(src: string): string[] {
  return layoutChartFull(parse(src), { lens: 'letra' }).blocks.flatMap((b) =>
    b.kind === 'stanza' || b.kind === 'chorus' ? b.rows.map((r) => r.plain) : [],
  )
}

describe('lens letra — beat marks must not leak into the lyric', () => {
  it('strips // glued after a chord that sat on punctuation (razão.[E]//)', () => {
    const plains = letraPlains('{title:t}\nrazão.[E]//')
    expect(plains).toEqual(['razão.'])
  })

  it('strips // glued after a word with no space (amigo[Em]//)', () => {
    const plains = letraPlains('{title:t}\nmeu a[C]migo[Em]//')
    expect(plains.join(' ')).toMatch(/amigo/)
    expect(plains.join(' ')).not.toMatch(/\//)
  })

  it('strips a lone x glued after a word (Amém[G]x)', () => {
    const plains = letraPlains('{title:t}\nAleluia Amém[G]x')
    expect(plains).toEqual(['Aleluia Amém'])
  })

  it('strips /_ residue that production charts leave after a chord', () => {
    const plains = letraPlains('{title:t}\nPai [D]/_')
    expect(plains.join(' ')).toBe('Pai')
    expect(plains.join(' ')).not.toMatch(/[/_]/)
  })

  it('drops a row that is only /_ — nothing to sing', () => {
    const plains = letraPlains('{title:t}\n[D]/_\nverso aqui')
    expect(plains.some((t) => t.includes('verso'))).toBe(true)
    expect(plains.every((t) => !/^[/_]+$/.test(t.trim()))).toBe(true)
  })

  it('strips /- and x... residue on a sung line', () => {
    const plains = letraPlains('{title:t}\nPai [Bm]/-\nFalar [Em]x...')
    const all = plains.join('\n')
    expect(all).toMatch(/Pai/)
    expect(all).toMatch(/Falar/)
    expect(all).not.toMatch(/\//)
    expect(all).not.toMatch(/x\.\.\./i)
  })

  it('strips Oh!x/// glued to punctuation without a chord gap', () => {
    const plains = letraPlains('{title:t}\nOh!x///')
    expect(plains).toEqual(['Oh!'])
  })

  it('keeps a slash that splits a sung word (cami/nhar)', () => {
    const plains = letraPlains('{title:t}\ncami/nhar com [G]fé')
    expect(plains.join(' ')).toMatch(/cami\/nhar/)
  })

  it('keeps the letter x inside a Portuguese word (Exaltado)', () => {
    const plains = letraPlains('{title:t}\nExaltado seja [G]o Senhor')
    expect(plains.join(' ')).toMatch(/Exaltado/)
  })

  it('mensageiro fixture: no trailing / after razão / soprar', () => {
    const plains = letraPlains(loadFixture('sda/021-mensageiro.cho'))
    const all = plains.join('\n')
    expect(all).toMatch(/razão/)
    expect(all).not.toMatch(/razão\.\//)
    expect(all).not.toMatch(/soprar\.\//)
    expect(all).not.toMatch(/[xX]\/+/)
    expect(all).not.toMatch(/(^|\s)\/+(\s|$)/)
  })
})

/**
 * Fixtures that leaked beat marks into Só letra before stripChordClock /
 * stripBeatMarks were fixed. Each row is a real chart + a lyric fragment that
 * must still be readable (so the test does not pass on an empty projection).
 * Expected: MARCAS-X — no clock marks in the lyric projection.
 */
const LEAKED_FIXTURES: { rel: string; mustKeep: RegExp }[] = [
  { rel: 'sda/021-mensageiro.cho', mustKeep: /razão/i },
  { rel: 'sda/023-em-mim.cho', mustKeep: /Senhor.*aviva|aviva Tua obra/i },
  { rel: 'sda/036-tu-es-o-meu-viver.cho', mustKeep: /amigo|contigo/i },
  { rel: 'sda/058-dez-mil-razoes.cho', mustKeep: /Santo é Teu nome/i },
  { rel: 'sda/063-digno-de-louvor.cho', mustKeep: /digno de louvor/i },
  { rel: 'sda/081-a-vida-e-tao-boa.cho', mustKeep: /passarinhos|vida é tão boa/i },
  { rel: 'sda/009-verdadeira-alegria-versao-muralhas.cho', mustKeep: /Amém|Aleluia/i },
  { rel: 'sda/054-inteiramente-fiel-h311.cho', mustKeep: /filho do Rei|inteiramente/i },
  { rel: 'sda/077-fortes.cho', mustKeep: /Senhor/i },
]

function assertNoBeatMarkLeak(all: string) {
  expect(all, 'x/// run').not.toMatch(/[xX]\/+/)
  expect(all, 'bare //').not.toMatch(/(^|\s)\/+(\s|$)/)
  expect(all, 'lone x mark').not.toMatch(/(^|\s)[xX](\s|$)/)
  expect(all, '/_ residue').not.toMatch(/\/_/)
  expect(all, '/- residue').not.toMatch(/\/-/)
  expect(all, 'x... residue').not.toMatch(/[xX]\.\.\./)
  expect(all, 'glued / after lyric or punct').not.toMatch(/(?:[\p{L}\p{N}]|[.,!;:?)])\/(?:\s|$)/u)
  expect(all, 'glued x mark after lyric or punct').not.toMatch(
    /(?:[\p{L}]|[.,!;:?)])[xX](?:\/|\s|$|\.|_|-)/u,
  )
}

describe('lens letra — production fixtures that used to leak', () => {
  it.each(LEAKED_FIXTURES)('$rel keeps lyric and drops clock marks', ({ rel, mustKeep }) => {
    const plains = letraPlains(loadFixture(rel))
    const all = plains.join('\n')
    expect(all, 'still has something to sing').toMatch(mustKeep)
    assertNoBeatMarkLeak(all)
  })
})
