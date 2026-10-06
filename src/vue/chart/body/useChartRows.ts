import { computed } from 'vue'
import type { ChartBlock, ReadingWord } from '@henryavila/titan-chordpro-ui'
import { readingWords } from '@henryavila/titan-chordpro-ui'
import type { EditRow } from '../../use/block-edit/rows'
import type { BlockEditApi } from '../../use/useBlockEdit'

const emptyRow: EditRow = {
  li: -1,
  chords: [],
  plain: '',
  anchors: [],
  played: false,
  columns: [],
  words: [],
}
const noWords: ReadingWord[] = []

/**
 * Sung lines are grouped once per source change. The template asks for the
 * same row more than once while it draws.
 */
export function useChartRows(props: { blocks: ChartBlock[]; edit: BlockEditApi | null }) {
  const editRows = computed(() => {
    const m = new Map<number, EditRow>()
    const e = props.edit
    if (!e) return m
    for (const b of props.blocks) {
      if (b.kind !== 'stanza' && b.kind !== 'chorus') continue
      for (const r of b.rows) m.set(r.li, e.buildRow(r.li))
    }
    return m
  })
  const readingRows = computed(() => {
    const m = new Map<number, ReadingWord[]>()
    for (const b of props.blocks) {
      if (b.kind !== 'stanza' && b.kind !== 'chorus') continue
      for (const r of b.rows) m.set(r.li, readingWords(r.segs))
    }
    return m
  })
  const rowOf = (li: number): EditRow => editRows.value.get(li) ?? emptyRow
  const wordsOf = (li: number): ReadingWord[] => readingRows.value.get(li) ?? noWords
  return { rowOf, wordsOf }
}
