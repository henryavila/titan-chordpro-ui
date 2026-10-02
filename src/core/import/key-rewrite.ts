import { rewriteDefineLines } from '../define'
import { notationEdge } from '../notation-region'
import {
  keyIndex,
  keyRootOf,
  signedSemitoneDelta,
  transposeTextChords,
  transposeToken,
  usesFlats,
} from '../transpose'
import { readMeta, writeMeta, type ChartMeta } from './meta'

export type KeyRewriteOffer = {
  declaredKey: string
  writtenKey: string
  capo: number
  /** `signedSemitoneDelta(declared, written)` — stored as `{transpose:}`. */
  k: number
}

/** Lyric-bearing line: not a directive, not a clock/chord-only intro. */
function isSungLine(raw: string): boolean {
  const t = String(raw ?? '').trim()
  if (!t || /^\s*\{/.test(t)) return false
  let s = t.replace(/\[[^\]]*\]/g, ' ')
  s = s.replace(/\b[xX]\/+/g, ' ')
  s = s.replace(/\/{2,}/g, ' ')
  s = s.replace(/\b[xX]\b/g, ' ')
  s = s.replace(/\/[_-]/g, ' ')
  return /[A-Za-zÀ-ÿ]/.test(s)
}

function sungRootIndexes(source: string): number[] {
  const idx: number[] = []
  let tab = false
  let score = false
  for (const raw of String(source ?? '').split('\n')) {
    const d = raw.match(/^\s*\{\s*([a-zA-Z_]+)/)
    const k = (d?.[1] ?? '').toLowerCase()
    const edge = notationEdge(k)
    if (edge === 'tab-open') {
      tab = true
      continue
    }
    if (edge === 'tab-close') {
      tab = false
      continue
    }
    if (edge === 'score-open') {
      score = true
      continue
    }
    if (edge === 'score-close') {
      score = false
      continue
    }
    if (tab || score) continue
    if (!isSungLine(raw)) continue
    for (const m of raw.matchAll(/\[([A-G](?:#|b)?)/g)) {
      const i = keyIndex(m[1] ?? '')
      if (i != null) idx.push(i)
    }
  }
  return idx
}

function rootHits(indexes: number[], root: string): number {
  const want = keyIndex(keyRootOf(root))
  if (want == null) return 0
  return indexes.filter((i) => i === want).length
}

/** I, IV and V roots of `key` all appear in the sung indexes. */
function hasOneFourFive(indexes: number[], key: string): boolean {
  const i = keyIndex(keyRootOf(key))
  if (i == null) return false
  const set = new Set(indexes)
  return set.has(i) && set.has((i + 5) % 12) && set.has((i + 7) % 12)
}

function rewriteOffer(declaredKey: string, writtenKey: string, capo: number): KeyRewriteOffer {
  return {
    declaredKey,
    writtenKey,
    capo,
    k: signedSemitoneDelta(declaredKey, writtenKey),
  }
}

/**
 * Written key vs `{key:}`. With `{capo:N}`, N is the interval (not a live
 * capo). Without capo, a unique k ∈ {±1, ±2} on the sung body (not the intro
 * clock, not the first chord, not chord frequency). Real capo (body already
 * in `{key:}`) stays.
 */
export function detectKeyRewrite(source: string): KeyRewriteOffer | null {
  const src = String(source ?? '')
  if (!src.trim()) return null
  const meta = readMeta(src)
  const declaredKey = (meta.key ?? '').trim()
  if (!declaredKey) return null
  const kr = keyRootOf(declaredKey)
  if (keyIndex(kr) == null) return null
  const capo = Number(meta.capo) || 0
  const sung = sungRootIndexes(src)
  const declaredHits = rootHits(sung, declaredKey)

  if (capo) {
    const writtenKey = transposeToken(declaredKey, -capo, usesFlats(declaredKey))
    const wr = keyRootOf(writtenKey)
    if (!wr || keyIndex(kr) === keyIndex(wr)) return null
    const writtenHits = rootHits(sung, writtenKey)
    if (writtenHits <= 0) return null
    if (writtenHits <= declaredHits) return null
    return rewriteOffer(declaredKey, writtenKey, capo)
  }

  if (declaredHits > 0 && hasOneFourFive(sung, declaredKey)) return null

  const found: KeyRewriteOffer[] = []
  for (const step of [-2, -1, 1, 2] as const) {
    const writtenKey = transposeToken(declaredKey, step, usesFlats(declaredKey))
    if (keyIndex(keyRootOf(writtenKey)) === keyIndex(kr)) continue
    const writtenHits = rootHits(sung, writtenKey)
    if (writtenHits <= 0) continue
    if (declaredHits > 0 && writtenHits <= declaredHits) continue
    if (!hasOneFourFive(sung, writtenKey)) continue
    found.push(rewriteOffer(declaredKey, writtenKey, 0))
  }
  return found.length === 1 ? (found[0] ?? null) : null
}

export type RewriteToKeyResult = {
  source: string
  from: string
  to: string
  transpose: number
  changed: boolean
}

/**
 * Move the written chords to `targetKey` and store `{transpose:k}` so the
 * reading stays where it was. A `{capo:}` that only encoded that gap is
 * dropped. Body delta is −k; k is `signedSemitoneDelta(declared, written)`.
 */
export function rewriteToKey(source: string, targetKey: string): RewriteToKeyResult | null {
  const src = String(source ?? '')
  const to = targetKey.trim()
  if (!/^[A-G](?:#|b)?m?$/.test(to)) return null
  const meta = readMeta(src)
  const offer = detectKeyRewrite(src)
  const fromKey = (offer?.writtenKey || (meta.key ?? '').trim() || to).trim()
  const fromRoot = keyRootOf(fromKey)
  const toRoot = keyRootOf(to)
  if (!fromRoot || !toRoot || keyIndex(fromRoot) === null || keyIndex(toRoot) === null) return null

  const bodyDelta = signedSemitoneDelta(fromRoot, toRoot)
  const flats = usesFlats(to)
  const movedChords = bodyDelta ? transposeTextChords(src, bodyDelta, flats) : src
  const moved = rewriteDefineLines(movedChords, bodyDelta, flats)
  const playing = signedSemitoneDelta(toRoot, fromRoot)
  const next: ChartMeta = { ...readMeta(moved), key: to }
  if (playing) next.transpose = String(playing)
  else delete next.transpose
  if (offer && offer.capo) delete next.capo

  const out = writeMeta(moved, next)
  return {
    source: out,
    from: fromKey,
    to,
    transpose: playing,
    changed: out !== src,
  }
}
