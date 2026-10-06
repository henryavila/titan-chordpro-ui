import type { ChartBlock } from '@henryavila/titan-chordpro-ui'
import { isScoreReference, readScoreReference } from '@henryavila/titan-chordpro-ui'

/** A rehearsal label is glued to the block under it — no + in that seam. */
export function slotBefore(blocks: ChartBlock[], i: number): boolean {
  if (i === 0) return true
  const prev = blocks[i - 1]
  return prev?.kind !== 'comment' && prev?.kind !== 'note'
}

export function canFold(block: ChartBlock): boolean {
  return block.kind === 'tab' || block.kind === 'score' || block.kind === 'image'
}

export function notationTitle(block: ChartBlock): string {
  if (block.kind === 'score' && isScoreReference(block.text)) {
    try { return readScoreReference(block.text)?.name ?? 'Solo' } catch { return 'Solo' }
  }
  return block.kind === 'tab' ? 'Tablatura' : 'Partitura'
}

export function isExternalScore(block: ChartBlock): boolean {
  return block.kind === 'score' && isScoreReference(block.text)
}

export function isSongStaff(songScore: boolean, block: ChartBlock): boolean {
  return songScore && isExternalScore(block)
}

export function scoreText(block: ChartBlock): string {
  return block.kind === 'score' ? block.text : ''
}

export function fileName(src: string): string {
  return src.split('/').pop() ?? src
}

export function hiddenCount(block: Extract<ChartBlock, { kind: 'hidden' }>): string {
  const n = block.li1 - block.li0 + 1
  return `${n} ${n === 1 ? 'linha' : 'linhas'}`
}

export function hiddenPreview(block: Extract<ChartBlock, { kind: 'hidden' }>): string {
  const first = block.texts.find((t) => t.trim()) ?? ''
  return first.replace(/\[[^\]]*\]/g, '').trim() || '—'
}

export function shiftBadge(n: number): string {
  const label = n > 0 ? `+${n}` : `−${Math.abs(n)}`
  return `este bloco: ${label} ${Math.abs(n) === 1 ? 'semitom' : 'semitons'}`
}

export function ownCapoLabel(block: ChartBlock): string | null {
  if ((block.kind !== 'stanza' && block.kind !== 'chorus') || !block.hasOwnCapo) return null
  return `capo ${block.blockCapo ?? 0} neste bloco`
}

export function blockShift(block: ChartBlock): number {
  if (block.kind !== 'stanza' && block.kind !== 'chorus') return 0
  return block.shift
}

/** Whether a comment/note line is the one being typed in right now. */
export function typingAt(
  edit: { editRow: { value: number | null }; editKind: { value: string } } | null | undefined,
  li: number,
): boolean {
  return !!edit && edit.editRow.value === li && edit.editKind.value === 'comment'
}
