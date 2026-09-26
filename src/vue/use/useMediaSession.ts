import { onUnmounted, watch, type Ref } from 'vue'

export type MediaArtwork = { src: string; sizes: string; type?: string }

export type MediaSessionInput = {
  enabled: Ref<boolean>
  playing: Ref<boolean>
  current: Ref<number>
  duration: Ref<number>
  title: Ref<string>
  artist: Ref<string>
  album: Ref<string>
  artwork: Ref<MediaArtwork[]>
  play: () => void
  pause: () => void
  skip: (dir: -1 | 1) => void
  seek: (t: number) => void
}

const ACTIONS = [
  'play',
  'pause',
  'seekbackward',
  'seekforward',
  'seekto',
  'stop',
] as const

function mimeFromUrl(url: string): string | undefined {
  const path = url.split('?')[0]!.toLowerCase()
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.webp')) return 'image/webp'
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg'
  return undefined
}

/** Artwork list for `MediaMetadata`. `sizes` is the file’s real pixel size. */
export function mediaSessionArtwork(art: {
  url: string
  width: number
  height: number
}): MediaArtwork[] {
  const type = mimeFromUrl(art.url)
  return [
    {
      src: art.url,
      sizes: `${art.width}x${art.height}`,
      ...(type ? { type } : {}),
    },
  ]
}

function session(): MediaSession | null {
  if (typeof navigator === 'undefined') return null
  return navigator.mediaSession ?? null
}

export type MediaSessionSnapshot = {
  available: boolean
  title: string
  artist: string
  album: string
  artwork: MediaArtwork[]
  playbackState: MediaSessionPlaybackState | 'none'
}

function artworkOf(meta: MediaMetadata | null | undefined): MediaArtwork[] {
  if (!meta?.artwork) return []
  return Array.from(meta.artwork).map((img) => {
    const type = img.type ? String(img.type) : ''
    return {
      src: String(img.src ?? ''),
      sizes: String(img.sizes ?? ''),
      ...(type ? { type } : {}),
    }
  })
}

/** Serializable view of the OS session — demo inspector and tests. */
export function readMediaSession(): MediaSessionSnapshot {
  const ms = session()
  if (!ms) {
    return {
      available: false,
      title: '',
      artist: '',
      album: '',
      artwork: [],
      playbackState: 'none',
    }
  }
  const meta = ms.metadata
  return {
    available: true,
    title: meta?.title ?? '',
    artist: meta?.artist ?? '',
    album: meta?.album ?? '',
    artwork: artworkOf(meta),
    playbackState: ms.playbackState || 'none',
  }
}

function setHandler(
  ms: MediaSession,
  action: (typeof ACTIONS)[number],
  handler: MediaSessionActionHandler | null,
) {
  try {
    ms.setActionHandler(action, handler)
  } catch {
    /* older WebKit rejects seekto / stop */
  }
}

function bindHandlers(ms: MediaSession, opts: MediaSessionInput) {
  setHandler(ms, 'play', () => opts.play())
  setHandler(ms, 'pause', () => opts.pause())
  setHandler(ms, 'seekbackward', () => opts.skip(-1))
  setHandler(ms, 'seekforward', () => opts.skip(1))
  setHandler(ms, 'seekto', (d) => {
    if (typeof d.seekTime === 'number') opts.seek(d.seekTime)
  })
  setHandler(ms, 'stop', () => opts.pause())
}

function clear(ms: MediaSession) {
  try {
    ms.metadata = null
  } catch {
    /* ignore */
  }
  try {
    ms.playbackState = 'none'
  } catch {
    /* ignore */
  }
  for (const action of ACTIONS) setHandler(ms, action, null)
}

function publishPosition(ms: MediaSession, opts: MediaSessionInput) {
  const duration = opts.duration.value
  const position = opts.current.value
  if (!Number.isFinite(duration) || duration <= 0) return
  if (!Number.isFinite(position) || position < 0) return
  try {
    ms.setPositionState({
      duration,
      playbackRate: 1,
      position: Math.min(position, duration),
    })
  } catch {
    /* duration/position rejected */
  }
}

function publish(opts: MediaSessionInput) {
  const ms = session()
  if (!ms) return
  if (!opts.enabled.value) {
    clear(ms)
    return
  }
  bindHandlers(ms, opts)
  const init = {
    title: opts.title.value,
    artist: opts.artist.value,
    album: opts.album.value,
    artwork: opts.artwork.value,
  }
  try {
    ms.metadata =
      typeof MediaMetadata === 'function' ? new MediaMetadata(init) : (init as MediaMetadata)
    ms.playbackState = opts.playing.value ? 'playing' : 'paused'
  } catch {
    /* MediaMetadata / playbackState unsupported */
  }
  publishPosition(ms, opts)
}

/**
 * Pushes rehearsal title, artist, cover and transport onto the OS media
 * session (lock screen / Control Center). Missing API is a silent no-op.
 */
export function useMediaSession(opts: MediaSessionInput) {
  watch(
    [opts.enabled, opts.playing, opts.title, opts.artist, opts.album, opts.artwork],
    () => publish(opts),
    { immediate: true, deep: true },
  )
  watch([opts.current, opts.duration], () => {
    const ms = session()
    if (ms && opts.enabled.value) publishPosition(ms, opts)
  })

  onUnmounted(() => {
    const ms = session()
    if (ms) clear(ms)
  })
}
