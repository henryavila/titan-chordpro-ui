import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { deleteBlock, isScoreReference, layoutChart, lyricsText, parse, readScoreReference, scoreAutoScale, writeScoreReference } from '../../src/core'
import { excerptTrack, loadNotation } from '../../src/vue/chart/notation-loader'

const fixture = readFileSync('fixtures/013-ele-vive-em-mim-partitura.cho', 'utf8')
describe('external solo reference', () => {
  it('round trips escaped references and preserves the real chart and lyrics', () => {
    const ref = { src: 'solos/intro "guitarra".gp', track: 2, start: 3, end: 7 }
    const text = writeScoreReference(ref)
    expect(text).toBe('{x_titan_score: src="solos/intro \\"guitarra\\".gp" track=2 start=3 end=7}')
    expect(text.split('\n')).toHaveLength(1)
    expect(readScoreReference(text)).toEqual(ref)
    const view = parse(`${fixture}\n${text}`)
    expect(layoutChart(view).at(-1)).toMatchObject({ kind: 'score', text })
    expect(lyricsText(view)).toBe(lyricsText(parse(fixture)))
    expect(view.source).toContain(text)
  })
  it('keeps inline notation separate; rejects malformed ranges and references', () => {
    expect(isScoreReference(fixture)).toBe(false)
    expect(readScoreReference('{x_titan_start_of_score: time=4/4}\n{x_titan_end_of_score}')).toBeNull()
    for (const ref of [
      { src: '', track: 1, start: 1 }, { src: 'a.gp', track: 0, start: 1 },
      { src: 'a.gp', track: 1, start: 2, end: 1 }, { src: 'a.gp', track: 1, start: 1.5 },
      { src: 'a\n{x_titan_end_of_score}', track: 1, start: 1 },
    ]) expect(() => writeScoreReference(ref)).toThrow()
  })
  it('owns exactly one source line without consuming the following chart', () => {
    const text = writeScoreReference({ src: 'solos/notes.gp', track: 1, start: 1 })
    const source = `${text}\n${fixture}`
    const blocks = layoutChart(parse(source))
    expect(blocks[0]).toMatchObject({ kind: 'score', text, li0: 0, li1: 0 })
    expect(lyricsText(parse(source))).toBe(lyricsText(parse(fixture)))
    expect(deleteBlock(source.split('\n'), blocks, 0)?.lines.join('\n')).toBe(fixture)
    expect(() => readScoreReference(text + '\n{x_titan_end_of_score}')).toThrow()
    expect(() => readScoreReference('{x_titan_score: track=1}')).toThrow()
    expect(() => readScoreReference(text.slice(0, -1))).toThrow()
    expect(readScoreReference(text.replace('{x_titan_score:', '{x_titan_start_of_score:') + '\n{x_titan_end_of_score}')).toBeNull()
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
