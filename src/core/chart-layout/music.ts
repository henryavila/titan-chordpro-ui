import { isPlayedLine, lineBeats } from '../clock/marks'
import type { BlockMusic } from '../types'
import type { ChartBlockDraft } from './group'

/** Musical weight of a block — see {@link BlockMusic}. */
export function musicOf(block: ChartBlockDraft, srcLines: string[]): BlockMusic {
  let chords = 0
  for (let i = block.li0; i <= block.li1; i++) {
    chords += ((srcLines[i] ?? '').match(/\[[^\]]*\]/g) || []).length
  }
  let bars = 0
  if (block.kind === 'score') {
    // A written score counts its bar lines: `| … |` — two pipes per bar.
    bars = Math.round((String(block.text).match(/\|/g) || []).length / 2)
  } else if (block.kind === 'tab') {
    const st = block.staves[0]
    bars = st ? st.tokens.filter((t) => t.kind === 'bar').length : 0
  }
  // Row by row, because a block mixes the two: the marks on a played line are
  // that line's whole time, the marks trailing a sung line are only its tail.
  // Counting them together made one `[Am]x///` shrink a whole verse to a beat.
  let beats = 0
  let tail = 0
  let rows = 0
  if (block.kind === 'stanza' || block.kind === 'chorus') {
    for (const row of block.rows) {
      const raw = srcLines[row.li] ?? ''
      const n = lineBeats(raw)
      if (isPlayedLine(raw)) beats += n
      else {
        rows++
        tail += n
      }
    }
  }
  return { beats, tail, bars, chords, rows }
}
