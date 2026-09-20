import { readMeta, writeMeta, type ChartMeta } from './import-chordpro'

export const AUDIO_KINDS = ['sung', 'playback'] as const
export type AudioKind = (typeof AUDIO_KINDS)[number]

export const AUDIO_KIND_LABEL: Record<AudioKind, string> = {
  sung: 'Cantado',
  playback: 'Playback',
}

export type AudioTracks = { sung: string | null; playback: string | null }

/** Cover the consumer already resized. Pass the file’s real pixel size. */
export type AudioArt = { url: string; width: number; height: number }

/** Pixel size of the packaged fallback cover. */
export const AUDIO_ART_DEFAULT_PX = 512

const ART_DIM_MAX = 4096

export type RehearsalAudioPatch = {
  sung?: string | null
  playback?: string | null
  art?: AudioArt | null
}

/**
 * Direct audio the rehearsal player will fetch. YouTube/Spotify/data/file
 * are not playable here — the consumer hosts a file or a streaming GET.
 * A `}` would break the `{x_audio_sung:…}` / `{x_audio_playback:…}` line.
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
    throw new Error('x_audio_sung / x_audio_playback must be an http(s) audio file URL (not YouTube)')
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

function artDim(raw: string | undefined): number | null {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > ART_DIM_MAX) return null
  return n
}

/**
 * Cover for the reference player. The consumer serves an already-optimized
 * file and must pass that file’s width/height (square 256–512 is enough).
 */
export function setAudioArt(source: string, art: AudioArt | null): string {
  const cur: ChartMeta = { ...readMeta(source) }
  if (art == null) {
    delete cur.x_audio_art
    delete cur.x_audio_art_w
    delete cur.x_audio_art_h
    return writeMeta(source, cur)
  }
  const ok = playableAudioUrl(art.url)
  if (!ok) {
    throw new Error('x_audio_art must be an http(s) image URL (not YouTube)')
  }
  const w = artDim(String(art.width))
  const h = artDim(String(art.height))
  if (!w || !h) {
    throw new Error('x_audio_art requires integer width and height (1–4096)')
  }
  cur.x_audio_art = ok
  cur.x_audio_art_w = String(w)
  cur.x_audio_art_h = String(h)
  return writeMeta(source, cur)
}

export function audioArtOf(source: string): AudioArt | null {
  const m = readMeta(source)
  const url = playableAudioUrl(m.x_audio_art)
  if (!url) return null
  return {
    url,
    width: artDim(m.x_audio_art_w) ?? AUDIO_ART_DEFAULT_PX,
    height: artDim(m.x_audio_art_h) ?? AUDIO_ART_DEFAULT_PX,
  }
}

/**
 * One write for the rehearsal media the host actually has.
 * Omitted keys stay; `null` clears that key.
 */
export function setRehearsalAudio(source: string, patch: RehearsalAudioPatch): string {
  let next = source
  if (Object.prototype.hasOwnProperty.call(patch, 'sung')) {
    next = setAudioUrl(next, patch.sung ?? null, 'sung')
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'playback')) {
    next = setAudioUrl(next, patch.playback ?? null, 'playback')
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'art')) {
    next = setAudioArt(next, patch.art ?? null)
  }
  return next
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
