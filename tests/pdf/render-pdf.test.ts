import { inflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse, transpose } from '../../src/core/index'
import { pdfText, type PdfjsLike } from '../../src/pdf/pdf-text'
import { renderPdf } from '../../src/pdf/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const workerSrc = pathToFileURL(join(root, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href

async function loadPdfjs(): Promise<PdfjsLike> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
  return pdfjs as unknown as PdfjsLike
}

async function readPdf(bytes: Uint8Array): Promise<string> {
  const copy = bytes.slice().buffer
  return pdfText({ arrayBuffer: async () => copy }, { load: loadPdfjs })
}

function pdfOps(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString('latin1')
  const out: string[] = []
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    try {
      out.push(inflateSync(Buffer.from(m[1] as string, 'latin1')).toString('latin1'))
    } catch {
      /* font streams and the like */
    }
  }
  return out.join('\n')
}

describe('renderPdf', () => {
  it('returns non-empty Uint8Array; header uses transposed key', async () => {
    const view = transpose(parse(loadFixture(JESUS_1)), 2)
    const bytes = await renderPdf(view)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
    const asText = await readPdf(bytes)
    expect(new TextDecoder('latin1').decode(bytes).slice(0, 5)).toBe('%PDF-')
    expect(asText).toMatch(/Tom A/)
  })

  it('keeps rehearsal comments, the clock marks, and the lyric', async () => {
    const bytes = await renderPdf(parse(loadFixture(JESUS_1)))
    const asText = await readPdf(bytes)
    expect(asText).toMatch(/INTRODUÇÃO/)
    expect(asText).toMatch(/x\/\//)
    expect(asText).toMatch(/minha vida/)
    expect(asText).toMatch(/EXECUÇÃO|BEM SUAVE/)
  })

  it('marks a personal version on the page', async () => {
    const bytes = await renderPdf(parse(loadFixture(JESUS_1)), { personal: true })
    expect(await readPdf(bytes)).toMatch(/versão pessoal/)
  })

  it('paints the host accent on paper — the light swatch, not the stage one', async () => {
    const view = parse(loadFixture(JESUS_1))
    const verde = await renderPdf(view)
    const teal = await renderPdf(view, { accent: 'teal' })
    const indigo = await renderPdf(view, { accent: '#4F46E5' })
    // jsPDF writes r/g/b as 0–1; verde light is #17713C, teal light is #0E6E7D.
    const rg = (r: number, g: number, b: number) => {
      const p = (n: number) => (n / 255).toFixed(2).replace('.', '\\.') + '\\d*'
      return new RegExp(`${p(r)}\\s+${p(g)}\\s+${p(b)}\\s+rg`)
    }
    expect(pdfOps(verde)).toMatch(rg(23, 113, 60))
    expect(pdfOps(teal)).toMatch(rg(14, 110, 125))
    expect(pdfOps(teal)).not.toMatch(rg(23, 113, 60))
    expect(pdfOps(indigo)).not.toEqual(pdfOps(verde))
  })
})
