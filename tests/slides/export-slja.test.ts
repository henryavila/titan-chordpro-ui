import { describe, expect, it } from 'vitest'
import { exportSlja, NoSlideLyricsError } from '../../src/slides'
import { loadFixture } from '../helpers/load-fixture'

describe('exportSlja — host download without mounting the viewer', () => {
  it('turns a ChordPro string into bytes and a filename', async () => {
    const file = await exportSlja(loadFixture('sda/101-fala-comigo.cho'))
    expect(file.bytes[0]).toBe(0x50)
    expect(file.bytes[1]).toBe(0x4b)
    expect(file.filename).toBe('slides-102-fala-comigo.slja')
    expect(file.title).toMatch(/Fala Comigo/)
  })

  it('lets the host override title and images without a Vue tree', async () => {
    const cover = new Uint8Array([1, 2, 3, 4])
    const file = await exportSlja('{title: X}\n[C]Oi\n', {
      title: 'Culto',
      coverImage: cover,
    })
    expect(file.filename).toBe('slides-culto.slja')
    expect(file.title).toBe('Culto')
  })

  it('throws when the chart has nothing to sing', async () => {
    await expect(exportSlja('{c:intro}\n[G]x///\n')).rejects.toBeInstanceOf(NoSlideLyricsError)
  })
})
