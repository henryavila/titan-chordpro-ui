import defaultCho from '../../fixtures/sda/001-tudo-que-ha-de-bom-em-mim.cho?raw'
import { listCharts, readMeta } from '@henryavila/titan-chordpro-ui'
import type { ChordproViewerProps, ImageChoice } from '@henryavila/titan-chordpro-ui/vue'
import type { ListaMode } from './recipe'

type DemoSong = NonNullable<ChordproViewerProps['songs']>[number]

const assetUrls = import.meta.glob('../../fixtures/assets/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export const FAIL_ID = 'falha-de-rede'

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

function listedCharts(source: string) {
  if (!/\{\s*start_of_x_chart\s*:/i.test(source)) return []
  try {
    return listCharts(source)
  } catch {
    return []
  }
}

function hasCharts(source: string | undefined): boolean {
  return listedCharts(source ?? '').length > 1
}

function defaultChartId(source: string): string | undefined {
  const charts = listedCharts(source)
  if (charts.length < 2) return undefined
  return charts.find((chart) => chart.isDefault)?.id ?? charts[0]?.id
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
  const ids = Object.keys(fixtures)
    .filter((k) => k !== 'vazio')
    .sort((a, b) => Number(hasCharts(fixtures[b])) - Number(hasCharts(fixtures[a])) || a.localeCompare(b))
  const list: DemoSong[] = ids.map((k) => {
    const source = fixtures[k] ?? ''
    const meta = readMeta(source)
    const chartId = defaultChartId(source)
    return {
      id: k,
      title: meta.title || k,
      subtitle: meta.subtitle ?? '',
      key: meta.key ?? '',
      ...(chartId ? { chartId } : {}),
      ...(mode === 'juntas' ? { source } : {}),
    }
  })
  if (mode === 'demanda') {
    list.splice(2, 0, { id: FAIL_ID, title: 'Cifra que não chega', subtitle: '', key: 'A' })
  }
  return list
}
