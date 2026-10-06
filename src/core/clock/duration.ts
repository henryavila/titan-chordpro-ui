/**
 * Song duration declared in the chart: accepts `m:ss`, `mm:ss`, `h:mm:ss` or
 * plain seconds, and tolerates a space after the directive colon.
 */
export function songDurationSec(duration: string | number | null | undefined): number | null {
  const s = String(duration ?? '').trim()
  if (!s) return null
  const m = s.match(/^(?:(\d+):)?(\d{1,3}):(\d{1,2})$/)
  let sec: number | null = null
  if (m) sec = Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3])
  else if (/^\d+$/.test(s)) sec = Number(s)
  return sec && sec >= 20 && sec <= 3 * 3600 ? sec : null
}

/**
 * Progressive `MM:SS` mask for duration fields: digits only, colon before the
 * last two when there are 3+. `426` → `4:26`, `0426` → `04:26`.
 */
export function maskDurationMmSs(raw: string): string {
  const d = String(raw ?? '').replace(/\D/g, '').slice(0, 4)
  if (d.length <= 2) return d
  return `${d.slice(0, -2)}:${d.slice(-2)}`
}

/**
 * Finalize a masked duration on blur: `MM:SS`, seconds clamped to 0–59.
 * Incomplete values (fewer than 3 digits) stay as typed so the field can keep
 * showing "falta" until the musician finishes.
 */
export function normalizeDurationMmSs(raw: string): string {
  const d = String(raw ?? '').replace(/\D/g, '').slice(0, 4)
  if (d.length < 3) return maskDurationMmSs(raw)
  const mm = d.slice(0, -2).padStart(2, '0')
  const ss = Math.min(59, Number(d.slice(-2)))
  return `${mm}:${String(ss).padStart(2, '0')}`
}

/** Whole seconds → `MM:SS` (or `H:MM:SS` above an hour), for `{duration:}`. */
export function formatDurationFromSec(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h > 0) return `${h}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

/**
 * Duration from a YouTube watch-page HTML. Prefers `lengthSeconds`, then the
 * ISO-8601 `itemprop="duration"` meta. Returns `MM:SS` or null.
 */
export function durationFromYoutubeHtml(html: string): string | null {
  const t = String(html ?? '')
  const secM = t.match(/"lengthSeconds"\s*:\s*"(\d+)"/) || t.match(/"lengthSeconds"\s*:\s*(\d+)/)
  if (secM) {
    const sec = Number(secM[1])
    if (sec >= 20 && sec <= 3 * 3600) return formatDurationFromSec(sec)
  }
  const iso = (t.match(/itemprop="duration"[^>]*content="([^"]+)"/i) ||
    t.match(/content="(PT[^"]+)"[^>]*itemprop="duration"/i) ||
    [])[1]
  if (iso) {
    const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i)
    if (m) {
      const sec = Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)
      if (sec >= 20 && sec <= 3 * 3600) return formatDurationFromSec(sec)
    }
  }
  return null
}

/**
 * Hard gate: auto-scroll runs only when the chart declares a usable
 * `{duration:}`. Unmarked chords and a BPM are not a duration.
 */
export function hasSongDuration(duration: string | number | null | undefined): boolean {
  return songDurationSec(duration) != null
}
