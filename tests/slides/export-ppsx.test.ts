import { describe, expect, it } from 'vitest'
import { exportPpsx, NoSlideLyricsError } from '../../src/slides'
import { loadFixture } from '../helpers/load-fixture'

describe('exportPpsx — host download without mounting the viewer', () => {
  it('turns a ChordPro string into bytes and a filename', async () => {
    const file = await exportPpsx(loadFixture('sda/101-fala-comigo.cho'))
    expect(file.bytes[0]).toBe(0x50)
    expect(file.bytes[1]).toBe(0x4b)
    expect(file.filename).toBe('slides-102-fala-comigo.ppsx')
    expect(file.mime).toBe('application/vnd.openxmlformats-officedocument.presentationml.slideshow')
    expect(file.title).toMatch(/Fala Comigo/)
  })

  it('lets the host override title and images without a Vue tree', async () => {
    const cover = new Uint8Array([1, 2, 3, 4])
    const file = await exportPpsx('{title: X}\n[C]Oi\n', {
      title: 'Culto',
      coverImage: cover,
    })
    expect(file.filename).toBe('slides-culto.ppsx')
    expect(file.title).toBe('Culto')
  })

  it('throws when the chart has nothing to sing', async () => {
    await expect(exportPpsx('{c:intro}\n[G]x///\n')).rejects.toBeInstanceOf(NoSlideLyricsError)
  })
})
