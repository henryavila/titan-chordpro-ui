import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { setAudioUrl } from '../../src/core/index'
import { ChordproViewer } from '../../src/vue/index'
import CpvAudioRef from '../../src/vue/chrome/CpvAudioRef.vue'
import { AUDIO_SKIP_SEC, useAudioRef, type AudioRefOpts } from '../../src/vue/use/useAudioRef'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

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
  mounted.splice(0).forEach((w) => w.unmount())
  globalThis.ResizeObserver = realRO
  localStorage.clear()
  vi.restoreAllMocks()
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

function hookOf(url: ReturnType<typeof ref<string | null>>, opts: AudioRefOpts) {
  let api!: ReturnType<typeof useAudioRef>
  const Host = defineComponent({
    setup() {
      api = useAudioRef(url, opts)
      return () => null
    },
  })
  const w = mount(Host)
  mounted.push(w)
  return api
}

function fakeAudio() {
  const listeners = new Map<string, Set<() => void>>()
  const el = {
    src: '',
    currentTime: 0,
    duration: 90,
    paused: true,
    preload: 'metadata',
    play: vi.fn(async () => {
      el.paused = false
      listeners.get('play')?.forEach((fn) => fn())
    }),
    pause: vi.fn(() => {
      el.paused = true
      listeners.get('pause')?.forEach((fn) => fn())
    }),
    load: vi.fn(),
    removeAttribute: vi.fn(),
    addEventListener: (type: string, fn: () => void) => {
      const set = listeners.get(type) ?? new Set<() => void>()
      set.add(fn)
      listeners.set(type, set)
    },
    removeEventListener: (type: string, fn: () => void) => {
      listeners.get(type)?.delete(fn)
    },
  }
  return el
}

describe('useAudioRef', () => {
  it('plays, skips 10s, and reloads when the URL hash changes', async () => {
    const url = ref<string | null>('https://cdn.sda/a.m4a?h=1')
    const el = fakeAudio()
    const cacheFill = vi.fn(async () => {})
    const audio = hookOf(url, {
      createAudio: () => el as unknown as HTMLAudioElement,
      cacheMatch: async () => null,
      cacheFill,
    })
    await flushPromises()
    expect(el.src).toBe('https://cdn.sda/a.m4a?h=1')
    expect(cacheFill).toHaveBeenCalledWith('https://cdn.sda/a.m4a?h=1')

    await audio.play()
    expect(audio.playing.value).toBe(true)

    audio.skip(1)
    expect(el.currentTime).toBe(AUDIO_SKIP_SEC)
    audio.skip(-1)
    expect(el.currentTime).toBe(0)

    url.value = 'https://cdn.sda/a.m4a?h=2'
    await flushPromises()
    expect(el.pause).toHaveBeenCalled()
    expect(el.src).toBe('https://cdn.sda/a.m4a?h=2')
    expect(audio.playing.value).toBe(false)
    expect(audio.current.value).toBe(0)
  })

  it('prefers a cached blob over the network URL', async () => {
    const url = ref<string | null>('https://cdn.sda/a.m4a?h=1')
    const el = fakeAudio()
    const blob = new Blob([new Uint8Array(8)], { type: 'audio/mp4' })
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    const audio = hookOf(url, {
      createAudio: () => el as unknown as HTMLAudioElement,
      cacheMatch: async () => blob,
      cacheFill: async () => {},
    })
    await flushPromises()
    expect(create).toHaveBeenCalled()
    expect(el.src).toBe('blob:test')
    expect(audio.fromCache.value).toBe(true)
    create.mockRestore()
  })
})

describe('CpvAudioRef', () => {
  it('is a music transport, not the Rolar chevron', async () => {
    const w = mount(CpvAudioRef, {
      props: {
        playing: false,
        current: 12,
        duration: 90,
        error: false,
      },
    })
    expect(w.get('[data-audio-ref]').classes()).toContain('cpv-hit')
    expect(w.get('[data-audio-ref]').text()).toContain('Referência')
    expect(w.find('[data-icon=play]').exists()).toBe(true)
    expect(w.find('[data-icon=chevronsDown]').exists()).toBe(false)
    expect(w.get('[data-audio-clock]').text()).toBe('0:12 / 1:30')
    await w.get('[data-audio-play]').trigger('click')
    expect(w.emitted('toggle')).toHaveLength(1)
    await w.get('[data-audio-skip="-1"]').trigger('click')
    expect(w.emitted('skip')?.[0]).toEqual([-1])
    await w.get('[data-audio-skip="1"]').trigger('click')
    expect(w.emitted('skip')?.[1]).toEqual([1])
    w.unmount()
  })

  it('shows pause while playing and an error copy on failure', async () => {
    const live = mount(CpvAudioRef, {
      props: { playing: true, current: 0, duration: 10, error: false },
    })
    expect(live.find('[data-icon=pause]').exists()).toBe(true)
    expect(live.get('[data-audio-play]').attributes('aria-label')).toBe('Pausar referência')
    live.unmount()

    const fail = mount(CpvAudioRef, {
      props: { playing: false, current: 0, duration: 0, error: true },
    })
    expect(fail.text()).toContain('Não foi possível tocar')
    fail.unmount()
  })
})

describe('viewer referência chrome', () => {
  it('hides the player when the chart has no x_audio', async () => {
    const w = await viewerAt(390)
    expect(w.find('[data-audio-ref]').exists()).toBe(false)
    expect(w.find('[data-scroll] [data-icon=chevronsDown]').exists()).toBe(true)
  })

  it('shows the player from {x_audio:} and keeps Rolar as chevrons', async () => {
    const source = setAudioUrl(loadFixture(JESUS_1), 'https://cdn.sda/jesus.m4a?h=1')
    const w = await viewerAt(390, { source })
    expect(w.find('[data-audio-ref]').exists()).toBe(true)
    expect(w.find('[data-audio-ref] [data-icon=play]').exists()).toBe(true)
    expect(w.find('[data-scroll] [data-icon=chevronsDown]').exists()).toBe(true)
    expect(w.find('[data-scroll] [data-icon=play]').exists()).toBe(false)
  })

  it('does not show the player in edit', async () => {
    const source = setAudioUrl(loadFixture(JESUS_1), 'https://cdn.sda/jesus.m4a?h=1')
    const w = await viewerAt(1024, { source, canEdit: true, modes: 'content' })
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(w.find('[data-audio-ref]').exists()).toBe(false)
  })
})
