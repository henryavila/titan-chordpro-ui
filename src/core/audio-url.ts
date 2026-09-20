import { readMeta, writeMeta, type ChartMeta } from './import-chordpro'

export const AUDIO_KINDS = ['sung', 'playback'] as const
export type AudioKind = (typeof AUDIO_KINDS)[number]

export const AUDIO_KIND_LABEL: Record<AudioKind, string> = {
  sung: 'Cantado',
  playback: 'Playback',
}

export type AudioTracks = { sung: string | null; playback: string | null }

/**
 * Direct audio the rehearsal player will fetch. YouTube/Spotify/data/file
 * are not playable here — the consumer hosts a file or a streaming GET.
 * A `}` would break the `{x_audio:…}` line.
 */
export function playableAudioUrl(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim()
  if (!s || s.includes('}')) return null
  if (s.startsWith('/') && !s.startsWith('//')) return s
  let u: URL
  try {
    u = new URL(s)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  const host = u.hostname.replace(/^www\./, '').toLowerCase()
  if (blockedHost(host)) return null
  return s
}

function blockedHost(host: string): boolean {
  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) return true
  if (host === 'spotify.com' || host.endsWith('.spotify.com')) return true
  if (host === 'music.apple.com' || host.endsWith('.music.apple.com')) return true
  if (host === 'deezer.com' || host.endsWith('.deezer.com')) return true
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) return true
  return false
}

function kindKey(kind: AudioKind): 'x_audio_sung' | 'x_audio_playback' {
  return kind === 'playback' ? 'x_audio_playback' : 'x_audio_sung'
}

/**
 * Write or clear one rehearsal track. `sung` also drops legacy
 * `{x_audio:}` / `{x_audio_cantado:}` so a chart does not carry two sung URLs.
 */
export function setAudioUrl(
  source: string,
  url: string | null,
  kind: AudioKind = 'sung',
): string {
  const cur: ChartMeta = { ...readMeta(source) }
  const key = kindKey(kind)
  if (kind === 'sung') {
    delete cur.x_audio_sung
  }
  if (url == null || !String(url).trim()) {
    delete cur[key]
    return writeMeta(source, cur)
  }
  const ok = playableAudioUrl(url)
  if (!ok) {
    throw new Error('x_audio must be an http(s) audio file URL (not YouTube)')
  }
  cur[key] = ok
  return writeMeta(source, cur)
}

/** Both tracks. Legacy `{x_audio:}` / `{x_audio_cantado:}` already fold into sung via readMeta. */
export function audioTracksOf(source: string): AudioTracks {
  const m = readMeta(source)
  return {
    sung: playableAudioUrl(m.x_audio_sung),
    playback: playableAudioUrl(m.x_audio_playback),
  }
}

export function audioUrlOf(source: string, kind?: AudioKind): string | null {
  const t = audioTracksOf(source)
  if (kind) return t[kind]
  return t.sung ?? t.playback
}

export function defaultAudioKind(tracks: AudioTracks): AudioKind | null {
  if (tracks.sung) return 'sung'
  if (tracks.playback) return 'playback'
  return null
}

export function audioKindsOf(tracks: AudioTracks): AudioKind[] {
  return AUDIO_KINDS.filter((k) => tracks[k])
}

/**
 * Cover art URL for the reference player. Same hosting rules as the audio
 * file — a hash in the query is a new image.
 */
export function setAudioArt(source: string, url: string | null): string {
  const cur: ChartMeta = { ...readMeta(source) }
  if (url == null || !String(url).trim()) {
    delete cur.x_audio_art
    return writeMeta(source, cur)
  }
  const ok = playableAudioUrl(url)
  if (!ok) {
    throw new Error('x_audio_art must be an http(s) image URL (not YouTube)')
  }
  cur.x_audio_art = ok
  return writeMeta(source, cur)
}

export function audioArtOf(source: string): string | null {
  return playableAudioUrl(readMeta(source).x_audio_art)
}

/** Strip a hinário catalog prefix (`001 - `) so the player can show the name. */
export function displaySongTitle(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim()
  if (!s) return 'Sem título'
  return s.replace(/^\d+\s*[-–—.]\s*/, '')
}

export function audioArtistOf(meta: {
  artist?: string
  subtitle?: string
}): string {
  const a = String(meta.artist ?? '').trim()
  if (a) return a
  const sub = String(meta.subtitle ?? '').trim()
  if (sub) return sub
  return 'Referência'
}

/** Clock label on the reference player: `1:12`. */
export function formatAudioClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const s = Math.floor(sec)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}
