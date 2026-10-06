import { MISSING_LABEL, missingOf, type ChartMeta } from '@henryavila/titan-chordpro-ui'

/** Usable duration is missing, or the typed value cannot drive the roll. */
export function durationGapNote(meta: ChartMeta): string {
  if (!missingOf(meta).includes('duration')) return ''
  return String(meta.duration ?? '').trim()
    ? 'Essa duração não serve para a rolagem — use minutos e segundos (ex.: 4:26), pelo menos 20s.'
    : 'Falta a duração. Sem ela a cifra não rola — olhe o tempo no YouTube ou no Spotify.'
}

/** Identity fields that can wait. Duration is the hard gate, tracked apart. */
export function softGapKeys(meta: ChartMeta): string[] {
  return missingOf(meta).filter((k) => k !== 'duration')
}

/** "título, tom e andamento" — the list both fichas put after "Falta". */
export function joinGapLabels(keys: readonly string[]): string {
  const w = keys.map((k) => MISSING_LABEL[k] ?? k)
  return w.length > 1 ? `${w.slice(0, -1).join(', ')} e ${w[w.length - 1]}` : (w[0] ?? '')
}
