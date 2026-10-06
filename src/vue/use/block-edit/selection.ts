import { computed, type Ref } from 'vue'
import {
  blockLabel,
  blockSpan,
  isInlineScore,
  isScoreReference,
  markCtx,
  shiftLabel,
} from '@henryavila/titan-chordpro-ui'
import type { ChartBlock } from '@henryavila/titan-chordpro-ui'
import type { WriteMode } from '../../public'

export type SelectionDeps = {
  editing: Ref<boolean>
  sel: Ref<number | null>
  dragBi: Ref<number | null>
  blocks: Ref<ChartBlock[]>
  lines: Ref<string[]>
  selBlock: Ref<ChartBlock | null>
  songCapo: Ref<number>
  wMode: Ref<WriteMode | null>
}

export function createSelection(d: SelectionDeps) {
  const selSpan = computed(() =>
    d.editing.value && d.sel.value !== null ? blockSpan(d.blocks.value, d.sel.value) : null,
  )
  const dragSpan = computed(() =>
    d.dragBi.value === null ? null : blockSpan(d.blocks.value, d.dragBi.value),
  )
  /** A label moves with its stanza, so it lights up with it too. */
  const inSel = (bi: number) =>
    bi === d.sel.value || !!(selSpan.value?.hasLab && bi === selSpan.value.first)
  const inDrag = (bi: number) =>
    bi === d.dragBi.value || !!(dragSpan.value?.hasLab && bi === dragSpan.value.first)

  const selLabel = computed(() =>
    d.sel.value === null ? '' : blockLabel(d.blocks.value, d.sel.value),
  )
  const selMarks = computed(() => {
    const b = d.selBlock.value
    return b ? markCtx(d.lines.value, b) : null
  })
  const selShift = computed(() => selMarks.value?.shiftTotal ?? 0)
  const selShiftLabel = computed(() => shiftLabel(selShift.value))
  const selHasChords = computed(
    () => d.selBlock.value?.kind === 'stanza' || d.selBlock.value?.kind === 'chorus',
  )
  const selIsScore = computed(
    () => d.selBlock.value?.kind === 'tab' || (d.selBlock.value?.kind === 'score' && isInlineScore(d.selBlock.value.text)),
  )
  const selIsExternalScore = computed(
    () => d.selBlock.value?.kind === 'score' && isScoreReference(d.selBlock.value.text),
  )
  const selIsImage = computed(() => d.selBlock.value?.kind === 'image')
  const selIsHidden = computed(() => d.selBlock.value?.kind === 'hidden')
  const selCapoOwn = computed(() => selMarks.value?.capoVal != null)
  const selCapoLabel = computed(() => {
    const own = selMarks.value?.capoVal
    if (own != null) return own === 0 ? 'sem capo' : `casa ${own}`
    const c = d.songCapo.value
    return c === 0 ? 'sem capo' : `casa ${c} (música)`
  })
  const selDualOn = computed(() => selCapoOwn.value && selMarks.value?.capoMapOn !== false)
  const canDelete = computed(() => d.wMode.value === 'persisted')

  return {
    inSel,
    inDrag,
    selLabel,
    selShift,
    selShiftLabel,
    selHasChords,
    selIsScore,
    selIsExternalScore,
    canDelete,
    selIsImage,
    selIsHidden,
    selCapoOwn,
    selCapoLabel,
    selDualOn,
  }
}
