import type { ChartSeg } from 'titan-chordpro-ui'

/** Reading-only fragments: wrap at source whitespace, never a chord change
 * inside a word. A chord stays on the first fragment of its original segment;
 * neither the ViewModel nor the source is modified. */
export function readingWords(segs: ChartSeg[]): ChartSeg[][] {
  const groups: ChartSeg[][] = []
  let group: ChartSeg[] = []
  const finish = () => {
    if (group.length) groups.push(group)
    group = []
  }
  for (const seg of segs) {
    const parts = seg.text.match(/\S+\s*|\s+/g) ?? ['']
    parts.forEach((text, index) => {
      // Leading whitespace is a real word boundary too, even when it belongs
      // to the following chord's segment (e.g. [Em7/D] mo[A]tivos).
      if (/^\s/.test(text)) finish()
      group.push(index === 0 ? { ...seg, text } : {
        ...seg, text, chord: '', shape: '', hasShape: false, tight: false, loose: false,
      })
      if (/\s$/.test(text)) finish()
    })
  }
  finish()
  return groups
}
