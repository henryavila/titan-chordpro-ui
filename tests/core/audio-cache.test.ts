import { describe, expect, it } from 'vitest'
import {
  AUDIO_CACHE_MAX_BYTES,
  AUDIO_CACHE_MAX_FILE,
  evictToFit,
  shouldCacheFile,
} from '../../src/core/audio-cache'

describe('audio cache LRU', () => {
  it('keys by full URL so a hash change is a miss', () => {
    const keepA = { url: 'https://cdn/a.m4a?h=1', bytes: 10, last: 1 }
    const incoming = { url: 'https://cdn/a.m4a?h=2', bytes: 10, last: 2 }
    const { keep, drop } = evictToFit([keepA], incoming, 100)
    expect(keep.map((e) => e.url)).toEqual([
      'https://cdn/a.m4a?h=2',
      'https://cdn/a.m4a?h=1',
    ])
    expect(drop).toEqual([])
  })

  it('drops the oldest when the cap is exceeded, never the incoming URL', () => {
    const entries = [
      { url: 'https://cdn/old.m4a?h=1', bytes: 80, last: 1 },
      { url: 'https://cdn/mid.m4a?h=1', bytes: 80, last: 2 },
    ]
    const incoming = { url: 'https://cdn/new.m4a?h=9', bytes: 80, last: 3 }
    const { keep, drop } = evictToFit(entries, incoming, 200)
    expect(keep.map((e) => e.url)).toEqual(['https://cdn/new.m4a?h=9', 'https://cdn/mid.m4a?h=1'])
    expect(drop).toEqual(['https://cdn/old.m4a?h=1'])
  })

  it('replaces the same URL in place instead of duplicating', () => {
    const entries = [{ url: 'https://cdn/a.m4a?h=1', bytes: 10, last: 1 }]
    const incoming = { url: 'https://cdn/a.m4a?h=1', bytes: 12, last: 9 }
    const { keep, drop } = evictToFit(entries, incoming, 100)
    expect(keep).toEqual([incoming])
    expect(drop).toEqual([])
  })

  it('refuses a file over the per-file cap', () => {
    expect(shouldCacheFile(AUDIO_CACHE_MAX_FILE)).toBe(true)
    expect(shouldCacheFile(AUDIO_CACHE_MAX_FILE + 1)).toBe(false)
    expect(shouldCacheFile(0)).toBe(false)
  })

  it('ships a rehearsal-sized origin cap', () => {
    expect(AUDIO_CACHE_MAX_BYTES).toBe(100 * 1024 * 1024)
    expect(AUDIO_CACHE_MAX_FILE).toBe(20 * 1024 * 1024)
  })
})
