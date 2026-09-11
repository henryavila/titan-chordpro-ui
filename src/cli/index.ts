import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname } from 'node:path'
import { parse, renderHtml, resolveTheme, transpose } from '../core/index'
import { buildChoFilename, buildPdfFilename, buildSljaFilename } from '../core/filenames'
import { semitoneDelta } from '../core/transpose'

function usage(): never {
  console.error(`titan-chordpro-ui <html|pdf|slides|parse> <file> [--theme light|dark|print|default] [--key A] [--accent verde|teal|#hex] [-o out]`)
  process.exit(1)
}

function arg(args: string[], name: string): string | undefined {
  const i = args.indexOf(name)
  if (i === -1) return undefined
  return args[i + 1]
}

async function main() {
  const argv = process.argv.slice(2)
  const cmd = argv[0]
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
