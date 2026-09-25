import { describe, expect, it } from 'vitest'
import { buildChoFilename, buildPdfFilename, buildSljaFilename } from '../../src/core/filenames'

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

  it('includes chartId when a named cifra is passed', () => {
    expect(buildPdfFilename('Uma', 'C', 'oferta')).toBe('cifra-uma-oferta-tom-c.pdf')
  })

  it('omits implicit default from the filename', () => {
    expect(buildPdfFilename('Uma', 'C', 'default')).toBe('cifra-uma-tom-c.pdf')
    expect(buildPdfFilename('Uma', 'C')).toBe('cifra-uma-tom-c.pdf')
  })
})

describe('buildSljaFilename', () => {
  it('slugs the title without a key — slides are not a transposed chart', () => {
    expect(buildSljaFilename('Fala Comigo')).toBe('slides-fala-comigo.slja')
    expect(buildSljaFilename('Lindo És')).toBe('slides-lindo-es.slja')
  })
})
