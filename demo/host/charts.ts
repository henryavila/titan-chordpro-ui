import { readMeta } from '@henryavila/titan-chordpro-ui'
import type { ChordproViewerProps, ImageChoice } from '@henryavila/titan-chordpro-ui/vue'
import type { ListaMode } from './recipe'

type DemoSong = NonNullable<ChordproViewerProps['songs']>[number]

const bundledRaw = import.meta.glob('../../fixtures/sda/*.{cho,chordpro,onsong}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const assetUrls = import.meta.glob('../../fixtures/assets/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function idFromPath(path: string): string {
  const base = path.split('/').pop() ?? path
  return base.replace(/\.(cho|chordpro|onsong)$/i, '')
}

export const FAIL_ID = 'falha-de-rede'

/** First chart in the production corpus — what a cold demo opens on. */
export const DEFAULT_SONG_ID = '001-tudo-que-ha-de-bom-em-mim'

export function bundledFixtures(): Record<string, string> {
  return {
    ...Object.fromEntries(
      Object.entries(bundledRaw).map(([path, src]) => [idFromPath(path), src]),
    ),
    vazio: '',
  }
}

export function bundledImages(): {
  images: ImageChoice[]
  resolveImage: (src: string) => string
} {
  const byName = new Map(
    Object.entries(assetUrls).map(([path, url]) => [path.split('/').pop() ?? path, url]),
  )
  return {
    images: [...byName.keys()].map((file) => ({
      file,
      label: file.replace(/\.png$/, '').replace(/-/g, ' '),
    })),
    resolveImage: (src: string) => byName.get(src.split('/').pop() ?? src) ?? src,
  }
}

export function defaultSongId(fixtures: Record<string, string>): string {
  if (fixtures[DEFAULT_SONG_ID]) return DEFAULT_SONG_ID
  return Object.keys(fixtures).find((k) => k !== 'vazio') ?? 'vazio'
}

export function mergeCatalog(
  fixtures: Record<string, string>,
  extra: Record<string, string>,
): Record<string, string> {
  return { ...fixtures, ...extra }
}

export function songsFor(
  fixtures: Record<string, string>,
  mode: ListaMode,
): DemoSong[] | undefined {
  if (mode === 'off') return undefined
  const ids = Object.keys(fixtures).filter((k) => k !== 'vazio')
  const list: DemoSong[] = ids.map((k) => {
    const meta = readMeta(fixtures[k] ?? '')
    return {
      id: k,
      title: meta.title || k,
      subtitle: meta.subtitle ?? '',
      key: meta.key ?? '',
      ...(mode === 'juntas' ? { source: fixtures[k] ?? '' } : {}),
    }
  })
  if (mode === 'demanda') {
    list.splice(2, 0, { id: FAIL_ID, title: 'Cifra que não chega', subtitle: '', key: 'A' })
  }
  return list
}
