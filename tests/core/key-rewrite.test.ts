import { describe, expect, it } from 'vitest'
import { detectKeyRewrite, exportCho, readMeta, rewriteToKey } from '../../src/core'
import { loadFixture } from '../helpers/load-fixture'

const OFFER_082 = { declaredKey: 'Ab', writtenKey: 'G', capo: 1, k: -1 }

describe('key-rewrite corpus gate', () => {
  it('082 fires with capo, k=−1; rewrite stores transpose and drops fake capo', () => {
    const src = loadFixture('sda/082-o-rei-vem-vindo.cho')
    expect(detectKeyRewrite(src)).toEqual(OFFER_082)
    const r = rewriteToKey(src, 'Ab')!
    expect(r.transpose).toBe(-1)
    expect(readMeta(r.source)).toMatchObject({ key: 'Ab', transpose: '-1' })
    expect(readMeta(r.source).capo).toBeUndefined()
    expect(r.source).toContain('[Ab]')
    expect(r.source).toContain('[Db]')
    expect(r.source).not.toMatch(/\[G\]/)
    expect(detectKeyRewrite(r.source)).toBeNull()
  })

  it('082 without {capo:} still fires on the sung body, not the D intro', () => {
    const src = loadFixture('sda/082-o-rei-vem-vindo.cho').replace(/\{capo:1\}\n/, '')
    expect(src).not.toMatch(/\{capo:/)
    expect(detectKeyRewrite(src)).toEqual({ declaredKey: 'Ab', writtenKey: 'G', capo: 0, k: -1 })
  })

  it('066 is the same pattern as 082', () => {
    const src = loadFixture('sda/066-tudo-por-ele.cho')
    expect(detectKeyRewrite(src)).toEqual({ declaredKey: 'Db', writtenKey: 'C', capo: 1, k: -1 })
    const r = rewriteToKey(src, 'Db')!
    expect(r.transpose).toBe(-1)
    expect(r.source).toContain('[Db]')
    expect(r.source).not.toMatch(/\{capo:/)
  })

  it('074 fires; the written lift F→F# becomes F#→G', () => {
    const src = loadFixture('sda/074-eu-vou.cho')
    expect(detectKeyRewrite(src)).toEqual({ declaredKey: 'F#', writtenKey: 'F', capo: 1, k: -1 })
    expect(src).toContain('[F]Eu vou')
    expect(src).toContain('[F#]Eu vou')
    const r = rewriteToKey(src, 'F#')!
    expect(r.transpose).toBe(-1)
    expect(r.source).toContain('[F#]Eu vou')
    expect(r.source).toContain('[G]Eu vou')
    expect(r.source).not.toMatch(/\{capo:/)
  })

  it('091 does not fire when V outnumbers I and there is no capo', () => {
    const src = loadFixture('sda/091-o-melhor-lugar-do-mundo.cho')
    expect(detectKeyRewrite(src)).toBeNull()
    const r = rewriteToKey(src, 'A')!
    expect(r.transpose).toBe(0)
    expect(r.source).toContain('[A] No mundo')
    expect(r.source).toMatch(/\[E\]x\/\/\//)
  })

  it('real capo (body already in {key:}) does not fire', () => {
    const src = `{title:X}\n{key:Em}\n{capo:2}\n\n[Em]Today [G]is [D]gonna [A7sus4]be\n`
    expect(detectKeyRewrite(src)).toBeNull()
    const r = rewriteToKey(src, 'Em')!
    expect(r.source).toContain('[Em]Today')
    expect(r.source).toMatch(/\{capo:2\}/)
  })
})

describe('exportCho keeps {key:} and the body', () => {
  it('writes {transpose:} for the live offset instead of rewriting chords', () => {
    const src = `{title:X}\n{key:Ab}\n\n[Ab]hey [Db]there\n`
    const out = exportCho(src, { semitones: -1 })
    expect(out).toMatch(/\{key:Ab\}/)
    expect(out).toMatch(/\{transpose:-1\}/)
    expect(out).toContain('[Ab]hey')
    expect(out).not.toContain('[G]hey')
  })
})
