const ONSONG_META = /^(Name|Title|Artist|Author|Key|Tempo|Time|Duration|Capo)\s*:\s*(.+)$/i
const CHORD_LINE = /^[\sA-G|#bmsuadimjn\/\d\(\)xX\.\-\+\*]+$/
const HAS_CHORD_TOKEN = /\b[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?)?\b/

export function looksLikeOnSong(source: string): boolean {
  const head = source.split(/\n\n/, 1)[0] ?? ''
  const hasOnSongMeta = head.split('\n').some((l) => ONSONG_META.test(l.trim()) && !l.trim().startsWith('{'))
  const hasChordProMeta = /\{(title|key|tempo)\s*:/i.test(source)
  if (hasOnSongMeta && !hasChordProMeta) return true
  return hasChordsOverLyrics(source) && !hasChordProMeta
}

function hasChordsOverLyrics(source: string): boolean {
  const lines = source.split('\n')
  for (let i = 0; i < lines.length - 1; i++) {
    const a = lines[i] ?? ''
    const b = lines[i + 1] ?? ''
    if (isChordOverLine(a) && isLyricLine(b)) return true
  }
  return false
}

function isChordOverLine(line: string): boolean {
  const t = line.trim()
  if (!t || t.startsWith('{') || t.includes('[')) return false
  if (!HAS_CHORD_TOKEN.test(t)) return false
  const letters = t.replace(/\s+/g, '')
  return CHORD_LINE.test(t) && /[A-G]/.test(letters) && !/[aeiouáéíóú]{3,}/i.test(t)
}

function isLyricLine(line: string): boolean {
  const t = line.trim()
  if (!t || t.startsWith('{') || t.endsWith(':')) return false
  return /[a-zà-ú]/i.test(t) && !isChordOverLine(line)
}

function mergeChordOver(chords: string, lyrics: string): string {
  const result: string[] = []
  let li = 0
  const re = /[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?)?/g
  let m: RegExpExecArray | null
  const tokens: Array<{ i: number; c: string }> = []
  while ((m = re.exec(chords))) tokens.push({ i: m.index, c: m[0] })
  for (const tok of tokens) {
    if (tok.i > li) {
      result.push(lyrics.slice(li, tok.i))
      li = tok.i
    }
    result.push(`[${tok.c}]`)
  }
  result.push(lyrics.slice(li))
  return result.join('')
}

export function normalizeOnSong(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  let seenBlank = false
  while (i < lines.length) {
    const raw = lines[i] ?? ''
    const t = raw.trim()
    const meta = t.match(ONSONG_META)
    if (meta && !seenBlank) {
      const k = meta[1]!.toLowerCase()
      const v = meta[2]!.trim()
      const map: Record<string, string> = {
        name: 'title',
        title: 'title',
        artist: 'artist',
        author: 'artist',
        key: 'key',
        tempo: 'tempo',
        time: 'time',
        duration: 'duration',
        capo: 'capo',
      }
      out.push(`{${map[k] ?? k}: ${v}}`)
      i++
      continue
    }
    if (!t) {
      seenBlank = true
      out.push('')
      i++
      continue
    }
    seenBlank = true
    const next = lines[i + 1]
    if (next !== undefined && isChordOverLine(raw) && isLyricLine(next)) {
      out.push(mergeChordOver(raw, next))
      i += 2
      continue
    }
    if (/^(verse|chorus|bridge|intro|tag|instrumental)\s*\d*\s*:?\s*$/i.test(t)) {
      const label = t.replace(/:$/, '')
      out.push(`{c: (${label.toUpperCase()})}`)
      i++
      continue
    }
    out.push(raw)
    i++
  }
  return out.join('\n')
}
