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

const HIT_ESSENCES: StrumEssence[] = ['normal', 'accent', 'mute', 'muted']

export type StrumDensity = 2 | 4
/** For 6/8: 2 = compound pulses, 6 = eighth-note pulses. */
export type SixEightPulse = 2 | 6

/** Undirected empty cell — used until the musician sets the hand-direction anchor. */
export function emptySlot(): StrumSlot {
  return { dir: null, contact: 'ghost', essence: null }
}

export function isEmptySlot(s: StrumSlot): boolean {
  return s.dir == null
}

export function oppositeDir(dir: 'down' | 'up'): 'down' | 'up' {
  return dir === 'down' ? 'up' : 'down'
}

/** Direction at `offset` steps from an anchor direction (0 = same). */
export function dirAtOffset(anchorDir: 'down' | 'up', offset: number): 'down' | 'up' {
  const steps = ((offset % 2) + 2) % 2
  return steps === 0 ? anchorDir : oppositeDir(anchorDir)
}

export function beatsInMeter(meter: string, sixEightPulse: SixEightPulse = 2): number {
  const m = String(meter || '4/4').trim()
  if (m === '6/8') return sixEightPulse === 6 ? 6 : 2
  const num = Number((m.split('/')[0] || '').trim())
  if (Number.isFinite(num) && num > 0) return Math.floor(num)
  return 4
}

export function gridFromDensity(
  meter: string,
  density: StrumDensity,
  sixEightPulse: SixEightPulse = 2,
): number {
  return beatsInMeter(meter, sixEightPulse) * density
}

export function densityFromGrid(
  meter: string,
  grid: number,
  sixEightPulse?: SixEightPulse,
): StrumDensity | null {
  const pulse =
    sixEightPulse ??
    (String(meter || '').trim() === '6/8' ? inferSixEightPulse(meter, grid) ?? 2 : 2)
  const beats = beatsInMeter(meter, pulse)
  if (beats <= 0) return null
  const d = grid / beats
  if (d === 2 || d === 4) return d
  return null
}

/** Infer 6/8 pulse reading from an existing grid; null when not 6/8 or ambiguous. */
export function inferSixEightPulse(meter: string, grid: number): SixEightPulse | null {
  if (String(meter || '').trim() !== '6/8') return null
  if (grid % 6 === 0 && (grid / 6 === 2 || grid / 6 === 4)) return 6
  if (grid % 2 === 0 && (grid / 2 === 2 || grid / 2 === 4)) return 2
  return null
}

export function hasStrumAnchor(pattern: StrumPattern): boolean {
  return pattern.slots.some((s) => s.dir === 'down' || s.dir === 'up')
}

/** First directed slot index, or -1. */
export function findAnchorIndex(pattern: StrumPattern): number {
  return pattern.slots.findIndex((s) => s.dir === 'down' || s.dir === 'up')
}

/**
 * Required direction at `index` given the current anchor phase.
 * Null when the pattern has no directed slot yet.
 */
export function requiredDir(pattern: StrumPattern, index: number): StrumDir {
  const a = findAnchorIndex(pattern)
  if (a < 0) return null
  const anchor = pattern.slots[a]!
  if (anchor.dir !== 'down' && anchor.dir !== 'up') return null
  return dirAtOffset(anchor.dir, index - a)
}

function choicesForDirs(dirs: Array<'down' | 'up'>): StrumSlot[] {
  const hits: StrumSlot[] = []
  for (const dir of dirs) {
    for (const essence of HIT_ESSENCES) {
      hits.push({ dir, contact: 'hit', essence })
    }
  }
  const ghosts = dirs.map((dir) => ({ dir, contact: 'ghost' as const, essence: null }))
  return [...hits, ...ghosts]
}

/**
 * Picker catalog. With an anchored pattern + index, only the legally required
 * direction is listed. Unanchored (or no args) → both directions.
 */
export function listSlotChoices(pattern?: StrumPattern, index?: number): StrumSlot[] {
  if (pattern && index != null && index >= 0 && index < pattern.slots.length) {
    const req = requiredDir(pattern, index)
    if (req === 'down' || req === 'up') return choicesForDirs([req])
  }
  return choicesForDirs(['down', 'up'])
}

export function slotEquals(a: StrumSlot, b: StrumSlot): boolean {
  return a.contact === b.contact && a.dir === b.dir && a.essence === b.essence
}

/** Strict hand physics: every slot directed, neighbors alternate, loop closes. */
export function isLegalStrumPattern(pattern: StrumPattern): boolean {
  const slots = pattern.slots
  const n = slots.length
  if (n < 2) return false
  if (slots.some((s) => s.dir !== 'down' && s.dir !== 'up')) return false
  for (let i = 0; i < n; i++) {
    const a = slots[i]!.dir
    const b = slots[(i + 1) % n]!.dir
    if (a === b) return false
  }
  return true
}

export function isCompleteStrumPattern(pattern: StrumPattern): boolean {
  return isLegalStrumPattern(pattern)
}

function ghostWithDir(dir: 'down' | 'up'): StrumSlot {
  return { dir, contact: 'ghost', essence: null }
}

/**
 * Apply `slot` at `index` and cascade directions from that phase:
 * empty cells become passa with the forced dir; existing cells keep
 * contact/essence but adopt the forced dir. Hand loop always closes on even grids.
 */
export function setSlotCascading(
  pattern: StrumPattern,
  index: number,
  slot: StrumSlot,
): StrumPattern {
  if (index < 0 || index >= pattern.slots.length) return pattern
  if (slot.dir !== 'down' && slot.dir !== 'up') {
    // Clearing direction is not supported via cascade; use setSlot for low-level.
    return setSlot(pattern, index, slot)
  }
  const anchorDir = slot.dir
  const slots = pattern.slots.map((s, i) => {
    const dir = dirAtOffset(anchorDir, i - index)
    if (i === index) {
      return { ...slot, dir }
    }
    if (isEmptySlot(s) || s.contact === 'rest') {
      return ghostWithDir(dir)
    }
    return {
      dir,
      contact: s.contact,
      essence: s.contact === 'hit' ? s.essence : null,
    }
  })
  return { ...pattern, slots, grid: slots.length }
}

/**
 * Normalize legacy rest and force a single alternating phase from the first
 * directed slot. Unanchored patterns become all-empty.
 */
export function repairStrumPattern(pattern: StrumPattern): StrumPattern {
  const cleaned = pattern.slots.map((s) => {
    if (s.contact === 'rest' || s.dir == null) return emptySlot()
    return { ...s }
  })
  const draft: StrumPattern = { ...pattern, slots: cleaned, grid: cleaned.length }
  const a = findAnchorIndex(draft)
  if (a < 0) return draft
  const anchor = draft.slots[a]!
  if (anchor.dir !== 'down' && anchor.dir !== 'up') return draft
  return setSlotCascading(draft, a, { ...anchor })
}

/** Immutable slot replace (no cascade). Prefer setSlotCascading in the editor. */
export function setSlot(pattern: StrumPattern, index: number, slot: StrumSlot): StrumPattern {
  if (index < 0 || index >= pattern.slots.length) return pattern
  const slots = pattern.slots.map((s, i) => (i === index ? { ...slot } : s))
  return { ...pattern, slots }
}

/** Immutable resize; new cells are empty until cascade, or filled when already anchored. */
export function resizePattern(pattern: StrumPattern, grid: number): StrumPattern {
  const n = Math.max(1, Math.floor(grid) || 1)
  let slots: StrumSlot[]
  if (n <= pattern.slots.length) {
    slots = pattern.slots.slice(0, n).map((s) => ({ ...s }))
  } else {
    slots = [
      ...pattern.slots.map((s) => ({ ...s })),
      ...Array.from({ length: n - pattern.slots.length }, () => emptySlot()),
    ]
  }
  const next: StrumPattern = { ...pattern, grid: n, slots }
  if (!hasStrumAnchor(next)) return next
  const a = findAnchorIndex(next)
  const anchor = next.slots[a]!
  if (anchor.dir !== 'down' && anchor.dir !== 'up') return next
  return setSlotCascading(next, a, { ...anchor })
}

export type EmptyPatternOpts = {
  bpm?: number | null
  meter?: string
  grid?: number
  label?: string
}

/** New pattern with empty slots (no direction) until the musician sets the anchor. */
export function emptyPattern(opts: EmptyPatternOpts = {}): StrumPattern {
  const grid = Math.max(1, Math.floor(opts.grid ?? 16) || 16)
  return {
    bpm: opts.bpm ?? null,
    meter: opts.meter || '4/4',
    grid,
    label: opts.label || 'Padrão',
    slots: Array.from({ length: grid }, () => emptySlot()),
  }
}
