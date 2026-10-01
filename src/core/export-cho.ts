import { buildChoFilename } from './filenames'
import { parse } from './parse'
import { EXPORT_MIME, textExportedFile, type ExportedFile } from './exported-file'

export type ExportChoOptions = {
  key?: string | null
  semitones?: number
  capo?: number
  title?: string
  /** Prepended to the downloaded text (personal-version mark). */
  preamble?: string
}

export function exportCho(
  source: string,
  opts?: ExportChoOptions,
): string {
  const n = opts?.semitones ?? 0
  const capo = opts?.capo ?? 0
  let out = source
  out = out.replace(/\{\s*transpose\s*:[^}]*\}[ \t]*\n?/gi, '')
  if (n) {
    const keyLine = out.match(/^\s*\{\s*key\s*:[^}]*\}[ \t]*\n?/im)
    if (keyLine && keyLine.index != null) {
      const at = keyLine.index + keyLine[0].length
      out = `${out.slice(0, at)}{transpose:${n}}\n${out.slice(at)}`
    } else {
      out = `{transpose:${n}}\n${out}`
    }
  }
  if (capo) {
    out = out.replace(/\{\s*capo\s*:[^}]*\}[ \t]*\n?/gi, '')
    out = `{capo: ${capo}}\n${out}`
  }
  return out
}

/** Host download without mounting the viewer. `exportCho` stays the source rewrite. */
export function exportChoFile(source: string, opts: ExportChoOptions = {}): ExportedFile {
  const text = `${opts.preamble ?? ''}${exportCho(source, opts)}`
  const view = parse(source)
  const title = (opts.title ?? view.meta.title ?? 'cifra').trim() || 'cifra'
  const key = opts.key !== undefined ? opts.key : view.displayKey ?? null
  return textExportedFile(text, buildChoFilename(title, key), title, EXPORT_MIME.cho)
}

/**
 * Write a meta directive into the source: replaces it in place when present,
 * drops the line when the value is cleared, and otherwise lands right after
 * the last meta directive — never at a random point of the chart.
 */
export function patchMeta(
  source: string,
  patch: {
    title?: string
    subtitle?: string
    artist?: string
    key?: string
    tempo?: string | number
    time?: string
    duration?: string
    capo?: string | number
    x_titan_source?: string
  },
): string {
  const lines = String(source ?? '').split('\n')
  const DIR = /^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/
  const ALIASES: Record<string, string[]> = {
    title: ['title', 't'],
    subtitle: ['subtitle', 'st'],
    artist: ['artist', 'composer'],
    key: ['key'],
    tempo: ['tempo'],
    time: ['time'],
    duration: ['duration'],
    capo: ['capo'],
    x_titan_source: ['x_titan_source'],
  }
  const META = new Set([
    'title',
    't',
    'subtitle',
    'st',
    'artist',
    'composer',
    'key',
    'tempo',
    'time',
    'duration',
    'capo',
    'x_titan_source',
  ])

  const indexOfMeta = (names: string[]) =>
    lines.findIndex((l) => {
      const m = l.match(DIR)
      return !!m && names.includes((m[1] ?? '').toLowerCase())
    })
  const lastMetaLine = () => {
    let at = -1
    for (let i = 0; i < lines.length; i++) {
      const m = (lines[i] ?? '').match(DIR)
      if (m && META.has((m[1] ?? '').toLowerCase())) at = i
    }
    return at
  }

  for (const [name, value] of Object.entries(patch)) {
    if (value === undefined) continue
    const names = ALIASES[name] ?? [name]
    const clean = String(value).trim()
    const at = indexOfMeta(names)
    if (at >= 0) {
      if (clean) lines[at] = `{${name}: ${clean}}`
      else lines.splice(at, 1)
      continue
    }
    if (!clean) continue
    lines.splice(lastMetaLine() + 1, 0, `{${name}: ${clean}}`)
  }
  return lines.join('\n')
}
