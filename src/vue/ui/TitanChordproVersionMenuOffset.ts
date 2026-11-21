/**
 * Horizontal shift, in px, that brings the open Versão menu back inside its
 * boundary (the Titan root, or the window when there is no root).
 *
 * The menu hangs from the left edge of the chip. On a phone the chip sits at
 * the right edge of the head, so the menu starts on screen and ends past it.
 * Positive values pull right, negative values pull left, 0 means it fits.
 *
 * When the menu is wider than the band left between the margins, no shift can
 * fit it: align its left edge to the band so the reader still starts at the
 * beginning of every row.
 */
export function versionMenuOffset(
  menuLeft: number,
  menuRight: number,
  limitLeft: number,
  limitRight: number,
  margin: number,
): number {
  const bandLeft = limitLeft + margin
  const bandRight = limitRight - margin
  if (menuRight - menuLeft > bandRight - bandLeft) return bandLeft - menuLeft
  if (menuLeft < bandLeft) return bandLeft - menuLeft
  if (menuRight > bandRight) return bandRight - menuRight
  return 0
}
