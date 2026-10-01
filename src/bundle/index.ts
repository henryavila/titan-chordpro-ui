import { buildChoFilename } from '../core/filenames'
import { normalizeSource, parse } from '../core/parse'
import { zip, type ZipMember } from '../slides/zip'
import {
  MEDIA,
  ORIGEM_ONLINE_AUDIO_COMMENT,
  ORIGEM_SOURCE_COMMENT,
  ORIGEM_YOUTUBE_COMMENT,
  PERSONAL_MARK,
  collectChartMedia,
  extension,
  isOnlineService,
  rewriteMediaLine,
  validateFile,
  type ChartAssetData,
  type ChartAssetKind,
  type ChartBundle,
  type ChartBundleOptions,
} from './shared'

export type {
  BundleExtra,
  ChartAssetData,
  ChartAssetKind,
  ChartBundle,
  ChartBundleOptions,
} from './shared'
export {
  importChartBundle,
  type ChartBundleAsset,
  type ChartBundleImport,
  type ChartBundleImportOptions,
  type ImportedChartAsset,
  type PersistChartAsset,
} from './import'

/** All song attachments are local. No DOM, fetch, service streaming, or partial archives. */
export async function exportChartBundle(source: string, opts: ChartBundleOptions = {}): Promise<ChartBundle> {
  const normalized = normalizeSource(source)
  const { lines, hits } = collectChartMedia(normalized)
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
  const rewritten = new Set<number>()
  for (const hit of hits) {
    if (hit.kind === 'audio' && isOnlineService(hit.ref)) {
      if (opts.onlineReferences !== 'provenance') throw new Error('Um áudio aponta para um serviço online. O app precisa fornecer o arquivo de áudio para uso offline.')
      provenance.push({ kind: hit.role, value: hit.ref })
      lines[hit.index] = ORIGEM_ONLINE_AUDIO_COMMENT
      rewritten.add(hit.index)
      continue
    }
    const path = await attach(hit.ref, hit.kind, hit.role)
    lines[hit.index] = rewriteMediaLine(lines[hit.index]!, hit, path)
    rewritten.add(hit.index)
  }
  let hasArt = hits.some(hit => hit.role === 'audio-cover' && rewritten.has(hit.index) && !lines[hit.index]!.trimStart().startsWith('#~'))
  for (let i = 0; i < lines.length; i++) {
    if (rewritten.has(i)) continue
    const match = lines[i]!.match(/^(\s*(?:#~ ?)?\{\s*([\w]+)\s*:\s*)(.*?)(\s*\}\s*)$/)
    if (!match || !match[3]?.trim()) continue
    const key = match[2]!.toLowerCase()
    const ref = match[3].trim()
    if (MEDIA[key]) continue
    if (key === 'x_titan_youtube') {
      if (opts.onlineReferences !== 'provenance') throw new Error('A cifra contém um vídeo do YouTube. Para um pacote sem dependências externas, forneça o vídeo como arquivo ou guarde o link somente como informação de origem.')
      provenance.push({ kind: 'youtube', value: ref })
      lines[i] = ORIGEM_YOUTUBE_COMMENT
    } else if (key === 'x_titan_source') {
      provenance.push({ kind: 'source', value: ref })
      lines[i] = ORIGEM_SOURCE_COMMENT
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
  const mark = opts.personal ? `${PERSONAL_MARK}\n` : ''
  members.unshift({ name: chartName, data: enc.encode(mark + lines.join('\n')) })
  members.push({ name: 'manifest.json', data: enc.encode(JSON.stringify({
    format: 'titan-chordpro-bundle', version: 1, offline: true, chart: chartName, assets,
  }, null, 2) + '\n') })
  if (provenance.length) members.push({ name: 'ORIGEM.txt', data: enc.encode(
    'Informações de origem — não são recursos necessários para abrir ou tocar a cifra offline.\n\n' +
    provenance.map(item => `${item.kind}: ${item.value}`).join('\n') + '\n',
  ) })
  members.push({ name: 'LEIA-ME.txt', data: enc.encode(
    `Cifra completa — Titan\n\nExtraia todos os arquivos juntos, preservando as pastas.\n${chartName} guarda a cifra; solos, imagens e áudios apontam para arquivos locais deste pacote.\nmanifest.json identifica os anexos e as capas fornecidas pelo app.\n\nOs arquivos musicais e áudios são os originais. A seleção de faixa e compassos está no ChordPro.\nNão é necessário acessar os servidores de origem para obter os anexos. Links em ORIGEM.txt são apenas informação, não conteúdo incluído.\n\nEste pacote contém o documento e suas mídias, não o aplicativo Titan. Um app compatível importa o ZIP, guarda os anexos no próprio armazenamento e atualiza as referências da cifra.\n`,
  ) })
  return { bytes: await zip(members), filename: `cifra-completa-${chartName.slice(0, -4)}.zip`, chart: chartName, assetCount: assets.length }
}
