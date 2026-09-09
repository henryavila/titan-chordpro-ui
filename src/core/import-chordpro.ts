/**
 * Bringing a chart in: recognise what was pasted or opened, and give back
 * ChordPro. Three origins — a URL, a file, text — all land here; the UI only
 * shows the result.
 *
 * This is the **explicit** path, the one a person starts and sees the outcome
 * of ("converted from OnSong", "already ChordPro"). It is not the same job as
 * `onsong.ts`, which normalises silently inside `parse()` for a host that hands
 * over OnSong as its `source`. That one has to stay conservative because it
 * runs on everything; this one may do more — chorus directives, tabs, section
 * names in Portuguese. `tests/core/import-chordpro.test.ts` pins the two
 * together on the case they share, so they cannot drift apart unnoticed.
 */

const CHORD =
  /^\(?[A-H](?:#|b)?(?:m|min|maj|M|dim|aug|sus|add|º|°|\+)?(?:\d{1,2})?(?:(?:sus|add|maj|min|dim|aug|no)\d{0,2}|[#b+-]\d{1,2}|\/[A-H](?:#|b)?)*\)?$/
const SECTION =
  /^\s*(intro|introdu(?:ç|c)(?:ã|a)o|verso?|vers[eo]\s*\d*|estrofe\s*\d*|refr(?:ã|a)o|chorus|pr[eé][- ]?chorus|pr[eé][- ]?refr(?:ã|a)o|ponte|bridge|solo|instrumental|interl[uú]dio|final|ending|outro|tag|coda|parte\s*\d*|primeira parte|segunda parte|terceira parte|dedilhado|riff)\s*\d*\s*[:\]]?\s*$/i
const CHORUS = /^(refr(?:ã|a)o|chorus)/i

const isChord = (t: string) => CHORD.test(t) && /[A-H]/.test(t[0] ?? '')

/** A line that is only chord names — an intro, a passing bar, a turnaround. */
export function isChordLine(line: string): boolean {
  const t = line.trim()
  if (!t || t.length > 90) return false
  const toks = t.split(/\s+/)
  if (toks.length > 14) return false
  return toks.every(isChord)
}

const isTabLine = (l: string) =>
  /\|/.test(l) && (l.match(/-/g) || []).length >= 5 && !/[a-z]{4}/i.test(l.replace(/^[eEADGBb]/, ''))

const clean = (s: string) =>
  String(s ?? '')
    .replace(/\r/g, '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+$/gm, '')

/**
 * Chords above the lyric become brackets on the right syllable. The column
 * decides: a chord goes in at the index it was written at, and never before
 * the one that came before it.
 */
function merge(chordLine: string, lyric: string): string {
  const marks: Array<{ name: string; col: number }> = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(chordLine))) marks.push({ name: m[0], col: m.index })
  if (!marks.length) return lyric
  let out = ''
  let cur = 0
  for (const c of marks) {
    const col = Math.max(cur, Math.min(c.col, lyric.length))
    out += lyric.slice(cur, col) + '[' + c.name.replace(/^\(|\)$/g, '') + ']'
    cur = col
  }
  return out + lyric.slice(cur)
}

const chordsOnly = (l: string) =>
  l
    .trim()
    .split(/\s+/)
    .map((c) => '[' + c.replace(/^\(|\)$/g, '') + ']')
    .join(' ')

function sectionDirective(label: string, open: boolean): string {
  const name = label.replace(/[:\]]\s*$/, '').replace(/^\[/, '').trim()
  return CHORUS.test(name) ? (open ? '{soc}' : '{eoc}') : '{c:' + name + '}'
}

/** Plain body → ChordPro. An intro tab stays a tab: `{sot}`…`{eot}`. */
export function fromPlain(text: string): string {
  const src = clean(text).split('\n')
  const out: string[] = []
  let chorus = false
  let tab: string[] | null = null
  const closeChorus = () => {
    if (chorus) {
      out.push('{eoc}')
      chorus = false
    }
  }
  for (let i = 0; i < src.length; i++) {
    const raw = src[i] ?? ''
    if (isTabLine(raw)) {
      ;(tab = tab || []).push(raw.replace(/\s+$/, ''))
      continue
    }
    if (tab) {
      out.push('{sot}', ...tab, '{eot}')
      tab = null
    }
    const bare = raw.trim()
    if (!bare) {
      out.push('')
      continue
    }
    const asSection = bare.replace(/^\[(.+)\]$/, '$1')
    if (SECTION.test(asSection) && !isChordLine(bare)) {
      closeChorus()
      const d = sectionDirective(asSection, true)
      if (d === '{soc}') {
        chorus = true
        out.push('{soc}')
      } else out.push(d)
      continue
    }
    if (isChordLine(raw)) {
      const next = src[i + 1]
      if (next && next.trim() && !isChordLine(next) && !isTabLine(next) && !SECTION.test(next.trim())) {
        out.push(merge(raw, next))
        i++
      } else out.push(chordsOnly(raw))
      continue
    }
    out.push(bare)
  }
  if (tab) out.push('{sot}', ...tab, '{eot}')
  closeChorus()
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

const ONSONG_KEYS: Record<string, string> = {
  title: 'title', t: 'title', subtitle: 'subtitle', artist: 'subtitle', author: 'subtitle',
  key: 'key', tempo: 'tempo', bpm: 'tempo', time: 'time', capo: 'capo', duration: 'duration',
}

/**
 * OnSong: `Key: value` header, sections ending in a colon, a body already in
 * brackets — or chords above the lyric, which falls through to `fromPlain`.
 */
export function fromOnSong(text: string): string {
  const src = clean(text).split('\n')
  const head: string[] = []
  const body: string[] = []
  let inHead = true
  let firstSeen = false
  for (const raw of src) {
    const bare = raw.trim()
    if (inHead) {
      if (!bare) {
        if (firstSeen) inHead = false
        continue
      }
      const kv = bare.match(/^([A-Za-zÀ-ú]+)\s*:\s*(.+)$/)
      const key = kv && ONSONG_KEYS[(kv[1] ?? '').toLowerCase()]
      if (key) {
        head.push('{' + key + ':' + (kv?.[2] ?? '').trim() + '}')
        firstSeen = true
        continue
      }
      if (!firstSeen && !kv && !SECTION.test(bare)) {
        head.push('{title:' + bare + '}')
        firstSeen = true
        continue
      }
      // A metadata line we do not carry over.
      if (kv && !key && !SECTION.test(bare)) {
        firstSeen = true
        continue
      }
      inHead = false
    }
    body.push(raw)
  }
  const hasBrackets = /\[[^\]]+\]/.test(body.join('\n'))
  const converted = hasBrackets ? bodyWithSections(body) : fromPlain(body.join('\n'))
  return [head.join('\n'), converted].filter(Boolean).join('\n\n')
}

function bodyWithSections(lines: string[]): string {
  const out: string[] = []
  let chorus = false
  const closeChorus = () => {
    if (chorus) {
      out.push('{eoc}')
      chorus = false
    }
  }
  for (const raw of lines) {
    const bare = raw.trim()
    if (!bare) {
      out.push('')
      continue
    }
    const asSection = bare.replace(/^\[(.+)\]$/, '$1')
    if (SECTION.test(asSection)) {
      closeChorus()
      const d = sectionDirective(asSection, true)
      if (d === '{soc}') {
        chorus = true
        out.push('{soc}')
      } else out.push(d)
      continue
    }
    out.push(raw.replace(/\s+$/, ''))
  }
  closeChorus()
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export type ImportFormat = 'vazio' | 'chordpro' | 'onsong' | 'plain'

export function detect(text: string): ImportFormat {
  const t = clean(text)
  if (!t.trim()) return 'vazio'
  if (/\{\s*(title|t|subtitle|st|artist|key|soc|start_of_chorus|c|comment|sot|start_of_tab)\s*:?/i.test(t))
    return 'chordpro'
  if (/^\s*(title|artist|key|tempo|time|flow|ccli|capo)\s*:/im.test(t)) return 'onsong'
  const lines = t.split('\n').filter((l) => l.trim())
  const above = lines.filter(isChordLine).length
  if (/\[[^\]]{1,12}\]/.test(t) && above / Math.max(1, lines.length) < 0.15) return 'chordpro'
  return 'plain'
}

const FORMAT_LABEL: Record<string, string> = {
  chordpro: 'ChordPro',
  onsong: 'OnSong',
  plain: 'acordes sobre a letra',
}

export type ImportResult = {
  source: string
  format: ImportFormat
  label: string
  /** False when it was already ChordPro and nothing had to be rewritten. */
  changed: boolean
}

export function convert(text: string): ImportResult {
  const fmt = detect(text)
  if (fmt === 'vazio') return { source: '', format: fmt, label: '', changed: false }
  const source =
    fmt === 'chordpro' ? clean(text).trim() : fmt === 'onsong' ? fromOnSong(text) : fromPlain(text)
  return { source, format: fmt, label: FORMAT_LABEL[fmt] ?? fmt, changed: fmt !== 'chordpro' }
}

// ----------------------------------------------------------------- metadata

export const META_KEYS = ['title', 'subtitle', 'key', 'tempo', 'time', 'x_origem'] as const
export type MetaKey = (typeof META_KEYS)[number]
export type ChartMeta = Partial<Record<MetaKey | 'capo', string>>

export function readMeta(source: string): ChartMeta {
  const meta: ChartMeta = {}
  String(source ?? '')
    .split('\n')
    .forEach((l) => {
      const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:\s*([^}]*)\}\s*$/)
      if (!d) return
      const k = (d[1] ?? '').toLowerCase()
      const v = (d[2] ?? '').trim()
      if (k === 't') meta.title = v
      else if (k === 'st') meta.subtitle = v
      else if ((META_KEYS as readonly string[]).includes(k) || k === 'capo') meta[k as MetaKey] = v
    })
  return meta
}

/**
 * Rewrites the header: the known keys leave the body and come back on top, in
 * the canonical order. No two `{key:}` lines competing.
 */
export function writeMeta(source: string, meta: ChartMeta): string {
  const body = String(source ?? '')
    .split('\n')
    .filter((l) => {
      const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:\s*[^}]*\}\s*$/)
      if (!d) return true
      const k = (d[1] ?? '').toLowerCase()
      return !((META_KEYS as readonly string[]).includes(k) || k === 't' || k === 'st')
    })
  const head = META_KEYS.filter((k) => (meta[k] ?? '').trim()).map(
    (k) => '{' + k + ':' + (meta[k] ?? '').trim() + '}',
  )
  return [head.join('\n'), body.join('\n').replace(/^\n+/, '')].filter(Boolean).join('\n')
}

export const MISSING_LABEL: Record<string, string> = {
  title: 'título',
  subtitle: 'artista',
  key: 'tom',
  tempo: 'andamento',
  time: 'compasso',
}

/** What a chart still needs before it can stand for everyone. */
export function missingOf(meta: ChartMeta): string[] {
  return ['title', 'key', 'tempo', 'time'].filter((k) => !String(meta[k as MetaKey] ?? '').trim())
}

// ------------------------------------------------------------------ origins

export function titleFromUrl(url: string): { title: string; subtitle: string } {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    const slug = parts[parts.length - 1] || ''
    const artist = parts.length > 1 ? (parts[parts.length - 2] ?? '') : ''
    const nice = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return { title: nice(slug), subtitle: nice(artist) }
  } catch {
    return { title: '', subtitle: '' }
  }
}

export const SUPPORTED_HOSTS = ['cifraclub.com.br', 'www.cifraclub.com.br']

export function hostOk(url: string): boolean {
  try {
    return SUPPORTED_HOSTS.includes(new URL(url).hostname)
  } catch {
    return false
  }
}

/**
 * ChordPro → chords above the lyric. Serves the URL fetch: the page a site
 * returns is plain text, so it goes through the real converter, not a shortcut.
 */
export function toPlain(source: string): string {
  const out: string[] = []
  String(source ?? '')
    .split('\n')
    .forEach((l) => {
      const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/)
      if (d) {
        const k = (d[1] ?? '').toLowerCase()
        const v = (d[2] ?? '').trim()
        if (k === 'soc' || k === 'start_of_chorus') out.push('[Refrão]')
        else if (k === 'c' || k === 'comment') out.push('[' + v.replace(/^\(|\)$/g, '') + ']')
        else if (k === 'sot' || k === 'start_of_tab' || k === 'eot' || k === 'end_of_tab') return
        else if (k === 'eoc' || k === 'end_of_chorus') out.push('')
        return
      }
      if (/^#/.test(l)) return
      if (!/\[/.test(l)) {
        out.push(l)
        return
      }
      let lyric = ''
      let chords = ''
      const re = /\[([^\]]*)\]/g
      let last = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(l))) {
        lyric += l.slice(last, m.index)
        while (chords.length < lyric.length) chords += ' '
        if (chords.length > lyric.length) lyric += ' '.repeat(chords.length - lyric.length)
        chords += (m[1] ?? '') + ' '
        last = re.lastIndex
      }
      lyric += l.slice(last)
      if (chords.trim()) out.push(chords.replace(/\s+$/, ''))
      if (lyric.trim()) out.push(lyric.replace(/\s+$/, ''))
    })
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
