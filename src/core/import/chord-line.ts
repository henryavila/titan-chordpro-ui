/** Only a parenthesis around the whole token — not the `(4)` in `D7(4)`. */
export function unwrapChord(token: string): string {
  return /^\(.+\)$/.test(token) ? token.slice(1, -1) : token
}

/**
 * Brazilian / Cifra Club names: C7M, D7(4), Em7(11), D7(9/11), C9/E, Eb°.
 */

export function isChord(token: string): boolean {
  const t = unwrapChord(token)
  if (!t || !/^[A-H]/.test(t)) return false
  return /^[A-H](?:#|b)?(?:m(?![aj])|M(?!aj)|maj|min|dim|aug|sus|add|º|°|\+)?(?:\d{1,2})?(?:M|maj)?(?:\([^)]+\))?(?:(?:add|sus|maj|min|dim|aug|no)\d{0,2})?(?:[#b+-]\d{1,2})?(?:\/[A-H](?:#|b)?)?$/.test(
    t,
  )
}

/** A line that is only chord names — an intro, a passing bar, a turnaround. */
export function isChordLine(line: string): boolean {
  const t = line.trim()
  if (!t || t.length > 200) return false
  const toks = t.split(/\s+/)
  if (toks.length > 24) return false
  return toks.every(isChord)
}

export const isTabLine = (l: string) =>
  /\|/.test(l) && (l.match(/-/g) || []).length >= 5 && !/[a-z]{4}/i.test(l.replace(/^[eEADGBb]/, ''))
