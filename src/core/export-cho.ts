import { transposeToken, usesFlats } from './transpose'

export function exportCho(
  source: string,
  opts?: { key?: string | null; semitones?: number; capo?: number },
): string {
  const n = opts?.semitones ?? 0
  const capo = opts?.capo ?? 0
  let out = source
  const keyMatch = source.match(/\{\s*key\s*:\s*([^}]*)\}/i)
  const sourceKey = keyMatch?.[1]?.trim() ?? opts?.key ?? null
  const flats = usesFlats(sourceKey)
  if (n) {
    out = out
      .replace(/\[([^\]]*)\]/g, (_, c: string) => `[${transposeToken(c, n, flats)}]`)
      .replace(/^(\s*\{\s*key\s*:\s*)([^}]*)\}/gim, (_, a: string, k: string) => {
        return `${a}${transposeToken(k.trim(), n, flats)}}`
      })
  }
  if (capo) {
    out = out.replace(/\{\s*capo\s*:[^}]*\}[ \t]*\n?/gi, '')
    out = `{capo: ${capo}}\n${out}`
  }
  return out
}

/**
 * Write a meta directive into the source: replaces it in place when present,
 * drops the line when the value is cleared, and otherwise lands right after
 * the last meta directive — never at a random point of the chart.
 */
export function patchMeta(
  source: string,
  patch: { title?: string; subtitle?: string; key?: string; tempo?: string | number },
): string {
  const lines = String(source ?? '').split('\n')
  const DIR = /^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/
  const ALIASES: Record<string, string[]> = {
    title: ['title', 't'],
    subtitle: ['subtitle', 'st'],
    key: ['key'],
    tempo: ['tempo'],
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
