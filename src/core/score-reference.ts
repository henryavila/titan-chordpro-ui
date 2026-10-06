export type TabRhythm = 'extended' | 'base' | 'none'
export function isTabRhythm(value: unknown): value is TabRhythm {
  return value === 'extended' || value === 'base' || value === 'none'
}

/** External notation stays in its original format; ChordPro stores the excerpt. */
export type ScoreReference = { src: string; track: number; start: number; end?: number; rhythm?: TabRhythm; name?: string }

export function isScoreReference(text: string): boolean {
  return /^\s*\{x_titan_score\s*:/i.test(text)
}

/** Only notation stored in the document belongs in Titan's note editor. */
export function isInlineScore(text: string): boolean {
  const header = text.split('\n')[0] ?? ''
  return /^\s*\{x_titan_start_of_score\b/i.test(header) && !/\bsrc\s*=/i.test(header)
}

export function readScoreReference(text: string): ScoreReference | null {
  if (!isScoreReference(text)) return null
  const head = text.trim()
  if (!/^\{x_titan_score\s*:[^\r\n]*\}$/i.test(head)) throw new Error('Use uma única diretiva {x_titan_score: ...} para o solo.')
  const match = head.match(/\bsrc\s*=\s*("(?:[^"\\]|\\.)*")/)
  if (!match) throw new Error('Informe o arquivo do solo entre aspas.')
  const src: unknown = JSON.parse(match[1]!)
  if (typeof src !== 'string' || !src.trim() || /[\r\n{}]/.test(src))
    throw new Error('Referência do solo inválida.')
  let rest = head.replace(match[0], '')
  const nameMatch = rest.match(/\bname\s*=\s*("(?:[^"\\]|\\.)*")/)
  let name: string | undefined
  if (/\bname\s*=/.test(rest)) {
    if (!nameMatch) throw new Error('Informe o nome do trecho entre aspas.')
    const value: unknown = JSON.parse(nameMatch[1]!)
    if (typeof value !== 'string' || !value.trim() || /[\r\n{}]/.test(value)) throw new Error('Nome do trecho inválido.')
    name = value.trim()
    rest = rest.replace(nameMatch[0], '')
  }
  const number = (key: string, fallback?: number): number | undefined => {
    const m = rest.match(new RegExp(`\\b${key}\\s*=\\s*([^\\s}]+)`))
    if (!m) return fallback
    const n = Number(m[1])
    if (!Number.isSafeInteger(n) || n < 1) throw new Error('Use números inteiros a partir de 1.')
    return n
  }
  const track = number('track', 1)!
  const start = number('start', 1)!
  const end = number('end')
  if (end !== undefined && end < start) throw new Error('O último compasso deve vir depois do primeiro.')
  const rhythm = rest.match(/\brhythm\s*=\s*([^\s}]+)/)?.[1]
  if (rhythm !== undefined && !isTabRhythm(rhythm)) throw new Error('Ritmo da TAB inválido: use extended, base ou none.')
  return { ...(name === undefined ? {} : { name }), ...(rhythm === undefined ? {} : { rhythm: rhythm as TabRhythm }), src: src.trim(), track, start, ...(end === undefined ? {} : { end }) }
}

/**
 * The external score the Partitura reading can stand on.
 * It starts at bar 1. An omitted end is the whole file. An explicit end
 * covers the file only once `barCount` is known and the end reaches it.
 * Before that, the longest explicit end is the candidate.
 */
export function songScoreBlock<T extends { kind: string }>(
  blocks: readonly T[],
  barCount?: number,
): T | null {
  const open: T[] = []
  const closed: { block: T; end: number }[] = []
  for (const block of blocks) {
    const text = 'text' in block && typeof block.text === 'string' ? block.text : ''
    if (block.kind !== 'score' || !isScoreReference(text)) continue
    let ref: ScoreReference | null = null
    try { ref = readScoreReference(text) } catch { continue }
    if (!ref || ref.start !== 1) continue
    if (ref.end === undefined) open.push(block)
    else closed.push({ block, end: ref.end })
  }
  if (open[0]) return open[0]
  if (barCount === undefined) {
    closed.sort((a, b) => b.end - a.end)
    return closed[0]?.block ?? null
  }
  return closed.find((item) => item.end >= barCount)?.block ?? null
}

export function writeScoreReference(ref: ScoreReference): string {
  const text = `{x_titan_score: src=${JSON.stringify(ref.src)} track=${ref.track} start=${ref.start}${ref.end === undefined ? '' : ` end=${ref.end}`}${ref.rhythm === undefined ? '' : ` rhythm=${ref.rhythm}`}${ref.name === undefined ? '' : ` name=${JSON.stringify(ref.name)}`}}`
  readScoreReference(text)
  return text
}

/** Keep notation at reading size; the engraver wraps bars instead of shrinking a page. */
export function scoreAutoScale(width: number): number {
  return Math.round(Math.min(1.5, Math.max(1.1, width / 600)) * 100) / 100
}

/** Readable fallback for exports that do not run a browser engraver. */
export function scoreReferenceCaption(text: string): string {
  try {
    const ref = readScoreReference(text)
    if (!ref) return text
    return `${ref.name ?? 'Solo'}: ${ref.src} · faixa ${ref.track} · compassos ${ref.start}–${ref.end ?? 'fim'} (tom do arquivo; abra na cifra para ver a partitura)`
  } catch { return 'Solo: referência inválida — abra a cifra para corrigir o trecho.' }
}
