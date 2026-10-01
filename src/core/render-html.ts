import { scoreReferenceCaption } from './score-reference'
import { layoutChart } from './layout'
import { assertTheme, cssVarsString, resolveTheme } from './themes'
import type { ChartBlock, ChartRow, TitanChordproDocument } from './types'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function segsHtml(row: ChartRow): string {
  return row.segs
    .map((s) => {
      const chord = s.chord
        ? `<span class="titan-chordpro-chord${s.tight ? ' titan-chordpro-chord--tight' : ''}">${escapeHtml(s.chord)}</span>`
        : `<span class="titan-chordpro-chord titan-chordpro-chord--empty"></span>`
      return `<span class="titan-chordpro-word"><span class="titan-chordpro-chord-box">${chord}</span><span class="titan-chordpro-lyric">${escapeHtml(s.text)}</span></span>`
    })
    .join('')
}

function rowHtml(row: ChartRow): string {
  return `<div class="titan-chordpro-row">${segsHtml(row)}</div>`
}

function blockHtml(block: ChartBlock): string {
  if (block.kind === 'comment') {
    return `<div class="titan-chordpro-comment"><span class="titan-chordpro-comment-dot"></span><span class="titan-chordpro-comment-text">${escapeHtml(block.text)}</span></div>`
  }
  if (block.kind === 'note') {
    const items = block.items.map((t) => `<div class="titan-chordpro-note-item">${escapeHtml(t)}</div>`).join('')
    return `<div class="titan-chordpro-note"><div class="titan-chordpro-note-label">Execução</div>${items}</div>`
  }
  if (block.kind === 'tab') {
    return `<div class="titan-chordpro-tab"><pre>${escapeHtml(block.text)}</pre></div>`
  }
  if (block.kind === 'score') {
    return `<div class="titan-chordpro-score"><pre>${escapeHtml(scoreReferenceCaption(block.text))}</pre></div>`
  }
  if (block.kind === 'image') {
    return `<figure class="titan-chordpro-image"><img src="${escapeHtml(block.src)}" alt="Partitura da música" /><figcaption>${escapeHtml(
      block.src.split('/').pop() ?? '',
    )}</figcaption></figure>`
  }
  // A hidden block never reaches static output: it is out of the reading.
  if (block.kind === 'hidden') return ''
  const rows = block.rows.map(rowHtml).join('')
  const cls =
    block.kind === 'chorus'
      ? 'titan-chordpro-chorus'
      : 'titan-chordpro-stanza'
  return `<div class="${cls}">${rows}</div>`
}

export function renderHtml(view: TitanChordproDocument, opts?: { theme?: string }): string {
  const theme = opts?.theme ?? 'default'
  assertTheme(theme)
  const resolved = resolveTheme(theme)
  const blocks = layoutChart(view)
  const body = blocks.map(blockHtml).join('\n')
  const alias = theme === 'default' ? 'default' : resolved
  const vars = cssVarsString(resolved)
  return `<div class="titan-chordpro titan-chordpro--${alias}" data-titan-chordpro-scroll data-theme="${resolved}" style="${vars}">${body}</div>`
}

export function isParseFatal(source: string, view: TitanChordproDocument): string | null {
  if (/[\u0000-\u0008\u000E-\u001F\uFFFD]/.test(source)) {
    return 'O conteúdo recebido não parece ser um arquivo ChordPro.'
  }
  // Anything the parser recognised counts as readable — a chart that is only a
  // score reference is a chart, not a broken file.
  const hasContent = view.sections.some((s) => s.lines.some((l) => l.type !== 'empty'))
  if (source.trim() && !hasContent) {
    return 'Nenhuma linha legível foi encontrada nesta fonte.'
  }
  return null
}
