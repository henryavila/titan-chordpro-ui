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

  it('opens the now-playing card and closes it without stopping', async () => {
    const w = mount(CpvAudioRef, { props: { ...base, playing: true } })
    await w.get('[data-audio-open]').trigger('click')
    expect(w.get('[data-audio-ref]').classes()).not.toContain('is-closed')
    expect(w.get('[data-audio-title]').text()).toBe('Nasce em Mim')
    expect(w.get('[data-audio-artist]').text()).toBe('Adoradores')
    expect(w.get('[data-audio-close]').exists()).toBe(true)
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
    expect(w.get('[data-audio-kind=sung]').text()).toBe('Cantado')
    expect(w.get('[data-audio-kind=playback]').text()).toBe('Playback')
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
    expect(pb.get('[data-audio-open]').text()).toContain('Playback')
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
})
