import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { AUDIO_ART_DEFAULT_PX, AUDIO_ART_MEDIA_PX } from '../../src/core/index'
import {
  mediaSessionArtwork,
  readMediaSession,
  useMediaSession,
  type MediaSessionInput,
} from '../../src/vue/use/useMediaSession'

type FakeSession = {
  metadata: { title?: string; artist?: string; album?: string; artwork?: unknown } | null
  playbackState: MediaSessionPlaybackState
  setActionHandler: ReturnType<typeof vi.fn>
  setPositionState: ReturnType<typeof vi.fn>
  handlers: Map<string, MediaSessionActionHandler | null>
}

function installMediaSession(): FakeSession {
  const handlers = new Map<string, MediaSessionActionHandler | null>()
  const api: FakeSession = {
    metadata: null,
    playbackState: 'none',
    setActionHandler: vi.fn((action: string, handler: MediaSessionActionHandler | null) => {
      handlers.set(action, handler)
    }),
    setPositionState: vi.fn(),
    handlers,
  }
  Object.defineProperty(navigator, 'mediaSession', {
    configurable: true,
    value: api,
  })
  vi.stubGlobal(
    'MediaMetadata',
    class {
      constructor(init: object) {
        Object.assign(this, init)
      }
    },
  )
  return api
}

const mounted: ReturnType<typeof mount>[] = []

function hookOf(partial: Partial<MediaSessionInput> = {}) {
  const enabled = partial.enabled ?? ref(true)
  const playing = partial.playing ?? ref(false)
  const current = partial.current ?? ref(12)
  const duration = partial.duration ?? ref(90)
  const title = partial.title ?? ref('Nasce em Mim')
  const artist = partial.artist ?? ref('Adoradores')
  const album = partial.album ?? ref('Cantado')
  const artwork =
    partial.artwork ??
    ref(
      mediaSessionArtwork({
        url: 'https://cdn.sda/nasce.jpg',
        width: AUDIO_ART_MEDIA_PX,
        height: AUDIO_ART_MEDIA_PX,
      }),
    )
  const play = partial.play ?? vi.fn()
  const pause = partial.pause ?? vi.fn()
  const skip = partial.skip ?? vi.fn()
  const seek = partial.seek ?? vi.fn()
  const Host = defineComponent({
    setup() {
      useMediaSession({
        enabled,
        playing,
        current,
        duration,
        title,
        artist,
        album,
        artwork,
        play,
        pause,
        skip,
        seek,
      })
      return () => null
    },
  })
  const w = mount(Host)
  mounted.push(w)
  return { enabled, playing, current, duration, title, artist, album, artwork, play, pause, skip, seek, w }
}

afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  Reflect.deleteProperty(navigator, 'mediaSession')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('mediaSessionArtwork', () => {
  it('labels a 1024 cover for the lock screen', () => {
    expect(AUDIO_ART_MEDIA_PX).toBe(1024)
    expect(
      mediaSessionArtwork({
        url: 'https://cdn.sda/nasce.jpg?h=1',
        width: AUDIO_ART_MEDIA_PX,
        height: AUDIO_ART_MEDIA_PX,
      }),
    ).toEqual([
      {
        src: 'https://cdn.sda/nasce.jpg?h=1',
        sizes: '1024x1024',
        type: 'image/jpeg',
      },
    ])
  })

  it('labels png and webp from the file suffix', () => {
    expect(mediaSessionArtwork({ url: 'https://cdn.sda/a.png', width: 1024, height: 1024 })[0]?.type).toBe(
      'image/png',
    )
    expect(mediaSessionArtwork({ url: 'https://cdn.sda/a.webp?h=1', width: 800, height: 800 })[0]).toEqual({
      src: 'https://cdn.sda/a.webp?h=1',
      sizes: '800x800',
      type: 'image/webp',
    })
    expect(mediaSessionArtwork({ url: 'https://cdn.sda/cover', width: 1024, height: 1024 })[0]?.type).toBeUndefined()
  })

  it('keeps the packaged fallback at 512', () => {
    expect(
      mediaSessionArtwork({
        url: '/assets/audio-ref-default.jpg',
        width: AUDIO_ART_DEFAULT_PX,
        height: AUDIO_ART_DEFAULT_PX,
      }),
    ).toEqual([
      {
        src: '/assets/audio-ref-default.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ])
  })
})

describe('useMediaSession', () => {
  it('publishes title, artist, album and cover while a track is loaded', () => {
    const session = installMediaSession()
    hookOf()
    expect(session.metadata).toMatchObject({
      title: 'Nasce em Mim',
      artist: 'Adoradores',
      album: 'Cantado',
      artwork: [
        {
          src: 'https://cdn.sda/nasce.jpg',
          sizes: '1024x1024',
          type: 'image/jpeg',
        },
      ],
    })
    expect(session.playbackState).toBe('paused')
  })

  it('marks playing and updates position', async () => {
    const session = installMediaSession()
    const playing = ref(false)
    const current = ref(5)
    hookOf({ playing, current })
    playing.value = true
    current.value = 18
    await flushPromises()
    expect(session.playbackState).toBe('playing')
    expect(session.setPositionState).toHaveBeenCalledWith({
      duration: 90,
      playbackRate: 1,
      position: 18,
    })
  })

  it('routes lock-screen buttons to the rehearsal transport', () => {
    const session = installMediaSession()
    const { play, pause, skip, seek } = hookOf()
    session.handlers.get('play')?.({ action: 'play' })
    session.handlers.get('pause')?.({ action: 'pause' })
    session.handlers.get('seekbackward')?.({ action: 'seekbackward' })
    session.handlers.get('seekforward')?.({ action: 'seekforward' })
    session.handlers.get('seekto')?.({ action: 'seekto', seekTime: 41 })
    session.handlers.get('stop')?.({ action: 'stop' })
    expect(play).toHaveBeenCalledTimes(1)
    expect(pause).toHaveBeenCalledTimes(2)
    expect(skip).toHaveBeenCalledWith(-1)
    expect(skip).toHaveBeenCalledWith(1)
    expect(seek).toHaveBeenCalledWith(41)
  })

  it('clears the session when the track goes away and on unmount', async () => {
    const session = installMediaSession()
    const enabled = ref(true)
    const { w } = hookOf({ enabled })
    expect(session.metadata?.title).toBe('Nasce em Mim')
    enabled.value = false
    await flushPromises()
    expect(session.metadata).toBeNull()
    expect(session.playbackState).toBe('none')
    enabled.value = true
    await flushPromises()
    expect(session.metadata?.title).toBe('Nasce em Mim')
    w.unmount()
    expect(session.metadata).toBeNull()
    expect(session.handlers.get('play')).toBeNull()
  })

  it('ignores seekto without a time and skips position when duration is missing', () => {
    const session = installMediaSession()
    const duration = ref(0)
    const current = ref(4)
    const { seek } = hookOf({ duration, current })
    session.handlers.get('seekto')?.({ action: 'seekto' })
    expect(seek).not.toHaveBeenCalled()
    expect(session.setPositionState).not.toHaveBeenCalled()
  })

  it('clamps position to duration', async () => {
    const session = installMediaSession()
    const current = ref(200)
    hookOf({ current, duration: ref(90) })
    await flushPromises()
    expect(session.setPositionState).toHaveBeenCalledWith({
      duration: 90,
      playbackRate: 1,
      position: 90,
    })
  })

  it('exposes a snapshot the host can read', () => {
    installMediaSession()
    hookOf()
    expect(readMediaSession()).toMatchObject({
      available: true,
      title: 'Nasce em Mim',
      artist: 'Adoradores',
      album: 'Cantado',
      playbackState: 'paused',
      artwork: [{ sizes: '1024x1024', type: 'image/jpeg' }],
    })
  })

  it('snapshot is empty when the API is missing', () => {
    expect(readMediaSession()).toEqual({
      available: false,
      title: '',
      artist: '',
      album: '',
      artwork: [],
      playbackState: 'none',
    })
  })

  it('is a no-op when the browser has no mediaSession', () => {
    expect(() => hookOf()).not.toThrow()
  })

  it('swallows unsupported action handlers', () => {
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: {
        metadata: null,
        playbackState: 'none',
        setActionHandler: vi.fn(() => {
          throw new TypeError('Unsupported action')
        }),
        setPositionState: vi.fn(),
      },
    })
    vi.stubGlobal(
      'MediaMetadata',
      class {
        constructor(init: object) {
          Object.assign(this, init)
        }
      },
    )
    expect(() => hookOf()).not.toThrow()
  })
})
