import { layoutChartFull } from './layout'
import { parse } from './parse'
import type { ChordProView } from './types'

/**
 * One sung line as the chart wrote it. `sectionIndex` is a closed
 * stanza/chorus block (blank line, `{soc}`/`{eoc}`) — a hard slide boundary.
 */
export type SlideSourceLine = {
  text: string
  sectionIndex: number
}

/**
 * Lyric projection for congregation slides. Chords, `x///`, tab, score,
 * images and rehearsal comments are gone; the author's line breaks and
 * section closures stay. Unlike the Só letra *reading* lens, comments do
 * not belong on a projector.
 */
export function lyricsForSlides(view: ChordProView): SlideSourceLine[] {
  const { blocks } = layoutChartFull(view, { lens: 'letra' })
  const out: SlideSourceLine[] = []
  let sectionIndex = -1
  for (const block of blocks) {
    if (block.kind !== 'stanza' && block.kind !== 'chorus') continue
    sectionIndex += 1
    for (const row of block.rows) {
      const text = String(row.plain ?? '')
        .replace(/[ \t]+/g, ' ')
        .trim()
      if (!text) continue
      out.push({ text, sectionIndex })
    }
  }
  return out
}

/** Plaintext: one chart line per line, blank line between sections. */
export function lyricsText(view: ChordProView): string {
  const rows = lyricsForSlides(view)
  const lines: string[] = []
  let prev: number | null = null
  for (const row of rows) {
    if (prev !== null && row.sectionIndex !== prev) lines.push('')
    lines.push(row.text)
    prev = row.sectionIndex
  }
  return lines.join('\n')
}

export type ChartLyrics = {
  title: string
  artist: string | null
  lyrics: string
}

/**
 * Host entry to register a song’s lyrics from its ChordPro, without mounting
 * the viewer. Chords, `x///`, comments, tab and images are not in the text.
 */
export function exportLyrics(source: string): ChartLyrics {
  const view = parse(source)
  const title = (view.meta.title ?? '').trim()
  const artist = (view.meta.artist ?? view.meta.subtitle ?? '').trim() || null
  return { title, artist, lyrics: lyricsText(view) }
}
