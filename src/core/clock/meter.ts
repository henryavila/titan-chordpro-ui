/** `{time:}` as a numerator and a denominator, 4/4 when absent or unusable. */
function meter(time: string | null | undefined): { n: number; d: number } {
  const m = String(time ?? '').match(/^\s*(\d+)\s*\/\s*(\d+)/)
  const n = m ? Number(m[1]) : 4
  const d = m ? Number(m[2]) : 4
  const ok = n >= 1 && n <= 12 && (d === 2 || d === 4 || d === 8 || d === 16)
  return ok ? { n, d } : { n: 4, d: 4 }
}

/**
 * A compound meter — 6/8, 9/8, 12/8 — is counted in the denominator's unit but
 * FELT in dotted groups of three, and that felt pulse is what a `{tempo:}`
 * names. 3/8 is left out: it is felt in three, like any simple meter.
 */
function compound(n: number, d: number): boolean {
  return d === 8 && n > 3 && n % 3 === 0
}

/**
 * Beats per bar, counted in the unit `{tempo:}` names — the felt pulse, not the
 * denominator. 4/4 is four, 3/4 is three, and 6/8 is TWO: a 6/8 bar is two
 * dotted quarters, not six of whatever a quarter is worth. Reading the
 * numerator alone made a 6/8 bar three times its real length, and every bar the
 * clock derives from it — tabs, scores, the sung estimate — went with it.
 */
export function beatsPerBar(time: string | null | undefined): number {
  const { n, d } = meter(time)
  return compound(n, d) ? n / 3 : n
}

/**
 * How many `x///` marks fit in one of those beats. A mark is one unit of the
 * denominator — a quarter in x/4, an eighth in x/8 — so a simple meter has one
 * mark per beat and a compound one has three.
 *
 * `[E]x//  [F#m7]x//  [D9]x//  [D9]x//` in 6/8 is how a musician writes half a
 * bar per chord, four chords, two bars. Read at one mark per beat it became
 * one and a half bars per chord: chords changing off the barline, which nobody
 * writes.
 */
export function marksPerBeat(time: string | null | undefined): number {
  const { n, d } = meter(time)
  return compound(n, d) ? 3 : 1
}

/** `{tempo:}` when it is a usable BPM. Accepts `65`, `"65"` and `"65 BPM"`. */
export function sheetBpm(tempo: string | number | null | undefined): number | null {
  if (typeof tempo === 'number') {
    return tempo >= 30 && tempo <= 300 && Number.isFinite(tempo) ? Math.round(tempo) : null
  }
  const m = String(tempo ?? '').trim().match(/^(\d{2,3})(?:\s*bpm)?$/i)
  if (!m) return null
  const t = Number(m[1])
  return t >= 30 && t <= 300 ? t : null
}
