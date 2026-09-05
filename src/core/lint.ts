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
 * Structural check of the ChordPro source, in the wording of the design SoT:
 * unbalanced section directives, unbalanced chord brackets, unreadable key.
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

  const unmatched =
    Math.abs(soc - eoc) + Math.abs(sot - eot) + Math.abs(sos - eos) + brackets
  return {
    ok: issues.length === 0,
    issues,
    unmatched,
    message: issues.length ? issues.join(' · ') : OK_MESSAGE,
  }
}
