import {
  durationFromYoutubeHtml,
  normalizeDurationMmSs,
  type ChartMeta,
} from '@henryavila/titan-chordpro-ui'

/**
 * A host may hand back `MM:SS` / `H:MM:SS` or a YouTube watch page.
 * Same read the import and the enrich form already agreed on.
 */
export function durationFromYoutubePayload(raw: string): string | null {
  const t = raw.trim()
  if (/^\d{1,2}:\d{2}$/.test(t) || /^\d+:\d{2}:\d{2}$/.test(t)) return normalizeDurationMmSs(t)
  return durationFromYoutubeHtml(raw)
}

export async function fillYoutubeDuration(
  meta: ChartMeta,
  videoId: string,
  fetchYoutubeDuration: ((videoId: string) => Promise<string>) | undefined,
  opts?: { onlyIfEmpty?: boolean },
): Promise<ChartMeta> {
  const id = videoId.trim()
  if (!id || !fetchYoutubeDuration) return meta
  if (opts?.onlyIfEmpty && String(meta.duration ?? '').trim()) return meta
  try {
    const raw = await fetchYoutubeDuration(id)
    const dur = durationFromYoutubePayload(raw)
    if (dur) return { ...meta, duration: dur }
  } catch {
    /* keep asking on the form */
  }
  return meta
}
