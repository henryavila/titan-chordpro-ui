import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MediaDemo from '../../demo/MediaDemo.vue'
import { MEDIA_DEMO_PAGE_TITLE } from '../../demo/media-host'

const observers: ((entries: unknown[]) => void)[] = []
class TestRO {
  constructor(cb: (entries: unknown[]) => void) {
    observers.push(cb)
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

const mounted: ReturnType<typeof mount>[] = []
let realRO: typeof ResizeObserver
let pageTitle = ''

beforeEach(() => {
  pageTitle = document.title
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
  const api = {
    metadata: {
      title: 'Nasce em Mim',
      artist: 'CD Jovem',
      album: 'Cantado',
      artwork: [{ src: '/art.jpg', sizes: '1024x1024', type: 'image/jpeg' }],
    },
    playbackState: 'paused' as MediaSessionPlaybackState,
    setActionHandler: vi.fn(),
    setPositionState: vi.fn(),
  }
  Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: api })
  vi.stubGlobal(
    'MediaMetadata',
    class {
      constructor(init: object) {
        Object.assign(this, init)
      }
    },
  )
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  globalThis.ResizeObserver = realRO
  localStorage.clear()
  document.title = pageTitle
  Reflect.deleteProperty(navigator, 'mediaSession')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('MediaDemo consumer host', () => {
  it('is reading mode with 1024 cover and a page title that is not the song', async () => {
    const w = mount(MediaDemo, { attachTo: document.body })
    mounted.push(w)
    observers.forEach((cb) => cb([{ contentRect: { width: 390, height: 800 } }]))
    await flushPromises()
    expect(document.title).toBe(MEDIA_DEMO_PAGE_TITLE)
    expect(w.get('[data-page-title]').text()).toBe(MEDIA_DEMO_PAGE_TITLE)
    expect(w.get('[data-page-title]').text()).not.toContain('Nasce em Mim')
    expect(w.get('[data-media-title]').text()).toBe('Nasce em Mim')
    expect(w.get('[data-media-artist]').text()).toBe('CD Jovem')
    expect(w.get('[data-media-album]').text()).toBe('Cantado')
    expect(w.get('[data-media-art-sizes]').text()).toBe('1024x1024')
    expect(w.get('[data-media-state]').text()).toBe('paused')
    expect(w.find('[data-audio-ref]').exists()).toBe(true)
    await w.get('[data-audio-open]').trigger('click')
    await flushPromises()
    expect(w.get('[data-audio-kind=sung]').text()).toBe('Cantado')
    expect(w.get('[data-audio-title]').text()).toBe('Nasce em Mim')
    expect(w.find('[data-edit]').exists()).toBe(false)
    const cho = String(w.getComponent({ name: 'ChordproViewer' }).props('source') ?? '')
    expect(cho).toContain('{x_audio_art_w:1024}')
    expect(cho).toContain('{x_audio_sung:')
    expect(cho).toContain('{x_audio_playback:')
    expect(w.getComponent({ name: 'ChordproViewer' }).props('editMode')).toBe('none')
    expect(w.getComponent({ name: 'ChordproViewer' }).props('defaultAudioArt')).toMatchObject({
      width: 1024,
      height: 1024,
    })
  })
})
