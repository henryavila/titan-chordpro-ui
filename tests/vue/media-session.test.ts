import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import {
  AUDIO_ART_DEFAULT_PX,
  AUDIO_ART_MEDIA_PX,
  setRehearsalAudio,
} from '../../src/core/index'
import { ChordproViewer } from '../../src/vue/index'
import {
  mediaSessionArtwork,
  readMediaSession,
  useMediaSession,
  type MediaSessionInput,
} from '../../src/vue/use/useMediaSession'
import { ESCUTA, JESUS_1, loadFixture } from '../helpers/load-fixture'

type FakeSession = {
  metadata: {
    title?: string
    artist?: string
    album?: string
    artwork?: { src?: string; sizes?: string; type?: string }[]
  } | null
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
  const playlist = partial.playlist ?? ref(false)
  const prevTrack = partial.prevTrack ?? vi.fn()
  const nextTrack = partial.nextTrack ?? vi.fn()
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
        ...(partial.playlist !== undefined ? { playlist } : {}),
        ...(partial.prevTrack !== undefined ? { prevTrack: partial.prevTrack } : {}),
        ...(partial.nextTrack !== undefined ? { nextTrack: partial.nextTrack } : {}),
      })
      return () => null
    },
  })
  const w = mount(Host)
  mounted.push(w)
  return {
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
    playlist,
    prevTrack,
    nextTrack,
    w,
  }
}

function actionKind(session: FakeSession, action: string) {
  const h = session.handlers.get(action)
  return h == null ? 'none' : 'fn'
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
    expect(actionKind(session, 'previoustrack')).toBe('none')
    expect(actionKind(session, 'nexttrack')).toBe('none')
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
    expect(session.handlers.get('previoustrack')).toBeNull()
    expect(session.handlers.get('nexttrack')).toBeNull()
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

function playlistHook(over: Partial<MediaSessionInput> = {}) {
  return hookOf({
    playlist: ref(true),
    prevTrack: vi.fn(),
    nextTrack: vi.fn(),
    ...over,
  })
}

describe('useMediaSession setlist skip', () => {
  it('leaves previous and next unbound without a set, and keeps ±10 s', () => {
    const session = installMediaSession()
    const { skip, prevTrack, nextTrack } = hookOf()
    expect(actionKind(session, 'previoustrack')).toBe('none')
    expect(actionKind(session, 'nexttrack')).toBe('none')
    expect(actionKind(session, 'seekbackward')).toBe('fn')
    expect(actionKind(session, 'seekforward')).toBe('fn')
    session.handlers.get('previoustrack')?.({ action: 'previoustrack' })
    session.handlers.get('nexttrack')?.({ action: 'nexttrack' })
    expect(prevTrack).not.toHaveBeenCalled()
    expect(nextTrack).not.toHaveBeenCalled()
    session.handlers.get('seekforward')?.({ action: 'seekforward' })
    expect(skip).toHaveBeenCalledWith(1)
  })

  it('binds both skip-song buttons for the whole set, including the first song', () => {
    const session = installMediaSession()
    const { prevTrack, nextTrack } = playlistHook()
    expect(actionKind(session, 'previoustrack')).toBe('fn')
    expect(actionKind(session, 'nexttrack')).toBe('fn')
    session.handlers.get('nexttrack')?.({ action: 'nexttrack' })
    session.handlers.get('previoustrack')?.({ action: 'previoustrack' })
    expect(nextTrack).toHaveBeenCalledTimes(1)
    expect(prevTrack).toHaveBeenCalledTimes(1)
  })

  it('keeps both skip-song buttons on the last song so iOS still paints them', () => {
    const session = installMediaSession()
    playlistHook()
    expect(actionKind(session, 'previoustrack')).toBe('fn')
    expect(actionKind(session, 'nexttrack')).toBe('fn')
  })

  it('drops ±10 s on the lock screen while a set is on — iOS hides skip-song if both exist', () => {
    const session = installMediaSession()
    const { skip, prevTrack, nextTrack } = playlistHook()
    expect(actionKind(session, 'seekbackward')).toBe('none')
    expect(actionKind(session, 'seekforward')).toBe('none')
    session.handlers.get('seekbackward')?.({ action: 'seekbackward' })
    session.handlers.get('seekforward')?.({ action: 'seekforward' })
    expect(skip).not.toHaveBeenCalled()
    expect(prevTrack).not.toHaveBeenCalled()
    expect(nextTrack).not.toHaveBeenCalled()
  })

  it('restores ±10 s when the set goes away', async () => {
    const session = installMediaSession()
    const playlist = ref(true)
    hookOf({
      playlist,
      prevTrack: vi.fn(),
      nextTrack: vi.fn(),
    })
    expect(actionKind(session, 'nexttrack')).toBe('fn')
    expect(actionKind(session, 'seekforward')).toBe('none')
    playlist.value = false
    await flushPromises()
    expect(actionKind(session, 'previoustrack')).toBe('none')
    expect(actionKind(session, 'nexttrack')).toBe('none')
    expect(actionKind(session, 'seekforward')).toBe('fn')
  })

  it('does not call a stale skip handler after the set turns off', async () => {
    const session = installMediaSession()
    const playlist = ref(true)
    const nextTrack = vi.fn()
    hookOf({ playlist, nextTrack, prevTrack: vi.fn() })
    const stale = session.handlers.get('nexttrack')
    playlist.value = false
    await flushPromises()
    expect(actionKind(session, 'nexttrack')).toBe('none')
    stale?.({ action: 'nexttrack' })
    expect(nextTrack).not.toHaveBeenCalled()
  })

  it('stop still pauses and does not change song', () => {
    const session = installMediaSession()
    const { pause, prevTrack, nextTrack } = playlistHook()
    session.handlers.get('stop')?.({ action: 'stop' })
    expect(pause).toHaveBeenCalledTimes(1)
    expect(prevTrack).not.toHaveBeenCalled()
    expect(nextTrack).not.toHaveBeenCalled()
  })

  it('clears skip handlers when the track goes away', async () => {
    const session = installMediaSession()
    const enabled = ref(true)
    playlistHook({ enabled })
    expect(actionKind(session, 'nexttrack')).toBe('fn')
    enabled.value = false
    await flushPromises()
    expect(actionKind(session, 'previoustrack')).toBe('none')
    expect(actionKind(session, 'nexttrack')).toBe('none')
  })

  it('leaves skip-song unbound when playlist is on but the callbacks are missing', () => {
    const session = installMediaSession()
    hookOf({ playlist: ref(true) })
    expect(actionKind(session, 'previoustrack')).toBe('none')
    expect(actionKind(session, 'nexttrack')).toBe('none')
    expect(actionKind(session, 'seekforward')).toBe('fn')
  })

  it('swallows unsupported previoustrack and nexttrack', () => {
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: {
        metadata: null,
        playbackState: 'none',
        setActionHandler: vi.fn((action: string) => {
          if (action === 'previoustrack' || action === 'nexttrack' || action === 'seekto') {
            throw new TypeError('Unsupported action')
          }
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
    expect(() => playlistHook()).not.toThrow()
  })
})

const observers: ((entries: unknown[]) => void)[] = []
class TestRO {
  constructor(cb: (entries: unknown[]) => void) {
    observers.push(cb)
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

function withSung(cho: string, url: string, art: string) {
  return setRehearsalAudio(cho, {
    sung: url,
    art: { url: art, width: 1024, height: 1024 },
  })
}

describe('viewer setlist skip on the media session', () => {
  let realRO: typeof ResizeObserver

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('cpv:fitSeen', '1')
    observers.length = 0
    realRO = globalThis.ResizeObserver
    globalThis.ResizeObserver = TestRO as unknown as typeof ResizeObserver
    class SilentAudio {
      src = ''
      currentTime = 0
      duration = Number.NaN
      paused = true
      preload = 'metadata'
      play = async () => {}
      pause = () => {}
      load = () => {}
      removeAttribute() {}
      addEventListener() {}
      removeEventListener() {}
    }
    vi.stubGlobal('Audio', SilentAudio)
  })

  afterEach(() => {
    globalThis.ResizeObserver = realRO
    localStorage.clear()
  })

  async function viewerAt(width: number, props: Record<string, unknown> = {}) {
    const w = mount(ChordproViewer, {
      props: {
        source: loadFixture(JESUS_1),
        theme: 'dark',
        autoHide: false,
        songId: 'jesus-1',
        ...props,
      },
      attachTo: document.body,
    })
    mounted.push(w)
    await flushPromises()
    observers.forEach((cb) => cb([{ contentRect: { width, height: 800 } }]))
    await flushPromises()
    return w
  }

  const jesusCho = () =>
    withSung(loadFixture(JESUS_1), 'https://cdn.sda/jesus.m4a?h=1', 'https://cdn.sda/jesus.jpg')
  const escutaCho = () =>
    withSung(loadFixture(ESCUTA), 'https://cdn.sda/escuta.m4a?h=2', 'https://cdn.sda/escuta.jpg')

  it('does not expose skip-song on a single chart with audio', async () => {
    const session = installMediaSession()
    await viewerAt(390, { source: jesusCho() })
    expect(session.metadata?.title).toBe('Jesus, Tu És a minha vida')
    expect(actionKind(session, 'previoustrack')).toBe('none')
    expect(actionKind(session, 'nexttrack')).toBe('none')
    expect(actionKind(session, 'seekforward')).toBe('fn')
  })

  it('one song in songs is not a set — skip stays off', async () => {
    const session = installMediaSession()
    await viewerAt(390, {
      source: '',
      songs: [{ id: 's0', title: 'Jesus', source: jesusCho() }],
    })
    expect(actionKind(session, 'previoustrack')).toBe('none')
    expect(actionKind(session, 'nexttrack')).toBe('none')
  })

  it('on the first song of a set both skip-song buttons are on, and ±10 s is off', async () => {
    const session = installMediaSession()
    await viewerAt(390, {
      source: '',
      songs: [
        { id: 's0', title: 'Jesus', source: jesusCho() },
        { id: 's1', title: 'Escuta', source: escutaCho() },
      ],
    })
    expect(session.metadata?.title).toBe('Jesus, Tu És a minha vida')
    expect(session.metadata?.artwork?.[0]?.src).toBe('https://cdn.sda/jesus.jpg')
    expect(actionKind(session, 'previoustrack')).toBe('fn')
    expect(actionKind(session, 'nexttrack')).toBe('fn')
    expect(actionKind(session, 'seekbackward')).toBe('none')
    expect(actionKind(session, 'seekforward')).toBe('none')
  })

  it('previous on the first song stays on this chart', async () => {
    const session = installMediaSession()
    await viewerAt(390, {
      source: '',
      songs: [
        { id: 's0', title: 'Jesus', source: jesusCho() },
        { id: 's1', title: 'Escuta', source: escutaCho() },
      ],
    })
    session.handlers.get('previoustrack')?.({ action: 'previoustrack' })
    await flushPromises()
    expect(session.metadata?.title).toBe('Jesus, Tu És a minha vida')
  })

  it('nexttrack swaps the chart, the title and the cover', async () => {
    const session = installMediaSession()
    await viewerAt(390, {
      source: '',
      songs: [
        { id: 's0', title: 'Jesus', source: jesusCho() },
        { id: 's1', title: 'Escuta', source: escutaCho() },
      ],
    })
    session.handlers.get('nexttrack')?.({ action: 'nexttrack' })
    await flushPromises()
    expect(session.metadata?.title).toBe('Escuta Meu Clamor')
    expect(session.metadata?.artwork?.[0]?.src).toBe('https://cdn.sda/escuta.jpg')
    expect(actionKind(session, 'previoustrack')).toBe('fn')
    expect(actionKind(session, 'nexttrack')).toBe('fn')
  })

  it('previoustrack returns to the song that was playing', async () => {
    const session = installMediaSession()
    await viewerAt(390, {
      source: '',
      songs: [
        { id: 's0', title: 'Jesus', source: jesusCho() },
        { id: 's1', title: 'Escuta', source: escutaCho() },
      ],
    })
    session.handlers.get('nexttrack')?.({ action: 'nexttrack' })
    await flushPromises()
    session.handlers.get('previoustrack')?.({ action: 'previoustrack' })
    await flushPromises()
    expect(session.metadata?.title).toBe('Jesus, Tu És a minha vida')
    expect(actionKind(session, 'previoustrack')).toBe('fn')
    expect(actionKind(session, 'nexttrack')).toBe('fn')
  })

  it('dock next and the lock-screen next land on the same song', async () => {
    const session = installMediaSession()
    const w = await viewerAt(390, {
      source: '',
      songs: [
        { id: 's0', title: 'Jesus', source: jesusCho() },
        { id: 's1', title: 'Escuta', source: escutaCho() },
      ],
    })
    await w.get('[data-song-next]').trigger('click')
    await flushPromises()
    expect(session.metadata?.title).toBe('Escuta Meu Clamor')
    expect(actionKind(session, 'nexttrack')).toBe('fn')
    expect(actionKind(session, 'previoustrack')).toBe('fn')
  })

  it('in the middle of three songs both skip buttons are on', async () => {
    const session = installMediaSession()
    const third = withSung(
      loadFixture(JESUS_1),
      'https://cdn.sda/third.m4a?h=3',
      'https://cdn.sda/third.jpg',
    )
    await viewerAt(390, {
      source: '',
      songs: [
        { id: 's0', title: 'Uma', source: jesusCho() },
        { id: 's1', title: 'Duas', source: escutaCho() },
        { id: 's2', title: 'Três', source: third },
      ],
    })
    session.handlers.get('nexttrack')?.({ action: 'nexttrack' })
    await flushPromises()
    expect(session.metadata?.title).toBe('Escuta Meu Clamor')
    expect(actionKind(session, 'previoustrack')).toBe('fn')
    expect(actionKind(session, 'nexttrack')).toBe('fn')
  })

  it('skip-song with the same file restarts the clock at 0', async () => {
    class LiveAudio {
      src = ''
      currentTime = 0
      duration = 90
      paused = true
      preload = 'metadata'
      private listeners = new Map<string, Set<() => void>>()
      play = async () => {
        this.paused = false
        this.listeners.get('play')?.forEach((fn) => fn())
      }
      pause = () => {
        this.paused = true
        this.listeners.get('pause')?.forEach((fn) => fn())
      }
      load = () => {}
      removeAttribute() {
        this.src = ''
      }
      addEventListener(type: string, fn: () => void) {
        const set = this.listeners.get(type) ?? new Set<() => void>()
        set.add(fn)
        this.listeners.set(type, set)
      }
      removeEventListener(type: string, fn: () => void) {
        this.listeners.get(type)?.delete(fn)
      }
    }
    vi.stubGlobal('Audio', LiveAudio)
    const session = installMediaSession()
    const same = 'https://cdn.sda/same.m4a?h=1'
    const w = await viewerAt(390, {
      source: '',
      songs: [
        { id: 's0', title: 'Jesus', source: withSung(loadFixture(JESUS_1), same, 'https://cdn.sda/jesus.jpg') },
        { id: 's1', title: 'Escuta', source: withSung(loadFixture(ESCUTA), same, 'https://cdn.sda/escuta.jpg') },
      ],
    })
    await w.get('[data-audio-open]').trigger('click')
    await w.get('[data-audio-play]').trigger('click')
    await flushPromises()
    await w.get('[data-audio-skip="1"]').trigger('click')
    expect(w.get('[data-audio-clock]').text()).not.toBe('0:00')
    session.handlers.get('nexttrack')?.({ action: 'nexttrack' })
    await flushPromises()
    expect(session.metadata?.title).toBe('Escuta Meu Clamor')
    expect(w.get('[data-audio-clock]').text()).toBe('0:00')
  })

  it('a song without audio drops the session until the next one with a track', async () => {
    const session = installMediaSession()
    await viewerAt(390, {
      source: '',
      songs: [
        { id: 's0', title: 'Jesus', source: jesusCho() },
        { id: 's1', title: 'Sem faixa', source: loadFixture(ESCUTA) },
        { id: 's2', title: 'De novo', source: escutaCho() },
      ],
    })
    session.handlers.get('nexttrack')?.({ action: 'nexttrack' })
    await flushPromises()
    expect(session.metadata).toBeNull()
    expect(actionKind(session, 'nexttrack')).toBe('none')
    expect(actionKind(session, 'previoustrack')).toBe('none')
  })

  it('clears skip handlers when the viewer unmounts', async () => {
    const session = installMediaSession()
    const w = await viewerAt(390, {
      source: '',
      songs: [
        { id: 's0', title: 'Jesus', source: jesusCho() },
        { id: 's1', title: 'Escuta', source: escutaCho() },
      ],
    })
    w.unmount()
    expect(session.metadata).toBeNull()
    expect(session.handlers.get('nexttrack')).toBeNull()
    expect(session.handlers.get('previoustrack')).toBeNull()
  })
})
