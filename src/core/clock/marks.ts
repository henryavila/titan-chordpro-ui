/**
 * Beats written on the line in the `x///` convention — `x` is always the head
 * of the time (downbeat); `/` is a beat that is not the head. `[Cm]//` with no
 * `x` is two beats, including as a phrase tail. `[Dsus]x/ [D]//` is four beats,
 * one bar in 4/4. It is the only EXACT duration a chart offers, and it shows up
 * exactly where height lies: intro and interlude, many chords and few lyrics.
 * Returns 0 when the line carries no marks — the block falls back to estimate.
 * Product SoT: `docs/MARCAS-X.md`. Do not treat these marks as lyric.
 */
export function lineBeats(src: string): number {
  const s = String(src ?? '')
  if (!/[x/]/.test(s)) return 0
  let n = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c !== 'x' && c !== '/') continue
    const prev = i > 0 ? (s[i - 1] as string) : ''
    const next = i + 1 < s.length ? (s[i + 1] as string) : ''
    const nextOk = next === '' || next === '/' || /\s/.test(next)
    if (!nextOk) continue
    if (c === 'x') {
      if (prev === ']' || (prev !== '' && /\s/.test(prev))) n++
    } else if (prev === ']' || prev === 'x' || prev === '/' || (prev !== '' && /\s/.test(prev))) n++
  }
  return n
}

/**
 * True when the line is played, not sung: chords and `x///` marks, no lyric of
 * its own. Intros, interludes and endings are written this way, and they are
 * the one place a chart states its time exactly — the beats on such a line ARE
 * the scroll time of that stretch, at the chart's BPM.
 *
 * The same marks at the end of a SUNG line are a held tail, not the line's
 * whole duration, which is why the two cases have to be told apart.
 */
export function isPlayedLine(src: string): boolean {
  const bare = String(src ?? '').replace(/\[[^\]]*\]/g, '')
  return !/[^x/\s]/.test(bare)
}
