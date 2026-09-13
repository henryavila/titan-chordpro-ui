import { describe, expect, it } from 'vitest'
import { YT_ID, cifraOk } from '../../functions/_shared'

describe('Pages Functions proxy gate', () => {
  it('allows only Cifra Club hosts', () => {
    expect(cifraOk('https://www.cifraclub.com.br/artista/musica/')).toBe(true)
    expect(cifraOk('https://cifraclub.com.br/artista/musica/')).toBe(true)
    expect(cifraOk('https://evil.com/?u=cifraclub.com.br')).toBe(false)
    expect(cifraOk('not-a-url')).toBe(false)
  })

  it('accepts only 11-char YouTube ids', () => {
    expect(YT_ID.test('dQw4w9WgXcQ')).toBe(true)
    expect(YT_ID.test('short')).toBe(false)
    expect(YT_ID.test('../etc/passwd')).toBe(false)
  })
})
