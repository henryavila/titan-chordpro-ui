import type { TabStave } from '../types'

/**
 * Tab text becomes a stave: each string is a continuous rule broken by the
 * fret numbers; a `|` inside the bar becomes a vertical divider.
 */
export function buildTab(text: string): { staves: TabStave[]; extras: string[] } {
  const raw = String(text || '')
    .replace(/^\n+|\n+$/g, '')
    .split('\n')
  const std = ['e', 'B', 'G', 'D', 'A', 'E']
  const bass = ['G', 'D', 'A', 'E']
  const isStave = (r: string) => /-{2,}/.test(r)
  const total = raw.filter(isStave).length
  const staves: TabStave[] = []
  const extras: string[] = []
  let i = 0
  for (const r of raw) {
    if (!isStave(r)) {
      if (r.trim()) extras.push(r.trim())
      continue
    }
    const m = r.match(/^\s*([A-Ga-g][#b]?)?\s*\|?(.*)$/)
    const label =
      (m && m[1]) || (total === 6 ? std[i] : total === 4 ? bass[i] : String(i + 1)) || String(i + 1)
    const body = (m ? m[2] : r)?.replace(/\|+\s*$/, '') ?? ''
    const tokens: TabStave['tokens'] = []
    for (const part of body.match(/-+|\|+|[^-|]+/g) || []) {
      if (part[0] === '-') tokens.push({ kind: 'gap', text: part.replace(/-/g, ' ') })
      else if (part[0] === '|') tokens.push({ kind: 'bar' })
      else tokens.push({ kind: 'mark', text: part })
    }
    staves.push({ label, tokens })
    i++
  }
  if (!staves.length) {
    return { staves: [], extras: raw.filter((r) => r.trim()) }
  }
  return { staves, extras }
}
