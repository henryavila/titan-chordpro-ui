import { parse } from './parse'
import { patchMeta } from './export-cho'
import { lintSource } from './lint'
import type { ChordProView } from './types'

export type SourceChangeReason = 'edit' | 'import' | 'undo' | 'redo' | 'meta'

export type SourceSession = {
  getSource: () => string
  getView: () => ChordProView
  replace: (next: string, reason?: SourceChangeReason) => void
  /**
   * Types into the source without opening an undo step. Free typing would
   * otherwise fill the 50-slot stack with single characters and bury every
   * structural operation under it — so the caller marks the step itself with
   * `checkpoint()` and the keystrokes after it coalesce into that one.
   */
  edit: (next: string) => void
  /** Remembers the current text as the point `undo()` comes back to. */
  checkpoint: () => void
  setMeta: (patch: { title?: string; subtitle?: string; key?: string; tempo?: string | number }) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  dirty: () => boolean
  commit: () => void
  discard: () => void
  lint: () => ReturnType<typeof lintSource>
  reset: (next: string) => void
}

export function createSourceSession(opts: { source: string }): SourceSession {
  let source = opts.source
  let committed = opts.source
  const undoStack: string[] = []
  const redoStack: string[] = []

  const push = (next: string) => {
    if (next === source) return
    undoStack.push(source)
    if (undoStack.length > 50) undoStack.shift()
    redoStack.length = 0
    source = next
  }

  return {
    getSource: () => source,
    getView: () => parse(source),
    replace: (next) => push(next),
    edit: (next) => {
      source = next
    },
    checkpoint: () => {
      // A second checkpoint with nothing typed between them is not a step.
      if (undoStack[undoStack.length - 1] === source) return
      undoStack.push(source)
      if (undoStack.length > 50) undoStack.shift()
      redoStack.length = 0
    },
    setMeta: (patch) => push(patchMeta(source, patch)),
    undo: () => {
      const prev = undoStack.pop()
      if (prev === undefined) return
      redoStack.push(source)
      source = prev
    },
    redo: () => {
      const next = redoStack.pop()
      if (next === undefined) return
      undoStack.push(source)
      source = next
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    dirty: () => source !== committed,
    commit: () => {
      committed = source
    },
    discard: () => {
      source = committed
      undoStack.length = 0
      redoStack.length = 0
    },
    reset: (next: string) => {
      source = next
      committed = next
      undoStack.length = 0
      redoStack.length = 0
    },
    lint: () => lintSource(source),
  }
}
