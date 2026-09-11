const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c >>> 0
}

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export type ZipMember = { name: string; data: Uint8Array }

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

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, n, true)
  return b
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n, true)
  return b
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

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  // Pull the readable side first. Awaiting write() before anyone reads
  // deadlocks CompressionStream in the browser — Exportar then sits on
  // "gerando…" forever. Node does not deadlock, so unit tests hid this.
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  const cs = new CompressionStream('deflate-raw')
  const reading = collect(cs.readable)
  const writer = cs.writable.getWriter()
  await writer.write(copy)
  await writer.close()
  return reading
}

function nameBytes(name: string): Uint8Array {
  const out = new Uint8Array(name.length)
  for (let i = 0; i < name.length; i++) out[i] = name.charCodeAt(i) & 0xff
  return out
}

/**
 * ZIP with member names stored as given (backslash paths for LouvorJA).
 */
export async function zip(members: ZipMember[]): Promise<Uint8Array> {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  const dosTime = 0
  const dosDate = 0x0021

  for (const member of members) {
    const name = nameBytes(member.name)
    const crc = crc32(member.data)
    const compressed = await deflateRaw(member.data)
    const local = concat([
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      u16(20),
      u16(0),
      u16(8),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(compressed.length),
      u32(member.data.length),
      u16(name.length),
      u16(0),
      name,
      compressed,
    ])
    const central = concat([
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]),
      u16(20),
      u16(20),
      u16(0),
      u16(8),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(compressed.length),
      u32(member.data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ])
    locals.push(local)
    centrals.push(central)
    offset += local.length
  }

  const centralDir = concat(centrals)
  const eocd = concat([
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    u16(0),
    u16(0),
    u16(members.length),
    u16(members.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ])
  return concat([...locals, centralDir, eocd])
}
