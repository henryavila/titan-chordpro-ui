/** External notation stays in its original format; ChordPro stores the excerpt. */
export type ScoreReference = { src: string; track: number; start: number; end?: number }

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
  const rest = head.replace(match[0], '')
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
  return { src: src.trim(), track, start, ...(end === undefined ? {} : { end }) }
}

export function writeScoreReference(ref: ScoreReference): string {
  const text = `{x_titan_score: src=${JSON.stringify(ref.src)} track=${ref.track} start=${ref.start}${ref.end === undefined ? '' : ` end=${ref.end}`}}`
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
    return `Solo: ${ref.src} · faixa ${ref.track} · compassos ${ref.start}–${ref.end ?? 'fim'} (tom do arquivo; abra na cifra para ver a partitura)`
  } catch { return 'Solo: referência inválida — abra a cifra para corrigir o trecho.' }
}
