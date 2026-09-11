import { inflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { parse } from '../../src/core'
import {
  COVER_IMAGE_MEMBER,
  NoSlideLyricsError,
  renderLja,
  renderSlja,
  SLIDES_IMAGE_MEMBER,
} from '../../src/slides/render-slja'
import { loadFixture } from '../helpers/load-fixture'

function unzip(buf: Uint8Array): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>()
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let o = 0
  while (o + 4 <= buf.length) {
    const sig = view.getUint32(o, true)
    if (sig !== 0x04034b50) break
    const method = view.getUint16(o + 8, true)
    const comp = view.getUint32(o + 18, true)
    const raw = view.getUint32(o + 22, true)
    const nameLen = view.getUint16(o + 26, true)
    const extra = view.getUint16(o + 28, true)
    const nameStart = o + 30
    const name = new TextDecoder('latin1').decode(buf.subarray(nameStart, nameStart + nameLen))
    const dataStart = nameStart + nameLen + extra
    const payload = buf.subarray(dataStart, dataStart + comp)
    const data =
      method === 8
        ? new Uint8Array(inflateRawSync(payload))
        : method === 0
          ? payload.slice()
          : payload
    if (data.length !== raw && method === 8) {
      expect(data.length).toBe(raw)
    }
    out.set(name, data)
    o = dataStart + comp
  }
  return out
}

describe('renderLja / renderSlja', () => {
  it('writes LouvorJA CP1252/CRLF fields without audio', () => {
    const data = renderLja([{ lines: ['És tudo', 'Não temas'], auxText: '(2x)' }], {
      title: 'Canção teste',
      version: '25.0.test',
    })
    const text = new TextDecoder('latin1').decode(data)
    expect(text).toContain('[Geral]\r\n')
    expect(text).toContain('slides=2\r\n')
    expect(text).toContain('versao=25.0.test\r\n')
    expect(text).toContain('audio=0\r\n')
    expect(text).not.toContain('url_musica=')
    expect(text).toContain('tipo=CAPA\r\n')
    expect(text).toContain('letra=Canção teste\r\n')
    expect(text).toContain(`imagem=${COVER_IMAGE_MEMBER}\r\n`)
    expect(text).toContain('tipo=LETRA\r\n')
    expect(text).toContain('letra=És tudo|Não temas\r\n')
    expect(text).toContain('letra_aux=(2x)\r\n')
    expect(text).toContain(`imagem=${SLIDES_IMAGE_MEMBER}\r\n`)
    expect(text).toContain('tempo=00:00:00\r\n')
    expect(text.includes('\n[Geral]\n')).toBe(false)
    const titleAt = text.indexOf('Canção')
    expect(titleAt).toBeGreaterThan(-1)
    expect(data[titleAt + 3]).toBe(0xe7)
    expect(data[titleAt + 4]).toBe(0xe3)
  })

  it('deflates without deadlocking the readable side', async () => {
    const bytes = await Promise.race([
      renderSlja(parse(`{title: Hi}\nHello [G]world\n`)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('zip deflate hung')), 2000),
      ),
    ])
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
  })

  it('embeds the lja and both image members with backslash paths', async () => {
    const cover = new Uint8Array([1, 2, 3, 4])
    const slides = new Uint8Array([5, 6, 7, 8])
    const bytes = await renderSlja(
      parse(`{title: Fala Comigo}\n[C]Fala comigo\n`),
      { coverImage: cover, slidesImage: slides },
    )
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
    const files = unzip(bytes)
    expect([...files.keys()]).toEqual(['slides.lja', COVER_IMAGE_MEMBER, SLIDES_IMAGE_MEMBER])
    expect(files.get(COVER_IMAGE_MEMBER)).toEqual(cover)
    expect(files.get(SLIDES_IMAGE_MEMBER)).toEqual(slides)
    const lja = new TextDecoder('latin1').decode(files.get('slides.lja'))
    expect(lja).toContain('letra=Fala comigo\r\n')
    expect(lja).toContain('letra=Fala Comigo\r\n')
  })

  it('uses default cover and lyric images when the host does not pass any', async () => {
    const bytes = await renderSlja(parse(`{title: Hi}\nHello [G]world\n`))
    const files = unzip(bytes)
    const cover = files.get(COVER_IMAGE_MEMBER)!
    const lyric = files.get(SLIDES_IMAGE_MEMBER)!
    expect(cover[0]).toBe(0xff)
    expect(cover[1]).toBe(0xd8)
    expect(lyric[0]).toBe(0xff)
    expect(lyric[1]).toBe(0xd8)
    expect(cover.length).toBeGreaterThan(50_000)
    expect(lyric.length).toBeGreaterThan(50_000)
    expect(cover).not.toEqual(lyric)
  })

  it('rejects a chart with nothing to sing', async () => {
    await expect(renderSlja(parse('{c:intro}\n[G]x///\n'))).rejects.toBeInstanceOf(NoSlideLyricsError)
  })

  it('builds a real fixture archive', async () => {
    const bytes = await renderSlja(parse(loadFixture('sda/101-fala-comigo.cho')))
    const files = unzip(bytes)
    const text = new TextDecoder('latin1').decode(files.get('slides.lja'))
    expect(text).toContain('Toma Teu lugar de honra|Queremos Tua Presença aqui')
    expect(text).toContain('tipo=CAPA')
    expect(text).not.toContain('INTRODUÇÃO')
  })
})
