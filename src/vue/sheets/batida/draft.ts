import { formatTitanStrum, repairStrumPattern, type StrumPattern } from '@henryavila/titan-chordpro-ui'

export function clonePattern(p: StrumPattern): StrumPattern {
  return repairStrumPattern({
    ...p,
    slots: p.slots.map((s) => ({ ...s })),
  })
}

export function snapshotKey(p: StrumPattern, lab: string): string {
  return formatTitanStrum({
    ...p,
    label: lab.trim() || 'Padrão',
    grid: p.slots.length,
  })
}
