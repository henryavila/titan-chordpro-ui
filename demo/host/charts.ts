import defaultCho from '../../fixtures/sda/001-tudo-que-ha-de-bom-em-mim.cho?raw'
import { listCharts, readMeta } from '@henryavila/titan-chordpro-ui'
import type { TitanChordproProps, ImageChoice } from '@henryavila/titan-chordpro-ui/vue'
import type { ListaMode } from './recipe'

type DemoSong = NonNullable<TitanChordproProps['songs']>[number]

const assetUrls = import.meta.glob('../../fixtures/assets/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export const FAIL_ID = 'falha-de-rede'

/** Short rehearsal for `prefetchAll` — not the 148-chart corpus. */
export const CACHE_LIST_IDS = [
  '100-nasce-em-mim',
  '001-tudo-que-ha-de-bom-em-mim',
  '018-te-agradeco',
] as const

/** First chart in the production corpus — what a cold demo opens on. */
export const DEFAULT_SONG_ID = '001-tudo-que-ha-de-bom-em-mim'

/** Enough to open standalone without pulling the 148-chart chunk. */
export function seedFixtures(): Record<string, string> {
  return {
    [DEFAULT_SONG_ID]: String(defaultCho),
    vazio: '',
  }
}

export async function loadAllFixtures(): Promise<Record<string, string>> {
  const { allFixtures } = await import('./charts-all')
  return allFixtures()
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

function songEntry(
  fixtures: Record<string, string>,
  id: string,
  withSource: boolean,
): DemoSong {
  const source = fixtures[id] ?? ''
  const meta = readMeta(source)
  const charts = listCharts(source)
  const chartId =
    charts.length > 1 ? charts.find((c) => c.isDefault)?.id ?? charts[0]?.id : undefined
  return {
    id,
    title: meta.title || id,
    subtitle: meta.subtitle ?? '',
    key: meta.key ?? '',
    time: meta.time || undefined,
    ...(chartId ? { chartId } : {}),
    ...(withSource ? { source } : {}),
  }
}

/** Demo pair: one song with versions, then one without. */
export const VERSION_PAIR = ['006-poder-do-amor-original', '001-tudo-que-ha-de-bom-em-mim'] as const

export function versionPair(list: DemoSong[]): DemoSong[] {
  return VERSION_PAIR.flatMap((id) => {
    const song = list.find((item) => item.id === id)
    return song ? [song] : []
  })
}

export function songsFor(
  fixtures: Record<string, string>,
  mode: ListaMode,
): DemoSong[] | undefined {
  if (mode === 'off') return undefined
  if (mode === 'cache') {
    return CACHE_LIST_IDS.filter((id) => id in fixtures).map((id) =>
      songEntry(fixtures, id, false),
    )
  }
  const ids = Object.keys(fixtures).filter((k) => k !== 'vazio')
  const list: DemoSong[] = ids.map((k) => songEntry(fixtures, k, mode === 'juntas'))
  if (mode === 'demanda') {
    list.splice(2, 0, { id: FAIL_ID, title: 'Cifra que não chega', subtitle: '', key: 'A' })
  }
  return list
}
