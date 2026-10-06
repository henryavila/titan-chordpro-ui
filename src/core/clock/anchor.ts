/**
 * Fraction of the viewport where the music comes to rest, once the scroll has
 * room to place it there. A third leaves two thirds of the screen for what is
 * coming, which is where a musician's eye already is — half the screen spent
 * on what has been played is half a screen not read.
 */
export const ANCHOR_RATIO = 0.34

/**
 * Share of the early scroll given over to building the anchor up.
 *
 * At the first note the music is necessarily at the top of the page: there is
 * nothing above it to scroll away. The old scroll paid that debt by standing
 * completely still until the music had covered a whole anchor of paper, which
 * on real charts was 25 to 96 seconds — a third of the song on `entrega-2`,
 * and half of `088-minha-ofertinha`, a chart with 29px of scrolling in it. The
 * page pays it gradually instead: it runs at `1 - ANCHOR_RAMP` of the music's
 * pace while the music drifts down to its resting place, and at the music's
 * pace from there.
 *
 * Compact voiceless intro is the exception. Many chords and no lyric occupy a
 * few lines at the top; the clock already spends their `x///` at the BPM, but
 * feeding those pixels into the ramp pulled the first verse to the top before
 * anyone sang it. The ramp starts at the first sung line, or at the reading
 * line when that intro is taller than a third of the screen (a tab, five
 * lines of chords). A `{c:INTRODUÇÃO}` with no played line is not an intro.
 */
export const ANCHOR_RAMP = 0.5

/**
 * Where the music rests on screen, in px from the top of the viewport.
 *
 * Bounded by the scrolling the chart actually has to give: a chart barely
 * taller than the frame cannot hold the music a third of the way down, and
 * asking it to used to freeze the page for most of the song over a scroll of
 * a few dozen pixels.
 */
export function anchorPx(viewportHeight: number, docHeight = Infinity): number {
  const room = Math.max(0, docHeight - viewportHeight)
  return Math.round(ANCHOR_RATIO * Math.min(viewportHeight, room))
}

/**
 * Where the page sits when the music has reached `px` of the document.
 *
 * `origin` is where the ramp starts ({@link Timeline.hold}, falling back to
 * {@link contentOrigin}). Chrome and a compact voiceless intro above it must
 * not consume the ramp: at t=0 the playhead is already at the first musical
 * pixel and the page is at scroll 0. With `origin = 0` this is the original
 * formula.
 */
export function scrollAtPx(px: number, anchor: number, origin = 0): number {
  const rel = Math.max(0, px - origin)
  const room = Math.max(0, anchor - origin)
  return rel - Math.min(room, rel * ANCHOR_RAMP)
}

/** The music shown at a given scroll offset — the inverse of {@link scrollAtPx}. */
export function pxAtScroll(scroll: number, anchor: number, origin = 0): number {
  const s = Math.max(0, scroll)
  const room = Math.max(0, anchor - origin)
  if (room <= 0) return origin + s
  // Below the knee the remaining anchor is still growing, so the page has
  // covered only `1 - ANCHOR_RAMP` of the music's paper past the origin.
  const knee = (room * (1 - ANCHOR_RAMP)) / ANCHOR_RAMP
  return s < knee ? origin + s / (1 - ANCHOR_RAMP) : s + origin + room
}
