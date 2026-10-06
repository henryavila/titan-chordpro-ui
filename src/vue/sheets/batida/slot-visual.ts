import { isEmptySlot, type StrumSlot } from '@henryavila/titan-chordpro-ui'

export function slotGlyph(s: StrumSlot): string {
  if (isEmptySlot(s)) return '·'
  if (s.essence === 'muted') return '×'
  if (s.dir === 'up') return '↑'
  if (s.dir === 'down') return '↓'
  return '·'
}

export function slotShortTag(s: StrumSlot): string {
  if (isEmptySlot(s)) return 'vazio'
  if (s.contact === 'rest' || s.contact === 'ghost') return 'passa'
  if (s.essence === 'accent') return 'acento'
  if (s.essence === 'mute') return 'mute'
  if (s.essence === 'muted') return 'abafada'
  return ''
}

export function slotClass(s: StrumSlot): string {
  const bits = ['batida-slot']
  if (isEmptySlot(s)) bits.push('is-empty')
  if (s.contact === 'ghost' || s.contact === 'rest') bits.push('is-ghost')
  if (s.essence === 'accent') bits.push('is-accent')
  if (s.essence === 'mute') bits.push('is-mute')
  if (s.essence === 'muted') bits.push('is-muted')
  return bits.join(' ')
}
