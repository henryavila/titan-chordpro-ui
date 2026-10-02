import { describe, expect, it } from 'vitest'
import { buildChoFilename, buildPdfFilename, buildPpsxFilename, buildScoreFilename, buildSljaFilename } from '../../src/core/filenames'

describe('buildChoFilename', () => {
  it('creates filename with key', () => {
    expect(buildChoFilename('Amazing Grace', 'Am')).toBe('amazing-grace-am.cho')
  })

  it('handles null key (no key suffix)', () => {
    expect(buildChoFilename('Amazing Grace', null)).toBe('amazing-grace.cho')
  })

  it('preserves # in key', () => {
    expect(buildChoFilename('Song Title', 'C#')).toBe('song-title-c#.cho')
  })

  it('slugifies title', () => {
    expect(buildChoFilename('Hallelujah', 'C')).toBe('hallelujah-c.cho')
  })
})

describe('buildPdfFilename', () => {
  it('creates filename with cifra- prefix and tom- key prefix', () => {
    expect(buildPdfFilename('Amazing Grace', 'Am')).toBe('cifra-amazing-grace-tom-am.pdf')
  })

  it('handles null key', () => {
    expect(buildPdfFilename('Amazing Grace', null)).toBe('cifra-amazing-grace.pdf')
  })

  it('includes C# key correctly', () => {
    expect(buildPdfFilename('Lindo És', 'C#')).toBe('cifra-lindo-es-tom-c#.pdf')
  })

  it('A9 jesus title', () => {
    expect(buildPdfFilename('Jesus Tu És a Minha Vida', 'A')).toBe(
      'cifra-jesus-tu-es-a-minha-vida-tom-a.pdf',
    )
  })
})

describe('buildSljaFilename', () => {
  it('slugs the title without a key — slides are not a transposed chart', () => {
    expect(buildSljaFilename('Fala Comigo')).toBe('slides-fala-comigo.slja')
    expect(buildSljaFilename('Lindo És')).toBe('slides-lindo-es.slja')
  })
})

describe('buildPpsxFilename', () => {
  it('uses the same slug as LouvorJA with a .ppsx suffix', () => {
    expect(buildPpsxFilename('Fala Comigo')).toBe('slides-fala-comigo.ppsx')
    expect(buildPpsxFilename('Lindo És')).toBe('slides-lindo-es.ppsx')
  })
})

describe('buildScoreFilename', () => {
  it('uses the Titan block name and the original extension', () => {
    expect(buildScoreFilename('Solo de entrada', 'solos/uuid.gp')).toBe('Solo de entrada.gp')
    expect(buildScoreFilename('Melodia', 'https://cdn.example/piano.musicxml?token=1')).toBe('Melodia.musicxml')
    expect(buildScoreFilename('Intro', 'notas.gp5')).toBe('Intro.gp5')
  })

  it('falls back to Solo and the Guitar Pro extension', () => {
    expect(buildScoreFilename(undefined, 'solos/uuid.gp')).toBe('Solo.gp')
    expect(buildScoreFilename('   ', 'blob:http://localhost/abc')).toBe('Solo.gp')
    expect(buildScoreFilename('Ponte', 'solos/uuid', 'application/vnd.recordare.musicxml+xml')).toBe('Ponte.musicxml')
  })

  it('keeps the block name readable and filesystem-safe', () => {
    expect(buildScoreFilename('Solo "track=99" / ritmo', 'a.gp')).toBe('Solo track=99 ritmo.gp')
    expect(buildScoreFilename('CON', 'a.gp')).toBe('_CON.gp')
  })
})
