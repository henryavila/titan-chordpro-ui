import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { parse, writeScoreReference } from '../../src/core'
import { renderPdf } from '../../src/pdf'
const source = readFileSync('fixtures/sda/084-escuta-meu-clamor.cho', 'utf8')
const text = writeScoreReference({ src: 'solo.gp', track: 1, start: 2, end: 4 })
const view = parse(source + '\n' + text)
const pixel = readFileSync('fixtures/assets/ele-vive-intro.png')

describe('PDF notation', () => {
  it('omits notation without fetching or rendering a file', async () => {
    const renderNotation = vi.fn()
    const bytes = await renderPdf(view, { notation: 'none', renderNotation })
    expect(renderNotation).not.toHaveBeenCalled()
    expect(Buffer.from(bytes).includes(Buffer.from('/Subtype /Image'))).toBe(false)
  })
  it('passes the exact excerpt and requested representation to the engraver', async () => {
    const renderNotation = vi.fn(async () => [{ data: pixel, width: 1000, height: 200 }])
    const bytes = await renderPdf(view, { notation: 'tab', renderNotation })
    expect(renderNotation).toHaveBeenCalledWith(text, 'tab')
    expect(Buffer.from(bytes).includes(Buffer.from('/Subtype /Image'))).toBe(true)
    expect(view.source).toContain(text)
  })
  it('fails instead of silently exporting a missing solo', async () => {
    await expect(renderPdf(view, { notation: 'score' })).rejects.toThrow('renderNotation')
    await expect(renderPdf(view, { notation: 'score', renderNotation: async () => [] })).rejects.toThrow('desenho')
    await expect(renderPdf(view, { notation: 'score', renderNotation: async () => { throw new Error('Arquivo indisponível') } })).rejects.toThrow('indisponível')
  })
})
