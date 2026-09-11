import { describe, expect, it } from 'vitest'
import { lintSource, patchMeta } from '../../src/core/index'

describe('lintSource', () => {
  it('reports a clean chart in the designer’s words', () => {
    const r = lintSource('{title: T}\n{soc}\n[C]a\n{eoc}\n')
    expect(r.ok).toBe(true)
    expect(r.message).toBe('Estrutura consistente — diretivas fechadas.')
    expect(r.issues).toEqual([])
  })

  it('names each unbalanced pair with its counts', () => {
    const r = lintSource('{soc}\n[C]a\n{soc}\n{eoc}\n')
    expect(r.ok).toBe(false)
    expect(r.issues).toContain('refrão sem fechar (2 {soc} × 1 {eoc})')
  })

  it('catches unclosed tabs, scores and chord brackets', () => {
    expect(lintSource('{sot}\nE|---|').issues).toContain('tab sem fechar (1 {sot} × 0 {eot})')
    expect(lintSource('{sos}\n| c4:q |').issues).toContain('partitura sem fechar (1 {sos} × 0 {eos})')
    expect(lintSource('[C a').issues).toContain('colchete de acorde sem par')
  })

  it('flags a key that is not a note name', () => {
    expect(lintSource('{key: Hm}').issues).toContain('tom não reconhecido: Hm')
    expect(lintSource('{key: Bb}').ok).toBe(true)
  })

  it('joins several findings into one footer line', () => {
    const r = lintSource('{soc}\n[C a')
    expect(r.message.split(' · ').length).toBe(2)
  })

  it('flags a voiceless line that has chords and no x///', () => {
    const r = lintSource('{title: T}\n{c:Intro}\n[G] [C] [D]\n\n[G]uma letra\n')
    expect(r.ok).toBe(false)
    expect(r.issues).toContain('trecho sem voz sem x/// (1 linha)')
  })

  it('accepts the same intro when it writes the marks', () => {
    const r = lintSource('{title: T}\n{c:Intro}\n[G]x///    [C]x///\n\n[G]uma letra\n')
    expect(r.issues.filter((i) => i.includes('x///'))).toEqual([])
  })

  it('does not treat a sung tail as a missing intro', () => {
    const r = lintSource('[D]Preciso ouvir Tua [A]voz [B]x///\n')
    expect(r.issues.filter((i) => i.includes('x///'))).toEqual([])
  })

  it('does not read TAB mute x as a missing time mark', () => {
    const r = lintSource('{sot}\nE|--x--|\n{eot}\n[G]letra\n')
    expect(r.issues.filter((i) => i.includes('x///'))).toEqual([])
  })
})

describe('patchMeta', () => {
  const src = '{title: A}\n{key: G}\n\n[G]hey'

  it('replaces a directive in place', () => {
    expect(patchMeta(src, { title: 'B' })).toBe('{title: B}\n{key: G}\n\n[G]hey')
  })

  it('adds a missing directive right after the last meta line', () => {
    expect(patchMeta(src, { subtitle: 'sub' })).toBe('{title: A}\n{key: G}\n{subtitle: sub}\n\n[G]hey')
  })

  it('removes the directive when the value is cleared', () => {
    expect(patchMeta(src, { key: '' })).toBe('{title: A}\n\n[G]hey')
  })

  it('leaves the chart alone when nothing is passed', () => {
    expect(patchMeta(src, {})).toBe(src)
    expect(patchMeta(src, { title: undefined })).toBe(src)
  })

  it('recognises the short aliases so a chart keeps one title', () => {
    expect(patchMeta('{t: A}\n[G]hey', { title: 'B' })).toBe('{title: B}\n[G]hey')
  })

  it('writes into a chart with no meta at all', () => {
    expect(patchMeta('[G]hey', { title: 'T' })).toBe('{title: T}\n[G]hey')
  })

  it('writes duration and time the same way as title', () => {
    expect(patchMeta(src, { duration: '04:26', time: '4/4' })).toBe(
      '{title: A}\n{key: G}\n{duration: 04:26}\n{time: 4/4}\n\n[G]hey',
    )
  })
})
