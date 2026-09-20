import { onUnmounted, ref, watch, type Ref } from 'vue'
import { fillAudioCache, matchAudio } from './audio-cache'

export const AUDIO_SKIP_SEC = 10

export type AudioRefOpts = {
  createAudio?: () => HTMLAudioElement
  cacheMatch?: (url: string) => Promise<Blob | null>
  cacheFill?: (url: string) => Promise<void>
}

/**
 * Independent reference transport. Does not drive Rolar, `{duration:}`, or
 * the metronome. Cache is keyed by the full URL (hash change = new file).
 */
export function useAudioRef(url: Ref<string | null>, opts: AudioRefOpts = {}) {
  const playing = ref(false)
  const current = ref(0)
  const duration = ref(0)
  const error = ref(false)
  const fromCache = ref(false)

  let el: HTMLAudioElement | null = null
  let blobUrl: string | null = null
  let generation = 0

  const cacheMatch = opts.cacheMatch ?? matchAudio
  const cacheFill = opts.cacheFill ?? fillAudioCache

  function dropBlob() {
    if (!blobUrl) return
    URL.revokeObjectURL(blobUrl)
    blobUrl = null
  }

  function bind(node: HTMLAudioElement) {
    node.addEventListener('timeupdate', () => {
      current.value = node.currentTime
    })
    node.addEventListener('durationchange', () => {
      const d = node.duration
      duration.value = Number.isFinite(d) ? d : 0
    })
    node.addEventListener('play', () => {
      playing.value = true
      error.value = false
    })
    node.addEventListener('pause', () => {
      playing.value = false
    })
    node.addEventListener('ended', () => {
      playing.value = false
    })
    node.addEventListener('error', () => {
      error.value = true
      playing.value = false
    })
  }

  function ensure(): HTMLAudioElement {
    if (el) return el
    el = (opts.createAudio ?? (() => new Audio()))()
    el.preload = 'metadata'
    bind(el)
    return el
  }

  async function load(next: string | null) {
    const resume = playing.value && !!next
    const gen = ++generation
    const node = el
    if (node) {
      node.pause()
      node.removeAttribute('src')
      node.load()
    }
    dropBlob()
    playing.value = false
    current.value = 0
    duration.value = 0
    error.value = false
    fromCache.value = false
    if (!next) return
    const audio = ensure()
    const blob = await cacheMatch(next)
    if (gen !== generation) return
    if (blob) {
      blobUrl = URL.createObjectURL(blob)
      audio.src = blobUrl
      fromCache.value = true
    } else {
      audio.src = next
      void cacheFill(next)
    }
    if (resume && gen === generation) void play()
  }

  async function play() {
    if (!el || !url.value) return
    try {
      await el.play()
    } catch {
      error.value = true
    }
  }

  function pause() {
    el?.pause()
  }

  function toggle() {
    if (playing.value) pause()
    else void play()
  }

  function seek(t: number) {
    if (!el) return
    const cap = duration.value || el.duration || 0
    const next = cap > 0 ? Math.max(0, Math.min(cap, t)) : Math.max(0, t)
    el.currentTime = next
    current.value = el.currentTime
  }

  function skip(dir: -1 | 1) {
    seek((el?.currentTime ?? current.value) + dir * AUDIO_SKIP_SEC)
  }

  watch(url, (u) => void load(u), { immediate: true })

  onUnmounted(() => {
    generation += 1
    el?.pause()
    dropBlob()
    el = null
  })

  return { playing, current, duration, error, fromCache, play, pause, toggle, seek, skip }
}
