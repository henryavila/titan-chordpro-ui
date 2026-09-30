import { readScoreReference } from '@henryavila/titan-chordpro-ui'
import type { PdfNotationImage } from '@henryavila/titan-chordpro-ui/pdf'
import { drawNotation, PAPER_PALETTE } from './notation-renderer'
import { loadNotation } from './notation-loader'

/** A separate paper engraving: never capture a zoomed, clipped or dark screen. */
export async function renderPdfNotation(
  text: string,
  mode: 'tab' | 'score',
  resolveScore?: (src: string) => string,
): Promise<PdfNotationImage[]> {
  const reference = readScoreReference(text)
  if (!reference) throw new Error('Este trecho não contém um arquivo Guitar Pro ou MusicXML.')
  const url = new URL(resolveScore?.(reference.src) ?? reference.src, document.baseURI)
  if (!['http:', 'https:', 'blob:'].includes(url.protocol)) throw new Error('Endereço do solo inválido.')
  const abort = new AbortController()
  const fetchTimer = setTimeout(() => abort.abort(), 20000)
  let bytes: Uint8Array
  try {
    const response = await fetch(url.href, { signal: abort.signal })
    if (!response.ok) throw new Error('Não foi possível abrir o arquivo do solo para o PDF.')
    bytes = new Uint8Array(await response.arrayBuffer())
  } finally { clearTimeout(fetchTimer) }
  const score = await loadNotation(bytes)
  const systems = await drawNotation(score, reference, {
    mode, width: 2012, scale: 3, palette: PAPER_PALETTE, engine: 'html5',
  })
  return systems.map(system => ({
    data: (system.content as HTMLCanvasElement).toDataURL('image/png'),
    width: system.width, height: system.height,
  }))
}
