import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isScoreReference, layoutChart, lyricsText, parse, readScoreReference, scoreAutoScale, writeScoreReference } from '../../src/core'
import { excerptTrack, loadNotation } from '../../src/vue/chart/notation-loader'

const fixture = readFileSync('fixtures/013-ele-vive-em-mim-partitura.cho', 'utf8')
describe('external solo reference', () => {
  it('round trips escaped references and preserves the real chart and lyrics', () => {
    const ref = { src: 'solos/intro "guitarra".gp', track: 2, start: 3, end: 7 }
    const text = writeScoreReference(ref)
    expect(readScoreReference(text)).toEqual(ref)
    const view = parse(`${fixture}\n${text}`)
    expect(layoutChart(view).at(-1)).toMatchObject({ kind: 'score', text })
    expect(lyricsText(view)).toBe(lyricsText(parse(fixture)))
    expect(view.source).toContain(text)
  })
  it('does not reinterpret legacy scores; rejects malformed ranges and references', () => {
    expect(isScoreReference(fixture)).toBe(false)
    expect(readScoreReference('{sos: time=4/4}\n{eos}')).toBeNull()
    for (const ref of [
      { src: '', track: 1, start: 1 }, { src: 'a.gp', track: 0, start: 1 },
      { src: 'a.gp', track: 1, start: 2, end: 1 }, { src: 'a.gp', track: 1, start: 1.5 },
      { src: 'a\n{eos}', track: 1, start: 1 },
    ]) expect(() => writeScoreReference(ref)).toThrow()
  })
  it('keeps readable glyphs on narrow surfaces and enlarges on wider ones', () => {
    expect(scoreAutoScale(320)).toBe(1.1)
    expect(scoreAutoScale(780)).toBe(1.3)
    expect(scoreAutoScale(1400)).toBe(1.5)
  })
  it.each(['notes.gp', 'notes.gp5', 'bends.musicxml'])('imports upstream %s without flattening the notation', async name => {
    const bytes = readFileSync(`fixtures/notation/${name}`)
    const score = await loadNotation(bytes)
    expect(score.tracks.length).toBeGreaterThan(0)
    expect(score.masterBars.length).toBeGreaterThan(0)
    expect(excerptTrack(score, 1, 1, 1)).toBe(score.tracks[0])
    expect(() => excerptTrack(score, score.tracks.length + 1, 1)).toThrow()
    expect(() => excerptTrack(score, 1, 1, score.masterBars.length + 1)).toThrow()
  })
  it('rejects an invalid file', async () => {
    await expect(loadNotation(new TextEncoder().encode('not a score'))).rejects.toThrow()
  })
})
