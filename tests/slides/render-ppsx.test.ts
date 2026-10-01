import { inflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { parse } from '../../src/core'
import { DEFAULT_COVER_JPEG, DEFAULT_SLIDES_JPEG } from '../../src/slides'
import { NoSlideLyricsError } from '../../src/slides/render-slja'
import { renderPpsx } from '../../src/slides/render-ppsx'
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
    out.set(name, data)
    o = dataStart + comp
  }
  return out
}

function text(files: Map<string, Uint8Array>, name: string): string {
  return new TextDecoder('utf-8').decode(files.get(name))
}

describe('renderPpsx', () => {
  it('writes a PPSX zip with cover, lyric slides and the same images as LouvorJA', async () => {
    const bytes = await renderPpsx(parse(`{title: Canção teste}\n[C]És tudo\nNão temas\n`))
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
    const files = unzip(bytes)
    expect(files.has('[Content_Types].xml')).toBe(true)
    expect(files.has('ppt/presentation.xml')).toBe(true)
    expect(files.has('ppt/slides/slide1.xml')).toBe(true)
    expect(files.has('ppt/slides/slide2.xml')).toBe(true)
    expect(files.has('ppt/media/cover.jpg')).toBe(true)
    expect(files.has('ppt/media/slides.jpg')).toBe(true)
    expect(files.get('ppt/media/cover.jpg')).toEqual(DEFAULT_COVER_JPEG)
    expect(files.get('ppt/media/slides.jpg')).toEqual(DEFAULT_SLIDES_JPEG)
    expect(text(files, 'ppt/slides/slide1.xml')).toContain('CANÇÃO TESTE')
    expect(text(files, 'ppt/slides/slide2.xml')).toContain('ÉS TUDO')
    expect(text(files, 'ppt/slides/slide2.xml')).toContain('NÃO TEMAS')
    expect(text(files, 'ppt/presentation.xml')).toContain('sldSz cx="9144000"')
    expect(text(files, '[Content_Types].xml')).toContain(
      'application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml',
    )
    expect(text(files, '[Content_Types].xml')).not.toContain(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml',
    )
  })

  it('embeds host cover and lyric images instead of the package defaults', async () => {
    const cover = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
    const slides = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 4, 5, 6])
    const bytes = await renderPpsx(parse(`{title: X}\n[C]Oi\n`), {
      coverImage: cover,
      slidesImage: slides,
    })
    const files = unzip(bytes)
    expect(files.get('ppt/media/cover.png')).toEqual(cover)
    expect(files.get('ppt/media/slides.jpg')).toEqual(slides)
    expect(text(files, 'ppt/slides/_rels/slide1.xml.rels')).toContain('../media/cover.png')
    expect(text(files, 'ppt/slides/_rels/slide2.xml.rels')).toContain('../media/slides.jpg')
  })

  it('uppercases title, lyrics and repeat marks for the projector', async () => {
    const bytes = await renderPpsx(
      parse(`{title: Canção teste}\n{start_of_chorus}\nFala comigo\n{end_of_chorus}\n{start_of_verse}\nFala comigo\n{end_of_verse}\n`),
    )
    const files = unzip(bytes)
    const lyric = text(files, 'ppt/slides/slide2.xml')
    expect(lyric).toContain('FALA COMIGO')
    expect(lyric).toContain('(2X)')
    expect(lyric).not.toContain('Fala comigo')
    expect(text(files, 'ppt/slides/slide1.xml')).toContain('CANÇÃO TESTE')
  })

  it('rejects a chart with nothing to sing', async () => {
    await expect(renderPpsx(parse('{c:intro}\n[G]x///\n'))).rejects.toBeInstanceOf(NoSlideLyricsError)
  })

  it('keeps Fala Comigo phrasing and repeats the lyric background', async () => {
    const bytes = await renderPpsx(parse(loadFixture('sda/101-fala-comigo.cho')))
    const files = unzip(bytes)
    const cover = text(files, 'ppt/slides/slide1.xml')
    const firstLyric = text(files, 'ppt/slides/slide2.xml')
    expect(cover).toContain('102 - FALA COMIGO')
    expect(cover).toContain('sz="5200"')
    expect(cover).toContain('y="1005840"')
    expect(firstLyric).toContain('TOMA TEU LUGAR DE HONRA')
    expect(firstLyric).toContain('QUEREMOS TUA PRESENÇA AQUI')
    expect(firstLyric).not.toContain('Toma Teu')
    expect(cover).not.toContain('INTRODUÇÃO')
    const lyricSlides = [...files.keys()].filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length
    expect(lyricSlides).toBeGreaterThan(4)
    expect(text(files, 'ppt/slides/_rels/slide2.xml.rels')).toContain('../media/slides.jpg')
    expect(text(files, 'ppt/slides/_rels/slide3.xml.rels')).toContain('../media/slides.jpg')
  })
})
