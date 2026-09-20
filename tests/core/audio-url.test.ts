import { describe, expect, it } from 'vitest'
import {
  audioArtOf,
  audioArtistOf,
  audioUrlOf,
  displaySongTitle,
  formatAudioClock,
  playableAudioUrl,
  setAudioArt,
  setAudioUrl,
  writeMeta,
} from '../../src/core/index'

describe('playableAudioUrl', () => {
  it('accepts https and http file URLs, including a content hash', () => {
    expect(playableAudioUrl('https://cdn.sda/nasce.m4a?h=a1b2')).toBe(
      'https://cdn.sda/nasce.m4a?h=a1b2',
    )
    expect(playableAudioUrl('http://127.0.0.1:5173/ref.wav')).toBe(
      'http://127.0.0.1:5173/ref.wav',
    )
  })

  it('accepts a same-origin path the host streams', () => {
    expect(playableAudioUrl('/songs/100/audio?h=a1b2')).toBe('/songs/100/audio?h=a1b2')
  })

  it('rejects YouTube, Spotify and non-http schemes', () => {
    expect(playableAudioUrl('https://www.youtube.com/watch?v=9yZt5ekdceI')).toBeNull()
    expect(playableAudioUrl('https://youtu.be/9yZt5ekdceI')).toBeNull()
    expect(playableAudioUrl('https://music.youtube.com/watch?v=abc')).toBeNull()
    expect(playableAudioUrl('https://open.spotify.com/track/x')).toBeNull()
    expect(playableAudioUrl('javascript:alert(1)')).toBeNull()
    expect(playableAudioUrl('data:audio/wav;base64,AA')).toBeNull()
    expect(playableAudioUrl('file:///tmp/a.mp3')).toBeNull()
  })

  it('rejects a value that would break the ChordPro brace', () => {
    expect(playableAudioUrl('https://cdn.sda/a.m4a?x=}')).toBeNull()
  })

  it('trims and treats empty as absent', () => {
    expect(playableAudioUrl('  ')).toBeNull()
    expect(playableAudioUrl(null)).toBeNull()
  })
})

describe('setAudioUrl / audioUrlOf', () => {
  const cho = '{title:Nasce}\n{key:A}\n{x_youtube:abcdefghijk}\n[A]x///\n'

  it('writes {x_audio:} without wiping the rest of the header', () => {
    const next = setAudioUrl(cho, 'https://cdn.sda/nasce.m4a?h=a1')
    expect(next).toContain('{x_audio:https://cdn.sda/nasce.m4a?h=a1}')
    expect(next).toContain('{title:Nasce}')
    expect(next).toContain('{x_youtube:abcdefghijk}')
    expect(next).toContain('[A]x///')
    expect(audioUrlOf(next)).toBe('https://cdn.sda/nasce.m4a?h=a1')
  })

  it('replaces the URL in place when the hash changes', () => {
    const a = setAudioUrl(cho, 'https://cdn.sda/nasce.m4a?h=a1')
    const b = setAudioUrl(a, 'https://cdn.sda/nasce.m4a?h=b2')
    expect(b.match(/\{x_audio:/g)).toHaveLength(1)
    expect(audioUrlOf(b)).toBe('https://cdn.sda/nasce.m4a?h=b2')
  })

  it('removes the directive when the URL is cleared', () => {
    const a = setAudioUrl(cho, 'https://cdn.sda/nasce.m4a?h=a1')
    const b = setAudioUrl(a, null)
    expect(b).not.toContain('x_audio')
    expect(audioUrlOf(b)).toBeNull()
  })

  it('throws on YouTube instead of writing', () => {
    expect(() => setAudioUrl(cho, 'https://youtu.be/9yZt5ekdceI')).toThrow(/not YouTube/i)
    expect(audioUrlOf(cho)).toBeNull()
  })

  it('hides a directive that sneaked in as YouTube', () => {
    const sneaky = writeMeta(cho, {
      title: 'Nasce',
      key: 'A',
      x_youtube: 'abcdefghijk',
      x_audio: 'https://youtube.com/watch?v=nope',
    })
    expect(sneaky).toContain('{x_audio:')
    expect(audioUrlOf(sneaky)).toBeNull()
  })
})

describe('setAudioArt / identity', () => {
  const cho = '{title:001 - Nasce em Mim}\n{key:A}\n{x_audio:https://cdn.sda/a.m4a?h=1}\n[A]x///\n'

  it('writes {x_audio_art:} beside the audio URL', () => {
    const next = setAudioArt(cho, 'https://cdn.sda/a.jpg?h=9')
    expect(next).toContain('{x_audio_art:https://cdn.sda/a.jpg?h=9}')
    expect(next).toContain('{x_audio:https://cdn.sda/a.m4a?h=1}')
    expect(audioArtOf(next)).toBe('https://cdn.sda/a.jpg?h=9')
  })

  it('clears the cover', () => {
    const next = setAudioArt(setAudioArt(cho, 'https://cdn.sda/a.jpg?h=9'), null)
    expect(next).not.toContain('x_audio_art')
    expect(audioArtOf(next)).toBeNull()
  })

  it('strips a hinário catalog prefix from the title', () => {
    expect(displaySongTitle('001 - Tudo que há de bom em mim')).toBe(
      'Tudo que há de bom em mim',
    )
    expect(displaySongTitle('Nasce em Mim')).toBe('Nasce em Mim')
    expect(displaySongTitle('')).toBe('Sem título')
  })

  it('prefers artist, then subtitle, then Referência', () => {
    expect(audioArtistOf({ artist: 'Adoradores', subtitle: 'SDA' })).toBe('Adoradores')
    expect(audioArtistOf({ subtitle: 'Ministério Jovem' })).toBe('Ministério Jovem')
    expect(audioArtistOf({})).toBe('Referência')
  })
})

describe('formatAudioClock', () => {
  it('renders m:ss from seconds', () => {
    expect(formatAudioClock(0)).toBe('0:00')
    expect(formatAudioClock(12)).toBe('0:12')
    expect(formatAudioClock(72)).toBe('1:12')
    expect(formatAudioClock(3601)).toBe('60:01')
  })

  it('treats missing duration as 0:00', () => {
    expect(formatAudioClock(NaN)).toBe('0:00')
    expect(formatAudioClock(-4)).toBe('0:00')
  })
})
