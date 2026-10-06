import { describe, expect, it } from 'vitest'
import { EXPORT_MIME, exportChoFile } from '../../src/core'

describe('exportChoFile — host download without mounting the viewer', () => {
  it('returns bytes, filename, mime and title', () => {
    const file = exportChoFile('{title: Fala Comigo}\n[C]Oi\n', { key: 'C' })
    expect(file.filename).toBe('fala-comigo-c.cho')
    expect(file.mime).toBe(EXPORT_MIME.cho)
    expect(file.title).toBe('Fala Comigo')
    expect(new TextDecoder().decode(file.bytes)).toContain('[C]Oi')
  })

  it('prepends a personal-version mark when asked', () => {
    const file = exportChoFile('{title: X}\n[C]Oi\n', {
      preamble: '# versão pessoal\n',
    })
    expect(new TextDecoder().decode(file.bytes).startsWith('# versão pessoal\n')).toBe(true)
  })
})
