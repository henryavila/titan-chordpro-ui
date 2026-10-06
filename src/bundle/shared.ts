import type { ExportedFile } from '../core/exported-file'
import { parse } from '../core/parse'
import { readScoreReference } from '../core/score-reference'

export type ChartAssetKind = 'score' | 'image' | 'audio'
export type ChartAssetData = { bytes: Uint8Array; contentType?: string }
export type BundleExtra = {
  role: 'audio-cover' | 'slide-cover' | 'slide-background'
  reference?: string
  data?: ChartAssetData
  width?: number
  height?: number
}
export type ChartBundleOptions = {
  /** Host can read private storage. The archive never stores these resolved URLs. */
  loadAsset?: (reference: string, kind: ChartAssetKind) => Promise<ChartAssetData>
  extras?: BundleExtra[]
  /** Service links cannot be embedded as files. Default: fail rather than omit. */
  onlineReferences?: 'error' | 'provenance'
  personal?: boolean
  title?: string
  key?: string | null
}
export type ChartBundle = ExportedFile & { chart: string; assetCount: number }

export const MEDIA: Record<string, { kind: ChartAssetKind; role: string }> = {
  x_titan_audio_sung: { kind: 'audio', role: 'sung' },
  x_titan_audio_playback: { kind: 'audio', role: 'playback' },
  x_titan_audio_art: { kind: 'image', role: 'audio-cover' },
}

export const MIME_EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/ogg': 'ogg',
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/flac': 'flac', 'audio/aac': 'aac', 'audio/webm': 'webm',
  'application/vnd.recordare.musicxml+xml': 'musicxml', 'application/vnd.recordare.musicxml': 'mxl',
  'application/xml': 'xml', 'text/xml': 'xml',
}

const EXT_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_EXT).map(([mime, ext]) => [ext, mime]),
)

export const EXTENSIONS: Record<ChartAssetKind, string[]> = {
  score: ['gp', 'gp3', 'gp4', 'gp5', 'gpx', 'xml', 'musicxml', 'mxl'],
  image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'],
  audio: ['mp3', 'm4a', 'mp4', 'ogg', 'opus', 'wav', 'flac', 'aac', 'webm'],
}

export const PERSONAL_MARK = '# versão pessoal — não é a cifra oficial da equipe'
export const ORIGEM_SOURCE_COMMENT = '# Origem registrada em ORIGEM.txt.'
export const ORIGEM_YOUTUBE_COMMENT = '# Vídeo online registrado apenas em ORIGEM.txt; não faz parte dos recursos offline.'
export const ORIGEM_ONLINE_AUDIO_COMMENT = '# Referência online registrada apenas em ORIGEM.txt.'

export type ChartMediaHit =
  | { index: number; kind: 'score'; role: 'notation'; ref: string }
  | { index: number; kind: 'image'; role: 'chart-image'; ref: string }
  | { index: number; kind: ChartAssetKind; role: string; key: string; ref: string }

export function extension(reference: string, kind: ChartAssetKind, file: ChartAssetData): string {
  const path = reference.split(/[?#]/)[0] ?? ''
  const ext = path.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase()
  if (ext && EXTENSIONS[kind].includes(ext)) return ext
  const mime = MIME_EXT[file.contentType?.split(';')[0]?.trim().toLowerCase() ?? '']
  if (mime && EXTENSIONS[kind].includes(mime)) return mime
  const signature = new TextDecoder('latin1').decode(file.bytes.subarray(0, 16))
  if (kind === 'image') {
    if (file.bytes[0] === 137 && signature.includes('PNG')) return 'png'
    if (file.bytes[0] === 255 && file.bytes[1] === 216) return 'jpg'
    if (signature.startsWith('GIF8')) return 'gif'
    if (signature.includes('WEBP')) return 'webp'
  }
  if (kind === 'audio') {
    if (signature.startsWith('ID3') || (file.bytes[0] === 255 && (file.bytes[1]! & 224) === 224)) return 'mp3'
    if (signature.startsWith('OggS')) return 'ogg'
    if (signature.includes('WAVE')) return 'wav'
    if (signature.startsWith('fLaC')) return 'flac'
    if (signature.slice(4, 8) === 'ftyp') return 'm4a'
  }
  return 'bin'
}

export function contentTypeFor(path: string, kind: ChartAssetKind): string {
  const ext = path.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'svg') return 'image/svg+xml'
  if (ext === 'mp3') return 'audio/mpeg'
  if (ext === 'm4a' || ext === 'mp4') return 'audio/mp4'
  if (ext === 'musicxml') return 'application/vnd.recordare.musicxml+xml'
  if (ext === 'mxl') return 'application/vnd.recordare.musicxml'
  if (ext && EXT_MIME[ext]) return EXT_MIME[ext]
  if (kind === 'audio') return 'application/octet-stream'
  if (kind === 'image') return 'application/octet-stream'
  return 'application/octet-stream'
}

export function isOnlineService(ref: string): boolean {
  try {
    const host = new URL(ref).hostname.toLowerCase()
    return ['youtu.be', 'youtube.com', 'spotify.com', 'music.apple.com', 'deezer.com', 'vimeo.com']
      .some(domain => host === domain || host.endsWith(`.${domain}`))
  } catch { return false }
}

function isJsonPayload(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.byteLength, 512))).trim()
  if (!/^[\{\[]/.test(head)) return false
  if (!/"[^"]*"\s*:/.test(head) && !/^\[/.test(head)) return false
  try {
    JSON.parse(new TextDecoder().decode(bytes))
    return true
  } catch {
    return /"[^"]*"\s*:/.test(head)
  }
}

export function validateFile(file: ChartAssetData, kind: ChartAssetKind, ref: string, mode: 'export' | 'import' = 'export') {
  const fail = mode === 'import' ? 'A cifra não foi importada.' : 'O pacote não foi gerado.'
  if (!file.bytes?.byteLength) throw new Error(`Um dos anexos está vazio. ${fail}`)
  const head = new TextDecoder().decode(file.bytes.subarray(0, 512)).trim()
  if (
    /(?:text\/html|application\/json)/i.test(file.contentType ?? '')
    || /^<!doctype html|^<html/i.test(head)
    || isJsonPayload(file.bytes)
  )
    throw new Error(`Um anexo retornou uma página em vez do arquivo. ${fail}`)
  if (kind === 'audio' && (/\.(m3u8?|mpd)(?:[?#]|$)/i.test(ref) || /^#EXTM3U|<MPD\b/i.test(head) || /mpegurl|dash\+xml/i.test(file.contentType ?? '')))
    throw new Error(mode === 'import'
      ? 'Um áudio do pacote é uma transmissão em partes. A cifra não foi importada.'
      : 'Um áudio é uma transmissão em partes. O app precisa fornecer o arquivo completo para uso offline.')
  if (kind === 'image' && /<svg\b/i.test(head)) {
    const svg = new TextDecoder().decode(file.bytes)
    const refs = [
      ...[...svg.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)].map(m => m[2]!.trim()),
      ...[...svg.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)].map(m => m[2]!.trim()),
    ]
    if (/@import/i.test(svg) || refs.some(value => value && !value.startsWith('#') && !/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(value)))
      throw new Error(mode === 'import'
        ? 'Uma imagem SVG do pacote depende de arquivos externos. A cifra não foi importada.'
        : 'Uma imagem SVG depende de arquivos externos. Envie uma imagem autocontida para o pacote offline.')
  }
}

export function isSafePath(path: string): boolean {
  if (!path || path.includes('\\') || path.includes('\0')) return false
  if (path.startsWith('/') || path.startsWith('./')) return false
  const parts = path.split('/')
  return parts.length > 0 && parts.every(part => part !== '' && part !== '.' && part !== '..')
}

export function basename(path: string): string {
  return path.split('/').pop() || path
}

/** Discover attachment refs in the chart, including lines hidden with `#~`. */
export function collectChartMedia(source: string): { lines: string[]; hits: ChartMediaHit[] } {
  const lines = source.split('\n')
  const view = parse(lines.map(line => line.replace(/^#~ ?/, '')).join('\n'))
  const hits: ChartMediaHit[] = []
  const protectedLines = new Set<number>()
  for (const section of view.sections) {
    for (const line of section.lines) {
      if (line.type === 'score' || line.type === 'tab')
        for (let i = line.li0; i <= line.li1; i++) protectedLines.add(i)
      if (line.type === 'score') {
        const reference = readScoreReference(line.text)
        if (!reference) continue
        hits.push({ index: line.li0, kind: 'score', role: 'notation', ref: reference.src })
      } else if (line.type === 'image') {
        protectedLines.add(line.li0)
        hits.push({ index: line.li0, kind: 'image', role: 'chart-image', ref: line.src })
      }
    }
  }
  for (let i = 0; i < lines.length; i++) {
    if (protectedLines.has(i)) continue
    const match = lines[i]!.match(/^(\s*(?:#~ ?)?\{\s*([\w]+)\s*:\s*)(.*?)(\s*\}\s*)$/)
    if (!match || !match[3]?.trim()) continue
    const key = match[2]!.toLowerCase()
    const ref = match[3].trim()
    const media = MEDIA[key]
    if (media) hits.push({ index: i, kind: media.kind, role: media.role, key, ref })
  }
  return { lines, hits }
}

export function rewriteMediaLine(line: string, hit: ChartMediaHit, next: string): string {
  if (hit.kind === 'score' && !('key' in hit)) {
    return line.replace(/\bsrc\s*=\s*"(?:[^"\\]|\\.)*"/, () => `src=${JSON.stringify(next)}`)
  }
  if (hit.kind === 'image' && hit.role === 'chart-image') {
    return line.replace(/(\{\s*(?:image|img)\s*:\s*)(.*?)(\s*\}\s*)$/i, (_full, prefix: string, _value: string, suffix: string) => `${prefix}${next}${suffix}`)
  }
  return line.replace(/^(\s*(?:#~ ?)?\{\s*[\w]+\s*:\s*)(.*?)(\s*\}\s*)$/, (_full, prefix: string, _value: string, suffix: string) => `${prefix}${next}${suffix}`)
}

export function assertHostRef(ref: string): string {
  const value = String(ref ?? '').trim()
  if (!value) throw new Error('O app devolveu uma referência vazia ao guardar um anexo. A cifra não foi importada.')
  if (/[\r\n{}]/.test(value)) throw new Error('A referência devolvida pelo app contém caracteres inválidos. A cifra não foi importada.')
  return value
}
