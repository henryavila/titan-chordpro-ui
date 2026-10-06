import { isTuneOp, type OverlayOp } from './model'

export type ApplyResult = {
  text: string
  applied: OverlayOp[]
  failed: OverlayOp[]
  /** Line index in the result → id of the op that put it there. */
  mine: Map<number, string>
}

/**
 * Reapply: the anchor is the original content, not the line number — the
 * search starts at the old index and fans out, so a change above does not
 * shift anything.
 */
export function applyOps(src: string, ops: OverlayOp[]): ApplyResult {
  const arr = String(src).split('\n')
  const applied: OverlayOp[] = []
  const failed: OverlayOp[] = []
  const mine = new Map<number, string>()

  const findRun = (run: string[], near: number): number => {
    if (!run.length) return -1
    const eq = (i: number) => run.every((t, k) => arr[i + k] === t)
    const max = arr.length
    for (let d = 0; d <= max; d++) {
      for (const i of d === 0 ? [near] : [near + d, near - d]) {
        if (i >= 0 && i + run.length <= max && eq(i)) return i
      }
    }
    return -1
  }

  for (const op of ops) {
    if (isTuneOp(op)) {
      applied.push(op)
      continue
    }
    if (op.type === 'insert') {
      let at = op.at
      if (op.anchor) {
        const k = findRun([op.anchor], Math.max(0, op.at - 1))
        if (k < 0) {
          failed.push(op)
          continue
        }
        at = k + 1
      }
      arr.splice(at, 0, ...op.after)
      for (let k = 0; k < op.after.length; k++) mine.set(at + k, op.id)
      applied.push(op)
      continue
    }
    const k = findRun(op.before, op.at)
    if (k < 0) {
      failed.push(op)
      continue
    }
    arr.splice(k, op.before.length, ...op.after)
    for (let x = 0; x < op.after.length; x++) mine.set(k + x, op.id)
    applied.push(op)
  }
  return { text: arr.join('\n'), applied, failed, mine }
}

export type ReviewProjection = {
  /** Official chart with fitting edits painted, and deleted lines still present. */
  text: string
  /** Line index in `text` → op that wrote the line that stays. */
  mine: Map<number, string>
  /** Line index in `text` → op that removes the line on accept. */
  struck: Map<number, string>
  /** First display line of each op that painted. */
  opLine: Record<string, number>
  applied: OverlayOp[]
  failed: OverlayOp[]
}

/**
 * What the review screen draws. Deletes stay on the page, struck.
 * Accept still uses `applyOps`, which drops those lines.
 * A line already struck is not a match for a later op.
 */
export function reviewProjection(src: string, ops: OverlayOp[]): ReviewProjection {
  const arr = String(src).split('\n')
  const mine = new Map<number, string>()
  const struck = new Map<number, string>()
  const hidden = new Set<number>()
  const opLine: Record<string, number> = {}
  const applied: OverlayOp[] = []
  const failed: OverlayOp[] = []

  const remapIndex = (i: number, start: number, remove: number, delta: number): number | null => {
    const end = start + remove
    if (i >= start && i < end) return null
    if (i >= end) return i + delta
    return i
  }

  const shiftMaps = (start: number, remove: number, add: number) => {
    const delta = add - remove
    const nextMine = new Map<number, string>()
    const nextStruck = new Map<number, string>()
    const nextHidden = new Set<number>()
    for (const [i, id] of mine) {
      const at = remapIndex(i, start, remove, delta)
      if (at != null) nextMine.set(at, id)
    }
    for (const [i, id] of struck) {
      const at = remapIndex(i, start, remove, delta)
      if (at != null) nextStruck.set(at, id)
    }
    for (const i of hidden) {
      const at = remapIndex(i, start, remove, delta)
      if (at != null) nextHidden.add(at)
    }
    mine.clear()
    struck.clear()
    hidden.clear()
    for (const [i, id] of nextMine) mine.set(i, id)
    for (const [i, id] of nextStruck) struck.set(i, id)
    for (const i of nextHidden) hidden.add(i)
    for (const id of Object.keys(opLine)) {
      const at = remapIndex(opLine[id] ?? 0, start, remove, delta)
      if (at == null) delete opLine[id]
      else opLine[id] = at
    }
  }

  const findRun = (run: string[], near: number): number => {
    if (!run.length) return -1
    const eq = (i: number) => run.every((t, k) => !hidden.has(i + k) && arr[i + k] === t)
    const max = arr.length
    for (let d = 0; d <= max; d++) {
      for (const i of d === 0 ? [near] : [near + d, near - d]) {
        if (i >= 0 && i + run.length <= max && eq(i)) return i
      }
    }
    return -1
  }

  for (const op of ops) {
    if (isTuneOp(op)) {
      applied.push(op)
      continue
    }
    if (op.type === 'insert') {
      let at = op.at
      if (op.anchor) {
        const k = findRun([op.anchor], Math.max(0, op.at - 1))
        if (k < 0) {
          failed.push(op)
          continue
        }
        at = k + 1
      }
      shiftMaps(at, 0, op.after.length)
      arr.splice(at, 0, ...op.after)
      for (let k = 0; k < op.after.length; k++) mine.set(at + k, op.id)
      opLine[op.id] = at
      applied.push(op)
      continue
    }
    const k = findRun(op.before, op.at)
    if (k < 0) {
      failed.push(op)
      continue
    }
    if (op.type === 'delete') {
      for (let x = 0; x < op.before.length; x++) {
        struck.set(k + x, op.id)
        hidden.add(k + x)
      }
      opLine[op.id] = k
      applied.push(op)
      continue
    }
    shiftMaps(k, op.before.length, op.after.length)
    arr.splice(k, op.before.length, ...op.after)
    for (let x = 0; x < op.after.length; x++) mine.set(k + x, op.id)
    opLine[op.id] = k
    applied.push(op)
  }

  return { text: arr.join('\n'), mine, struck, opLine, applied, failed }
}

export function hasRun(lines: string[], run: string[]): boolean {
  if (!run || !run.length) return false
  for (let i = 0; i + run.length <= lines.length; i++) {
    let ok = true
    for (let k = 0; k < run.length; k++) {
      if (lines[i + k] !== run[k]) {
        ok = false
        break
      }
    }
    if (ok) return true
  }
  return false
}

/**
 * An adjustment the person in charge accepted has become official: it leaves
 * the overlay instead of staying marked as personal — otherwise the musician
 * sees a conflict with themselves.
 */
export function absorbedOp(op: OverlayOp, lines: string[]): boolean {
  if (isTuneOp(op)) return false
  if (op.type === 'delete') return !hasRun(lines, op.before)
  return hasRun(lines, op.after) && !hasRun(lines, op.before)
}
