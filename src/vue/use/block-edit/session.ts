import type { Ref } from 'vue'
import type { ChartBlock, Harmony } from '@henryavila/titan-chordpro-ui'
import type { ChordEdit, EditLatch, PickerMode } from './types'

export type BlockSessionDeps = {
  sel: Ref<number | null>
  dragBi: Ref<number | null>
  dropAt: Ref<number | null>
  editRow: Ref<number | null>
  editKind: Ref<'lyric' | 'comment'>
  rowText: Ref<string>
  chordEdit: Ref<ChordEdit | null>
  chordText: Ref<string>
  placing: Ref<boolean>
  clip: Ref<Harmony | null>
  insertMenu: Ref<boolean>
  insertAtLine: Ref<number | null>
  rowCaret: Ref<number | null>
  picker: Ref<PickerMode>
  wantRowFocus: Ref<boolean>
  wantChordFocus: Ref<boolean>
  blocks: Ref<ChartBlock[]>
  root: Ref<HTMLElement | null>
  scroller: Ref<HTMLElement | null>
  locals: EditLatch
}

export function createBlockSession(d: BlockSessionDeps) {
  function clearSel() {
    d.sel.value = null
    d.editRow.value = null
  }

  function reset() {
    clearSel()
    d.dragBi.value = null
    d.dropAt.value = null
    d.chordEdit.value = null
    d.placing.value = false
    d.insertMenu.value = false
    d.insertAtLine.value = null
    d.rowCaret.value = null
    d.picker.value = null
    d.clip.value = null
  }

  function toggleSel(bi: number) {
    d.sel.value = d.sel.value === bi ? null : bi
    d.editRow.value = null
  }

  function openChord(li: number, idx: number, name: string, focus: boolean) {
    d.chordText.value = name
    d.chordEdit.value = { li, idx }
    d.insertMenu.value = false
    d.wantChordFocus.value = focus
  }

  /**
   * A rehearsal comment is text too. Renaming one used to mean opening the
   * source — including the ones the Insert menu had just created.
   */
  function editComment(li: number, text: string) {
    d.locals.skipCommit = false
    d.editKind.value = 'comment'
    d.rowText.value = text
    d.editRow.value = li
    d.insertMenu.value = false
    d.wantRowFocus.value = true
  }

  function togglePlacing() {
    d.placing.value = !d.placing.value
    d.editRow.value = null
  }

  function openPicker(mode: Exclude<PickerMode, null>) {
    d.picker.value = mode
    d.insertMenu.value = false
  }

  /**
   * After an insert the new block has to show up already selected — otherwise
   * the action looks like it did nothing.
   */
  function focusLine(li: number) {
    requestAnimationFrame(() => {
      const bs = d.blocks.value
      let bi = -1
      for (let i = 0; i < bs.length; i++) {
        if ((bs[i]?.li1 ?? -1) >= li) {
          bi = i
          break
        }
      }
      if (bi < 0) return
      d.sel.value = bi
      const el = d.root.value?.querySelector<HTMLElement>(`[data-block="${bi}"]`)
      const sc = d.scroller.value
      if (!el || !sc) return
      const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop
      sc.scrollTop = Math.max(0, top - 130)
    })
  }

  return { clearSel, reset, toggleSel, openChord, editComment, togglePlacing, openPicker, focusLine }
}
