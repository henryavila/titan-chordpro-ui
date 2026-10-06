import { nextTick, onMounted, onUpdated, watch, type Ref } from 'vue'
import type { ChartBlock } from '@henryavila/titan-chordpro-ui'
import type { BlockEditApi } from '../../use/useBlockEdit'

/**
 * Pills sit outside the flow, so their place has to be measured after the
 * browser has laid the syllables out — every render, and again when a font or
 * a resize moves them. The line editor is a child, so a caret edit also
 * schedules a measure when this component itself does not re-render.
 */
export function useChartBodyEffects(
  props: { edit: BlockEditApi | null; lyricPx: string; blocks: ChartBlock[] },
  bodyEl: Ref<HTMLElement | null>,
) {
  function placePills() {
    if (!props.edit) return
    requestAnimationFrame(() => props.edit?.layoutPills())
  }
  onMounted(placePills)
  onUpdated(placePills)
  watch(
    () => [props.lyricPx, props.blocks, props.edit?.editRow.value, props.edit?.rowText.value, props.edit?.editKind.value],
    () => placePills(),
  )
  // The row input replaces the text in place and takes the caret with it.
  // The caret sits on the syllable that was tapped — nothing is selected, so
  // one keystroke cannot wipe the line. A tap that missed every letter goes
  // to the end.
  watch(
    () => props.edit?.editRow.value,
    async () => {
      if (!props.edit?.wantRowFocus.value) return
      props.edit.wantRowFocus.value = false
      await nextTick()
      const el = bodyEl.value?.querySelector<HTMLInputElement>('.titan-chordpro-row-input')
      if (!el) return
      el.focus()
      const lyric = !el.classList.contains('titan-chordpro-row-input--comment') && !el.classList.contains('titan-chordpro-row-input--note')
      const caret = lyric ? props.edit.rowCaret.value : null
      const at = caret == null ? el.value.length : Math.max(0, Math.min(caret, el.value.length))
      try {
        el.setSelectionRange(at, at)
      } catch {
        /* an input type that has no caret range */
      }
    },
  )
}
