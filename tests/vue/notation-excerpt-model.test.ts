import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { model } from '@coderline/alphatab'
import { isolateExcerpt, loadNotation } from '../../src/vue/chart/notation-loader'

it('clips incoming ties only on the rendering copy, retaining notes and internal ties', async () => {
  const score = await loadNotation(readFileSync('fixtures/notation/full-song.gp'))
  const original = model.JsonConverter.scoreToJson(score)
  const copy = model.JsonConverter.jsObjectToScore(model.JsonConverter.scoreToJsObject(score))
  const notes = copy.tracks.flatMap(t => t.staves.flatMap(s => s.bars.flatMap(b => b.voices.flatMap(v => v.beats.flatMap(b => b.notes)))))
  const incoming = notes.filter(n => n.beat.voice.bar.index >= 6 && n.tieOrigin && n.tieOrigin.beat.voice.bar.index < 6)
  const internal = notes.filter(n => n.beat.voice.bar.index >= 6 && n.tieOrigin && n.tieOrigin.beat.voice.bar.index >= 6)
  expect(incoming.length).toBeGreaterThan(0)
  expect(internal.length).toBeGreaterThan(0)
  const music = notes.map(n => [n.fret, n.octave, n.tone, n.beat.duration, n.beat.dots])
  const origins = internal.map(n => n.tieOrigin)
  isolateExcerpt(copy, 7)
  expect(incoming.every(n => !n.tieOrigin && !n.isTieDestination)).toBe(true)
  expect(internal.map(n => n.tieOrigin)).toEqual(origins)
  expect(notes.map(n => [n.fret, n.octave, n.tone, n.beat.duration, n.beat.dots])).toEqual(music)
  expect(model.JsonConverter.scoreToJson(score)).toBe(original)
})
