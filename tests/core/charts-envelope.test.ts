import { describe, expect, it } from 'vitest'
import { chartDocument, readMeta, writeSongScopedMeta } from '../../src/core/charts'
import {
  applyCifraClubEnrich,
  commitChartDocument,
  inferWrittenKey,
  listCharts,
  lintSource,
  parse,
  parseXStrum,
  replaceChart,
  rewriteToKey,
  storedTransposeSemis,
  writeMeta,
} from '../../src/core/index'
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

  it('two-arg writeMeta on N>1 puts sound keys on the default chart, not the song header', () => {
    const out = writeMeta(TWO_CHART_SOURCE, { title: 'X', key: 'A' })
    expect(out).toContain('{title:X}')
    const header = out.slice(0, out.indexOf('{start_of_x_chart'))
    expect(header).not.toMatch(/\{key:/)
    expect(parse(out, { chartId: 'oferta' }).meta.key).toBe('A')
    expect(parse(out, { chartId: 'completa' }).meta.key).toBe('G')
    expect(out).toContain('{duration:04:26}')
    expect(out).toContain('{duration:02:00}')
    expect(out).toContain('[C]corpo da oferta')
    expect(out).toContain('[G]corpo da completa')
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

  it('replaceChart drops omitted song identity and keeps x_chart_default', () => {
    const file = `{title:Uma}
{subtitle:Sub}
{artist:Alguém}
{x_source:https://example.test/a}
{x_youtube:abcdefghijk}
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
    const doc = `{title:Nova}\n{key:D}\n[D]nova oferta`
    const out = replaceChart(file, 'oferta', doc)
    const header = out.slice(0, out.indexOf('{start_of_x_chart'))
    expect(header).toContain('{title:Nova}')
    expect(header).not.toContain('{title:Uma}')
    expect(header).not.toMatch(/\{subtitle:/)
    expect(header).not.toMatch(/\{artist:/)
    expect(header).not.toContain('Alguém')
    expect(header).not.toMatch(/\{x_source:/)
    expect(header).not.toMatch(/\{x_youtube:/)
    expect(header).toContain('{x_chart_default:oferta}')
    const completa = chartBlock(out, 'completa')
    const oferta = chartBlock(out, 'oferta')
    expect(completa).toContain('{key:G}')
    expect(completa).toContain('{duration:04:26}')
    expect(completa).toContain('[G]corpo da completa')
    expect(oferta).toContain('{key:D}')
    expect(oferta).toContain('[D]nova oferta')
    expect(oferta).not.toContain('corpo da oferta')
    expect(oferta).not.toContain('{key:C}')
    expect(parse(out, { chartId: 'completa' }).meta.key).toBe('G')
    expect(parse(out, { chartId: 'oferta' }).meta.artist).toBeUndefined()
    expect(parse(out, { chartId: 'oferta' }).meta.title).toBe('Nova')
  })
})

/** Default chart is `completa`, not the first block's sibling. */
const DEFAULT_COMPLETA = `{title:Uma}
{x_chart_default:completa}

{start_of_x_chart:completa}
{key:G}
[G]completa
{end_of_x_chart}

{start_of_x_chart:oferta}
{key:C}
[C]oferta
{end_of_x_chart}
`

function chartBlock(source: string, id: string): string {
  const start = source.indexOf(`{start_of_x_chart:${id}}`)
  const end = source.indexOf('{end_of_x_chart}', start)
  return source.slice(start, end === -1 ? source.length : end)
}

describe('rewriteToKey and untargeted writeMeta on the default chart', () => {
  it('rewrites only the default chart into the target key', () => {
    const result = rewriteToKey(DEFAULT_COMPLETA, 'A')
    expect(result).not.toBeNull()
    const out = result!.source
    expect(result).toEqual(expect.objectContaining({ changed: true, from: 'G', to: 'A' }))
    const completa = chartBlock(out, 'completa')
    const oferta = chartBlock(out, 'oferta')
    expect(completa).toContain('{key:A}')
    expect(completa).toContain('[A]completa')
    expect(completa).not.toContain('{key:G}')
    expect(completa).not.toContain('[G]')
    expect(oferta).toContain('{key:C}')
    expect(oferta).toContain('[C]oferta')
    expect(oferta).not.toContain('[D]')
    expect(oferta).not.toContain('{transpose:')
    const header = out.slice(0, out.indexOf('{start_of_x_chart'))
    expect(header).not.toMatch(/\{key:/)
    expect(header).not.toMatch(/\{transpose:/)
    expect(parse(out, { chartId: 'completa' }).meta.key).toBe('A')
    expect(parse(out, { chartId: 'oferta' }).meta.key).toBe('C')
  })

  it('writeMeta without target updates only the default chart key', () => {
    const out = writeMeta(DEFAULT_COMPLETA, { key: 'D' })
    const header = out.slice(0, out.indexOf('{start_of_x_chart'))
    expect(header).not.toContain('{key:')
    const completa = chartBlock(out, 'completa')
    const oferta = chartBlock(out, 'oferta')
    expect(completa).toContain('{key:D}')
    expect(completa).toContain('[G]completa')
    expect(oferta).toContain('{key:C}')
    expect(oferta).toContain('[C]oferta')
    expect(oferta).not.toContain('{key:D}')
    expect(parse(out, { chartId: 'completa' }).meta.key).toBe('D')
    expect(parse(out, { chartId: 'oferta' }).meta.key).toBe('C')
  })

  it('readMeta is the default chart, so a spread write does not copy the sibling key', () => {
    const source = `{title:Uma}
{x_chart_default:completa}

{start_of_x_chart:completa}
{key:G}
{x_audio_sung:https://cdn.example/g.m4a}
[G]completa
{end_of_x_chart}

{start_of_x_chart:oferta}
{key:C}
{x_audio_sung:https://cdn.example/c.m4a}
[C]oferta
{end_of_x_chart}
`
    expect(readMeta(source).key).toBe('G')
    expect(readMeta(source).x_audio_sung).toBe('https://cdn.example/g.m4a')
    expect(readMeta(source)).toEqual(readMeta(chartDocument(source)))
    expect(readMeta(TWO_CHART_SOURCE)).toEqual(readMeta(chartDocument(TWO_CHART_SOURCE)))
    expect(readMeta(TWO_CHART_SOURCE)).toMatchObject({
      title: 'Uma',
      artist: 'Alguém',
      key: 'C',
      duration: '02:00',
    })
    const plain = '{title:Uma}\n{key:G}\n{key:D}\n[G]letra'
    expect(readMeta(plain).key).toBe('D')

    const out = writeMeta(source, { ...readMeta(source), duration: '01:11' })
    const completa = chartBlock(out, 'completa')
    const oferta = chartBlock(out, 'oferta')
    expect(completa).toContain('{key:G}')
    expect(completa).not.toContain('{key:C}')
    expect(completa).toContain('{duration:01:11}')
    expect(completa).toContain('{x_audio_sung:https://cdn.example/g.m4a}')
    expect(oferta).toContain('{key:C}')
    expect(oferta).toContain('{x_audio_sung:https://cdn.example/c.m4a}')
    expect(oferta).not.toContain('{key:G}')
    expect(oferta).not.toContain('{duration:')
    const header = out.slice(0, out.indexOf('{start_of_x_chart'))
    expect(header).not.toMatch(/\{key:/)
    expect(header).toContain('{title:Uma}')
  })

  it('a later canonical sound key wins over an earlier alias on a duration-only write', () => {
    const src = `{x_chart_default:completa}
{start_of_x_chart:completa}
{x_audio:old}
{x_audio_sung:current}
{key:C}
{key:D}
[G]z
{end_of_x_chart}
{start_of_x_chart:oferta}
{key:C}
{x_audio_sung:other}
[C]o
{end_of_x_chart}
`
    const out = writeMeta(src, { duration: '01:30' })
    const completa = chartBlock(out, 'completa')
    const oferta = chartBlock(out, 'oferta')
    expect(completa).toContain('{x_audio_sung:current}')
    expect(completa).not.toContain('old')
    expect(completa).toContain('{key:D}')
    expect(completa).not.toContain('{key:C}')
    expect(completa).toContain('{duration:01:30}')
    expect(oferta).toContain('{key:C}')
    expect(oferta).toContain('{x_audio_sung:other}')
    expect(oferta).not.toContain('{duration:')
    const header = out.slice(0, out.indexOf('{start_of_x_chart'))
    expect(header).not.toContain('{duration:')
    expect(header).not.toContain('{key:')
  })

  it('spreading readMeta while moving x_chart_default does not copy sound onto the new chart', () => {
    const file = `{title:Uma}
{x_chart_default:oferta}
{start_of_x_chart:completa}
{key:G}
{x_audio_sung:https://cdn.example/g.m4a}
{x_strum:bpm=40;meter=4/4;grid=4;label=Sib;pat=DUDU}
[G]completa
{end_of_x_chart}
{start_of_x_chart:oferta}
{key:C}
{x_audio_sung:https://cdn.example/c.m4a}
{x_strum:bpm=60;meter=4/4;grid=4;label=A;pat=DUDU}
[C]oferta
{end_of_x_chart}
`
    const out = writeMeta(file, { ...readMeta(file), x_chart_default: 'completa' })
    expect(listCharts(out).find((c) => c.isDefault)?.id).toBe('completa')
    const completa = chartBlock(out, 'completa')
    const oferta = chartBlock(out, 'oferta')
    expect(completa).toContain('{key:G}')
    expect(completa).toContain('{x_audio_sung:https://cdn.example/g.m4a}')
    expect(completa).toContain('label=Sib')
    expect(completa).not.toContain('{key:C}')
    expect(completa).not.toContain('cdn.example/c.m4a')
    expect(completa).not.toContain('label=A')
    expect(oferta).toContain('{key:C}')
    expect(oferta).toContain('{x_audio_sung:https://cdn.example/c.m4a}')
    expect(oferta).toContain('label=A')

    const pointer = writeMeta(file, { x_chart_default: 'completa' })
    expect(listCharts(pointer).find((c) => c.isDefault)?.id).toBe('completa')
    expect(chartBlock(pointer, 'completa')).toContain('{key:G}')
    expect(chartBlock(pointer, 'completa')).toContain('{x_audio_sung:https://cdn.example/g.m4a}')
    expect(chartBlock(pointer, 'oferta')).toContain('{key:C}')
    expect(chartBlock(pointer, 'oferta')).toContain('{x_audio_sung:https://cdn.example/c.m4a}')

    const sparseKey = writeMeta(file, { key: 'D' })
    expect(listCharts(sparseKey).find((c) => c.isDefault)?.id).toBe('oferta')
    expect(chartBlock(sparseKey, 'oferta')).toContain('{key:D}')
    expect(chartBlock(sparseKey, 'oferta')).not.toContain('{key:C}')
    expect(chartBlock(sparseKey, 'completa')).toContain('{key:G}')
    expect(chartBlock(sparseKey, 'completa')).not.toContain('{key:D}')
  })
})

describe('chart document edits and x_chart_default', () => {
  it('commitChartDocument rewrites the default lyric and keeps the sibling', () => {
    const doc = parse(TWO_CHART_SOURCE).source.replace('corpo da oferta', 'corpo novo')
    const out = commitChartDocument(TWO_CHART_SOURCE, doc)
    expect(out).toContain('{start_of_x_chart:completa}')
    expect(out).toContain('{start_of_x_chart:oferta}')
    expect(out).toContain('corpo da completa')
    expect(out).not.toContain('corpo da oferta')
    expect(parse(out).source).toContain('corpo novo')
    expect(parse(out, { chartId: 'completa' }).source).toContain('corpo da completa')
    expect(out).toContain('{x_chart_default:oferta}')
    expect(parse(commitChartDocument(TWO_CHART_SOURCE, parse(TWO_CHART_SOURCE).source)).source).toBe(
      parse(TWO_CHART_SOURCE).source,
    )
  })

  it('commitChartDocument on a one-chart file replaces the file', () => {
    const one = '{title:Velho}\n{key:C}\n[C]linha unica'
    const doc = one.replace('linha unica', 'linha nova')
    expect(commitChartDocument(one, doc)).toBe(doc)
    expect(doc).not.toBe(one)
  })

  it('writes x_chart_default and does not clear it when a patch omits it', () => {
    const song = writeMeta(TWO_CHART_SOURCE, { x_chart_default: 'completa' }, { target: 'song' })
    expect(listCharts(song).find((c) => c.isDefault)?.id).toBe('completa')
    expect(parse(song, { chartId: 'oferta' }).meta.key).toBe('C')
    expect(parse(song, { chartId: 'completa' }).meta.key).toBe('G')
    expect(song).toContain('corpo da oferta')
    expect(song).toContain('corpo da completa')

    const untargeted = writeMeta(TWO_CHART_SOURCE, { x_chart_default: 'completa' })
    expect(listCharts(untargeted).find((c) => c.isDefault)?.id).toBe('completa')
    expect(chartBlock(untargeted, 'oferta')).toContain('{key:C}')
    expect(chartBlock(untargeted, 'completa')).toContain('{key:G}')
    expect(untargeted).not.toMatch(/\{x_chart_default:[^}]*\}[\s\S]*\{x_chart_default:/)

    const omitted = writeMeta(untargeted, { title: 'X' })
    expect(omitted).toContain('{x_chart_default:completa}')
    expect(listCharts(omitted).find((c) => c.isDefault)?.id).toBe('completa')
    expect(omitted).toContain('{title:X}')

    const one = '{title:Velho}\n{key:C}\n[G]Letra'
    expect(writeMeta(one, { title: 'Novo', key: 'C' })).not.toContain('x_chart_default')
    expect(writeMeta(one, { ...readMeta(one), title: 'Novo' })).not.toContain('x_chart_default')
    const added = writeMeta(one, { ...readMeta(one), x_chart_default: 'completa' })
    expect(added.match(/\{x_chart_default:/g)).toHaveLength(1)
    expect(added).toContain('{title:Velho}')
    expect(added).toContain('{key:C}')
    expect(added).toContain('[G]Letra')

    const kept = '{title:Velho}\n{x_chart_default:completa}\n{key:C}\n[G]Letra'
    const rewritten = writeMeta(kept, { title: 'Novo', key: 'C' })
    expect(rewritten).toContain('{x_chart_default:completa}')
    expect(rewritten).toContain('{title:Novo}')
    expect(rewritten).toContain('[G]Letra')
    expect(rewritten.match(/\{x_chart_default:/g)).toHaveLength(1)

    const oneWithDefault = '{title:Velho}\n{x_chart_default:completa}\n{key:C}\n[G]Letra'
    const cleared = writeMeta(oneWithDefault, { x_chart_default: '' }, { target: 'song' })
    expect(cleared).not.toContain('x_chart_default')
    expect(cleared).toContain('{title:Velho}')
    expect(cleared).toContain('{key:C}')
    expect(cleared).toContain('[G]Letra')
    const omittedSong = writeMeta(oneWithDefault, { title: 'Novo' }, { target: 'song' })
    expect(omittedSong).toContain('{x_chart_default:completa}')
    expect(omittedSong).toContain('{title:Novo}')
    expect(omittedSong).toContain('{key:C}')
  })

  it('commitChartDocument keeps a leading blank line in the chart body', () => {
    const doc = '{title:Uma}\n{artist:Alguém}\n\n[C]corpo da oferta\n\n[C]segunda'
    const out = commitChartDocument(TWO_CHART_SOURCE, doc)
    const oferta = chartBlock(out, 'oferta')
    expect(oferta).toContain('{x_chart_label:Oferta}\n\n[C]corpo da oferta\n\n[C]segunda')
    expect(chartBlock(out, 'completa')).toContain('corpo da completa')
    expect(parse(out).source).toBe(doc)
  })

  it('lintSource on the chart document ignores a broken sibling and reports the default key', () => {
    const file = `{title:Uma}
{x_chart_default:oferta}
{start_of_x_chart:completa}
{key:G}
{soc}
[G]completa
{end_of_x_chart}
{start_of_x_chart:oferta}
{key:H}
[C]oferta
{end_of_x_chart}
`
    const doc = parse(file).source
    expect(doc).toContain('{key:H}')
    expect(doc).not.toContain('{soc}')
    expect(doc).not.toContain('completa')
    const pane = lintSource(doc)
    expect(pane.ok).toBe(false)
    expect(pane.issues.join(' ')).toContain('tom não reconhecido: H')
    expect(pane.issues.join(' ')).not.toContain('refrão')
    const whole = lintSource(file)
    expect(whole.issues.join(' ')).toContain('refrão')
    expect(whole.issues.join(' ')).not.toContain('tom não reconhecido')
  })

  it('keeps raw title bytes, preamble order, and the spacer before the first chart', () => {
    const file = [
      '# antes',
      '{title:Uma}',
      '# meio',
      '{artist:Alguém}',
      '{x_chart_default:oferta}',
      '',
      '{start_of_x_chart:completa}',
      '{x_chart_label:Completa}',
      '{key:G}',
      '[G]corpo da completa',
      '{end_of_x_chart}',
      '',
      '{start_of_x_chart:oferta}',
      '{x_chart_label:Oferta}',
      '{key:C}',
      '[C]corpo da oferta',
      '{end_of_x_chart}',
      '',
    ].join('\n')
    const spaced = commitChartDocument(file, '{title:Uma }\n{artist:Alguém}\n{key:C}\n[C]corpo da oferta')
    const header = spaced.slice(0, spaced.indexOf('{start_of_x_chart'))
    expect(header.startsWith('# antes\n{title:Uma }\n# meio\n{artist:Alguém}\n')).toBe(true)
    expect(header).toContain('{title:Uma }')
    expect(header).not.toMatch(/\{title:Uma\}/)
    expect(header.endsWith('{x_chart_default:oferta}\n\n')).toBe(true)
    expect(chartBlock(spaced, 'completa')).toBe(chartBlock(file, 'completa'))
    expect(chartBlock(spaced, 'oferta')).toContain('[C]corpo da oferta')
    expect(parse(spaced).source).toContain('{title:Uma }')
    expect(parse(spaced).source).not.toMatch(/\{title:Uma\}/)

    const emptied = commitChartDocument(spaced, '{title:}\n{artist:Alguém}\n{key:C}\n[C]corpo da oferta')
    const emptyHeader = emptied.slice(0, emptied.indexOf('{start_of_x_chart'))
    expect(emptyHeader.startsWith('# antes\n{title:}\n# meio\n')).toBe(true)
    expect(emptyHeader).toContain('{title:}')
    expect(emptyHeader).not.toMatch(/\{title:Uma/)
    expect(emptyHeader.endsWith('{x_chart_default:oferta}\n\n')).toBe(true)
    expect(parse(emptied).source.startsWith('{title:}\n')).toBe(true)
    expect(chartBlock(emptied, 'completa')).toBe(chartBlock(file, 'completa'))

    const lyric = commitChartDocument(file, '{title:Uma}\n{artist:Alguém}\n{key:C}\n[C]corpo novo')
    const lyricHeader = lyric.slice(0, lyric.indexOf('{start_of_x_chart'))
    expect(lyricHeader.startsWith('# antes\n{title:Uma}\n# meio\n')).toBe(true)
    expect(lyricHeader.endsWith('\n\n')).toBe(true)
    expect(chartBlock(lyric, 'oferta')).toContain('[C]corpo novo')
    expect(chartBlock(lyric, 'completa')).toContain('[G]corpo da completa')
  })

  it('reads raw song identity that has no colon, and {composer:} as artist', () => {
    const colonless = commitChartDocument(
      TWO_CHART_SOURCE,
      '{title Uma}\n{artist Alguém}\n{key:C}\n[C]corpo',
    )
    expect(readMeta(colonless).title).toBe('Uma')
    expect(readMeta(colonless).artist).toBe('Alguém')
    expect(colonless).toContain('{title Uma}')
    expect(colonless).toContain('{artist Alguém}')
    expect(chartBlock(colonless, 'completa')).toBe(chartBlock(TWO_CHART_SOURCE, 'completa'))

    const composed = commitChartDocument(
      TWO_CHART_SOURCE,
      '{title:Uma}\n{composer:Alguém}\n{key:C}\n[C]corpo',
    )
    expect(readMeta(composed).title).toBe('Uma')
    expect(readMeta(composed).artist).toBe('Alguém')
    expect(composed).toContain('{composer:Alguém}')
    expect(chartBlock(composed, 'completa')).toBe(chartBlock(TWO_CHART_SOURCE, 'completa'))
  })

  it('a flat identity edit does not leave a second copy the reader accepts', () => {
    const titled = writeSongScopedMeta('{title Uma}\n[C]corpo\n', { title: 'Nova' })
    expect(readMeta(titled).title).toBe('Nova')
    expect(parse(titled).meta.title).toBe('Nova')
    expect(titled).not.toContain('{title Uma}')
    expect(titled).toContain('[C]corpo')

    const artist = writeSongScopedMeta('{composer:Alguém}\n[C]corpo\n', { artist: 'Novo' })
    expect(readMeta(artist).artist).toBe('Novo')
    expect(parse(artist).meta.artist).toBe('Novo')
    expect(artist).not.toContain('composer')
    expect(artist).toContain('[C]corpo')

    const cleared = writeSongScopedMeta('{composer:Alguém}\n[C]corpo\n', { artist: '' })
    expect(readMeta(cleared).artist).toBeUndefined()
    expect(parse(cleared).meta.artist).toBeUndefined()
    expect(cleared).not.toContain('composer')
    expect(cleared).toContain('[C]corpo')
  })

  it('an unrelated flat save keeps the artist parse shows', () => {
    const later = '{artist:Local}\n{composer:Bach}\n[C]song\n'
    expect(parse(later).meta.artist).toBe('Bach')
    const savedLater = writeSongScopedMeta(later, { subtitle: 'X' })
    expect(parse(savedLater).meta.artist).toBe('Bach')
    expect(savedLater).toContain('{composer:Bach}')
    expect(savedLater).not.toContain('composer:Local')
    expect(savedLater).toContain('{subtitle:X}')
    expect(savedLater).toContain('[C]song')

    const earlier = '{composer:Bach}\n{artist:Local}\n[C]song\n'
    expect(parse(earlier).meta.artist).toBe('Local')
    const savedEarlier = writeSongScopedMeta(earlier, { subtitle: 'X' })
    expect(parse(savedEarlier).meta.artist).toBe('Local')
    expect(savedEarlier).toContain('{subtitle:X}')
    expect(savedEarlier).toContain('[C]song')

    const repeated = '{composer:Bach}\n{composer:Mozart}\n[C]song\n'
    expect(parse(repeated).meta.artist).toBe('Mozart')
    const savedRepeated = writeSongScopedMeta(repeated, { subtitle: 'X' })
    expect(parse(savedRepeated).meta.artist).toBe('Mozart')
    expect(savedRepeated).toContain('{composer:Mozart}')
    expect(savedRepeated).toContain('[C]song')
  })

  it('counts colonless {transpose} and {key} the way parse does', () => {
    expect(storedTransposeSemis('{key:C}\n{transpose 2}\n[C]uma')).toBe(2)
    expect(storedTransposeSemis('{key C}\n{transpose:2}\n[C]uma')).toBe(2)
  })

  it('keeps {transpose:2} when the sibling chart is in another key', () => {
    const src = `{title:Uma}
{x_chart_default:oferta}
{start_of_x_chart:completa}
{key:G}
[G]completa [G]mais [G]ainda
{end_of_x_chart}
{start_of_x_chart:oferta}
{key:C}
{transpose:2}
[C]oferta
{end_of_x_chart}
`
    expect(inferWrittenKey(src)).toBe('G')
    expect(storedTransposeSemis(src)).toBe(2)
    expect(inferWrittenKey(parse(src).source)).toBe('C')
    expect(parse(src).meta.key).toBe('C')
    expect(parse(src).meta.transpose).toBe(2)
  })

  it('a later zero or empty {transpose} clears the earlier offset', () => {
    const zero = '{key:C}\n{transpose:2}\n{transpose:0}\n[C]uma'
    const empty = '{key:C}\n{transpose:2}\n{transpose:}\n[C]uma'
    expect(storedTransposeSemis(zero)).toBe(0)
    expect(parse(zero).meta.transpose).toBe(0)
    expect(storedTransposeSemis(empty)).toBe(0)
    expect(parse(empty).meta.transpose).toBe(0)

    const siblingKeeps = `{title:Uma}
{x_chart_default:oferta}
{start_of_x_chart:completa}
{key:G}
{transpose:0}
[G]completa [G]mais [G]ainda
{end_of_x_chart}
{start_of_x_chart:oferta}
{key:C}
{transpose:2}
[C]oferta
{end_of_x_chart}
`
    expect(storedTransposeSemis(siblingKeeps)).toBe(2)
    expect(parse(siblingKeeps).meta.transpose).toBe(2)

    const siblingDoesNotInvent = `{title:Uma}
{x_chart_default:oferta}
{start_of_x_chart:completa}
{key:G}
{transpose:2}
[G]completa [G]mais [G]ainda
{end_of_x_chart}
{start_of_x_chart:oferta}
{key:C}
{transpose:2}
{transpose:0}
[C]oferta
{end_of_x_chart}
`
    expect(storedTransposeSemis(siblingDoesNotInvent)).toBe(0)
    expect(parse(siblingDoesNotInvent).meta.transpose).toBe(0)
    expect(parse(siblingDoesNotInvent, { chartId: 'completa' }).meta.transpose).toBe(2)
  })
})

function mustStrum(raw: string) {
  const parsed = parseXStrum(raw)
  if (!parsed) throw new Error(`bad strum ${raw}`)
  return parsed
}

describe('applyCifraClubEnrich strum clear on an envelope', () => {
  it('drops a stale x_strum_set on the default chart and leaves the sibling', () => {
    const src = `{title:Uma}
{x_chart_default:oferta}
{start_of_x_chart:completa}
{key:G}
{x_strum:bpm=40;meter=4/4;grid=4;label=Sib;pat=DUDU}
{x_strum_set:0|bpm=40;meter=4/4;grid=4;label=Sib;pat=DUDU|bpm=50;meter=4/4;grid=4;label=Sib2;pat=UDUD}
[G]linha completa
{end_of_x_chart}
{start_of_x_chart:oferta}
{key:C}
{x_strum:bpm=60;meter=4/4;grid=4;label=A;pat=DUDU}
{x_strum_set:0|bpm=60;meter=4/4;grid=4;label=A;pat=DUDU|bpm=70;meter=4/4;grid=4;label=B;pat=UDUD}
[C]linha oferta
{end_of_x_chart}
`
    const next = applyCifraClubEnrich(
      src,
      {
        proposed: {},
        patch: {},
        conflicts: [],
        youtube: null,
        capoWarning: null,
        strumMissing: false,
        strumConflict: {
          local: {
            activeIndex: 0,
            patterns: [
              mustStrum('bpm=60;meter=4/4;grid=4;label=A;pat=DUDU'),
              mustStrum('bpm=70;meter=4/4;grid=4;label=B;pat=UDUD'),
            ],
          },
          remote: {
            activeIndex: 0,
            patterns: [mustStrum('bpm=80;meter=4/4;grid=4;label=CC;pat=DUDU')],
          },
        },
      },
      { strum: 'replace' },
    )
    const oferta = chartBlock(next, 'oferta')
    const completa = chartBlock(next, 'completa')
    expect(oferta).toContain('label=CC')
    expect(oferta).not.toContain('x_strum_set')
    expect(oferta).toContain('[C]linha oferta')
    expect(completa).toBe(chartBlock(src, 'completa'))
    expect(completa).toContain('x_strum_set')
    expect(next).toContain('{start_of_x_chart:completa}')
    expect(next).toContain('{start_of_x_chart:oferta}')
  })
})


