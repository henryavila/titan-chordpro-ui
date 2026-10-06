import type { Ref } from 'vue'
import {
  addChord as addChordAt,
  blockSpan,
  copyHarmony as copyHarmonyOf,
  deleteBlock as deleteBlockAt,
  duplicateBlock as duplicateBlockAt,
  groupAfter,
  hideBlock as hideBlockAt,
  insertBlock as insertBlockAt,
  insertImage,
  lastChordName,
  markCtx,
  moveBlock as moveBlockTo,
  moveChord as moveChordTo,
  pasteHarmony as pasteHarmonyOn,
  removeChord as removeChordAt,
  renameChord,
  rowParts,
  setBlockCapo as setBlockCapoOn,
  setComment,
  setLyric,
  shiftBlock,
  toggleBlockDual as toggleBlockDualOn,
  unhideBlock as unhideBlockAt,
} from '@henryavila/titan-chordpro-ui'
import type { ChartBlock, Harmony, InsertKind } from '@henryavila/titan-chordpro-ui'
import type { ChordEdit, EditLatch, PickerMode } from './types'

export type SourceCommandDeps = {
  lines: Ref<string[]>
  blocks: Ref<ChartBlock[]>
  write: (next: string[], message?: string) => void
  sel: Ref<number | null>
  selBlock: Ref<ChartBlock | null>
  editRow: Ref<number | null>
  editKind: Ref<'lyric' | 'comment'>
  rowText: Ref<string>
  chordEdit: Ref<ChordEdit | null>
  chordText: Ref<string>
  clip: Ref<Harmony | null>
  insertMenu: Ref<boolean>
  insertAtLine: Ref<number | null>
  picker: Ref<PickerMode>
  placing: Ref<boolean>
  flats: Ref<boolean>
  songCapo: Ref<number>
  canDelete: Ref<boolean>
  source: Ref<string>
  toast: (msg: string) => void
  clearSel: () => void
  focusLine: (li: number) => void
  openChord: (li: number, idx: number, name: string, focus: boolean) => void
  locals: EditLatch
}

export function createSourceCommands(d: SourceCommandDeps) {
  function moveChord(li: number, idx: number, off: number) {
    const cur = d.lines.value[li] ?? ''
    const p = rowParts(cur)
    const c = p.chords[idx]
    if (!c) return
    const at = Math.max(0, Math.min(p.plain.length, off))
    if (c.off === at) return
    const out = [...d.lines.value]
    out[li] = moveChordTo(cur, idx, at)
    d.write(out)
  }

  /** Places a chord and answers where it landed in the line's chord order. */
  function addChord(li: number, off: number, name: string): number {
    const cur = d.lines.value[li] ?? ''
    const p = rowParts(cur)
    const at = Math.max(0, Math.min(p.plain.length, off))
    const out = [...d.lines.value]
    out[li] = addChordAt(cur, at, name)
    d.write(out)
    // `rowJoin` sorts by offset and the new chord goes in last, so among the
    // ones already on that syllable it lands after them.
    return p.chords.filter((c) => c.off <= at).length
  }

  function applyChord() {
    const e = d.chordEdit.value
    if (!e) return
    const cur = d.lines.value[e.li] ?? ''
    const name = d.chordText.value.trim()
    const out = [...d.lines.value]
    out[e.li] = name ? renameChord(cur, e.idx, name) : removeChordAt(cur, e.idx)
    d.write(out, name ? undefined : 'Acorde removido')
    d.chordEdit.value = null
  }

  function dropChord() {
    d.chordText.value = ''
    applyChord()
  }

  function moveBlock(from: number, to: number) {
    const r = moveBlockTo(d.lines.value, d.blocks.value, from, to)
    if (!r) {
      d.sel.value = from
      return
    }
    d.write(r.lines, r.message)
    d.sel.value = r.sel
    d.editRow.value = null
  }

  /** Reordering without a drag: keyboard and thumb have to reach it too. */
  function nudgeBlock(dir: number) {
    const bi = d.sel.value
    if (bi === null) return
    const sp = blockSpan(d.blocks.value, bi)
    if (!sp) return
    if (dir < 0) {
      if (sp.first > 0) {
        const prev = blockSpan(d.blocks.value, sp.first - 1)
        if (prev) moveBlock(bi, prev.first)
      }
    } else if (bi < d.blocks.value.length - 1) moveBlock(bi, groupAfter(d.blocks.value, bi + 1))
  }

  function deleteBlock(bi = d.sel.value) {
    if (bi === null || !d.canDelete.value) return
    const r = deleteBlockAt(d.lines.value, d.blocks.value, bi)
    if (!r) return
    d.write(r.lines, r.message)
    d.clearSel()
  }

  function hideBlock() {
    if (d.sel.value === null) return
    const r = hideBlockAt(d.lines.value, d.blocks.value, d.sel.value)
    if (!r) return
    d.write(r.lines, r.message)
    d.clearSel()
  }

  function unhideBlock(bi: number) {
    const r = unhideBlockAt(d.lines.value, d.blocks.value, bi)
    if (!r) return
    d.write(r.lines, r.message)
    d.clearSel()
  }

  function duplicateBlock() {
    if (d.sel.value === null) return
    const r = duplicateBlockAt(d.lines.value, d.blocks.value, d.sel.value)
    if (!r) return
    d.write(r.lines, r.message)
    d.focusLine(r.focusLine)
  }

  function secShift(n: number) {
    const b = d.selBlock.value
    if (!b) return
    const r = shiftBlock(d.lines.value, b, n, d.flats.value)
    if (!r) return
    d.write(r.lines, r.message)
  }

  function secReset() {
    const b = d.selBlock.value
    if (!b) return
    const ctx = markCtx(d.lines.value, b)
    if (ctx?.shiftTotal) secShift(-ctx.shiftTotal)
  }

  /** Reset the block a grip is not on — the badge drawn beside the block. */
  function resetBlockShift(bi: number) {
    d.sel.value = bi
    secReset()
  }

  function setBlockCapo(step: number, drop: boolean) {
    const b = d.selBlock.value
    if (!b) return
    const r = setBlockCapoOn(d.lines.value, b, step, drop, d.songCapo.value)
    if (!r) return
    d.write(r.lines, r.message)
  }

  function toggleBlockDual() {
    const b = d.selBlock.value
    if (!b) return
    const r = toggleBlockDualOn(d.lines.value, b)
    if (!r) return
    d.write(r.lines, r.message)
  }

  function copyHarmony() {
    if (d.sel.value === null) return
    const h = copyHarmonyOf(d.lines.value, d.blocks.value, d.sel.value)
    if (!h) return
    d.clip.value = h
    d.toast('Harmonia copiada — cole em quantos blocos quiser')
  }

  function pasteHarmony(bi: number) {
    const c = d.clip.value
    if (!c) return
    const r = pasteHarmonyOn(d.lines.value, d.blocks.value, bi, c)
    if (!r) return
    d.write(r.lines, r.message)
  }

  /** The + that was pressed. With none, the new block goes at the end. */
  function whereToInsert(): number {
    const at = d.insertAtLine.value
    if (at == null) return d.lines.value.length
    return Math.max(0, Math.min(d.lines.value.length, at))
  }

  /** Open the insert menu on the gap the musician pointed at. Same gap closes it. */
  function openInsert(at: number) {
    if (d.insertMenu.value && d.insertAtLine.value === at) {
      d.insertMenu.value = false
      return
    }
    if (d.editRow.value !== null) commitRow()
    d.placing.value = false
    d.insertAtLine.value = at
    d.insertMenu.value = true
  }

  function insertBlock(kind: InsertKind) {
    const at = whereToInsert()
    const r = insertBlockAt(d.lines.value, at, kind)
    d.write(r.lines, r.message)
    d.insertMenu.value = false
    d.sel.value = null
    d.focusLine(r.focusLine)
  }

  function pickImage(file: string) {
    const replace = d.picker.value === 'replace'
    const r = insertImage(d.lines.value, d.blocks.value, d.sel.value, whereToInsert(), file, replace)
    d.write(r.lines, r.message)
    d.picker.value = null
    d.focusLine(r.focusLine)
  }

  /**
   * A new score goes into the file empty and the editor opens on top of it.
   * Cancelling undoes the insert — no ghost block is left behind in the chart.
   */
  function insertScore(text = '{x_titan_start_of_score: time=4/4 key=D tempo=92 tuning=EADGBE}\n{x_titan_end_of_score}'): { li0: number; li1: number } {
    const at = whereToInsert()
    const out = [...d.lines.value]
    const inserted = text.split('\n')
    out.splice(at, 0, ...inserted, '')
    d.write(out, 'Partitura nova')
    d.insertMenu.value = false
    d.picker.value = null
    d.sel.value = null
    return { li0: at, li1: at + inserted.length - 1 }
  }

  /** Swap one block's lines for new ones — how the score editor writes back. */
  function replaceSpan(li0: number, li1: number, text: string, message: string) {
    const out = [...d.lines.value]
    out.splice(li0, Math.max(1, li1 - li0 + 1), ...text.split('\n'))
    d.write(out, message)
  }

  /**
   * A chord at the caret of the line being typed. The words commit first, so
   * a typo and the new chord land in one write.
   */
  function insertChordAtCaret(caret: number) {
    const li = d.editRow.value
    if (li === null || d.editKind.value !== 'lyric') return
    const plain = d.rowText.value
    const rewritten = setLyric(d.lines.value[li] ?? '', plain)
    const at = Math.max(0, Math.min(plain.length, Math.round(caret)))
    const name = lastChordName(d.source.value)
    const idx = rowParts(rewritten).chords.filter((c) => c.off <= at).length
    const out = [...d.lines.value]
    out[li] = addChordAt(rewritten, at, name)
    d.locals.skipCommit = true
    d.editRow.value = null
    d.write(out)
    d.openChord(li, idx, name, true)
  }

  function commitRow(e?: Event) {
    const next = (e as FocusEvent | undefined)?.relatedTarget
    // Tabbing onto "Cifra" must not close the line before the chord lands.
    if (next instanceof HTMLElement && next.closest('[data-insert-chord]')) return
    const li = d.editRow.value
    if (li === null || d.locals.skipCommit) {
      d.locals.skipCommit = false
      d.editRow.value = null
      return
    }
    if (d.editKind.value === 'comment') {
      const r = setComment(d.lines.value, li, d.rowText.value)
      d.write(r.lines, r.message || undefined)
    } else {
      const out = [...d.lines.value]
      out[li] = setLyric(out[li] ?? '', d.rowText.value)
      d.write(out)
    }
    d.editRow.value = null
  }

  return {
    moveChord,
    addChord,
    applyChord,
    dropChord,
    moveBlock,
    nudgeBlock,
    deleteBlock,
    hideBlock,
    unhideBlock,
    duplicateBlock,
    secShift,
    secReset,
    resetBlockShift,
    setBlockCapo,
    toggleBlockDual,
    copyHarmony,
    pasteHarmony,
    openInsert,
    insertBlock,
    pickImage,
    insertScore,
    replaceSpan,
    insertChordAtCaret,
    commitRow,
  }
}
