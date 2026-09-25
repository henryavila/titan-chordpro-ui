import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref, type Ref } from 'vue'
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

function hookOf(url: Ref<string | null>, opts: AudioRefOpts) {
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
  const attrs: Record<string, string | null> = {}
  const el = {
    currentTime: 0,
    duration: 90,
    paused: true,
    preload: 'metadata',
    get src() {
      return attrs.src ?? ''
    },
    set src(v: string) {
      attrs.src = v
    },
    play: vi.fn(async () => {
      el.paused = false
      listeners.get('play')?.forEach((fn) => fn())
    }),
    pause: vi.fn(() => {
      el.paused = true
      listeners.get('pause')?.forEach((fn) => fn())
    }),
    load: vi.fn(() => {
      if (!attrs.src) {
        queueMicrotask(() => {
          listeners.get('error')?.forEach((fn) => fn())
        })
      }
    }),
    removeAttribute: vi.fn((name: string) => {
      attrs[name] = null
    }),
    getAttribute: (name: string) => attrs[name] ?? null,
    addEventListener: (type: string, fn: () => void) => {
      const set = listeners.get(type) ?? new Set<() => void>()
      set.add(fn)
      listeners.set(type, set)
    },
    removeEventListener: (type: string, fn: () => void) => {
      listeners.get(type)?.delete(fn)
    },
    emit(type: string) {
      listeners.get(type)?.forEach((fn) => fn())
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
    expect(audio.playing.value).toBe(true)
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

  it('does not treat a paused kind/song reload as a hard failure', async () => {
    const url = ref<string | null>('https://cdn.sda/a.m4a?h=1')
    const el = fakeAudio()
    let release!: () => void
    const gate = new Promise<void>((r) => {
      release = r
    })
    let waits = 0
    const audio = hookOf(url, {
      createAudio: () => el as unknown as HTMLAudioElement,
      cacheMatch: async () => {
        waits += 1
        if (waits === 1) return null
        await gate
        return null
      },
      cacheFill: async () => {},
    })
    await flushPromises()
    expect(el.src).toBe('https://cdn.sda/a.m4a?h=1')
    expect(audio.error.value).toBe(false)

    url.value = 'https://cdn.sda/b.m4a?h=2'
    await flushPromises()
    expect(audio.error.value).toBe(false)

    release()
    await flushPromises()
    expect(el.src).toBe('https://cdn.sda/b.m4a?h=2')
    expect(audio.error.value).toBe(false)
    expect(el.getAttribute('src')).toBe('https://cdn.sda/b.m4a?h=2')
  })

  it('ignores AbortError from an interrupted play()', async () => {
    const url = ref<string | null>('https://cdn.sda/a.m4a?h=1')
    const el = fakeAudio()
    const audio = hookOf(url, {
      createAudio: () => el as unknown as HTMLAudioElement,
      cacheMatch: async () => null,
      cacheFill: async () => {},
    })
    await flushPromises()
    el.play.mockImplementation(async () => {
      throw new DOMException('The play() request was interrupted', 'AbortError')
    })
    await audio.play()
    expect(audio.error.value).toBe(false)
    expect(audio.playing.value).toBe(false)
  })

  it('sets error when the current source cannot play', async () => {
    const url = ref<string | null>('https://cdn.sda/a.m4a?h=1')
    const el = fakeAudio()
    const audio = hookOf(url, {
      createAudio: () => el as unknown as HTMLAudioElement,
      cacheMatch: async () => null,
      cacheFill: async () => {},
    })
    await flushPromises()
    el.play.mockImplementation(async () => {
      throw new DOMException('Failed to load', 'NotSupportedError')
    })
    await audio.play()
    expect(audio.error.value).toBe(true)

    url.value = 'https://cdn.sda/b.m4a?h=2'
    await flushPromises()
    expect(audio.error.value).toBe(false)
    el.emit('error')
    expect(audio.error.value).toBe(true)
  })
})

describe('CpvAudioRef', () => {
  const base = {
    playing: false,
    current: 12,
    duration: 90,
    error: false,
    title: 'Nasce em Mim',
    artist: 'Adoradores',
    art: 'https://cdn.sda/a.jpg?h=1',
    kind: 'sung' as const,
    kinds: ['sung'] as ('sung' | 'playback')[],
  }

  it('starts closed: a Referência chip, not the full card', () => {
    const w = mount(CpvAudioRef, { props: base })
    expect(w.get('[data-audio-ref]').classes()).toContain('is-closed')
    expect(w.get('[data-audio-open]').text()).toContain('Cantado')
    expect(w.get('[data-audio-open]').text()).toContain('Nasce em Mim')
    expect(w.find('[data-audio-title]').exists()).toBe(false)
    expect(w.find('[data-audio-seek]').exists()).toBe(false)
    expect(w.find('[data-audio-close]').exists()).toBe(false)
    expect(w.get('[data-audio-ref]').classes()).toContain('cpv-audio-ref')
    w.unmount()
  })

  it('inline closed chip is headphones, not play or album art', async () => {
    const w = mount(CpvAudioRef, { props: { ...base, inline: true } })
    expect(w.get('[data-audio-ref]').classes()).toContain('is-inline')
    expect(w.get('[data-audio-ref]').classes()).toContain('is-closed')
    expect(w.find('[data-audio-play]').exists()).toBe(false)
    expect(w.find('[data-icon=chevronUp]').exists()).toBe(false)
    expect(w.get('[data-icon=headphones]').exists()).toBe(true)
    expect(w.find('[data-audio-art]').exists()).toBe(false)
    await w.get('[data-audio-open]').trigger('click')
    expect(w.get('[data-audio-art]').exists()).toBe(true)
    expect(w.get('[data-audio-title]').text()).toBe('Nasce em Mim')
    w.unmount()
  })

  it('inline headphones pulse while the reference plays', () => {
    const w = mount(CpvAudioRef, { props: { ...base, inline: true, playing: true } })
    expect(w.get('[data-audio-ref]').classes()).toContain('is-playing')
    expect(w.get('[data-icon=headphones]').exists()).toBe(true)
    expect(w.findAll('[data-audio-wave]').length).toBe(2)
    const idle = mount(CpvAudioRef, { props: { ...base, inline: true, playing: false } })
    expect(idle.get('[data-audio-ref]').classes()).not.toContain('is-playing')
    idle.unmount()
    w.unmount()
  })

  it('opens the now-playing card and closes it without stopping', async () => {
    const w = mount(CpvAudioRef, { props: { ...base, playing: true } })
    await w.get('[data-audio-open]').trigger('click')
    expect(w.get('[data-audio-ref]').classes()).not.toContain('is-closed')
    expect(w.get('[data-audio-title]').text()).toBe('Nasce em Mim')
    expect(w.get('[data-audio-artist]').text()).toBe('Adoradores')
    expect(w.find('[data-audio-close]').exists()).toBe(true)
    expect(w.find('[data-icon=pause]').exists()).toBe(true)
    await w.get('[data-audio-close]').trigger('click')
    expect(w.get('[data-audio-ref]').classes()).toContain('is-closed')
    expect(w.find('[data-audio-open]').exists()).toBe(true)
    expect(w.emitted('toggle')).toBeUndefined()
    w.unmount()
  })

  it('shows what is playing even when only one track exists', async () => {
    const one = mount(CpvAudioRef, { props: base })
    await one.get('[data-audio-open]').trigger('click')
    expect(one.get('[data-audio-kind=sung]').text()).toBe('Cantado')
    expect(one.get('[data-audio-kind=sung]').classes()).toContain('is-solo')
    expect(one.find('[data-audio-kind=playback]').exists()).toBe(false)
    one.unmount()

    const pb = mount(CpvAudioRef, {
      props: { ...base, kind: 'playback', kinds: ['playback'] },
    })
    await pb.get('[data-audio-open]').trigger('click')
    expect(pb.get('[data-audio-kind=playback]').text()).toBe('Playback')
    expect(pb.find('button[data-audio-kind]').exists()).toBe(false)
    pb.unmount()
  })

  it('switches sung and playback as quiet labels, not tabs', async () => {
    const w = mount(CpvAudioRef, {
      props: { ...base, kinds: ['sung', 'playback'] },
    })
    await w.get('[data-audio-open]').trigger('click')
    expect(w.get('[data-audio-kind]').classes()).toContain('is-switch')
    expect(w.get('[data-audio-kind=sung]').element.tagName).toBe('BUTTON')
    expect(w.get('[data-audio-kind=playback]').element.tagName).toBe('BUTTON')
    expect(w.get('[data-audio-kind=sung]').text()).toBe('Cantado')
    expect(w.get('[data-audio-kind=playback]').text()).toBe('Playback')
    expect(w.get('[data-audio-kind=playback]').attributes('title')).toContain('Playback')
    await w.get('[data-audio-kind=playback]').trigger('click')
    expect(w.emitted('kind')?.[0]).toEqual(['playback'])
    w.unmount()
  })

  it('is a music transport, not the Rolar chevron', async () => {
    const w = mount(CpvAudioRef, { props: base })
    await w.get('[data-audio-open]').trigger('click')
    expect(w.get('[data-audio-ref]').classes()).toContain('cpv-hit')
    expect(w.get('[data-audio-title]').text()).toBe('Nasce em Mim')
    expect(w.get('[data-audio-artist]').text()).toBe('Adoradores')
    expect(w.get('[data-audio-art] img').attributes('src')).toBe('https://cdn.sda/a.jpg?h=1')
    expect(w.find('[data-icon=play]').exists()).toBe(true)
    expect(w.find('[data-icon=chevronsDown]').exists()).toBe(false)
    expect(w.get('[data-audio-clock]').text()).toBe('0:12')
    expect(w.get('[data-audio-total]').text()).toBe('1:30')
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
      props: { ...base, playing: true, current: 0, duration: 10, title: 'Nasce' },
    })
    expect(live.find('[data-icon=pause]').exists()).toBe(true)
    expect(live.get('[data-audio-play]').attributes('aria-label')).toBe('Pausar referência')
    await live.get('[data-audio-open]').trigger('click')
    expect(live.find('[data-icon=pause]').exists()).toBe(true)
    live.unmount()

    const fail = mount(CpvAudioRef, {
      props: { ...base, current: 0, duration: 0, error: true, title: 'Nasce' },
    })
    await fail.get('[data-audio-open]').trigger('click')
    expect(fail.text()).toContain('Não foi possível tocar')
    fail.unmount()
  })

  it('shows default cover art when the host did not provide one', async () => {
    const w = mount(CpvAudioRef, {
      props: { ...base, current: 0, duration: 0, art: null },
    })
    expect(w.find('[data-audio-art] img').exists()).toBe(true)
    expect(w.find('[data-audio-art] img').attributes('data-audio-art-default')).toBeDefined()
    expect(w.find('[data-audio-art] img').attributes('width')).toBe('512')
    await w.get('[data-audio-open]').trigger('click')
    expect(w.find('[data-audio-art] img').attributes('data-audio-art-default')).toBeDefined()
    w.unmount()
  })
})

describe('viewer referência chrome', () => {
  it('hides the player when the chart has no sung or playback track', async () => {
    const w = await viewerAt(390)
    expect(w.find('[data-audio-ref]').exists()).toBe(false)
    expect(w.find('[data-scroll] [data-icon=chevronsDown]').exists()).toBe(true)
  })

  it('shows the player from a sung track and keeps Rolar as chevrons', async () => {
    const source = setAudioUrl(loadFixture(JESUS_1), 'https://cdn.sda/jesus.m4a?h=1', 'sung')
    const w = await viewerAt(390, { source })
    expect(w.find('[data-audio-ref]').exists()).toBe(true)
    expect(w.find('[data-audio-open]').exists()).toBe(true)
    expect(w.find('[data-audio-title]').exists()).toBe(false)
    await w.get('[data-audio-open]').trigger('click')
    expect(w.get('[data-audio-title]').text().length).toBeGreaterThan(0)
    expect(w.find('[data-audio-ref] [data-icon=play]').exists()).toBe(true)
    expect(w.find('[data-scroll] [data-icon=chevronsDown]').exists()).toBe(true)
    expect(w.find('[data-scroll] [data-icon=play]').exists()).toBe(false)
    expect(w.get('[data-audio-kind=sung]').text()).toBe('Cantado')
    expect(w.find('button[data-audio-kind]').exists()).toBe(false)
  })

  it('shows playback-only and a switcher when both tracks exist', async () => {
    const onlyPb = setAudioUrl(loadFixture(JESUS_1), 'https://cdn.sda/pb.m4a?h=1', 'playback')
    const pb = await viewerAt(390, { source: onlyPb })
    expect(pb.get('[data-audio-open]').exists()).toBe(true)
    expect(pb.get('[data-audio-open]').text()).not.toContain('Playback')
    await pb.get('[data-audio-open]').trigger('click')
    expect(pb.get('[data-audio-kind=playback]').text()).toBe('Playback')
    expect(pb.find('button[data-audio-kind]').exists()).toBe(false)
    pb.unmount()

    const both = setAudioUrl(onlyPb, 'https://cdn.sda/voz.m4a?h=2', 'sung')
    const w = await viewerAt(390, { source: both })
    await w.get('[data-audio-open]').trigger('click')
    expect(w.find('[data-audio-kind=sung]').exists()).toBe(true)
    expect(w.find('[data-audio-kind=playback]').exists()).toBe(true)
    await w.get('[data-audio-kind=playback]').trigger('click')
    expect(w.get('[data-audio-kind=playback]').attributes('aria-pressed')).toBe('true')
  })

  it('does not show the player in edit', async () => {
    const source = setAudioUrl(loadFixture(JESUS_1), 'https://cdn.sda/jesus.m4a?h=1')
    const w = await viewerAt(1024, { source, canEdit: true, modes: 'content' })
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(w.find('[data-audio-ref]').exists()).toBe(false)
  })

  it('on a phone, the closed player shares the Cifra/Letra row', async () => {
    const source = setAudioUrl(loadFixture(JESUS_1), 'https://cdn.sda/jesus.m4a?h=1', 'sung')
    const w = await viewerAt(390, { source })
    expect(w.get('[data-phone-lead]').exists()).toBe(true)
    expect(w.get('[data-reading-switch]').exists()).toBe(true)
    expect(w.get('[data-audio-ref]').exists()).toBe(true)
    expect(w.get('[data-audio-ref]').classes()).toContain('is-closed')
    expect(w.get('[data-audio-ref]').classes()).toContain('is-inline')
    expect(w.find('[data-audio-art]').exists()).toBe(false)
    expect(w.find('[data-audio-play]').exists()).toBe(false)
    expect(w.get('[data-icon=headphones]').exists()).toBe(true)
    w.unmount()
  })

  it('on a wide screen the chip stays above the dock, with title', async () => {
    const source = setAudioUrl(loadFixture(JESUS_1), 'https://cdn.sda/jesus.m4a?h=1', 'sung')
    const w = await viewerAt(1024, { source })
    expect(w.find('[data-phone-lead]').exists()).toBe(false)
    expect(w.get('[data-audio-open]').text()).toContain('Cantado')
    expect(w.get('[data-audio-ref]').classes()).not.toContain('is-inline')
    w.unmount()
  })
})

function installLiveAudio() {
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
    removeAttribute() {}
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
}

function chromeGone(w: Awaited<ReturnType<typeof viewerAt>>) {
  return w.findAll('.cpv-chrome').map((c) => c.classes().includes('is-hidden'))
}

async function phoneWithAudio(props: Record<string, unknown> = {}) {
  installLiveAudio()
  const source = setAudioUrl(loadFixture(JESUS_1), 'https://cdn.sda/jesus.m4a?h=1', 'sung')
  const w = await viewerAt(390, { source, ...props })
  const el = w.get('[data-cpv-scroll]').element as HTMLElement
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 4000 })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: 500 })
  observers.forEach((cb) => cb([{ contentRect: { width: 390, height: 800 } }]))
  await flushPromises()
  return w
}

describe('chrome while the reference plays', () => {
  it('a tap on the chart hides the chrome without stopping the audio', async () => {
    const w = await phoneWithAudio({ autoHide: false })
    await w.get('[data-audio-open]').trigger('click')
    await flushPromises()
    await w.get('[data-audio-play]').trigger('click')
    await flushPromises()
    expect(w.find('[data-icon=pause]').exists()).toBe(true)
    expect(chromeGone(w).some(Boolean)).toBe(false)

    await w.get('[data-cpv-scroll]').trigger('click')
    await flushPromises()
    expect(chromeGone(w).every(Boolean), 'playing pinned the chrome').toBe(true)
    expect(w.find('[data-audio-title]').exists()).toBe(false)
    expect(w.get('[data-icon=headphones]').exists()).toBe(true)
    expect(w.get('[data-audio-ref]').classes()).toContain('is-playing')

    await w.get('[data-cpv-scroll]').trigger('click')
    await flushPromises()
    expect(chromeGone(w).some(Boolean)).toBe(false)
    expect(w.get('[data-audio-ref]').classes()).toContain('is-playing')
    w.unmount()
  })

  it('Rolar still tucks the dock while the reference plays', async () => {
    const w = await phoneWithAudio({ autoHide: true })
    await w.get('[data-audio-open]').trigger('click')
    await flushPromises()
    await w.get('[data-audio-play]').trigger('click')
    await flushPromises()
    await w.get('[data-scroll]').trigger('click')
    await flushPromises()
    const dock = w.get('[data-scroll]').element.closest('.cpv-chrome') as HTMLElement
    expect(dock.classList.contains('is-hidden'), 'playing blocked auto-hide').toBe(true)
    expect(w.get('[data-icon=headphones]').exists()).toBe(true)
    w.unmount()
  })

  it('a tap still hides chrome when the player is only paused', async () => {
    const w = await phoneWithAudio({ autoHide: false })
    expect(w.find('[data-audio-ref]').exists()).toBe(true)
    await w.get('[data-cpv-scroll]').trigger('click')
    await flushPromises()
    expect(chromeGone(w).every(Boolean)).toBe(true)
    w.unmount()
  })
})
