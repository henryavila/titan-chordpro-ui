import { buildChoFilename } from '../core/filenames'
import { normalizeSource, parse } from '../core/parse'
import { readScoreReference } from '../core/score-reference'
import { zip, type ZipMember } from '../slides/zip'

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
export type ChartBundle = { bytes: Uint8Array; filename: string; chart: string; assetCount: number }

const MEDIA: Record<string, { kind: ChartAssetKind; role: string }> = {
  x_titan_audio_sung: { kind: 'audio', role: 'sung' },
  x_titan_audio_playback: { kind: 'audio', role: 'playback' },
  x_titan_audio_art: { kind: 'image', role: 'audio-cover' },
}
const MIME_EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/ogg': 'ogg',
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/flac': 'flac', 'audio/aac': 'aac', 'audio/webm': 'webm',
  'application/vnd.recordare.musicxml+xml': 'musicxml', 'application/vnd.recordare.musicxml': 'mxl',
  'application/xml': 'xml', 'text/xml': 'xml',
}
const EXTENSIONS: Record<ChartAssetKind, string[]> = {
  score: ['gp', 'gp3', 'gp4', 'gp5', 'gpx', 'xml', 'musicxml', 'mxl'],
  image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'],
  audio: ['mp3', 'm4a', 'mp4', 'ogg', 'opus', 'wav', 'flac', 'aac', 'webm'],
}
function extension(reference: string, kind: ChartAssetKind, file: ChartAssetData): string {
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
function isOnlineService(ref: string): boolean {
  try {
    const host = new URL(ref).hostname.toLowerCase()
    return ['youtu.be', 'youtube.com', 'spotify.com', 'music.apple.com', 'deezer.com', 'vimeo.com']
      .some(domain => host === domain || host.endsWith(`.${domain}`))
  } catch { return false }
}
function validateFile(file: ChartAssetData, kind: ChartAssetKind, ref: string) {
  if (!file.bytes?.byteLength) throw new Error('Um dos anexos está vazio. O pacote não foi gerado.')
  const head = new TextDecoder().decode(file.bytes.subarray(0, 512)).trim()
  if (/(?:text\/html|application\/json)/i.test(file.contentType ?? '') || /^<!doctype html|^<html/i.test(head))
    throw new Error('Um anexo retornou uma página em vez do arquivo. O pacote não foi gerado.')
  if (kind === 'audio' && (/\.(m3u8?|mpd)(?:[?#]|$)/i.test(ref) || /^#EXTM3U|<MPD\b/i.test(head) || /mpegurl|dash\+xml/i.test(file.contentType ?? '')))
    throw new Error('Um áudio é uma transmissão em partes. O app precisa fornecer o arquivo completo para uso offline.')
  if (kind === 'image' && /<svg\b/i.test(head)) {
    const svg = new TextDecoder().decode(file.bytes)
    const refs = [
      ...[...svg.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)].map(m => m[2]!.trim()),
      ...[...svg.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)].map(m => m[2]!.trim()),
    ]
    if (/@import/i.test(svg) || refs.some(value => value && !value.startsWith('#') && !/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(value)))
      throw new Error('Uma imagem SVG depende de arquivos externos. Envie uma imagem autocontida para o pacote offline.')
  }
}

/** All song attachments are local. No DOM, fetch, service streaming, or partial archives. */
export async function exportChartBundle(source: string, opts: ChartBundleOptions = {}): Promise<ChartBundle> {
  const normalized = normalizeSource(source)
  const lines = normalized.split('\n')
  const view = parse(lines.map(line => line.replace(/^#~ ?/, '')).join('\n'))
  const original = parse(normalized)
  const chart = buildChoFilename(opts.title ?? original.meta.title ?? 'cifra', opts.key === undefined ? original.displayKey : opts.key)
  const chartName = chart.startsWith('.') || chart.startsWith('-') ? `cifra${chart}` : chart
  const members: ZipMember[] = []
  const assets: Array<{ path: string; kind: ChartAssetKind; roles: string[]; width?: number; height?: number }> = []
  const names = new Map<string, typeof assets[number]>()
  const provenance: Array<{ kind: string; value: string }> = []
  const enc = new TextEncoder()
  async function attach(ref: string, kind: ChartAssetKind, role: string, data?: ChartAssetData): Promise<string> {
    const id = `${kind}:${ref}`
    const existing = names.get(id)
    if (existing) { if (!existing.roles.includes(role)) existing.roles.push(role); return existing.path }
    let file = data
    if (!file) {
      if (!opts.loadAsset) throw new Error('O app precisa fornecer os arquivos anexos para exportar a cifra completa.')
      try { file = await opts.loadAsset(ref, kind) }
      catch { throw new Error(`Não foi possível incluir ${kind === 'score' ? 'um solo' : kind === 'audio' ? 'um áudio' : 'uma imagem'}. Verifique o arquivo no app e tente novamente.`) }
    }
    validateFile(file, kind, ref)
    const prefix = kind === 'score' ? 'solos/solo' : kind === 'audio' ? 'audios/audio' : 'imagens/imagem'
    const path = `${prefix}-${assets.length + 1}.${extension(ref, kind, file)}`
    const asset = { path, kind, roles: [role] }
    names.set(id, asset)
    members.push({ name: path, data: file.bytes })
    assets.push(asset)
    return path
  }
  const protectedLines = new Set<number>()
  for (const section of view.sections) {
    for (const line of section.lines) {
      if (line.type === 'score' || line.type === 'tab')
        for (let i = line.li0; i <= line.li1; i++) protectedLines.add(i)
      if (line.type === 'score') {
        const reference = readScoreReference(line.text)
        if (!reference) continue
        const path = await attach(reference.src, 'score', 'notation')
        lines[line.li0] = lines[line.li0]!.replace(/\bsrc\s*=\s*"(?:[^"\\]|\\.)*"/, `src=${JSON.stringify(path)}`)
      } else if (line.type === 'image') {
        protectedLines.add(line.li0)
        const path = await attach(line.src, 'image', 'chart-image')
        lines[line.li0] = lines[line.li0]!.replace(/(\{\s*(?:image|img)\s*:\s*)(.*?)(\s*\}\s*)$/i, `$1${path}$3`)
      }
    }
  }
  let hasArt = false
  for (let i = 0; i < lines.length; i++) {
    if (protectedLines.has(i)) continue
    const match = lines[i]!.match(/^(\s*(?:#~ ?)?\{\s*([\w]+)\s*:\s*)(.*?)(\s*\}\s*)$/)
    if (!match || !match[3]?.trim()) continue
    const key = match[2]!.toLowerCase()
    const ref = match[3].trim()
    const media = MEDIA[key]
    if (media) {
      if (media.kind === 'audio' && isOnlineService(ref)) {
        if (opts.onlineReferences !== 'provenance') throw new Error('Um áudio aponta para um serviço online. O app precisa fornecer o arquivo de áudio para uso offline.')
        provenance.push({ kind: media.role, value: ref })
        lines[i] = '# Referência online registrada apenas em ORIGEM.txt.'
        continue
      }
      const path = await attach(ref, media.kind, media.role)
      lines[i] = `${match[1]}${path}${match[4]}`
      if (key === 'x_titan_audio_art' && !lines[i]!.trimStart().startsWith('#~')) hasArt = true
    } else if (key === 'x_titan_youtube') {
      if (opts.onlineReferences !== 'provenance') throw new Error('A cifra contém um vídeo do YouTube. Para um pacote sem dependências externas, forneça o vídeo como arquivo ou guarde o link somente como informação de origem.')
      provenance.push({ kind: 'youtube', value: ref })
      lines[i] = '# Vídeo online registrado apenas em ORIGEM.txt; não faz parte dos recursos offline.'
    } else if (key === 'x_titan_source') {
      provenance.push({ kind: 'source', value: ref })
      lines[i] = '# Origem registrada em ORIGEM.txt.'
    } else if (/^(?:x_(?:titan_)?)?(?:video|image|file|attachment|include|asset|media)(?:_|$)/i.test(key) || (/^(?:x_(?:titan_)?)?audio(?:_|$)/i.test(key) && key !== 'x_titan_audio_art_w' && key !== 'x_titan_audio_art_h')) {
      throw new Error(`A diretiva ${key} contém um anexo ainda não suportado pelo pacote offline.`)
    }
  }
  for (const extra of opts.extras ?? []) {
    if (extra.role === 'audio-cover' && hasArt) continue
    const path = await attach(extra.reference ?? `extra:${extra.role}`, 'image', extra.role, extra.data)
    const asset = assets.find(asset => asset.path === path)!
    if (extra.width) asset.width = extra.width
    if (extra.height) asset.height = extra.height
    if (extra.role === 'audio-cover') {
      lines.unshift(`{x_titan_audio_art: ${path}}`, `{x_titan_audio_art_w: ${extra.width ?? 512}}`, `{x_titan_audio_art_h: ${extra.height ?? 512}}`)
      hasArt = true
    }
  }
  const mark = opts.personal ? '# versão pessoal — não é a cifra oficial da equipe\n' : ''
  members.unshift({ name: chartName, data: enc.encode(mark + lines.join('\n')) })
  members.push({ name: 'manifest.json', data: enc.encode(JSON.stringify({
    format: 'titan-chordpro-bundle', version: 1, offline: true, chart: chartName, assets,
  }, null, 2) + '\n') })
  if (provenance.length) members.push({ name: 'ORIGEM.txt', data: enc.encode(
    'Informações de origem — não são recursos necessários para abrir ou tocar a cifra offline.\n\n' +
    provenance.map(item => `${item.kind}: ${item.value}`).join('\n') + '\n',
  ) })
  members.push({ name: 'LEIA-ME.txt', data: enc.encode(
    `Cifra completa — Titan\n\nExtraia todos os arquivos juntos, preservando as pastas.\n${chartName} guarda a cifra; solos, imagens e áudios apontam para arquivos locais deste pacote.\nmanifest.json identifica os anexos e as capas fornecidas pelo app.\n\nOs arquivos musicais e áudios são os originais. A seleção de faixa e compassos está no ChordPro.\nNão é necessário acessar os servidores de origem para obter os anexos. Links em ORIGEM.txt são apenas informação, não conteúdo incluído.\n\nEste pacote contém o documento e suas mídias, não o aplicativo Titan. A importação direta do ZIP ainda não está disponível; um consumidor pode extrair os arquivos e resolver os caminhos relativos a esta pasta.\n`,
  ) })
  return { bytes: await zip(members), filename: `cifra-completa-${chartName.slice(0, -4)}.zip`, chart: chartName, assetCount: assets.length }
}
