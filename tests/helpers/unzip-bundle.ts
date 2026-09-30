import { inflateRawSync } from 'node:zlib'

export function unzip(bytes: Uint8Array) {
  const out = new Map<string, Uint8Array>()
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 0
  while (view.getUint32(offset, true) === 0x04034b50) {
    const length = view.getUint32(offset + 18, true)
    const nameLength = view.getUint16(offset + 26, true)
    const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLength))
    const start = offset + 30 + nameLength + view.getUint16(offset + 28, true)
    out.set(name, new Uint8Array(inflateRawSync(bytes.subarray(start, start + length))))
    offset = start + length
  }
  return out
}
