/**
 * Editing a chart by its blocks, on the source text.
 *
 * Every operation here takes the source lines and gives back new ones: the
 * file is the only truth, so a block that was transposed, capoed or hidden
 * says so in the file itself and survives a reload, an undo and a re-parse.
 */

export {
  addChord,
  anchorWords,
  lastChordName,
  moveChord,
  playedColumns,
  removeChord,
  renameChord,
  rowJoin,
  rowParts,
  setLyric,
  type AnchorCell,
  type AnchorChar,
  type AnchorWord,
  type ChordRef,
  type PlayedCol,
  type RowParts,
} from './block-ops/rows'
export {
  blockLabel,
  blockSpan,
  deleteBlock,
  duplicateBlock,
  groupAfter,
  hideBlock,
  moveBlock,
  unhideBlock,
  type BlockSpan,
  type BlockWrite,
} from './block-ops/blocks'
export {
  markCtx,
  setBlockCapo,
  shiftBlock,
  shiftLabel,
  toggleBlockDual,
  writeMarks,
  type MarkCtx,
} from './block-ops/marks'
export { copyHarmony, pasteHarmony, type Harmony, type HarmonyRow } from './block-ops/harmony'
export {
  insertAt,
  insertBlock,
  insertImage,
  insertSnippet,
  setComment,
  type InsertKind,
} from './block-ops/insert'
