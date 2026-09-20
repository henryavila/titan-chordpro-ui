import { describe, expect, it } from 'vitest'
import { exportCho } from '../../src/core/index'
import { loadFixture } from '../helpers/load-fixture'

describe('exportCho keeps define directives', () => {
  it('still contains {define-guitar:} from the source', () => {
    const src = loadFixture('define-roundtrip.cho')
    expect(src).toMatch(/\{define-guitar:/)
    const out = exportCho(src)
    expect(out).toMatch(/\{define-guitar:/)
    expect(out).toContain('[G]')
  })

  it('rewrites define names with the same transpose as the body', () => {
    const src = loadFixture('define-roundtrip.cho')
    const out = exportCho(src, { semitones: 2 })
    expect(out).toMatch(/\{define-guitar:\s*A\b/)
    expect(out).toMatch(/\[A\]/)
    expect(out).not.toMatch(/\{define-guitar:\s*G\b/)
    expect(out).toMatch(/\[D\]/)
    expect(out).toMatch(/\[E\]/)
  })
})
