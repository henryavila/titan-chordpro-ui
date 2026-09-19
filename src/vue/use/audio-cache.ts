import {
  AUDIO_CACHE_MAX_BYTES,
  evictToFit,
  shouldCacheFile,
  type AudioCacheEntry,
} from '@henryavila/titan-chordpro-ui'

const CACHE_NAME = 'cpv-audio-ref-v1'
/** Synthetic key inside the same Cache Storage bucket — not an audio URL. */
const INDEX_URL = 'https://titan-chordpro-ui.local/audio-ref-index'

function cacheApi(): CacheStorage | null {
  try {
    const g = globalThis as typeof globalThis & { caches?: CacheStorage }
    return g.caches ?? null
  } catch {
    return null
  }
}

async function bytesOf(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return await new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as ArrayBuffer)
    fr.onerror = () => reject(fr.error)
    fr.readAsArrayBuffer(blob)
  })
}

async function open(): Promise<Cache | null> {
  const api = cacheApi()
  if (!api) return null
  try {
    return await api.open(CACHE_NAME)
  } catch {
    return null
  }
}

async function readIndex(cache: Cache): Promise<AudioCacheEntry[]> {
  try {
    const res = await cache.match(INDEX_URL)
    if (!res) return []
    const data = (await res.json()) as unknown
    if (!Array.isArray(data)) return []
    return data.filter(
      (e): e is AudioCacheEntry =>
        !!e && typeof e.url === 'string' && typeof e.bytes === 'number' && typeof e.last === 'number',
    )
  } catch {
    return []
  }
}

async function writeIndex(cache: Cache, entries: AudioCacheEntry[]): Promise<void> {
  await cache.put(
    INDEX_URL,
    new Response(JSON.stringify(entries), { headers: { 'Content-Type': 'application/json' } }),
  )
}

export async function matchAudio(url: string): Promise<Blob | null> {
  const cache = await open()
  if (!cache) return null
  try {
    const res = await cache.match(url)
    if (!res || !res.ok) return null
    const buf = await res.arrayBuffer()
    if (!buf.byteLength) return null
    const type = res.headers.get('Content-Type') || 'application/octet-stream'
    const blob = new Blob([buf], { type })
    const entries = await readIndex(cache)
    const now = Date.now()
    const next = entries.some((e) => e.url === url)
      ? entries.map((e) => (e.url === url ? { ...e, last: now, bytes: blob.size } : e))
      : [...entries, { url, bytes: blob.size, last: now }]
    await writeIndex(cache, next)
    return blob
  } catch {
    return null
  }
}

export async function putAudio(url: string, blob: Blob): Promise<void> {
  if (!shouldCacheFile(blob.size)) return
  const cache = await open()
  if (!cache) return
  try {
    const incoming: AudioCacheEntry = { url, bytes: blob.size, last: Date.now() }
    const { keep, drop } = evictToFit(await readIndex(cache), incoming, AUDIO_CACHE_MAX_BYTES)
    for (const dead of drop) await cache.delete(dead)
    const type = blob.type || 'application/octet-stream'
    await cache.put(
      url,
      new Response(await bytesOf(blob), { headers: { 'Content-Type': type } }),
    )
    await writeIndex(cache, keep)
  } catch {
    /* quota / private mode — play still uses the network URL */
  }
}

/** Background fill. Never throws; CORS failure leaves playback on `<audio src>`. */
export async function fillAudioCache(url: string): Promise<void> {
  if (await matchAudio(url)) return
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) return
    const blob = await res.blob()
    await putAudio(url, blob)
  } catch {
    /* opaque / offline / CORS */
  }
}
