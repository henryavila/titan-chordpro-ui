import { buildScoreFilename, readScoreReference } from '@henryavila/titan-chordpro-ui'

function unwrapBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array && value.byteLength) return value
  if (ArrayBuffer.isView(value) && value.byteLength) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  if (value && typeof value === 'object' && 'value' in value) return unwrapBytes((value as { value: unknown }).value)
  return null
}

export function saveBlob(name: string, blob: Blob): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.rel = 'noopener'
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/** Downloads the original Guitar Pro/MusicXML bytes under the Titan block name. */
export async function downloadScoreFile(opts: {
  text: string
  resolveScore?: (src: string) => string
  bytes?: Uint8Array | null
  contentType?: string
}): Promise<string> {
  const ref = readScoreReference(opts.text)
  if (!ref) throw new Error('Referência do solo inválida.')
  let bytes = unwrapBytes(opts.bytes)
  let contentType = opts.contentType ?? ''
  if (!bytes?.byteLength) {
    const url = new URL(opts.resolveScore?.(ref.src) ?? ref.src, document.baseURI)
    if (!['http:', 'https:', 'blob:'].includes(url.protocol)) throw new Error('Use um endereço HTTP ou HTTPS para o arquivo.')
    const response = await fetch(url.href)
    if (!response.ok) throw new Error('Não foi possível baixar o arquivo do solo.')
    bytes = new Uint8Array(await response.arrayBuffer())
    contentType = response.headers.get('content-type') ?? contentType
  }
  if (!bytes.byteLength) throw new Error('Não foi possível baixar o arquivo do solo.')
  const filename = buildScoreFilename(ref.name, ref.src, contentType)
  saveBlob(filename, new Blob([bytes as BlobPart], { type: contentType || 'application/octet-stream' }))
  return filename
}
