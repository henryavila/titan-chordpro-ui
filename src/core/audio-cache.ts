/** Origin cap: a weekend rehearsal of ~10 songs, not the whole hymnal. */
export const AUDIO_CACHE_MAX_BYTES = 100 * 1024 * 1024
/** Skip caching a single file bigger than this; still stream it. */
export const AUDIO_CACHE_MAX_FILE = 20 * 1024 * 1024

export type AudioCacheEntry = { url: string; bytes: number; last: number }

export function shouldCacheFile(bytes: number): boolean {
  return bytes > 0 && bytes <= AUDIO_CACHE_MAX_FILE
}

/**
 * LRU keyed by the full URL. A content hash in the query is a new key —
 * Titan does not inspect ETag or songId.
 */
export function evictToFit(
  entries: AudioCacheEntry[],
  incoming: AudioCacheEntry,
  maxBytes: number,
): { keep: AudioCacheEntry[]; drop: string[] } {
  const rest = entries.filter((e) => e.url !== incoming.url)
  const next = [...rest, incoming].sort((a, b) => b.last - a.last)
  const drop: string[] = []
  let total = next.reduce((sum, e) => sum + e.bytes, 0)
  while (total > maxBytes && next.length > 1) {
    let i = next.length - 1
    if (next[i]?.url === incoming.url) i -= 1
    if (i < 0) break
    const victim = next.splice(i, 1)[0]
    if (!victim) break
    drop.push(victim.url)
    total -= victim.bytes
  }
  return { keep: next, drop }
}
