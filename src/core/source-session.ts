import { hasChartEnvelope, replaceChart } from './charts'
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
  /**
   * Working text of this chart differs from the last commit. A sibling
   * rascunho does not make another chart dirty.
   */
  chartDirty: (chartId: string) => boolean
  commit: () => void
  discard: () => void
  lint: () => ReturnType<typeof lintSource>
  reset: (next: string) => void
  /**
   * Put one chart document into the working file and the last commit, without
   * dropping undo or a draft that still lives on a sibling.
   */
  spliceChart: (chartId: string, doc: string) => void
}

export function createSourceSession(opts: {
  source: string
  /** Named chart inside an N>1 file. Absent → parse uses the file default. */
  chartId?: () => string | undefined
}): SourceSession {
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
    getView: () => {
      const id = String(opts.chartId?.() ?? '').trim()
      return parse(source, id ? { chartId: id } : undefined)
    },
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
    chartDirty: (chartId) => {
      const id = String(chartId ?? '').trim()
      if (!id) return source !== committed
      try {
        return parse(source, { chartId: id }).source !== parse(committed, { chartId: id }).source
      } catch {
        return source !== committed
      }
    },
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
    spliceChart: (chartId, doc) => {
      source = replaceChart(source, chartId, doc)
      committed = replaceChart(committed, chartId, doc)
    },
    lint: () => lintSource(source),
  }
}
