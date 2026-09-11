/**
 * Cifra Club strumming → Titan slots.
 * CC codes collapse to direction + contact + four essences (normal / accent /
 * mute / muted). Ghost (23) and rest (24) carry no essence.
 */

export type StrumContact = 'hit' | 'ghost' | 'rest'
export type StrumDir = 'down' | 'up' | null
/** `muted` = abafada (left-hand dampen); `mute` = palm. */
export type StrumEssence = 'normal' | 'accent' | 'mute' | 'muted'

export type StrumSlot = {
  dir: StrumDir
  contact: StrumContact
  essence: StrumEssence | null
}

export type StrumPattern = {
  bpm: number | null
  meter: string
  grid: number
  label: string
  slots: StrumSlot[]
}

/** CC stroke code → essence for a hit. Direction comes from the code family. */
const ESSENCE_BY_CODE: Record<number, StrumEssence> = {
  0: 'muted',
  1: 'accent',
  2: 'accent',
  3: 'normal',
  4: 'muted',
  5: 'accent',
  6: 'normal',
  7: 'normal',
  8: 'accent', // palm+accent → accent wins in v1
  9: 'mute',
  10: 'accent',
  11: 'normal',
  12: 'muted',
  13: 'accent',
  14: 'accent',
  15: 'normal',
  16: 'muted',
  17: 'accent',
  18: 'normal',
  19: 'normal',
  20: 'accent',
  21: 'mute',
  22: 'muted',
}

export function slotFromCcCode(code: number, index: number): StrumSlot {
  if (code === 24) return { dir: null, contact: 'rest', essence: null }
  if (code === 23) {
    return { dir: index % 2 === 0 ? 'down' : 'up', contact: 'ghost', essence: null }
  }
  if (code === 22) return { dir: null, contact: 'hit', essence: 'muted' }
  if (code >= 0 && code <= 11) {
    return { dir: 'down', contact: 'hit', essence: ESSENCE_BY_CODE[code] ?? 'normal' }
  }
  if (code >= 12 && code <= 21) {
    return { dir: 'up', contact: 'hit', essence: ESSENCE_BY_CODE[code] ?? 'normal' }
  }
  // Unknown → treat as ghost so the grid stays aligned
  return { dir: index % 2 === 0 ? 'down' : 'up', contact: 'ghost', essence: null }
}

export function slotsFromCcPattern(pattern: number[]): StrumSlot[] {
  return pattern.map((c, i) => slotFromCcCode(c, i))
}

/** Beat numbers in a CC timeSignature → 4/4 (the only meter we infer today). */
export function meterFromTimeSignature(ts: string[]): string {
  const beats = ts.filter((t) => t !== 'x' && /^\d+$/.test(t)).length
  if (beats === 3) return '3/4'
  if (beats === 2) return '2/4'
  if (beats === 6) return '6/8'
  return '4/4'
}

export function encodeStrumPat(slots: StrumSlot[]): string {
  const toks = slots.map((s) => {
    if (s.contact === 'rest') return '-'
    if (s.contact === 'ghost') return s.dir === 'up' ? 'u' : 'd'
    const base = s.dir === 'up' ? 'U' : 'D'
    if (s.essence === 'accent') return base + '!'
    if (s.essence === 'mute') return base + 'm'
    if (s.essence === 'muted') return base + 'a'
    return base
  })
  // Group by bar when grid is known by caller — here flat with spaces every 4
  const parts: string[] = []
  for (let i = 0; i < toks.length; i += 4) {
    parts.push(toks.slice(i, i + 4).join(''))
  }
  return parts.join(' ')
}

export function decodeStrumPat(pat: string): StrumSlot[] {
  const slots: StrumSlot[] = []
  const re = /D!|U!|Dm|Um|Da|Ua|D|U|d|u|-/g
  let m: RegExpExecArray | null
  while ((m = re.exec(pat))) {
    const t = m[0]
    if (t === '-') {
      slots.push({ dir: null, contact: 'rest', essence: null })
      continue
    }
    if (t === 'd' || t === 'u') {
      slots.push({ dir: t === 'u' ? 'up' : 'down', contact: 'ghost', essence: null })
      continue
    }
    const up = t[0] === 'U'
    const dir: StrumDir = up ? 'up' : 'down'
    if (t.endsWith('!')) slots.push({ dir, contact: 'hit', essence: 'accent' })
    else if (t.endsWith('m')) slots.push({ dir, contact: 'hit', essence: 'mute' })
    else if (t.endsWith('a')) slots.push({ dir, contact: 'hit', essence: 'muted' })
    else slots.push({ dir, contact: 'hit', essence: 'normal' })
  }
  return slots
}

export function formatXStrum(p: StrumPattern): string {
  const bits = [
    p.bpm != null ? `bpm=${p.bpm}` : '',
    p.meter ? `meter=${p.meter}` : '',
    p.grid ? `grid=${p.grid}` : '',
    p.label ? `label=${p.label.replace(/;/g, ',')}` : '',
    `pat=${encodeStrumPat(p.slots)}`,
  ].filter(Boolean)
  return bits.join('; ')
}

export function parseXStrum(raw: string): StrumPattern | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const get = (k: string) => {
    const m = s.match(new RegExp(`(?:^|;\\s*)${k}=([^;]*)`))
    return (m?.[1] ?? '').trim()
  }
  const pat = get('pat')
  if (!pat) return null
  const bpmRaw = get('bpm')
  const gridRaw = get('grid')
  const slots = decodeStrumPat(pat)
  return {
    bpm: bpmRaw && /^\d+$/.test(bpmRaw) ? Number(bpmRaw) : null,
    meter: get('meter') || '4/4',
    grid: gridRaw && /^\d+$/.test(gridRaw) ? Number(gridRaw) : slots.length || 16,
    label: get('label'),
    slots,
  }
}

export function patternFromCc(
  pattern: number[],
  timeSignature: string[],
  bpm: number | null,
  label: string,
): StrumPattern {
  const grid = timeSignature.length || pattern.length || 16
  return {
    bpm,
    meter: meterFromTimeSignature(timeSignature),
    grid,
    label: label || 'Padrão',
    slots: slotsFromCcPattern(pattern),
  }
}
