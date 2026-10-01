/**
 * One downloaded file. Every file export (CHO, PDF, SLJA, PPSX, ZIP, HTML)
 * returns this shape from `exportX(source)`. Heavy writers stay in their
 * package entry (`./pdf`, `./slides`, `./bundle`); this type lives in core
 * so hosts and the Vue menu share one contract without a plugin registry.
 */
export type ExportedFile = {
  bytes: Uint8Array
  filename: string
  mime: string
  title: string
}

export const EXPORT_MIME = {
  cho: 'text/plain;charset=utf-8',
  html: 'text/html;charset=utf-8',
  pdf: 'application/pdf',
  slja: 'application/zip',
  ppsx: 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
  bundle: 'application/zip',
} as const

export type ExportKind = keyof typeof EXPORT_MIME

const utf8 = new TextEncoder()

export function textExportedFile(
  text: string,
  filename: string,
  title: string,
  mime: string = EXPORT_MIME.cho,
): ExportedFile {
  return { bytes: utf8.encode(text), filename, mime, title }
}
