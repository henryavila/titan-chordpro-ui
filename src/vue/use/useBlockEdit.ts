import { computed, ref } from 'vue'
import type { ChartBlock, Harmony } from '@henryavila/titan-chordpro-ui'
import { buildRow as buildRowFromSource } from './block-edit/rows'
import { createGestures } from './block-edit/gestures'
import { createSelection } from './block-edit/selection'
import { createBlockSession } from './block-edit/session'
import { createSourceCommands } from './block-edit/source-commands'
import type { BlockEditOpts, ChordEdit, EditLatch, PickerMode } from './block-edit/types'

export type { BlockEditOpts, ChordEdit, PickerMode } from './block-edit/types'
export type { EditRow } from './block-edit/rows'
/** A score the host already has on file, offered as a reference for the source. */
export type { ImageChoice } from '../public'

/**
 * Editing a chart by its blocks: selection, reordering, the chord pills and
 * the in-place text. Every action goes through `core/block-edit` and comes back
 * as new source — nothing here keeps a parallel model of the song.
 */
export function useBlockEdit(opts: BlockEditOpts) {
  const sel = ref<number | null>(null)
  const dragBi = ref<number | null>(null)
  const dropAt = ref<number | null>(null)
  const editRow = ref<number | null>(null)
  const editKind = ref<'lyric' | 'comment'>('lyric')
  const rowText = ref('')
  const chordEdit = ref<ChordEdit | null>(null)
  const chordText = ref('')
  const placing = ref(false)
  const clip = ref<Harmony | null>(null)
  const insertMenu = ref(false)
  /** Source line the open insert slot writes into. The button is that line. */
  const insertAtLine = ref<number | null>(null)
  /** Caret in the lyric being typed, taken from the syllable that was tapped. */
  const rowCaret = ref<number | null>(null)
  const picker = ref<PickerMode>(null)
  /** Focus the row/chord input on the next paint — never on touch. */
  const wantRowFocus = ref(false)
  const wantChordFocus = ref(false)
  const locals: EditLatch = { pillAt: 0, skipCommit: false }

  const lines = computed(() => opts.source.value.split('\n'))
  const blocks = computed(() => opts.blocks.value)
  const selBlock = computed<ChartBlock | null>(() =>
    sel.value === null ? null : (blocks.value[sel.value] ?? null),
  )

  const session = createBlockSession({
    sel,
    dragBi,
    dropAt,
    editRow,
    editKind,
    rowText,
    chordEdit,
    chordText,
    placing,
    clip,
    insertMenu,
    insertAtLine,
    rowCaret,
    picker,
    wantRowFocus,
    wantChordFocus,
    blocks,
    root: opts.root,
    scroller: opts.scroller,
    locals,
  })
  const selection = createSelection({
    editing: opts.editing,
    sel,
    dragBi,
    blocks,
    lines,
    selBlock,
    songCapo: opts.songCapo,
    wMode: opts.wMode,
  })
  const commands = createSourceCommands({
    lines,
    blocks,
    write: (next, message) => opts.write(next.join('\n'), message),
    sel,
    selBlock,
    editRow,
    editKind,
    rowText,
    chordEdit,
    chordText,
    clip,
    insertMenu,
    insertAtLine,
    picker,
    placing,
    flats: opts.flats,
    songCapo: opts.songCapo,
    canDelete: selection.canDelete,
    source: opts.source,
    toast: opts.toast,
    clearSel: session.clearSel,
    focusLine: session.focusLine,
    openChord: session.openChord,
    locals,
  })
  const gestures = createGestures({
    root: opts.root,
    scroller: opts.scroller,
    editing: opts.editing,
    lines,
    source: opts.source,
    dropAt,
    dragBi,
    placing,
    editKind,
    rowText,
    rowCaret,
    editRow,
    insertMenu,
    wantRowFocus,
    locals,
    moveChord: commands.moveChord,
    addChord: commands.addChord,
    openChord: session.openChord,
    moveBlock: commands.moveBlock,
    toggleSel: session.toggleSel,
    commitRow: commands.commitRow,
  })

  return {
    sel,
    selBlock,
    dragBi,
    dropAt,
    editRow,
    editKind,
    rowText,
    chordEdit,
    chordText,
    placing,
    clip,
    insertMenu,
    insertAtLine,
    rowCaret,
    picker,
    wantRowFocus,
    wantChordFocus,
    inSel: selection.inSel,
    inDrag: selection.inDrag,
    selLabel: selection.selLabel,
    selShift: selection.selShift,
    selShiftLabel: selection.selShiftLabel,
    selHasChords: selection.selHasChords,
    selIsScore: selection.selIsScore,
    selIsExternalScore: selection.selIsExternalScore,
    canDelete: selection.canDelete,
    selIsImage: selection.selIsImage,
    selIsHidden: selection.selIsHidden,
    selCapoOwn: selection.selCapoOwn,
    selCapoLabel: selection.selCapoLabel,
    selDualOn: selection.selDualOn,
    buildRow: (li: number) => buildRowFromSource(lines.value[li] ?? '', li),
    layoutPills: gestures.layoutPills,
    clearSel: session.clearSel,
    reset: session.reset,
    toggleSel: session.toggleSel,
    gripKey: gestures.gripKey,
    gripDown: gestures.gripDown,
    nudgeBlock: commands.nudgeBlock,
    moveBlock: commands.moveBlock,
    deleteBlock: commands.deleteBlock,
    hideBlock: commands.hideBlock,
    unhideBlock: commands.unhideBlock,
    duplicateBlock: commands.duplicateBlock,
    secShift: commands.secShift,
    secReset: commands.secReset,
    resetBlockShift: commands.resetBlockShift,
    setBlockCapo: commands.setBlockCapo,
    toggleBlockDual: commands.toggleBlockDual,
    copyHarmony: commands.copyHarmony,
    pasteHarmony: commands.pasteHarmony,
    togglePlacing: session.togglePlacing,
    insertBlock: commands.insertBlock,
    insertScore: commands.insertScore,
    openInsert: commands.openInsert,
    insertChordAtCaret: commands.insertChordAtCaret,
    replaceSpan: commands.replaceSpan,
    openPicker: session.openPicker,
    pickImage: commands.pickImage,
    chordDown: gestures.chordDown,
    chordKey: gestures.chordKey,
    applyChord: commands.applyChord,
    dropChord: commands.dropChord,
    rowClick: gestures.rowClick,
    editComment: session.editComment,
    commitRow: commands.commitRow,
    onRowKey: gestures.onRowKey,
    focusLine: session.focusLine,
  }
}

/** Everything the editing surface needs, handed down as one object. */
export type BlockEditApi = ReturnType<typeof useBlockEdit>
