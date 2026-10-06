import { EXPORT_MIME, type ExportedFile } from '../core/exported-file'
import { buildPdfFilename } from '../core/filenames'
import { parse } from '../core/parse'
import { renderPdf, type PdfOptions } from './render-pdf'

export type PdfFile = ExportedFile
export type ExportPdfOptions = PdfOptions & { key?: string | null }

/** Host download without mounting the viewer. `renderPdf` stays the ViewModel writer. */
export async function exportPdf(source: string, opts: ExportPdfOptions = {}): Promise<PdfFile> {
  const view = parse(source)
  const title = (opts.title ?? view.meta.title ?? 'cifra').trim() || 'cifra'
  const key = opts.key !== undefined ? opts.key : view.displayKey ?? null
  const bytes = await renderPdf(view, { ...opts, title })
  return { bytes, filename: buildPdfFilename(title, key), mime: EXPORT_MIME.pdf, title }
}
