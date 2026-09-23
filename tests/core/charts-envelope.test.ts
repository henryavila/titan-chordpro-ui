import { describe, expect, it } from 'vitest'
import { listCharts, parse } from '../../src/core/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

/** Minimal N>1 envelope — not an SDA chart. */
export const TWO_CHART_SOURCE = `{title:Uma}
{artist:Alguém}
{x_chart_default:oferta}

{start_of_x_chart:completa}
{x_chart_label:Completa}
{key:G}
{duration:04:26}
[G]corpo da completa
{end_of_x_chart}

{start_of_x_chart:oferta}
{x_chart_label:Oferta}
{key:C}
{duration:02:00}
[C]corpo da oferta
{end_of_x_chart}
`

describe('listCharts', () => {
  it('treats a file with no envelope as one implicit chart id default', () => {
    const charts = listCharts('{title:Uma}\n{key:G}\n[G]letra')
    expect(charts).toEqual([{ id: 'default', label: 'default', isDefault: true }])
  })

  it('lists named charts in file order', () => {
    const charts = listCharts(TWO_CHART_SOURCE)
    expect(charts.map((c) => c.id)).toEqual(['completa', 'oferta'])
  })

  it('marks x_chart_default as isDefault, else the first chart', () => {
    const charts = listCharts(TWO_CHART_SOURCE)
    expect(charts.find((c) => c.id === 'oferta')?.isDefault).toBe(true)
    expect(charts.find((c) => c.id === 'completa')?.isDefault).toBe(false)

    const noDefault = TWO_CHART_SOURCE.replace('{x_chart_default:oferta}\n', '')
    const first = listCharts(noDefault)
    expect(first[0]?.id).toBe('completa')
    expect(first[0]?.isDefault).toBe(true)
    expect(first[1]?.isDefault).toBe(false)
  })

  it('uses x_chart_label when present, otherwise the id', () => {
    const charts = listCharts(TWO_CHART_SOURCE)
    expect(charts.find((c) => c.id === 'oferta')?.label).toBe('Oferta')
    expect(charts.find((c) => c.id === 'completa')?.label).toBe('Completa')

    const unlabeled = `{start_of_x_chart:oferta}
{key:C}
[C]corpo
{end_of_x_chart}
`
    expect(listCharts(unlabeled)).toEqual([{ id: 'oferta', label: 'oferta', isDefault: true }])
  })
})

function lyricsOf(source: string, chartId?: string): string {
  const view = chartId ? parse(source, { chartId }) : parse(source)
  return view.sections
    .flatMap((s) => s.lines)
    .filter((l) => l.type === 'lyrics')
    .map((l) => (l.type === 'lyrics' ? l.words.map((w) => w.lyric).join('') : ''))
    .join('\n')
}

describe('parse fatiado', () => {
  it('uses the default chart only when no chartId is passed', () => {
    const view = parse(TWO_CHART_SOURCE)
    expect(view.meta.key).toBe('C')
    expect(view.meta.duration).toBe('02:00')
    const lyrics = lyricsOf(TWO_CHART_SOURCE)
    expect(lyrics).toContain('corpo da oferta')
    expect(lyrics).not.toContain('corpo da completa')
  })

  it('parses the named chart: oferta meta and lyrics, not completa', () => {
    const view = parse(TWO_CHART_SOURCE, { chartId: 'oferta' })
    expect(view.meta.key).toBe('C')
    expect(view.meta.duration).toBe('02:00')
    expect(view.meta.title).toBe('Uma')
    expect(view.meta.artist).toBe('Alguém')
    const lyrics = lyricsOf(TWO_CHART_SOURCE, 'oferta')
    expect(lyrics).toContain('corpo da oferta')
    expect(lyrics).not.toContain('corpo da completa')
  })

  it('sets view.source to the chart document with no sibling body', () => {
    const view = parse(TWO_CHART_SOURCE, { chartId: 'oferta' })
    expect(view.source).toContain('{title:Uma}')
    expect(view.source).toContain('{artist:Alguém}')
    expect(view.source).toContain('corpo da oferta')
    expect(view.source).not.toContain('corpo da completa')
    expect(view.source).not.toMatch(/start_of_x_chart\s*:\s*completa/)
    expect(view.source).not.toContain('{end_of_x_chart}')
  })

  it('parses a one-chart jesus-style string as today', () => {
    const src = loadFixture(JESUS_1)
    const view = parse(src)
    expect(view.meta.title).toBe('087 - Jesus, Tu És a minha vida')
    expect(view.meta.key).toBe('G')
    expect(view.sections.length).toBe(11)
    expect(parse(src, { chartId: 'default' }).sections.length).toBe(11)
    expect(parse(src, { chartId: 'default' }).meta.title).toBe(view.meta.title)
  })
})

