import { isPlayedLine, lineBeats } from './timeline'

export type LintResult = {
  ok: boolean
  /** One sentence for the source pane footer. */
  message: string
  /** Individual findings, in the order the designer's copy lists them. */
  issues: string[]
  unmatched: number
}

const OK_MESSAGE = 'Estrutura consistente — diretivas fechadas.'

function count(src: string, re: RegExp): number {
  return (src.match(re) || []).length
}

/**
 * Lines that are played and not sung, with chords but no `x///` marks — the
 * clock will not guess their length. Tab/score bodies are skipped: an `x` on
 * a stave is a mute, not a beat. See docs/MARCAS-X.md.
 */
function voicelessWithoutMarks(src: string): number {
  const lines = src.split('\n')
  let tab = false
  let score = false
  let n = 0
  for (const raw of lines) {
    const d = raw.match(/^\s*\{\s*([a-zA-Z_]+)/)
    const k = (d?.[1] ?? '').toLowerCase()
    if (k === 'sot' || k === 'start_of_tab') {
      tab = true
      continue
    }
    if (k === 'eot' || k === 'end_of_tab') {
      tab = false
      continue
    }
    if (k === 'sos' || k === 'start_of_score') {
      score = true
      continue
    }
    if (k === 'eos' || k === 'end_of_score') {
      score = false
      continue
    }
    if (tab || score || d) continue
    if (/^\s*#/.test(raw) || !raw.trim()) continue
    if (!/\[[^\]]*\]/.test(raw)) continue
    if (!isPlayedLine(raw)) continue
    if (lineBeats(raw) > 0) continue
    n++
  }
  return n
}

/**
 * Structural check of the ChordPro source, in the wording of the design SoT:
 * unbalanced section directives, unbalanced chord brackets, unreadable key,
 * voiceless stretches with no time marks.
 */
export function lintSource(source: string): LintResult {
  const src = String(source ?? '')
  const issues: string[] = []

  const soc = count(src, /\{\s*(soc|start_of_chorus)\b/gi)
  const eoc = count(src, /\{\s*(eoc|end_of_chorus)\b/gi)
  const sot = count(src, /\{\s*(sot|start_of_tab)\b/gi)
  const eot = count(src, /\{\s*(eot|end_of_tab)\b/gi)
  const sos = count(src, /\{\s*(sos|start_of_score)\b/gi)
  const eos = count(src, /\{\s*(eos|end_of_score)\b/gi)

  if (soc !== eoc) issues.push(`refrão sem fechar (${soc} {soc} × ${eoc} {eoc})`)
  if (sot !== eot) issues.push(`tab sem fechar (${sot} {sot} × ${eot} {eot})`)
  if (sos !== eos) issues.push(`partitura sem fechar (${sos} {sos} × ${eos} {eos})`)
  const brackets = Math.abs(count(src, /\[/g) - count(src, /\]/g))
  if (brackets) issues.push('colchete de acorde sem par')
  const k = (src.match(/\{\s*key\s*:\s*([^}]*)\}/i) || [])[1]
  if (k && !/^[A-G](#|b)?/.test(k.trim())) issues.push(`tom não reconhecido: ${k.trim()}`)
  const mute = voicelessWithoutMarks(src)
  if (mute) issues.push(`trecho sem voz sem x/// (${mute} ${mute === 1 ? 'linha' : 'linhas'})`)

  const unmatched =
    Math.abs(soc - eoc) + Math.abs(sot - eot) + Math.abs(sos - eos) + brackets
  return {
    ok: issues.length === 0,
    issues,
    unmatched,
    message: issues.length ? issues.join(' · ') : OK_MESSAGE,
  }
}
