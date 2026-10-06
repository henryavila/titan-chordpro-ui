import { describe, expect, it } from 'vitest'
import { lyricsForSlides, parse } from '../../src/core'
import { planSlides } from '../../src/slides'
import { loadFixture } from '../helpers/load-fixture'

describe('planSlides — the chart already wrote the phrasing', () => {
  it('never glues two source rows into one slide line', () => {
    const slides = planSlides([
      { text: 'Santo é Teu nome,', sectionIndex: 0 },
      { text: 'Pai', sectionIndex: 0 },
    ])
    expect(slides).toEqual([{ lines: ['Santo é Teu nome,', 'Pai'], auxText: '' }])
  })

  it('packs two short source rows on one slide', () => {
    const slides = planSlides([
      { text: 'Fala comigo', sectionIndex: 0 },
      { text: 'fala comigo', sectionIndex: 0 },
    ])
    expect(slides[0]?.lines).toEqual(['Fala comigo', 'fala comigo'])
  })

  it('splits a packed chart line on the author’s mid-line capital', () => {
    const slides = planSlides([
      {
        text: 'Toma Teu lugar de honra Queremos Tua Presença aqui',
        sectionIndex: 0,
      },
    ])
    expect(slides).toEqual([
      {
        lines: ['Toma Teu lugar de honra', 'Queremos Tua Presença aqui'],
        auxText: '',
      },
    ])
  })

  it('splits a packed chart line on a mid-line capital even when it fits the width', () => {
    const slides = planSlides([
      { text: 'És o meu refúgio Minha fortaleza', sectionIndex: 0 },
      { text: 'Meu socorro eterno És o meu abrigo', sectionIndex: 0 },
    ])
    expect(slides.map((s) => [...s.lines])).toEqual([
      ['És o meu refúgio', 'Minha fortaleza'],
      ['Meu socorro eterno', 'És o meu abrigo'],
    ])
  })

  it('does not pack two long independent rows onto one slide', () => {
    const slides = planSlides([
      { text: 'Cristo é a Rocha da minha salvação', sectionIndex: 0 },
      { text: 'Com ele não há mais condenação', sectionIndex: 0 },
    ])
    expect(slides.map((s) => [...s.lines])).toEqual([
      ['Cristo é a Rocha da minha salvação'],
      ['Com ele não há mais condenação'],
    ])
  })

  it('does not mix a wrapped source row with the next row', () => {
    const slides = planSlides([
      {
        text: 'Toma Teu lugar de honra Queremos Tua Presença aqui',
        sectionIndex: 0,
      },
      { text: 'Fala ao meu coração', sectionIndex: 0 },
    ])
    expect(slides.map((s) => [...s.lines])).toEqual([
      ['Toma Teu lugar de honra', 'Queremos Tua Presença aqui'],
      ['Fala ao meu coração'],
    ])
  })

  it('treats a section boundary as a hard slide break', () => {
    const slides = planSlides([
      { text: 'Primeira', sectionIndex: 0 },
      { text: 'Segunda', sectionIndex: 1 },
    ])
    expect(slides.map((s) => [...s.lines])).toEqual([['Primeira'], ['Segunda']])
  })

  it('collapses consecutive identical slides with (Nx)', () => {
    const slides = planSlides([
      { text: 'Fala comigo', sectionIndex: 0 },
      { text: 'Fala comigo', sectionIndex: 1 },
      { text: 'Fala comigo', sectionIndex: 2 },
    ])
    expect(slides).toEqual([{ lines: ['Fala comigo'], auxText: '(3x)' }])
  })

  it('plans Fala Comigo from the fixture’s own lines, not an inferred soup', () => {
    const rows = lyricsForSlides(parse(loadFixture('sda/101-fala-comigo.cho')))
    const slides = planSlides(rows)
    expect(slides[0]?.lines).toEqual([
      'Toma Teu lugar de honra',
      'Queremos Tua Presença aqui',
    ])
    expect(slides.some((s) => s.lines.join(' ').includes('Fala comigo'))).toBe(true)
    expect(slides.every((s) => s.lines.length <= 2)).toBe(true)
    expect(slides.every((s) => s.lines.every((line) => line.length <= 34))).toBe(true)
    const joined = slides.flatMap((s) => [...s.lines]).join('\n')
    expect(joined).not.toMatch(/INTRODUÇÃO|INTERLÚDIO/)
  })
})
