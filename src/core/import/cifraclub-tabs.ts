import { isChordLine, isTabLine } from './chord-line'

/**
 * Cifra Club writes a tab as `[TAB - …]` / `[Tab - …]`, then the same chords
 * again, often `Parte N de M`, then the ASCII staff. That chord line only
 * labels the fingering. Drop the whole block. A staff with no caption stays,
 * so a pasted tab the musician wrote is still `{sot}`.
 */
const TAB_CAPTION = /^\s*\[(?:tab|tablatura)\b[^\]]*\]\s*$/i
const TAB_PARTE = /^\s*parte\s+\d+\s+de\s+\d+\s*$/i

function stripHashTabMarkers(text: string): string {
  if (!text.includes('#t1#') && !text.includes('#t2#')) return text
  return text.replace(/#t1#[\s\S]*?#\/t1#/g, '\n').replace(/#t2#[\s\S]*?#\/t2#/g, '\n')
}

function staffAhead(lines: string[], from: number): boolean {
  let seen = 0
  for (let i = from + 1; i < lines.length && seen < 8; i++) {
    const raw = lines[i] ?? ''
    const bare = raw.trim()
    if (!bare) continue
    seen++
    if (isTabLine(raw)) return true
    if (TAB_CAPTION.test(bare) || /^\[[^\]]+\]/.test(bare)) return false
  }
  return false
}

export function stripPlainCifraClubTabs(text: string): string {
  const lines = stripHashTabMarkers(text).split('\n')
  const out: string[] = []
  let inTab = false
  // Chord names above the staff label the fingering. The same shape after
  // the staff is the song again.
  let seenStaff = false
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? ''
    const bare = raw.trim()
    if (TAB_CAPTION.test(bare) || (TAB_PARTE.test(bare) && staffAhead(lines, i))) {
      inTab = true
      seenStaff = false
      continue
    }
    if (inTab) {
      if (!bare) continue
      if (TAB_PARTE.test(bare)) {
        seenStaff = false
        continue
      }
      if (isTabLine(raw)) {
        seenStaff = true
        continue
      }
      if (isChordLine(raw) && !seenStaff) continue
      inTab = false
      if (out.length && (out[out.length - 1] ?? '').trim()) out.push('')
    }
    out.push(raw)
  }
  return out.join('\n')
}
