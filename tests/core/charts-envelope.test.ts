import { describe, expect, it } from 'vitest'
import { listCharts, parse, replaceChart, writeMeta } from '../../src/core/index'
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

describe('writeMeta target and replaceChart', () => {
  it('song target changes the song header and leaves both chart keys intact', () => {
    const out = writeMeta(TWO_CHART_SOURCE, { title: 'X' }, { target: 'song' })
    expect(out).toContain('{title:X}')
    expect(out).not.toContain('{title:Uma}')
    expect(out).toContain('{artist:Alguém}')
    expect(out).toMatch(/\{start_of_x_chart:completa\}[\s\S]*\{key:G\}/)
    expect(out).toMatch(/\{start_of_x_chart:oferta\}[\s\S]*\{key:C\}/)
    expect(out).toContain('{duration:04:26}')
    expect(out).toContain('{duration:02:00}')
    expect(out).toContain('corpo da completa')
    expect(out).toContain('corpo da oferta')
  })

  it('chart target rewrites only that chart\'s key and duration', () => {
    const out = writeMeta(TWO_CHART_SOURCE, { key: 'G', duration: '03:00' }, { target: 'chart', chartId: 'oferta' })
    const oferta = parse(out, { chartId: 'oferta' })
    const completa = parse(out, { chartId: 'completa' })
    expect(oferta.meta.key).toBe('G')
    expect(oferta.meta.duration).toBe('03:00')
    expect(oferta.meta.title).toBe('Uma')
    expect(lyricsOf(out, 'oferta')).toContain('corpo da oferta')
    expect(completa.meta.key).toBe('G')
    expect(completa.meta.duration).toBe('04:26')
    expect(lyricsOf(out, 'completa')).toContain('corpo da completa')
  })

  it('replaceChart substitutes one chart document and keeps the sibling', () => {
    const doc = `{title:Uma}\n{artist:Alguém}\n{key:G}\n{duration:03:00}\n[G]nova oferta`
    const out = replaceChart(TWO_CHART_SOURCE, 'oferta', doc)
    expect(out).toContain('{start_of_x_chart:completa}')
    expect(out).toContain('{start_of_x_chart:oferta}')
    expect(out).toContain('corpo da completa')
    expect(out).not.toContain('corpo da oferta')
    expect(lyricsOf(out, 'oferta')).toContain('nova oferta')
    expect(parse(out, { chartId: 'oferta' }).meta.key).toBe('G')
    expect(parse(out, { chartId: 'oferta' }).meta.duration).toBe('03:00')
    expect(parse(out, { chartId: 'completa' }).meta.key).toBe('G')
    expect(parse(out, { chartId: 'completa' }).meta.duration).toBe('04:26')
  })

  it('one-chart writeMeta without target still rewrites a single header', () => {
    const out = writeMeta('{key:C}\n{title:Velho}\n[G]Letra', { title: 'Novo', key: 'G' })
    expect(out.match(/\{key:/g)).toHaveLength(1)
    expect(out.match(/\{title:/g)).toHaveLength(1)
    expect(out).toContain('{title:Novo}')
    expect(out).toContain('{key:G}')
    expect(out).toContain('[G]Letra')
    expect(out.split('\n').slice(0, 2)).toEqual(['{title:Novo}', '{key:G}'])
  })

  it('two-arg writeMeta on N>1 does not flatten chart key and duration into the song header', () => {
    const out = writeMeta(TWO_CHART_SOURCE, { title: 'X', key: 'A' })
    expect(out).toContain('{title:X}')
    expect(out).not.toMatch(/\{key:A\}/)
    expect(parse(out, { chartId: 'oferta' }).meta.key).toBe('C')
    expect(parse(out, { chartId: 'completa' }).meta.key).toBe('G')
    expect(out).toContain('{duration:04:26}')
    expect(out).toContain('{duration:02:00}')
  })

  it('song target on a one-chart file rewrites title and keeps sound keys', () => {
    const one = '{key:C}\n{title:Velho}\n{duration:02:00}\n[G]Letra'
    const out = writeMeta(one, { title: 'X', key: 'A' }, { target: 'song' })
    expect(out).toBe('{title:X}\n{key:C}\n{duration:02:00}\n[G]Letra')
  })

  it('chart target on a one-chart file rewrites key and duration on that header', () => {
    const one = '{key:C}\n{title:Velho}\n{duration:02:00}\n[G]Letra'
    const out = writeMeta(one, { title: 'Z', key: 'G', duration: '03:00' }, { target: 'chart', chartId: 'default' })
    expect(out).toBe('{title:Velho}\n{key:G}\n{duration:03:00}\n[G]Letra')
  })

  it('unknown chartId leaves an enveloped file unchanged', () => {
    const out = writeMeta(TWO_CHART_SOURCE, { key: 'A', duration: '01:00' }, { target: 'chart', chartId: 'ausente' })
    expect(out).toBe(TWO_CHART_SOURCE)
  })

  it('another chartId does not rewrite a one-chart file', () => {
    const one = '{title:Velho}\n{key:C}\n[G]Letra'
    expect(writeMeta(one, { key: 'G' }, { target: 'chart', chartId: 'oferta' })).toBe(one)
  })

  it('replaceChart without an envelope replaces only default or an empty id', () => {
    const one = '{title:Velho}\n{key:C}\n[G]Letra'
    const doc = '{title:Nova}\n{key:G}\n[G]nova'
    expect(replaceChart(one, 'default', doc)).toBe(doc)
    expect(replaceChart(one, '', doc)).toBe(doc)
    expect(replaceChart(one, 'oferta', doc)).toBe(one)
  })

  it('replaceChart with a missing enveloped id returns the file', () => {
    const doc = '{title:Nova}\n{key:G}\n[G]nova'
    expect(replaceChart(TWO_CHART_SOURCE, 'ausente', doc)).toBe(TWO_CHART_SOURCE)
    const kept = replaceChart(TWO_CHART_SOURCE, 'oferta', doc)
    expect(kept).toContain('{start_of_x_chart:completa}')
    expect(kept).toContain('corpo da completa')
    expect(kept).not.toContain('corpo da oferta')
  })
})


