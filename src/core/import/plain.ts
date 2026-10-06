import { DIR } from '../define'
import { isChord, isChordLine, isTabLine, unwrapChord } from './chord-line'
import { stripPlainCifraClubTabs } from './cifraclub-tabs'

export { isChord, isChordLine, isTabLine }

export const SECTION =
  /^\s*(intro|introdu(?:ç|c)(?:ã|a)o|verso?|vers[eo]\s*\d*|estrofe\s*\d*|refr(?:ã|a)o|chorus|pr[eé][- ]?chorus|pr[eé][- ]?refr(?:ã|a)o|ponte|bridge|solo|instrumental|interl[uú]dio|final|ending|outro|tag|coda|parte\s*\d*|primeira parte|segunda parte|terceira parte|dedilhado|riff)\s*\d*\s*[:\]]?\s*$/i
const CHORUS = /^(refr(?:ã|a)o|chorus)/i
/** Cifra Club (and plain paste) say Intro; Titan charts say INTRODUÇÃO. */
const INTRO_LABEL = /^(intro|introdu(?:ç|c)(?:ã|a)o)\s*$/i

export const clean = (s: string) =>
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
    out += lyric.slice(cur, col) + '[' + unwrapChord(c.name) + ']'
    cur = col
  }
  return out + lyric.slice(cur)
}

const chordsOnly = (l: string) =>
  l
    .trim()
    .split(/\s+/)
    .map((c) => '[' + unwrapChord(c) + ']')
    .join(' ')

function sectionName(label: string): string {
  const name = label.replace(/[:\]]\s*$/, '').replace(/^\[/, '').trim()
  return INTRO_LABEL.test(name) ? 'INTRODUÇÃO' : name
}

function sectionDirective(label: string, open: boolean): string {
  const name = sectionName(label)
  return CHORUS.test(name) ? (open ? '{soc}' : '{eoc}') : '{c:' + name + '}'
}

/** Plain body → ChordPro. A bare staff stays a tab: `{sot}`…`{eot}`. */
export function fromPlain(text: string): string {
  const src = stripPlainCifraClubTabs(clean(text)).split('\n')
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
      // A blank ends the refrain: Cifra Club (and plain cifras) mark the next
      // verse that way, with no [Verso] tag. Leaving {soc} open painted every
      // following line as its own chorus box in the editor.
      closeChorus()
      out.push('')
      continue
    }
    const tagged = bare.match(/^\[([^\]]+)\]\s*(.*)$/)
    if (tagged && !isChord(tagged[1] ?? '')) {
      closeChorus()
      const d = sectionDirective(tagged[1] ?? '', true)
      if (d === '{soc}') {
        chorus = true
        out.push('{soc}')
      } else out.push(d)
      const rest = (tagged[2] ?? '').trim()
      if (rest) {
        if (isChordLine(rest)) out.push(chordsOnly(rest))
        else out.push(rest)
      }
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
      closeChorus()
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

/**
 * ChordPro → chords above the lyric. Serves the URL fetch: the page a site
 * returns is plain text, so it goes through the real converter, not a shortcut.
 */
export function toPlain(source: string): string {
  const out: string[] = []
  String(source ?? '')
    .split('\n')
    .forEach((l) => {
      const d = l.match(DIR)
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
