import { crc32 } from '../slides/zip'

const LOCAL = 0x04034b50
const CENTRAL = 0x02014b50
const EOCD = 0x06054b50

const DAMAGED = 'O arquivo ZIP está danificado ou não é uma cifra completa do Titan.'
const INCOMPLETE = 'O arquivo ZIP está incompleto.'
const EOCD_MIN = 22
const EOCD_MAX_COMMENT = 65535

function concat(parts: Uint8Array[]): Uint8Array {
  const n = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(n)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return concat(chunks)
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('Este ambiente não consegue ler o ZIP da cifra completa.')
  }
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  const ds = new DecompressionStream('deflate-raw')
  const reading = collect(ds.readable)
  const writer = ds.writable.getWriter()
  await writer.write(copy)
  await writer.close()
  return reading
}

function decodeName(bytes: Uint8Array, utf8: boolean): string {
  return new TextDecoder(utf8 ? 'utf-8' : 'latin1').decode(bytes)
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) return bytes
  const out = new Uint8Array(bytes.byteLength)
  out.set(bytes)
  return out
}

function u16(view: DataView, offset: number): number {
  if (offset + 2 > view.byteLength) throw new Error(INCOMPLETE)
  return view.getUint16(offset, true)
}

function u32(view: DataView, offset: number): number {
  if (offset + 4 > view.byteLength) throw new Error(INCOMPLETE)
  return view.getUint32(offset, true)
}

function findEocd(view: DataView, length: number): number {
  if (length < EOCD_MIN) throw new Error(DAMAGED)
  const start = length - EOCD_MIN
  const limit = Math.max(0, length - EOCD_MIN - EOCD_MAX_COMMENT)
  for (let i = start; i >= limit; i--) {
    if (u32(view, i) !== EOCD) continue
    const commentLength = u16(view, i + 20)
    if (i + EOCD_MIN + commentLength === length) return i
  }
  throw new Error(DAMAGED)
}

function rejectFlags(flags: number, compressed: number, uncompressed: number) {
  if (flags & 1) throw new Error('O pacote está protegido por senha e não pode ser importado.')
  if (flags & 8) throw new Error('O arquivo ZIP usa um formato que o Titan não lê.')
  if (compressed === 0xffffffff || uncompressed === 0xffffffff) {
    throw new Error('Este ZIP é grande demais para o contrato atual.')
  }
}

async function inflateMember(method: number, payload: Uint8Array, uncompressed: number, crc: number): Promise<Uint8Array> {
  let data: Uint8Array
  if (method === 0) {
    data = new Uint8Array(payload)
  } else if (method === 8) {
    try { data = await inflateRaw(payload) }
    catch { throw new Error(DAMAGED) }
  } else {
    throw new Error('O arquivo ZIP usa uma compressão que o Titan não lê.')
  }
  if (data.byteLength !== uncompressed || crc32(data) !== crc) throw new Error(DAMAGED)
  return data
}

async function readLocal(
  bytes: Uint8Array,
  view: DataView,
  localOffset: number,
  expected: { name: string; method: number; crc: number; compressed: number; uncompressed: number; utf8: boolean },
): Promise<Uint8Array> {
  if (u32(view, localOffset) !== LOCAL) throw new Error(DAMAGED)
  const flags = u16(view, localOffset + 6)
  const method = u16(view, localOffset + 8)
  const crc = u32(view, localOffset + 14)
  const compressed = u32(view, localOffset + 18)
  const uncompressed = u32(view, localOffset + 22)
  const nameLength = u16(view, localOffset + 26)
  const extraLength = u16(view, localOffset + 28)
  rejectFlags(flags, compressed, uncompressed)
  const nameStart = localOffset + 30
  const nameEnd = nameStart + nameLength
  const dataStart = nameEnd + extraLength
  const dataEnd = dataStart + compressed
  if (nameEnd > bytes.length || dataEnd > bytes.length) throw new Error(INCOMPLETE)
  const utf8 = Boolean(flags & (1 << 11)) || expected.utf8
  const name = decodeName(bytes.subarray(nameStart, nameEnd), utf8)
  if (
    name !== expected.name
    || method !== expected.method
    || crc !== expected.crc
    || compressed !== expected.compressed
    || uncompressed !== expected.uncompressed
  ) throw new Error(DAMAGED)
  return inflateMember(method, bytes.subarray(dataStart, dataEnd), uncompressed, crc)
}

/** Members listed in the central directory. Locals without EOCD are rejected. */
export async function unzip(input: Uint8Array): Promise<Map<string, Uint8Array>> {
  const bytes = copyBytes(input)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocd = findEocd(view, bytes.length)
  const disk = u16(view, eocd + 4)
  const cdDisk = u16(view, eocd + 6)
  const entriesOnDisk = u16(view, eocd + 8)
  const entries = u16(view, eocd + 10)
  const cdSize = u32(view, eocd + 12)
  const cdOffset = u32(view, eocd + 16)
  if (disk !== 0 || cdDisk !== 0 || entriesOnDisk !== entries) throw new Error(DAMAGED)
  if (entries === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    throw new Error('Este ZIP é grande demais para o contrato atual.')
  }
  if (entries === 0) throw new Error('O arquivo ZIP está vazio ou não é uma cifra completa do Titan.')
  if (cdOffset + cdSize > eocd) throw new Error(DAMAGED)

  const out = new Map<string, Uint8Array>()
  let offset = cdOffset
  const cdEnd = cdOffset + cdSize
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > cdEnd) throw new Error(DAMAGED)
    if (u32(view, offset) !== CENTRAL) throw new Error(DAMAGED)
    const flags = u16(view, offset + 8)
    const method = u16(view, offset + 10)
    const crc = u32(view, offset + 16)
    const compressed = u32(view, offset + 20)
    const uncompressed = u32(view, offset + 24)
    const nameLength = u16(view, offset + 28)
    const extraLength = u16(view, offset + 30)
    const commentLength = u16(view, offset + 32)
    const localOffset = u32(view, offset + 42)
    rejectFlags(flags, compressed, uncompressed)
    const nameStart = offset + 46
    const nameEnd = nameStart + nameLength
    const recordEnd = nameEnd + extraLength + commentLength
    if (recordEnd > cdEnd) throw new Error(DAMAGED)
    const name = decodeName(bytes.subarray(nameStart, nameEnd), Boolean(flags & (1 << 11)))
    offset = recordEnd
    if (!name || name.endsWith('/')) continue
    if (out.has(name)) throw new Error('O pacote contém arquivos duplicados.')
    out.set(name, await readLocal(bytes, view, localOffset, {
      name,
      method,
      crc,
      compressed,
      uncompressed,
      utf8: Boolean(flags & (1 << 11)),
    }))
  }
  if (offset !== cdEnd) throw new Error(DAMAGED)
  if (out.size === 0) throw new Error('O arquivo ZIP está vazio ou não é uma cifra completa do Titan.')
  return out
}
