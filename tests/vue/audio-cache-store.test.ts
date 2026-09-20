import { afterEach, describe, expect, it, vi } from 'vitest'
import { fillAudioCache, matchAudio, putAudio } from '../../src/vue/use/audio-cache'

type Stored = { body: ArrayBuffer; type: string; status: number }
type Store = Map<string, Stored>

function keyOf(req: RequestInfo) {
  return typeof req === 'string' ? req : req.url
}

function installCaches() {
  const buckets = new Map<string, Store>()
  const cachesLike = {
    open: vi.fn(async (name: string) => {
      const store = buckets.get(name) ?? new Map<string, Stored>()
      buckets.set(name, store)
      return {
        match: async (req: RequestInfo) => {
          const hit = store.get(keyOf(req))
          if (!hit) return undefined
          return new Response(hit.body.slice(0), {
            status: hit.status,
            headers: { 'Content-Type': hit.type },
          })
        },
        put: async (req: RequestInfo, res: Response) => {
          store.set(keyOf(req), {
            body: await res.arrayBuffer(),
            type: res.headers.get('Content-Type') || 'application/octet-stream',
            status: res.status,
          })
        },
        delete: async (req: RequestInfo) => store.delete(keyOf(req)),
      }
    }),
  }
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: cachesLike })
  return { buckets, cachesLike }
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'caches')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Cache Storage audio ref', () => {
  it('round-trips a blob keyed by the full URL', async () => {
    installCaches()
    const url = 'https://cdn.sda/nasce.m4a?h=a1'
    const blob = new Blob([new Uint8Array(32)], { type: 'audio/mp4' })
    await putAudio(url, blob)
    const hit = await matchAudio(url)
    expect(hit).toBeTruthy()
    expect(hit?.size).toBe(32)
    expect(await matchAudio('https://cdn.sda/nasce.m4a?h=b2')).toBeNull()
  })

  it('skips a file over the per-file cap', async () => {
    installCaches()
    const url = 'https://cdn.sda/huge.m4a?h=1'
    const blob = new Blob([new Uint8Array(20 * 1024 * 1024 + 8)])
    await putAudio(url, blob)
    expect(await matchAudio(url)).toBeNull()
  })

  it('fills from fetch when CORS allows, and no-ops when it does not', async () => {
    installCaches()
    const url = 'https://cdn.sda/ok.m4a?h=1'
    const body = new Uint8Array(16)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body, { status: 200, headers: { 'Content-Type': 'audio/mp4' } })),
    )
    await fillAudioCache(url)
    expect((await matchAudio(url))?.size).toBe(16)

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    await fillAudioCache('https://cdn.sda/blocked.m4a?h=1')
    expect(await matchAudio('https://cdn.sda/blocked.m4a?h=1')).toBeNull()
  })

  it('is a silent no-op when Cache Storage is missing', async () => {
    Reflect.deleteProperty(globalThis, 'caches')
    const blob = new Blob([new Uint8Array(8)])
    await putAudio('https://cdn.sda/a.m4a?h=1', blob)
    expect(await matchAudio('https://cdn.sda/a.m4a?h=1')).toBeNull()
  })
})
