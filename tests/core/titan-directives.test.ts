import { describe, expect, it } from 'vitest'
import * as core from '../../src/core'
import { canonicalMetaKey } from '../../src/core/import-chordpro'
import { ELE_VIVE_IMG, loadFixture } from '../helpers/load-fixture'

const fixture = loadFixture(ELE_VIVE_IMG)
const strum = core.readMeta(loadFixture('sda/005-tua-vontade.cho')).x_titan_strum!
const fields = {
  x_titan_source: 'https://example.com/cifra',
  x_titan_youtube: 'abcdefghijk',
  x_titan_audio_sung: '/ref-audio.wav',
  x_titan_audio_playback: '/ref-audio-2.wav',
  x_titan_audio_art: '/capa.jpg',
  x_titan_audio_art_w: '1024',
  x_titan_audio_art_h: '1024',
  x_titan_strum: strum,
  x_titan_strum_set: `0|${strum}|${strum}`,
} satisfies core.ChartMeta

describe('Titan directive namespace (breaking format change)', () => {
  it('round trips all metadata and preserves the real chart, clocks and notation', () => {
    const source = core.writeMeta(fixture, { ...core.readMeta(fixture), ...fields })
    expect(core.readMeta(source)).toMatchObject(fields)
    expect(core.audioTracksOf(source)).toEqual({ sung: fields.x_titan_audio_sung, playback: fields.x_titan_audio_playback })
    expect(core.audioArtOf(source)).toEqual({ url: fields.x_titan_audio_art, width: 1024, height: 1024 })
    expect(core.readStrumPatterns(source).patterns).toHaveLength(2)
    expect(core.writeMeta(source, core.readMeta(source))).toBe(source)
    expect(core.exportCho(source)).toBe(source)
    expect(core.lyricsText(core.parse(source))).toBe(core.lyricsText(core.parse(fixture)))
    expect(source.match(/\][x/]+/g)).toEqual(fixture.match(/\][x/]+/g))
    expect(source).toContain('{x_titan_start_of_score:')
    expect(source).toContain('{image:')
  })

  it('does not interpret or auto-convert any former metadata names', () => {
    const previous = Object.entries(fields).map(([key, value]) => `{${key.replace('x_titan_', 'x_')}:${value}}`)
    previous.push('{x_origem:https://example.com}', '{x_audio:/ref-audio.wav}', '{x_audio_cantado:/ref-audio.wav}')
    const oldSource = `${fixture}\n${previous.join('\n')}`
    expect(core.readMeta(oldSource)).toEqual(core.readMeta(fixture))
    expect(core.audioTracksOf(oldSource)).toEqual({ sung: null, playback: null })
    expect(core.audioArtOf(oldSource)).toBeNull()
    expect(core.readStrumPatterns(oldSource).patterns).toEqual([])
    for (const line of previous) {
      expect(canonicalMetaKey(line.slice(1, line.indexOf(':')))).toBeNull()
      expect(core.writeMeta(oldSource, core.readMeta(oldSource))).toContain(line)
    }
    expect(core.writeMeta(oldSource, core.readMeta(oldSource))).not.toContain('{x_titan_audio')
  })

  it('recognizes only the new notation directives', () => {
    const reference = core.writeScoreReference({ src: 'fixtures/notation/notes.gp', track: 1, start: 1 })
    expect(core.readScoreReference(reference)?.src).toBe('fixtures/notation/notes.gp')
    const oldReference = reference.replace('x_titan_score', 'score')
    expect(core.isScoreReference(oldReference)).toBe(false)
    expect(core.readScoreReference(oldReference)).toBeNull()
    expect(core.parse(oldReference).sections.flatMap(s => s.lines).some(l => l.type === 'score')).toBe(false)
    const inline = core.parse(fixture).sections.flatMap(s => s.lines).find(l => l.type === 'score')!
    if (inline.type !== 'score') throw new Error('Fixture must contain inline notation')
    expect(core.isInlineScore(inline.text)).toBe(true)
    expect(core.parseScore(inline.text).from).toBe('x_titan_start_of_score')
    for (const [start, end] of [['sos', 'eos'], ['start_of_score', 'end_of_score']]) {
      const old = inline.text.replace('x_titan_start_of_score', start!).replace('x_titan_end_of_score', end!)
      expect(core.isInlineScore(old)).toBe(false)
      expect(core.parseScore(old).notes).toEqual([])
      expect(core.parse(old).sections.flatMap(s => s.lines).some(l => l.type === 'score')).toBe(false)
    }
  })

  it('exports the new strum helpers without compatibility aliases', () => {
    expect(core.parseTitanStrum(strum)).not.toBeNull()
    for (const name of ['parseXStrum', 'formatXStrum', 'parseXStrumSet', 'formatXStrumSet']) {
      expect(core).not.toHaveProperty(name)
    }
  })
})
