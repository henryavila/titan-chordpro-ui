import { describe, expect, it } from 'vitest'
import { parse, transpose } from '../../src/core/index'
import { renderPdf } from '../../src/pdf/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

describe('renderPdf', () => {
  it('returns non-empty Uint8Array; header uses transposed key', async () => {
    const view = transpose(parse(loadFixture(JESUS_1)), 2)
    const bytes = await renderPdf(view)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
    const asText = new TextDecoder('latin1').decode(bytes)
    expect(asText.slice(0, 5)).toBe('%PDF-')
    expect(asText).toMatch(/Tom A/)
  })
})
