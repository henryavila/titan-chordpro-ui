import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname } from 'node:path'
import {
  applyCifraClubEnrich,
  hostOk,
  parse,
  proposeCifraClubEnrich,
  readMeta,
  renderHtml,
  resolveTheme,
  transpose,
} from '../core/index'
import { buildChoFilename, buildPdfFilename, buildSljaFilename } from '../core/filenames'
import { semitoneDelta } from '../core/transpose'

function usage(): never {
  console.error(`titan-chordpro-ui <html|pdf|slides|parse|enrich-cc> …

  html|pdf|slides|parse <file> [--theme …] [--key A] [--accent …] [-o out]
  enrich-cc --url <cifraclub-url> --in <file|-> [--out <file|->] [--youtube remote|skip]
    Fetch Cifra Club HTML, apply meta-only enrich (body untouched).`)
  process.exit(1)
}

function arg(args: string[], name: string): string | undefined {
  const i = args.indexOf(name)
  if (i === -1) return undefined
  return args[i + 1]
}

async function enrichCc(argv: string[]): Promise<void> {
  const url = arg(argv, '--url')?.trim() ?? ''
  const inPath = arg(argv, '--in') ?? '-'
  const outPath = arg(argv, '--out') ?? '-'
  const ytMode = (arg(argv, '--youtube') ?? 'remote').trim()
  if (!url || !hostOk(url)) {
    console.error('enrich-cc: --url must be a cifraclub.com.br address')
    process.exit(1)
  }
  if (ytMode !== 'remote' && ytMode !== 'skip') {
    console.error('enrich-cc: --youtube must be remote|skip')
    process.exit(1)
  }

  let source: string
  try {
    source = inPath === '-' ? await readStdin() : readFileSync(inPath, 'utf8')
  } catch {
    console.error(`Cannot read ${inPath}`)
    process.exit(1)
  }

  let html: string
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; titan-chordpro-ui-enrich)' },
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    html = await r.text()
  } catch (e) {
    console.error(`enrich-cc: fetch failed: ${e instanceof Error ? e.message : e}`)
    process.exit(2)
  }

  const proposal = proposeCifraClubEnrich(source, html, { url })
  const localYt = String(readMeta(source).x_youtube ?? '').trim()
  let youtubeId: string | null = null
  if (ytMode === 'remote' && proposal.youtube?.remoteId) {
    if (localYt && localYt !== proposal.youtube.remoteId) {
      console.error(
        `enrich-cc: youtube conflict — keeping local ${localYt} (CC ${proposal.youtube.remoteId})`,
      )
      youtubeId = localYt
    } else {
      youtubeId = proposal.youtube.remoteId
    }
  }
  const next = applyCifraClubEnrich(source, proposal, { youtubeId })
  const report = {
    url,
    strumMissing: proposal.strumMissing,
    capoWarning: proposal.capoWarning,
    patch: proposal.patch,
    youtubeId,
    conflicts: proposal.conflicts,
  }
  console.error(JSON.stringify(report))
  if (outPath === '-') process.stdout.write(next)
  else {
    const dir = dirname(outPath)
    if (dir && dir !== '.') mkdirSync(dir, { recursive: true })
    writeFileSync(outPath, next)
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    process.stdin.on('data', (c) => chunks.push(Buffer.from(c)))
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    process.stdin.on('error', reject)
  })
}

async function main() {
  const argv = process.argv.slice(2)
  const cmd = argv[0]
  if (cmd === 'enrich-cc') {
    await enrichCc(argv.slice(1))
    return
  }

  const file = argv[1]
  if (!cmd || !file || !['html', 'pdf', 'slides', 'parse'].includes(cmd)) usage()

  let source: string
  try {
    source = readFileSync(file, 'utf8')
  } catch {
    console.error(`Cannot read ${file}`)
    process.exit(1)
  }

  const ext = extname(file).toLowerCase()
  if (ext && !['.cho', '.chordpro', '.chopro', '.onsong', '.txt', '.pro', '.crd'].includes(ext)) {
    // still attempt parse (SPEC: unknown extension still attempts)
  }

  let view = parse(source)
  const keyOpt = arg(argv, '--key')
  if (keyOpt) {
    if (!view.meta.key) {
      view = { ...view, meta: { ...view.meta, key: keyOpt }, displayKey: keyOpt }
    } else {
      const delta = semitoneDelta(view.meta.key, keyOpt)
      view = transpose(view, delta)
    }
  }

  const out = arg(argv, '-o')
  const theme = arg(argv, '--theme') ?? 'default'

  try {
    if (cmd === 'parse') {
      const json = JSON.stringify(view, null, 2)
      if (out) {
        const dir = dirname(out)
        if (dir && dir !== '.') mkdirSync(dir, { recursive: true })
        writeFileSync(out, json)
      } else process.stdout.write(json)
      return
    }
    if (cmd === 'html') {
      resolveTheme(theme === 'default' ? 'light' : theme)
      const html = `<!doctype html><meta charset="utf-8"><title>${view.meta.title ?? 'cifra'}</title>${renderHtml(view, { theme })}`
      const dest = out ?? buildChoFilename(view.meta.title ?? 'cifra', view.displayKey).replace(/\.cho$/, '.html')
      const dir = dirname(dest)
      if (dir && dir !== '.') mkdirSync(dir, { recursive: true })
      writeFileSync(dest, html)
      return
    }
    if (cmd === 'pdf') {
      const { renderPdf } = await import('../pdf/index')
      const accent = arg(argv, '--accent')
      const bytes = await renderPdf(view, accent ? { accent } : {})
      const dest = out ?? buildPdfFilename(view.meta.title ?? 'cifra', view.displayKey)
      const dir = dirname(dest)
      if (dir && dir !== '.') mkdirSync(dir, { recursive: true })
      writeFileSync(dest, bytes)
      return
    }
    if (cmd === 'slides') {
      const { renderSlja } = await import('../slides/index')
      const bytes = await renderSlja(view)
      const dest = out ?? buildSljaFilename(view.meta.title ?? 'cifra')
      const dir = dirname(dest)
      if (dir && dir !== '.') mkdirSync(dir, { recursive: true })
      writeFileSync(dest, bytes)
      return
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(2)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(2)
})
