import { canonicalMetaKey } from '../import-chordpro'
import { keyRootOf, signedSemitoneDelta } from '../transpose'
import { hashText, type ReadingCtx, type TextOp } from './model'

function chordsOf(src: string): string[] {
  return [...String(src).matchAll(/\[([^\]]+)\]/g)].map((m) => m[1] ?? '').filter(Boolean)
}

function tokenDelta(from: string, to: string): number | null {
  const a = from.split('/')
  const b = to.split('/')
  if (a.length !== b.length) return null
  let k: number | null = null
  for (let i = 0; i < a.length; i++) {
    const ra = keyRootOf(a[i])
    const rb = keyRootOf(b[i])
    if (!ra || !rb) return null
    if ((a[i] ?? '').slice(ra.length) !== (b[i] ?? '').slice(rb.length)) return null
    const d = signedSemitoneDelta(ra, rb)
    if (k == null) k = d
    else if (k !== d) return null
  }
  return k
}

function isHeaderMetaLine(line: string): boolean {
  const d = String(line).match(/^\s*\{\s*([a-zA-Z_]+)\s*:/)
  if (!d) return false
  return canonicalMetaKey(d[1] ?? '') != null
}

/** Body identity ignoring header meta and the pitch of chord tokens. */
function bodyMask(src: string): string {
  return String(src)
    .split('\n')
    .filter((l) => !isHeaderMetaLine(l) && l.trim() !== '')
    .map((l) => l.replace(/\[[^\]]*\]/g, '[]'))
    .join('\n')
}

function uniformChordDelta(oldSrc: string, newSrc: string): number | null {
  const a = chordsOf(oldSrc)
  const b = chordsOf(newSrc)
  if (a.length < 2 || a.length !== b.length) return null
  let k: number | null = null
  for (let i = 0; i < a.length; i++) {
    const d = tokenDelta(a[i] ?? '', b[i] ?? '')
    if (d == null) return null
    if (k == null) k = d
    else if (k !== d) return null
  }
  return k
}

/**
 * A whole-chart rewrite (fake-capo / transpose every token by the same k,
 * lyrics untouched) is one suggestion, not one op per sung line. Comments
 * and blank lines would otherwise split the LCS into N trechos.
 */
export function isUniformChartRewrite(oldSrc: string, newSrc: string): boolean {
  if (bodyMask(oldSrc) !== bodyMask(newSrc)) return false
  const k = uniformChordDelta(oldSrc, newSrc)
  return k != null && k !== 0
}

export type Hunk = { ai: number; aj: number; bi: number; bj: number }

/**
 * Line LCS: small enough for a chart, and it returns contiguous stretches —
 * an adjustment in the musician's head is one stretch, not N lines.
 */
export function lcsHunks(a: string[], b: string[]): Hunk[] {
  const n = a.length
  const m = b.length
  const dp: Int32Array[] = []
  for (let i = 0; i <= n; i++) dp.push(new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const row = dp[i] as Int32Array
      const next = dp[i + 1] as Int32Array
      row[j] = a[i] === b[j] ? (next[j + 1] ?? 0) + 1 : Math.max(next[j] ?? 0, row[j + 1] ?? 0)
    }
  }
  const hunks: Hunk[] = []
  let i = 0
  let j = 0
  let cur: Hunk | null = null
  const flush = () => {
    if (cur) {
      hunks.push(cur)
      cur = null
    }
  }
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      flush()
      i++
      j++
      continue
    }
    if (!cur) cur = { ai: i, aj: i, bi: j, bj: j }
    const row = dp[i] as Int32Array
    const next = dp[i + 1] as Int32Array
    if (j < m && (i >= n || (row[j + 1] ?? 0) >= (next[j] ?? 0))) {
      j++
      cur.bj = j
    } else {
      i++
      cur.aj = i
    }
  }
  flush()
  return hunks
}

export function diffOps(oldSrc: string, newSrc: string, ctx: ReadingCtx): TextOp[] {
  const a = String(oldSrc).split('\n')
  const b = String(newSrc).split('\n')
  const hunks = isUniformChartRewrite(oldSrc, newSrc)
    ? [{ ai: 0, aj: a.length, bi: 0, bj: b.length }]
    : lcsHunks(a, b)
  return hunks.map((h, k) => {
    const before = a.slice(h.ai, h.aj)
    const after = b.slice(h.bi, h.bj)
    const anchor = h.ai > 0 ? (a[h.ai - 1] ?? '') : ''
    return {
      id: `op${k}-${hashText(`${before.join('\n')}→${after.join('\n')}`)}`,
      type: !before.length ? 'insert' : !after.length ? 'delete' : 'replace',
      at: h.ai,
      anchor,
      anchorHash: hashText(anchor),
      before,
      after,
      ctx,
    }
  })
}
