import { readMeta, writeMeta, type ChartMeta } from './import-chordpro'

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

/**
 * Write or clear `{x_audio:}` on a chart. Merges with the existing header so
 * title / youtube / batida stay put. Invalid URLs throw — the viewer never
 * writes this; the consumer does, before persist.
 */
export function setAudioUrl(source: string, url: string | null): string {
  const cur: ChartMeta = { ...readMeta(source) }
  if (url == null || !String(url).trim()) {
    delete cur.x_audio
    return writeMeta(source, cur)
  }
  const ok = playableAudioUrl(url)
  if (!ok) {
    throw new Error('x_audio must be an http(s) audio file URL (not YouTube)')
  }
  cur.x_audio = ok
  return writeMeta(source, cur)
}

/** Playable `{x_audio:}` or null (missing, empty, or a blocked host). */
export function audioUrlOf(source: string): string | null {
  return playableAudioUrl(readMeta(source).x_audio)
}

/** Clock label on the reference player: `1:12`. */
export function formatAudioClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const s = Math.floor(sec)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}
