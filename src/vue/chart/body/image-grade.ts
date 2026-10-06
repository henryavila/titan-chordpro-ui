export type ImageGrade = (
  img: HTMLImageElement | null,
  opts: { autoInvert: boolean; theme: 'light' | 'dark' },
) => void

/**
 * A score is always black ink on white paper. In the dark theme that is a lit
 * rectangle in the middle of the chart, so we measure the file's real paper
 * and invert when it fights the theme. `hue-rotate` gives back the chord
 * colour that `invert` alone would push to its complement.
 *
 * One grader per chart: the sample is cached by URL for every scan on that page.
 */
export function createImageGrader(): ImageGrade {
  const bgCache = new Map<string, number | null>()

  function paperLuma(img: HTMLImageElement): number | null {
    const key = img.getAttribute('src') ?? ''
    const hit = bgCache.get(key)
    if (hit !== undefined) return hit
    let lum: number | null = null
    try {
      const n = 40
      const c = document.createElement('canvas')
      c.width = n
      c.height = n
      const cx = c.getContext('2d', { willReadFrequently: true })
      if (!cx) throw new Error('no 2d context')
      cx.drawImage(img, 0, 0, n, n)
      const d = cx.getImageData(0, 0, n, n).data
      // Mode, not mean: the mean of white paper with a lot of ink falls to grey
      // and says nothing about the paper.
      const hist = new Array<number>(16).fill(0)
      for (let i = 0; i < d.length; i += 4) {
        if ((d[i + 3] ?? 0) < 128) continue
        const y = (d[i] ?? 0) * 0.299 + (d[i + 1] ?? 0) * 0.587 + (d[i + 2] ?? 0) * 0.114
        const bucket = Math.min(15, y >> 4)
        hist[bucket] = (hist[bucket] ?? 0) + 1
      }
      let bi = 0
      for (let i = 1; i < 16; i++) if ((hist[i] ?? 0) > (hist[bi] ?? 0)) bi = i
      lum = hist[bi] ? (bi * 16 + 8) / 255 : null
    } catch {
      lum = null
    }
    bgCache.set(key, lum)
    return lum
  }

  return (img, opts) => {
    if (!img || !img.naturalWidth) return
    // A scanned score usually has fewer pixels than the column offers.
    // Stretching to 100% blurred the chords, so the ceiling is the file's own
    // size: it shrinks on a narrow column, never enlarges.
    img.style.maxWidth = `${img.naturalWidth}px`
    img.style.width = '100%'
    const wrap = img.parentElement
    if (!opts.autoInvert) {
      img.style.filter = ''
      if (wrap) wrap.style.background = '#FFFFFF'
      return
    }
    const lum = paperLuma(img)
    if (lum === null) return
    const dark = opts.theme === 'dark'
    const flip = dark ? lum > 0.62 : lum < 0.38
    // Inverting alone leaves the paper absolute black, darker than the card
    // around it. The reduced contrast lifts the black point towards the card
    // without erasing the ink.
    img.style.filter = flip ? 'invert(1) hue-rotate(180deg) contrast(0.9) brightness(1.03)' : ''
    if (wrap) wrap.style.background = flip ? 'transparent' : lum > 0.5 ? '#FFFFFF' : '#0B0B0C'
  }
}
