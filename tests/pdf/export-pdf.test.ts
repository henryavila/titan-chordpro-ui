import { describe, expect, it } from 'vitest'
import { EXPORT_MIME } from '../../src/core'
import { exportPdf } from '../../src/pdf'
import { loadFixture } from '../helpers/load-fixture'

describe('exportPdf — host download without mounting the viewer', () => {
  it('turns a ChordPro string into bytes and a filename', async () => {
    const file = await exportPdf(loadFixture('sda/101-fala-comigo.cho'))
    expect(file.bytes[0]).toBe(0x25)
    expect(file.filename).toMatch(/^cifra-102-fala-comigo.*\.pdf$/)
    expect(file.mime).toBe(EXPORT_MIME.pdf)
    expect(file.title).toMatch(/Fala Comigo/)
  })

  it('lets the host override title and key without a Vue tree', async () => {
    const file = await exportPdf('{title: X}\n[C]Oi\n', { title: 'Culto', key: 'G' })
    expect(file.filename).toBe('cifra-culto-tom-g.pdf')
    expect(file.title).toBe('Culto')
  })
})
