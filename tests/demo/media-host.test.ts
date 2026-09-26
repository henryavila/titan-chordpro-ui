import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  AUDIO_ART_MEDIA_PX,
  audioArtOf,
  audioTracksOf,
  displaySongTitle,
  parse,
} from '../../src/core/index'
import {
  MEDIA_DEMO_PAGE_TITLE,
  MEDIA_DEMO_SONG_ID,
  rehearsalChart,
} from '../../demo/media-host'
import { loadFixture } from '../helpers/load-fixture'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function jpegSize(buf: Uint8Array): { width: number; height: number } {
  let i = 2
  while (i + 8 < buf.length) {
    if (buf[i] !== 0xff) break
    const marker = buf[i + 1]!
    const len = (buf[i + 2]! << 8) | buf[i + 3]!
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return {
        height: (buf[i + 5]! << 8) | buf[i + 6]!,
        width: (buf[i + 7]! << 8) | buf[i + 8]!,
      }
    }
    i += 2 + len
  }
  throw new Error('JPEG SOF not found')
}

describe('media demo host', () => {
  const chart = loadFixture('sda/100-nasce-em-mim.cho')
  const cho = rehearsalChart({
    chart,
    sung: 'https://cdn.example/nasce-voz.m4a?h=1',
    playback: 'https://cdn.example/nasce-pb.m4a?h=2',
    artUrl: 'https://cdn.example/nasce.jpg?h=3',
  })

  it('writes both tracks and a 1024 square cover into the ChordPro', () => {
    expect(AUDIO_ART_MEDIA_PX).toBe(1024)
    expect(audioTracksOf(cho)).toEqual({
      sung: 'https://cdn.example/nasce-voz.m4a?h=1',
      playback: 'https://cdn.example/nasce-pb.m4a?h=2',
    })
    expect(audioArtOf(cho)).toEqual({
      url: 'https://cdn.example/nasce.jpg?h=3',
      width: 1024,
      height: 1024,
    })
    expect(cho).toContain('{x_audio_art_w:1024}')
    expect(cho).toContain('{x_audio_art_h:1024}')
  })

  it('can omit chart art so the consumer defaultAudioArt is used', () => {
    const bare = rehearsalChart({
      chart,
      sung: 'https://cdn.example/nasce-voz.m4a?h=1',
      playback: 'https://cdn.example/nasce-pb.m4a?h=2',
      artUrl: 'https://cdn.example/nasce.jpg?h=3',
      includeArt: false,
    })
    expect(audioTracksOf(bare).sung).toBeTruthy()
    expect(audioArtOf(bare)).toBeNull()
  })

  it('keeps the consumer page title distinct from the song name', () => {
    expect(displaySongTitle(parse(chart).meta.title)).toBe('Nasce em Mim')
    expect(MEDIA_DEMO_PAGE_TITLE).toBe('Demo consumer · titan-chordpro-ui')
    expect(MEDIA_DEMO_PAGE_TITLE).not.toContain('Nasce em Mim')
    expect(MEDIA_DEMO_SONG_ID).toBe('100-nasce-em-mim')
  })

  it('boots as a module so the top-level await typechecks', () => {
    const boot = readFileSync(join(root, 'demo/media.ts'), 'utf8')
    expect(boot).toContain("from './media-host'")
    expect(boot).toContain('MEDIA_DEMO_PAGE_TITLE')
  })

  it('ships a real 1024×1024 JPEG for the lock screen', () => {
    const buf = readFileSync(join(root, 'demo/ref-audio-art.jpg'))
    expect(jpegSize(buf)).toEqual({ width: 1024, height: 1024 })
  })
})
