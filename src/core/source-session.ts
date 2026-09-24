import { hasChartEnvelope } from './charts'
import { parse } from './parse'
import { readMeta, writeMeta, type ChartMeta, type MetaKey } from './import-chordpro'
import { lintSource } from './lint'
import type { ChordProView } from './types'

export type SourceChangeReason = 'edit' | 'import' | 'undo' | 'redo' | 'meta'

export type MetaPatch = ChartMeta & { tempo?: string | number }

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
  /** Rewrites the ChordPro header for every known meta key (canonical order). */
  setMeta: (patch: MetaPatch) => void
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
    setMeta: (patch) => {
      const only: ChartMeta = {}
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) continue
        only[k as MetaKey] = String(v)
      }
      // N>1: a tempo save must not rewrite title, artist, `{t:}`, or `{composer:}`.
      if (hasChartEnvelope(source)) {
        push(writeMeta(source, only))
        return
      }
      const next: ChartMeta = { ...readMeta(source), ...only }
      push(writeMeta(source, next))
    },
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
