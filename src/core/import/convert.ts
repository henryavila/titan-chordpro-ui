import { metaFromStrumSet } from '../strum-multi'
import {
  fromCifraClubHtml,
  looksLikeCifraClubHtml,
  stripLyricDots,
} from './cifraclub'
import { detectKeyRewrite, type KeyRewriteOffer } from './key-rewrite'
import { readMeta, writeMeta, type ChartMeta } from './meta'
import { clean, fromOnSong, fromPlain, isChordLine } from './plain'

export type ImportFormat = 'vazio' | 'chordpro' | 'onsong' | 'plain' | 'cifraclub'

export function detect(text: string): ImportFormat {
  const t = clean(text)
  if (!t.trim()) return 'vazio'
  if (looksLikeCifraClubHtml(t)) return 'cifraclub'
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
  cifraclub: 'Cifra Club',
}

export type ImportResult = {
  source: string
  format: ImportFormat
  label: string
  /** False when it was already ChordPro and nothing had to be rewritten. */
  changed: boolean
  /** Fake-capo pattern: wait for the musician before calling `rewriteToKey`. */
  keyRewrite?: KeyRewriteOffer
}

export function convert(text: string): ImportResult {
  const fmt = detect(text)
  if (fmt === 'vazio') return { source: '', format: fmt, label: '', changed: false }
  if (fmt === 'cifraclub') {
    const page = fromCifraClubHtml(text)
    if (!page.body.trim()) return { source: '', format: 'vazio', label: '', changed: false }
    const converted = stripLyricDots(fromPlain(page.body))
    const capoN = Math.max(0, Math.min(9, Number(page.capo) || 0))
    const strumMeta = page.strums.length
      ? metaFromStrumSet({ activeIndex: 0, patterns: page.strums })
      : {}
    const meta: ChartMeta = {
      ...readMeta(converted),
      ...(page.title ? { title: page.title } : {}),
      ...(page.subtitle ? { subtitle: page.subtitle } : {}),
      ...(page.key ? { key: page.key } : {}),
      ...(page.tempo ? { tempo: page.tempo } : {}),
      ...(page.time ? { time: page.time } : {}),
      ...(capoN > 0 ? { capo: String(capoN) } : {}),
      ...(page.youtubeId ? { x_titan_youtube: page.youtubeId } : {}),
      ...strumMeta,
    }
    const source = writeMeta(converted, meta)
    const keyRewrite = detectKeyRewrite(source)
    return {
      source,
      format: fmt,
      label: FORMAT_LABEL[fmt] ?? fmt,
      changed: true,
      ...(keyRewrite ? { keyRewrite } : {}),
    }
  }
  const source =
    fmt === 'chordpro' ? clean(text).trim() : fmt === 'onsong' ? fromOnSong(text) : fromPlain(text)
  const keyRewrite = detectKeyRewrite(source)
  return {
    source,
    format: fmt,
    label: FORMAT_LABEL[fmt] ?? fmt,
    changed: fmt !== 'chordpro',
    ...(keyRewrite ? { keyRewrite } : {}),
  }
}
