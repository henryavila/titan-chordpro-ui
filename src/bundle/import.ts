import { playableAudioUrl } from '../core/audio-url'
import {
  ORIGEM_SOURCE_COMMENT,
  ORIGEM_YOUTUBE_COMMENT,
  PERSONAL_MARK,
  assertHostRef,
  basename,
  collectChartMedia,
  contentTypeFor,
  isSafePath,
  rewriteMediaLine,
  validateFile,
  type ChartAssetKind,
} from './shared'
import { unzip } from './unzip'

export type ChartBundleAsset = {
  path: string
  kind: ChartAssetKind
  roles: string[]
  bytes: Uint8Array
  contentType: string
  filename: string
  width?: number
  height?: number
}

export type PersistChartAsset = (asset: ChartBundleAsset) => Promise<{ ref: string }>

export type ChartBundleImportOptions = {
  /** Host stores each attachment and returns the reference the ChordPro should keep. */
  persistAsset: PersistChartAsset
  /** Put YouTube and origem back into the chart from ORIGEM.txt. Default true. */
  restoreProvenance?: boolean
}

export type ImportedChartAsset = {
  path: string
  kind: ChartAssetKind
  roles: string[]
  ref: string
  width?: number
  height?: number
}

export type ChartBundleImport = {
  source: string
  chart: string
  personal: boolean
  assetCount: number
  assets: ImportedChartAsset[]
  provenance: Array<{ kind: string; value: string }>
}

type ManifestAsset = {
  path: string
  kind: ChartAssetKind
  roles: string[]
  width?: number
  height?: number
}

const KINDS = new Set<ChartAssetKind>(['score', 'image', 'audio'])
const FAIL = 'A cifra não foi importada.'

function asBytes(input: Uint8Array | ArrayBuffer): Uint8Array {
  if (input instanceof Uint8Array) {
    const out = new Uint8Array(input.byteLength)
    out.set(input)
    return out
  }
  return new Uint8Array(input)
}

function readUtf8(bytes: Uint8Array, label: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error(`${label} ${FAIL}`)
  }
}

function parseProvenance(text: string): Array<{ kind: string; value: string }> {
  const items: Array<{ kind: string; value: string }> = []
  for (const line of text.split('\n')) {
    const match = line.match(/^([a-z0-9_-]+):\s*(.+)$/i)
    if (!match) continue
    const value = match[2]!.trim()
    if (!value || /[\r\n{}]/.test(value)) continue
    items.push({ kind: match[1]!.toLowerCase(), value })
  }
  return items
}

function readManifest(raw: Uint8Array): { chart: string; assets: ManifestAsset[] } {
  let json: unknown
  try { json = JSON.parse(readUtf8(raw, 'O manifesto do pacote está ilegível.')) }
  catch (error) {
    if (error instanceof Error && error.message.includes(FAIL)) throw error
    throw new Error(`O manifesto do pacote está ilegível. ${FAIL}`)
  }
  if (!json || typeof json !== 'object') throw new Error(`O manifesto do pacote está ilegível. ${FAIL}`)
  const body = json as Record<string, unknown>
  if (body.format !== 'titan-chordpro-bundle') throw new Error('Este ZIP não é uma cifra completa do Titan.')
  if (body.version !== 1) throw new Error('Este pacote usa uma versão que este Titan ainda não importa.')
  if (typeof body.chart !== 'string' || !body.chart.trim() || !isSafePath(body.chart)) {
    throw new Error(`O manifesto não aponta para a cifra. ${FAIL}`)
  }
  if (!Array.isArray(body.assets)) throw new Error(`O manifesto não lista os anexos. ${FAIL}`)
  const seen = new Set<string>()
  const assets: ManifestAsset[] = []
  for (const row of body.assets) {
    if (!row || typeof row !== 'object') throw new Error(`O manifesto lista um anexo inválido. ${FAIL}`)
    const item = row as Record<string, unknown>
    if (typeof item.path !== 'string' || !isSafePath(item.path)) throw new Error(`O pacote aponta para um caminho inválido. ${FAIL}`)
    if (!KINDS.has(item.kind as ChartAssetKind)) throw new Error(`O pacote contém um tipo de anexo desconhecido. ${FAIL}`)
    if (seen.has(item.path)) throw new Error(`O manifesto lista o mesmo anexo duas vezes. ${FAIL}`)
    seen.add(item.path)
    const roles = Array.isArray(item.roles) ? item.roles.filter((role): role is string => typeof role === 'string' && role.trim() !== '') : []
    const asset: ManifestAsset = { path: item.path, kind: item.kind as ChartAssetKind, roles }
    if (typeof item.width === 'number' && Number.isFinite(item.width)) asset.width = item.width
    if (typeof item.height === 'number' && Number.isFinite(item.height)) asset.height = item.height
    assets.push(asset)
  }
  return { chart: body.chart, assets }
}

function restoreProvenance(source: string, items: Array<{ kind: string; value: string }>): string {
  let text = source
  const origin = items.find(item => item.kind === 'source')
  const youtube = items.find(item => item.kind === 'youtube')
  const placed = new Set<string>()
  if (origin && text.includes(ORIGEM_SOURCE_COMMENT)) {
    text = text.replace(ORIGEM_SOURCE_COMMENT, () => `{x_titan_source: ${origin.value}}`)
    placed.add('source')
  }
  if (youtube && text.includes(ORIGEM_YOUTUBE_COMMENT)) {
    text = text.replace(ORIGEM_YOUTUBE_COMMENT, () => `{x_titan_youtube: ${youtube.value}}`)
    placed.add('youtube')
  }
  const missing: string[] = []
  if (origin && !placed.has('source') && !/\{x_titan_source\s*:/i.test(text)) {
    missing.push(`{x_titan_source: ${origin.value}}`)
  }
  if (youtube && !placed.has('youtube') && !/\{x_titan_youtube\s*:/i.test(text)) {
    missing.push(`{x_titan_youtube: ${youtube.value}}`)
  }
  if (!missing.length) return text
  return `${missing.join('\n')}\n${text}`
}

function kindLabel(kind: ChartAssetKind): string {
  return kind === 'score' ? 'um solo' : kind === 'audio' ? 'um áudio' : 'uma imagem'
}

function needsPlayableRef(kind: ChartAssetKind, roles: string[]): boolean {
  return kind === 'audio' || roles.includes('audio-cover')
}

function assertPlayableHostRef(ref: string): string {
  if (!playableAudioUrl(ref)) {
    throw new Error('A referência devolvida pelo app não pode ser usada no player. A cifra não foi importada.')
  }
  return ref
}

/**
 * Open a Titan offline chart ZIP, persist every attachment through the host,
 * and return ChordPro whose references point at those stored files.
 */
export async function importChartBundle(
  input: Uint8Array | ArrayBuffer,
  opts: ChartBundleImportOptions,
): Promise<ChartBundleImport> {
  if (typeof opts?.persistAsset !== 'function') {
    throw new Error('O app precisa guardar os arquivos anexos para importar a cifra completa.')
  }
  const entries = await unzip(asBytes(input))
  const manifestBytes = entries.get('manifest.json')
  if (!manifestBytes) throw new Error('Este ZIP não é uma cifra completa do Titan.')
  const manifest = readManifest(manifestBytes)
  const chartBytes = entries.get(manifest.chart)
  if (!chartBytes) throw new Error(`A cifra do pacote não foi encontrada. ${FAIL}`)
  let source = readUtf8(chartBytes, 'A cifra do pacote não está em texto.')
  const personal = source.startsWith(`${PERSONAL_MARK}\n`) || source === PERSONAL_MARK
  if (personal) source = source.slice(PERSONAL_MARK.length).replace(/^\n/, '')

  const files = new Map<string, ChartBundleAsset>()
  for (const asset of manifest.assets) {
    const bytes = entries.get(asset.path)
    if (!bytes) throw new Error(`O pacote não inclui o anexo ${asset.path}. ${FAIL}`)
    const file: ChartBundleAsset = {
      path: asset.path,
      kind: asset.kind,
      roles: asset.roles.length ? asset.roles : ['attachment'],
      bytes,
      contentType: contentTypeFor(asset.path, asset.kind),
      filename: basename(asset.path),
      ...(asset.width !== undefined ? { width: asset.width } : {}),
      ...(asset.height !== undefined ? { height: asset.height } : {}),
    }
    validateFile(file, file.kind, file.path, 'import')
    files.set(asset.path, file)
  }

  const { hits } = collectChartMedia(source)
  for (const hit of hits) {
    const file = files.get(hit.ref)
    if (!file) {
      throw new Error(`O pacote não inclui o anexo ${hit.ref}. ${FAIL}`)
    }
    if (file.kind !== hit.kind) {
      throw new Error(`O anexo ${hit.ref} não é o tipo que a cifra espera. ${FAIL}`)
    }
  }

  const refs = new Map<string, string>()
  const imported: ImportedChartAsset[] = []
  for (const asset of manifest.assets) {
    const file = files.get(asset.path)!
    let saved: { ref: string }
    try { saved = await opts.persistAsset(file) }
    catch (error) {
      if (error instanceof Error && error.message.includes(FAIL)) throw error
      throw new Error(`Não foi possível guardar ${kindLabel(asset.kind)}. ${FAIL}`)
    }
    const ref = assertHostRef(saved?.ref)
    if (needsPlayableRef(file.kind, file.roles)) assertPlayableHostRef(ref)
    refs.set(asset.path, ref)
    imported.push({
      path: asset.path,
      kind: asset.kind,
      roles: file.roles,
      ref,
      ...(file.width !== undefined ? { width: file.width } : {}),
      ...(file.height !== undefined ? { height: file.height } : {}),
    })
  }

  const { lines, hits: rewriteHits } = collectChartMedia(source)
  for (const hit of rewriteHits) {
    const next = refs.get(hit.ref)
    if (!next) continue
    if (hit.kind === 'audio' || hit.role === 'audio-cover') assertPlayableHostRef(next)
    lines[hit.index] = rewriteMediaLine(lines[hit.index]!, hit, next)
  }
  source = lines.join('\n')

  const provenance = entries.has('ORIGEM.txt')
    ? parseProvenance(readUtf8(entries.get('ORIGEM.txt')!, 'A origem do pacote está ilegível.'))
    : []
  if (opts.restoreProvenance !== false) source = restoreProvenance(source, provenance)

  return {
    source,
    chart: manifest.chart,
    personal,
    assetCount: imported.length,
    assets: imported,
    provenance,
  }
}
