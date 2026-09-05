import { describe, expect, it } from 'vitest'
import { parse } from '../../src/core/index'

const ONSONG = `Title: Amazing Grace
Artist: Traditional
Key: G
Tempo: 72

Verse:
G          C        G
Amazing grace how sweet
`

describe('OnSong parse', () => {
  it('yields ViewModel with ≥1 lyrics line when content present', () => {
    const view = parse(ONSONG)
    expect(view.meta.key).toBe('G')
    expect(view.meta.title).toMatch(/Amazing Grace/)
    const lyrics = view.sections.flatMap((s) => s.lines).filter((l) => l.type === 'lyrics')
    expect(lyrics.length).toBeGreaterThanOrEqual(1)
    const chords = lyrics.flatMap((l) => (l.type === 'lyrics' ? l.words : [])).filter((w) => w.chord)
    expect(chords.length).toBeGreaterThan(0)
  })
})
