import { describe, expect, it } from 'vitest'
import { PdfHasNoText, pdfText, type PdfjsLike } from '../../src/pdf/pdf-text'
import { detect, fromPlain } from '../../src/core/import-chordpro'

type Run = { str: string; x: number; y: number; width?: number }

/** A pdf.js stand-in: pages of loose runs with coordinates, as the real one gives. */
function fakePdf(pages: Run[][]): PdfjsLike {
  return {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: pages.length,
        getPage: (n: number) =>
          Promise.resolve({
            getTextContent: () =>
              Promise.resolve({
                items: (pages[n - 1] ?? []).map((r) => ({
                  str: r.str,
                  width: r.width ?? r.str.length * 6,
                  transform: [1, 0, 0, 1, r.x, r.y],
                })),
              }),
          }),
      }),
    }),
  }
}

/** jsdom's Blob has no arrayBuffer(); the bytes are all this needs. */
const blob = () => ({ arrayBuffer: async () => new ArrayBuffer(8) })
const read = (pages: Run[][]) => pdfText(blob(), { load: async () => fakePdf(pages) })

describe('a PDF that has text', () => {
  it('puts runs that share a line back on one line, top down', async () => {
    const out = await read([[
      { str: 'segunda', x: 0, y: 100 },
      { str: 'primeira', x: 0, y: 200 },
    ]])
    expect(out.split('\n')).toEqual(['primeira', 'segunda'])
  })

  it('treats a couple of units of drift as the same line', async () => {
    const out = await read([[
      { str: 'a', x: 0, y: 200 },
      { str: 'b', x: 60, y: 201 },
    ]])
    expect(out.split('\n')[0]).toContain('a')
    expect(out.split('\n')[0]).toContain('b')
  })

  it('places each run at the column its x implies — a chord stays over its syllable', async () => {
    const out = await read([[
      { str: 'G', x: 0, y: 200 },
      { str: 'C', x: 48, y: 200 },
      { str: 'Uma letra', x: 0, y: 180 },
    ]])
    const [chords, lyric] = out.split('\n')
    expect(lyric).toBe('Uma letra')
    expect(chords?.indexOf('G')).toBe(0)
    // 48 / 6 per-glyph = column 8.
    expect(chords?.indexOf('C')).toBe(8)
  })

  it('what comes out is what the converter expects to be given', async () => {
    const out = await read([[
      { str: 'G', x: 0, y: 200 },
      { str: 'C', x: 48, y: 200 },
      { str: 'Uma letra qualquer', x: 0, y: 180 },
    ]])
    expect(detect(out)).toBe('plain')
    expect(fromPlain(out)).toBe('[G]Uma letr[C]a qualquer')
  })

  it('reads every page', async () => {
    const out = await read([
      [{ str: 'pagina um', x: 0, y: 100 }],
      [{ str: 'pagina dois', x: 0, y: 100 }],
    ])
    expect(out).toContain('pagina um')
    expect(out).toContain('pagina dois')
  })
})

describe('a PDF that has none', () => {
  it('says it is a scan instead of returning an empty chart', async () => {
    await expect(read([[]])).rejects.toBeInstanceOf(PdfHasNoText)
  })

  it('whitespace only is still no text', async () => {
    await expect(read([[{ str: '   ', x: 0, y: 10 }]])).rejects.toBeInstanceOf(PdfHasNoText)
  })
})
