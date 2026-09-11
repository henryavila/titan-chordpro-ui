import { describe, expect, it } from 'vitest'
import { exportLyrics, lyricsForSlides, lyricsText, parse } from '../../src/core'
import { loadFixture } from '../helpers/load-fixture'

describe('lyricsForSlides', () => {
  it('keeps the chart’s sung lines and drops chords, x/// and comments', () => {
    const view = parse(`{title: Teste}
{c:(INTRODUÇÃO)}
[G]x///    [C]x///

[C9]Toma Teu lugar de honra Que[G]remos Tua Presença aqui
Fala ao meu [Dm7]coração Fala ao meu [F]coração

{soc}
[C9]Fala comigo [F]fala comigo [C]x///
{eoc}
`)
    const rows = lyricsForSlides(view)
    expect(rows.map((r) => r.text)).toEqual([
      'Toma Teu lugar de honra Queremos Tua Presença aqui',
      'Fala ao meu coração Fala ao meu coração',
      'Fala comigo fala comigo',
    ])
    expect(rows.map((r) => r.sectionIndex)).toEqual([0, 0, 1])
    expect(rows.some((r) => /INTRODUÇÃO|[xX/]|\[/.test(r.text))).toBe(false)
  })

  it('does not invent a blob: two source lines stay two rows', () => {
    const view = parse(`Santo é Teu [G]nome,
[C]Pai
`)
    const rows = lyricsForSlides(view)
    expect(rows.map((r) => r.text)).toEqual(['Santo é Teu nome,', 'Pai'])
  })

  it('uses a real fixture — comments and played-only rows stay out', () => {
    const view = parse(loadFixture('sda/101-fala-comigo.cho'))
    const rows = lyricsForSlides(view)
    const text = rows.map((r) => r.text).join('\n')
    expect(text).toContain('Toma Teu lugar de honra')
    expect(text).toContain('Fala comigo')
    expect(text).not.toMatch(/INTRODUÇÃO|INTERLÚDIO|ÁPICE/)
    expect(text).not.toMatch(/\[/)
    expect(text).not.toMatch(/\bx\/+/)
    expect(rows.length).toBeGreaterThan(8)
    expect(new Set(rows.map((r) => r.sectionIndex)).size).toBeGreaterThan(1)
  })
})

describe('exportLyrics — host cadastra a letra sem montar o viewer', () => {
  it('returns plaintext with section gaps, no chords or comments', () => {
    const { title, artist, lyrics } = exportLyrics(`{title: Teste}
{artist: Alguém}
{c:(INTRODUÇÃO)}
[G]x///

[C9]Toma Teu lugar de honra Que[G]remos Tua Presença aqui
Fala ao meu [Dm7]coração

{soc}
[C9]Fala comigo [F]fala comigo
{eoc}
`)
    expect(title).toBe('Teste')
    expect(artist).toBe('Alguém')
    expect(lyrics).toBe(
      [
        'Toma Teu lugar de honra Queremos Tua Presença aqui',
        'Fala ao meu coração',
        '',
        'Fala comigo fala comigo',
      ].join('\n'),
    )
    expect(lyrics).not.toMatch(/INTRODUÇÃO|\[|[xX]\/+/)
  })

  it('reads title and artist from a real fixture', () => {
    const file = exportLyrics(loadFixture('sda/101-fala-comigo.cho'))
    expect(file.title).toMatch(/Fala Comigo/)
    expect(file.artist).toBe('Sérgio Saas')
    expect(file.lyrics).toContain('Toma Teu lugar de honra')
    expect(file.lyrics).toContain('Fala comigo')
    expect(file.lyrics).not.toMatch(/INTRODUÇÃO|INTERLÚDIO/)
  })

  it('returns empty lyrics for a voiceless chart instead of throwing', () => {
    const file = exportLyrics('{title: Intro}\n{c:intro}\n[G]x///\n')
    expect(file.title).toBe('Intro')
    expect(file.lyrics).toBe('')
  })
})

describe('lyricsText', () => {
  it('inserts a blank line at each chart section', () => {
    const text = lyricsText(
      parse(`Primeira [G]linha

{soc}
Refrão [C]aqui
{eoc}
`),
    )
    expect(text).toBe('Primeira linha\n\nRefrão aqui')
  })
})
