/**
 * Text out of a PDF that has text — a scan has none, and says so.
 *
 * PDF text comes as loose runs with coordinates, not as lines: a chart read
 * naively turns into chords and lyrics interleaved at random. So runs are
 * regrouped by `y` into lines, and each run is placed at the column its `x`
 * implies — which is what keeps a chord above the syllable it was over.
 */

/** The slice of pdf.js this needs. Kept structural: the dep stays optional. */
export type PdfjsLike = {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument: (opts: { data: ArrayBuffer }) => {
    promise: Promise<{
      numPages: number
      getPage: (n: number) => Promise<{
        getTextContent: () => Promise<{
          items: Array<{ str?: string; width?: number; transform?: number[] }>
        }>
      }>
    }>
  }
}

export type PdfTextOptions = {
  /**
   * Where pdf.js comes from. The default asks for the `pdfjs-dist` the host
   * installed — it is an optional peer, so a host that never opens a PDF does
   * not carry it. Injectable so a host can point at its own copy, or a test at
   * a fake.
   */
  load?: () => Promise<PdfjsLike>
  /** Only needed with the default loader. */
  workerSrc?: string
}

const DEFAULT_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs'

async function defaultLoad(): Promise<PdfjsLike> {
  // The specifier goes through a variable so bundlers and `tsc` leave it alone:
  // the dependency is optional and may simply not be there.
  const id = 'pdfjs-dist'
  return (await import(/* @vite-ignore */ id)) as unknown as PdfjsLike
}

/** Thrown when the PDF carries no text at all — almost always a scan. */
export class PdfHasNoText extends Error {
  constructor() {
    super('sem-texto')
    this.name = 'PdfHasNoText'
  }
}

/** Anything that can hand over its bytes: a `File`, a `Blob`, a host's own box. */
export type PdfSource = { arrayBuffer(): Promise<ArrayBuffer> }

export async function pdfText(blob: PdfSource, opts: PdfTextOptions = {}): Promise<string> {
  const pdfjs = await (opts.load ?? defaultLoad)()
  if (!opts.load) pdfjs.GlobalWorkerOptions.workerSrc = opts.workerSrc ?? DEFAULT_WORKER
  const buf = await blob.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf }).promise
  const lines: string[] = []

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const tc = await page.getTextContent()

    // Same y (within a couple of units) is the same line; x becomes a column.
    const rows = new Map<number, Array<{ x: number; s: string }>>()
    for (const it of tc.items) {
      if (!it.str) continue
      const y = Math.round(it.transform?.[5] ?? 0)
      const x = it.transform?.[4] ?? 0
      const near = [...rows.keys()].find((k) => Math.abs(k - y) <= 2)
      const key = near ?? y
      const row = rows.get(key) ?? []
      row.push({ x, s: it.str })
      rows.set(key, row)
    }

    // The median glyph width is the column unit: it survives a font change
    // better than any fixed number would.
    const widths = tc.items
      .map((it) => (it.width ?? 0) / Math.max(1, (it.str ?? '').length))
      .filter((w) => w > 0)
      .sort((a, b) => a - b)
    const unit = widths.length ? (widths[Math.floor(widths.length / 2)] as number) : 6

    for (const y of [...rows.keys()].sort((a, b) => b - a)) {
      const parts = (rows.get(y) ?? []).sort((a, b) => a.x - b.x)
      let line = ''
      for (const part of parts) {
        const col = Math.round(part.x / unit)
        if (col > line.length) line += ' '.repeat(col - line.length)
        line += part.s
      }
      lines.push(line.replace(/\s+$/, ''))
    }
    lines.push('')
  }

  const text = lines.join('\n').trim()
  if (!text) throw new PdfHasNoText()
  return text
}
