/**
 * Id of a named chart, minted from the label the musician typed.
 * The grammar lives in `charts.ts` (`CHART_ID`); this only proposes a free id.
 */

export function chartIdFromLabel(label: string, taken: Iterable<string>): string {
  const base = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
  let id = base && /^[a-z0-9_]/.test(base) ? base : 'versao'
  const used = new Set(taken)
  if (!used.has(id)) return id
  let n = 2
  while (used.has(`${id}_${n}`) && n < 40) n += 1
  return `${id}_${n}`.slice(0, 64)
}
