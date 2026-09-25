import { describe, expect, it } from 'vitest'
import { chartDocument, readMeta, splitCho, writeChartScopedMeta, writeSongScopedMeta } from '../../src/core/charts'
import {
  ChartEnvelopeError,
  applyCifraClubEnrich,
  audioUrlOf,
  commitChartDocument,
  createSourceSession,
  deleteBlock,
  inferWrittenKey,
  layoutChart,
  listCharts,
  lintSource,
  parse,
  parseXStrum,
  replaceChart,
  rewriteToKey,
  setAudioUrl,
  storedTransposeSemis,
  writeMeta,
  writeStrumPatterns,
} from '../../src/core/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

/** Minimal N>1 file — not an SDA chart. Each block is a complete chart. */
export const TWO_CHART_SOURCE = `{start_of_x_chart:completa}
{title:Uma}
{artist:Alguém}
{x_chart_label:Completa}
{key:G}
{duration:04:26}
[G]corpo da completa
{end_of_x_chart}

{start_of_x_chart:oferta}
{title:Uma}
{artist:Alguém}
{x_chart_label:Oferta}
{x_chart_default:oferta}
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
  it('song target changes the open chart title and leaves both chart keys intact', () => {
    const out = writeMeta(TWO_CHART_SOURCE, { title: 'X' }, { target: 'song' })
    expect(chartBlock(out, 'oferta')).toContain('{title:X}')
    expect(chartBlock(out, 'oferta')).not.toContain('{title:Uma}')
    expect(chartBlock(out, 'completa')).toContain('{title:Uma}')
    expect(out.slice(0, out.indexOf('{start_of_x_chart'))).not.toMatch(/\{title:/)
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

  it('replaceChart drops omitted song identity and does not put the default marker back', () => {
    const file = `{start_of_x_chart:completa}
{x_chart_label:Completa}
{key:G}
{duration:04:26}
[G]corpo da completa
{end_of_x_chart}

{start_of_x_chart:oferta}
{title:Uma}
{subtitle:Sub}
{artist:Alguém}
{x_source:https://example.test/a}
{x_youtube:abcdefghijk}
{x_chart_default:oferta}
{x_chart_label:Oferta}
{key:C}
{duration:02:00}
[C]corpo da oferta
{end_of_x_chart}
`
    const doc = `{title:Nova}\n{key:D}\n[D]nova oferta`
    const out = replaceChart(file, 'oferta', doc)
    const header = out.slice(0, out.indexOf('{start_of_x_chart'))
    expect(header.trim()).toBe('')
    const completa = chartBlock(out, 'completa')
    const oferta = chartBlock(out, 'oferta')
    expect(oferta).toContain('{title:Nova}')
    expect(oferta).not.toContain('{title:Uma}')
    expect(oferta).not.toMatch(/\{subtitle:/)
    expect(oferta).not.toMatch(/\{artist:/)
    expect(oferta).not.toContain('Alguém')
    expect(oferta).not.toMatch(/\{x_source:/)
    expect(oferta).not.toMatch(/\{x_youtube:/)
    expect(oferta).not.toContain('{x_chart_default:')
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

/** Default chart is `completa`, the block that marks itself. */
const DEFAULT_COMPLETA = `{start_of_x_chart:completa}
{title:Uma}
{x_chart_default:completa}
{key:G}
[G]completa
{end_of_x_chart}

{start_of_x_chart:oferta}
{title:Oferta}
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
    const source = `{start_of_x_chart:completa}
{title:Uma}
{x_chart_default:completa}
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
    expect(header).not.toMatch(/\{title:/)
    expect(completa).toContain('{title:Uma}')
  })

  it('a later canonical sound key wins over an earlier alias on a duration-only write', () => {
    const src = `{start_of_x_chart:completa}
{x_chart_default:completa}
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
    const file = `{start_of_x_chart:completa}
{key:G}
{x_audio_sung:https://cdn.example/g.m4a}
{x_strum:bpm=40;meter=4/4;grid=4;label=Sib;pat=DUDU}
[G]completa
{end_of_x_chart}
{start_of_x_chart:oferta}
{title:Uma}
{x_chart_default:oferta}
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
    expect(oferta).toContain('{title:Uma}\n{artist:Alguém}\n\n[C]corpo da oferta\n\n[C]segunda')
    expect(oferta).toContain('{x_chart_label:Oferta}')
    expect(oferta).not.toContain('{x_chart_default:')
    expect(chartBlock(out, 'completa')).toContain('corpo da completa')
    expect(() => splitCho(out)).not.toThrow()
    const ofertaView = parse(out, { chartId: 'oferta' })
    expect(ofertaView.source).toContain('\n\n[C]corpo da oferta\n\n[C]segunda')
    expect(ofertaView.source).toContain('{title:Uma}')
    expect(ofertaView.source).not.toContain('corpo da completa')
  })

  it('lintSource on the chart document ignores a broken sibling and reports the default key', () => {
    const file = `{start_of_x_chart:completa}
{key:G}
{soc}
[G]completa
{end_of_x_chart}
{start_of_x_chart:oferta}
{title:Uma}
{x_chart_default:oferta}
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

  it('keeps raw title bytes inside the chart and refuses text outside the blocks', () => {
    const file = [
      '{start_of_x_chart:completa}',
      '{x_chart_label:Completa}',
      '{key:G}',
      '[G]corpo da completa',
      '{end_of_x_chart}',
      '',
      '{start_of_x_chart:oferta}',
      '{title:Uma }',
      '{artist:Alguém}',
      '{x_chart_label:Oferta}',
      '{x_chart_default:oferta}',
      '{key:C}',
      '[C]corpo da oferta',
      '{end_of_x_chart}',
      '',
    ].join('\n')
    const spaced = commitChartDocument(file, chartDocument(file))
    expect(chartBlock(spaced, 'oferta')).toContain('{title:Uma }')
    expect(chartBlock(spaced, 'oferta')).not.toMatch(/\{title:Uma\}/)
    expect(chartBlock(spaced, 'completa')).toBe(chartBlock(file, 'completa'))
    expect(parse(spaced).source).toContain('{title:Uma }')
    expect(spaced.slice(0, spaced.indexOf('{start_of_x_chart')).trim()).toBe('')

    const outside = ['# antes', '{title:Uma}', file].join('\n')
    expect(() => listCharts(outside)).toThrow(/outside chart blocks/)
    expect(() => parse(outside)).toThrow(/outside chart blocks/)
    expect(() => readMeta(outside)).toThrow(/outside chart blocks/)
    expect(() => writeMeta(outside, { title: 'X' })).toThrow(/outside chart blocks/)
    const lyric = ['[G]acorde fora', file].join('\n')
    expect(() => listCharts(lyric)).toThrow(/outside chart blocks/)
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

  it('a later short title or subtitle is the one parse shows', () => {
    const titled = '{title:First}\n{t:Second}\n[C]song\n'
    expect(parse(titled).meta.title).toBe('Second')
    const savedTitle = writeSongScopedMeta(titled, { subtitle: 'X' })
    expect(parse(savedTitle).meta.title).toBe('Second')
    expect(savedTitle).toContain('{t:Second}')
    expect(savedTitle).toContain('{subtitle:X}')
    expect(savedTitle).toContain('[C]song')

    const sub = '{subtitle:A}\n{st:B}\n[C]song\n'
    expect(parse(sub).meta.subtitle).toBe('B')
    const savedSub = writeSongScopedMeta(sub, { title: 'T' })
    expect(parse(savedSub).meta.subtitle).toBe('B')
    expect(savedSub).toContain('{st:B}')
    expect(savedSub).toContain('{title:T}')
    expect(savedSub).toContain('[C]song')
  })

  it('a credit inside tab or score is not the song credit', () => {
    for (const [open, close] of [
      ['{start_of_tab}', '{end_of_tab}'],
      ['{sot}', '{eot}'],
      ['{start_of_score}', '{end_of_score}'],
      ['{sos}', '{eos}'],
    ]) {
      const src = `{composer:Bach}\n${open}\n{artist:Local}\n${close}\n[C]song\n`
      expect(parse(src).meta.artist).toBe('Bach')
      const saved = writeSongScopedMeta(src, { subtitle: 'X' })
      expect(parse(saved).meta.artist).toBe('Bach')
      expect(readMeta(saved).artist).toBe('Bach')
      const openAt = saved.indexOf(open)
      const closeAt = saved.indexOf(close)
      expect(saved.slice(openAt, closeAt)).toContain('{artist:Local}')
      expect(saved).toContain('{subtitle:X}')
      expect(saved).toContain('[C]song')
    }
  })

  it('an explicit identity edit applies even when the value equals readMeta', () => {
    const artist = writeSongScopedMeta('{artist:Local}\n{composer:Bach}\n[C]song\n', { artist: 'Local' })
    expect(parse(artist).meta.artist).toBe('Local')
    expect(artist).not.toContain('{composer:Bach}')
    expect(artist).toContain('[C]song')

    const title = writeSongScopedMeta('{title:}\n{t:Second}\n[C]song\n', { title: '' })
    expect(parse(title).meta.title).toBeUndefined()
    expect(readMeta(title).title).toBeUndefined()
    expect(title).not.toContain('{t:Second}')
    expect(title).toContain('[C]song')
  })

  it('an unrelated save does not drop the sibling composer', () => {
    const file = [
      '{start_of_x_chart:completa}',
      '{artist:Local}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{composer:Bach}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    expect(parse(file).meta.artist).toBe('Local')
    expect(parse(file, { chartId: 'oferta' }).meta.artist).toBe('Bach')
    const saved = writeSongScopedMeta(file, { subtitle: 'X' })
    expect(parse(saved).meta.artist).toBe('Local')
    expect(parse(saved).meta.subtitle).toBe('X')
    expect(parse(saved, { chartId: 'oferta' }).meta.artist).toBe('Bach')
    expect(chartBlock(saved, 'oferta')).toBe(chartBlock(file, 'oferta'))
    expect(chartBlock(saved, 'completa')).toContain('{subtitle:X}')
  })

  it('does not delete a credit that lives inside tab or score', () => {
    for (const [open, close] of [
      ['{sot}', '{eot}'],
      ['{start_of_tab}', '{end_of_tab}'],
      ['{sos}', '{eos}'],
      ['{start_of_score}', '{end_of_score}'],
    ]) {
      const src = `{artist:Local}\n${open}\n{composer:Bach}\n${close}\n[C]song\n`
      expect(parse(src).meta.artist).toBe('Local')
      const saved = writeSongScopedMeta(src, { subtitle: 'X' })
      expect(parse(saved).meta.artist).toBe('Local')
      expect(saved).toContain('{subtitle:X}')
      const openAt = saved.indexOf(open)
      const closeAt = saved.indexOf(close)
      expect(openAt).toBeGreaterThanOrEqual(0)
      expect(saved.slice(openAt, closeAt)).toContain('{composer:Bach}')
      expect(saved).toContain('[C]song')
    }
  })

  it('an explicit artist edit wins over a credit kept inside a chart tab', () => {
    const file = [
      '{start_of_x_chart:oferta}',
      '{artist:Local}',
      '{sot}',
      '{composer:Bach}',
      '{eot}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    const saved = writeSongScopedMeta(file, { artist: 'Novo' })
    expect(parse(saved).meta.artist).toBe('Novo')
    expect(readMeta(saved).artist).toBe('Novo')
    expect(betweenMarkers(saved, '{sot}', '{eot}')).toContain('{composer:Bach}')
    expect(saved).toContain('[C]oferta')
  })

  it('readMeta agrees with parse after an edit when a tab still holds the old artist', () => {
    const src = '{artist:Local}\n{sot}\n{artist:Bach}\n{eot}\n[C]song\n'
    const saved = writeSongScopedMeta(src, { artist: 'Novo' })
    expect(parse(saved).meta.artist).toBe('Novo')
    expect(readMeta(saved).artist).toBe('Novo')
    const openAt = saved.indexOf('{sot}')
    const closeAt = saved.indexOf('{eot}')
    expect(saved.slice(openAt, closeAt)).toContain('{artist:Bach}')

    const cleared = writeSongScopedMeta(src, { artist: '' })
    expect(parse(cleared).meta.artist).toBeUndefined()
    expect(readMeta(cleared).artist).toBeUndefined()
    expect(cleared.slice(cleared.indexOf('{sot}'), cleared.indexOf('{eot}'))).toContain('{artist:Bach}')
  })

  it('a subtitle edit does not copy an artist out of a chart tab', () => {
    const file = [
      '{start_of_x_chart:oferta}',
      '{artist:Local}',
      '{sot}',
      '{artist:Bach}',
      '{eot}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    const saved = writeSongScopedMeta(file, { subtitle: 'X' })
    expect(parse(saved).meta.artist).toBe('Local')
    expect(readMeta(saved).artist).toBe('Local')
    expect(saved).toContain('{subtitle:X}')
    expect(saved.slice(saved.indexOf('{start_of_x_chart'), saved.indexOf('{sot}'))).toContain('{artist:Local}')
    expect(saved.slice(saved.indexOf('{start_of_x_chart'), saved.indexOf('{sot}'))).not.toContain('Bach')
    expect(betweenMarkers(saved, '{sot}', '{eot}')).toContain('{artist:Bach}')
  })

  it('saving the chart document does not delete a credit that exists only inside tab', () => {
    const file = [
      '{start_of_x_chart:oferta}',
      '{sot}',
      '{composer:Bach}',
      '{eot}',
      '{x_chart_default:oferta}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    const saved = replaceChart(file, 'oferta', chartDocument(file, 'oferta'))
    expect(betweenMarkers(saved, '{sot}', '{eot}')).toContain('{composer:Bach}')
    expect(saved).toContain('[C]oferta')
    expect(saved).toContain('{x_chart_default:oferta}')
  })

  it('a new identity value replaces the alias inside the default chart only', () => {
    const artistFile = [
      '{start_of_x_chart:completa}',
      '{composer:Stay}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{artist:Local}',
      '{x_chart_default:oferta}',
      '{composer:Bach}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    expect(parse(artistFile).meta.artist).toBe('Bach')
    const artistSaved = writeSongScopedMeta(artistFile, { artist: 'Novo' })
    expect(parse(artistSaved).meta.artist).toBe('Novo')
    expect(chartBlock(artistSaved, 'oferta')).not.toContain('composer')
    expect(chartBlock(artistSaved, 'completa')).toBe(chartBlock(artistFile, 'completa'))

    const titleFile = [
      '{start_of_x_chart:completa}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{title:First}',
      '{x_chart_default:oferta}',
      '{t:Second}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    expect(parse(titleFile).meta.title).toBe('Second')
    const titleSaved = writeSongScopedMeta(titleFile, { title: 'Nova' })
    expect(parse(titleSaved).meta.title).toBe('Nova')
    expect(chartBlock(titleSaved, 'oferta')).not.toContain('{t:Second}')
    expect(chartBlock(titleSaved, 'completa')).toBe(chartBlock(titleFile, 'completa'))
  })

  it('counts colonless {transpose} and {key} the way parse does', () => {
    expect(storedTransposeSemis('{key:C}\n{transpose 2}\n[C]uma')).toBe(2)
    expect(storedTransposeSemis('{key C}\n{transpose:2}\n[C]uma')).toBe(2)
  })

  it('keeps {transpose:2} when the sibling chart is in another key', () => {
    const src = `{start_of_x_chart:completa}
{key:G}
[G]completa [G]mais [G]ainda
{end_of_x_chart}
{start_of_x_chart:oferta}
{title:Uma}
{x_chart_default:oferta}
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

    const siblingKeeps = `{start_of_x_chart:completa}
{key:G}
{transpose:0}
[G]completa [G]mais [G]ainda
{end_of_x_chart}
{start_of_x_chart:oferta}
{title:Uma}
{x_chart_default:oferta}
{key:C}
{transpose:2}
[C]oferta
{end_of_x_chart}
`
    expect(storedTransposeSemis(siblingKeeps)).toBe(2)
    expect(parse(siblingKeeps).meta.transpose).toBe(2)

    const siblingDoesNotInvent = `{start_of_x_chart:completa}
{key:G}
{transpose:2}
[G]completa [G]mais [G]ainda
{end_of_x_chart}
{start_of_x_chart:oferta}
{title:Uma}
{x_chart_default:oferta}
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
    const src = `{start_of_x_chart:completa}
{key:G}
{x_strum:bpm=40;meter=4/4;grid=4;label=Sib;pat=DUDU}
{x_strum_set:0|bpm=40;meter=4/4;grid=4;label=Sib;pat=DUDU|bpm=50;meter=4/4;grid=4;label=Sib2;pat=UDUD}
[G]linha completa
{end_of_x_chart}
{start_of_x_chart:oferta}
{title:Uma}
{x_chart_default:oferta}
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

const NOTATION_FENCES = [
  ['{sot}', '{eot}'],
  ['{start_of_tab}', '{end_of_tab}'],
  ['{sos}', '{eos}'],
  ['{start_of_score}', '{end_of_score}'],
] as const

function betweenMarkers(source: string, open: string, close: string): string {
  const openAt = source.indexOf(open)
  const closeAt = source.indexOf(close, openAt + open.length)
  return source.slice(openAt, closeAt)
}


describe('notation inside a chart stays notation', () => {
  it('does not hoist a tab credit out of the chart on round-trip', () => {
    for (const [open, close] of NOTATION_FENCES) {
      const file = [
        '{start_of_x_chart:completa}',
        '{title:Completa}',
        '[G]completa',
        '{end_of_x_chart}',
        '',
        '{start_of_x_chart:oferta}',
        '{title:Oferta}',
        '{x_chart_default:oferta}',
        open,
        '{composer:Bach}',
        '{lyricist:Bach}',
        close,
        '[C]oferta',
        '{end_of_x_chart}',
      ].join('\n')
      const saved = commitChartDocument(file, chartDocument(file))
      expect(saved.slice(0, saved.indexOf('{start_of_x_chart')).trim()).toBe('')
      expect(betweenMarkers(chartBlock(saved, 'oferta'), open, close)).toContain('{composer:Bach}')
      expect(betweenMarkers(chartBlock(saved, 'oferta'), open, close)).toContain('{lyricist:Bach}')
      expect(parse(saved).meta.artist).toBeUndefined()
      expect(parse(saved).meta.title).toBe('Oferta')
      expect(chartBlock(saved, 'completa')).toBe(chartBlock(file, 'completa'))
    }
  })

  it('a title inside tab or score is not the chart title', () => {
    for (const [open, close] of NOTATION_FENCES) {
      const file = [
        '{start_of_x_chart:completa}',
        '{title:Completa}',
        '[G]completa',
        '{end_of_x_chart}',
        '{start_of_x_chart:oferta}',
        '{title:Oferta}',
        '{x_chart_default:oferta}',
        open,
        '{t:Second}',
        close,
        '[C]oferta',
        '{end_of_x_chart}',
      ].join('\n')
      const saved = replaceChart(file, 'oferta', chartDocument(file, 'oferta'))
      expect(parse(saved).meta.title).toBe('Oferta')
      expect(parse(saved, { chartId: 'completa' }).meta.title).toBe('Completa')
      expect(betweenMarkers(chartBlock(saved, 'oferta'), open, close)).toContain('{t:Second}')
      expect(chartBlock(saved, 'completa')).toBe(chartBlock(file, 'completa'))
    }
  })
})

describe('a notation row is not the lyric body', () => {
  it('does not leave a blank before the lyric when a tab staff sits above sound keys', () => {
    const src = ['{sot}', 'e|-----0-----|', '{eot}', '{key:G}', '', '{tempo:72}', '[G]linha'].join('\n')
    const cleared = writeMeta(src, { ...readMeta(src), x_audio_sung: '' })
    expect(cleared).toContain('e|-----0-----|')
    expect(cleared).toContain('[G]linha')
    expect(cleared).not.toMatch(/\n\n\[G\]linha/)
    expect(cleared).toContain('{key:G}')
    expect(cleared).toContain('{tempo:72}')
  })

  it('does not leave a blank before the lyric when a score row sits above sound keys', () => {
    const src = ['{sos}', 'C4 D4 E4', '{eos}', '{key:G}', '', '{tempo:72}', '[G]linha'].join('\n')
    const cleared = writeMeta(src, { ...readMeta(src), x_audio_sung: '' })
    expect(cleared).toContain('C4 D4 E4')
    expect(cleared).toContain('[G]linha')
    expect(cleared).not.toMatch(/\n\n\[G\]linha/)
  })

  it('drops that blank on the default chart and leaves the sibling', () => {
    for (const row of ['e|-----0-----|', 'C4 D4 E4']) {
      const open = row.startsWith('e|') ? '{sot}' : '{sos}'
      const close = row.startsWith('e|') ? '{eot}' : '{eos}'
      const src = [
        '{start_of_x_chart:completa}',
        '{title:Completa}',
        '{key:D}',
        '[D]outro',
        '{end_of_x_chart}',
        '{start_of_x_chart:oferta}',
        open,
        row,
        close,
        '{key:G}',
        '',
        '{tempo:72}',
        '[G]linha',
        '{x_audio_sung:https://cdn.example/c.m4a}',
        '{title:Oferta}',
        '{x_chart_default:oferta}',
        '{end_of_x_chart}',
      ].join('\n')
      const next = setAudioUrl(src, null)
      const oferta = chartBlock(next, 'oferta')
      expect(oferta).toContain(row)
      expect(oferta).toContain('[G]linha')
      expect(oferta).not.toMatch(/\n\n\[G\]linha/)
      expect(oferta).not.toContain('x_audio_sung')
      expect(oferta).toContain('{title:Oferta}')
      expect(chartBlock(next, 'completa')).toBe(chartBlock(src, 'completa'))
      expect(chartBlock(next, 'completa')).toContain('{title:Completa}')
    }
  })
})

describe('the chart that opens marks itself', () => {
  it('uses a self-marker outside tab and score, otherwise the first block', () => {
    const marked = [
      '{start_of_x_chart:completa}',
      '{title:Completa}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{title:Oferta}',
      '{x_chart_default:oferta}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    expect(listCharts(marked).find((c) => c.isDefault)?.id).toBe('oferta')
    expect(parse(marked).meta.title).toBe('Oferta')

    const inTab = [
      '{start_of_x_chart:completa}',
      '{sot}',
      '{x_chart_default:oferta}',
      '{eot}',
      '{title:Completa}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{title:Oferta}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    expect(listCharts(inTab).find((c) => c.isDefault)?.id).toBe('completa')
    expect(parse(inTab).meta.title).toBe('Completa')
    const saved = writeMeta(inTab, { subtitle: 'X' })
    expect(betweenMarkers(chartBlock(saved, 'completa'), '{sot}', '{eot}')).toContain('{x_chart_default:oferta}')
    expect(listCharts(saved).find((c) => c.isDefault)?.id).toBe('completa')
    expect(parse(saved, { chartId: 'oferta' }).meta.title).toBe('Oferta')
  })

  it('refuses a marker that names a different chart, and two self-markers', () => {
    const foreign = [
      '{start_of_x_chart:completa}',
      '{x_chart_default:oferta}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    expect(() => listCharts(foreign)).toThrow(/different chart/)
    expect(() => parse(foreign)).toThrow(/different chart/)
    expect(() => readMeta(foreign)).toThrow(/different chart/)
    expect(() => writeMeta(foreign, { key: 'A' })).toThrow(/different chart/)

    const both = [
      '{start_of_x_chart:completa}',
      '{x_chart_default:completa}',
      '[G]c',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{x_chart_default:oferta}',
      '[C]o',
      '{end_of_x_chart}',
    ].join('\n')
    expect(() => listCharts(both)).toThrow(/more than one/)
  })
})

describe('an eot inside a sibling score is not the tab end', () => {
  it('keeps both charts when the only eot sits inside sos…eos', () => {
    const file = [
      '{start_of_x_chart:completa}',
      '{title:Completa}',
      '{sot}',
      'e|-----0-----|',
      '{start_of_x_chart:oferta}',
      '{title:Oferta}',
      '{x_chart_default:oferta}',
      '{sos}',
      '{eot}',
      '{eos}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    expect(listCharts(file).map((c) => c.id)).toEqual(['completa', 'oferta'])
    expect(listCharts(file).find((c) => c.isDefault)?.id).toBe('oferta')
    expect(parse(file, { chartId: 'completa' }).meta.title).toBe('Completa')
    expect(parse(file).meta.title).toBe('Oferta')
    const completa = splitCho(file).charts.find((c) => c.id === 'completa')?.inner ?? ''
    const oferta = splitCho(file).charts.find((c) => c.id === 'oferta')?.inner ?? ''
    expect(completa).toContain('e|-----0-----|')
    expect(completa).not.toContain('Oferta')
    expect(oferta).toContain('{eot}')
    expect(oferta).toContain('[C]oferta')
  })

  it('keeps both charts when the only eos sits inside sot…eot', () => {
    const file = [
      '{start_of_x_chart:completa}',
      '{title:Completa}',
      '{sos}',
      'C4 D4 E4',
      '{start_of_x_chart:oferta}',
      '{title:Oferta}',
      '{sot}',
      '{eos}',
      '{eot}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    expect(listCharts(file).map((c) => c.id)).toEqual(['completa', 'oferta'])
    expect(splitCho(file).charts.find((c) => c.id === 'oferta')?.inner).toContain('{eos}')
    expect(splitCho(file).charts.find((c) => c.id === 'completa')?.inner).not.toContain('Oferta')
  })
})

describe('a closed tab with many chart fences stays one chart', () => {
  it('hides fences that sit before the real eot, even after a score that contains eot', () => {
    const file = [
      '{start_of_x_chart:unica}',
      '{sot}',
      '{start_of_x_chart:nota}',
      '{sos}',
      '{eot}',
      '{eos}',
      '{eot}',
      '[G]linha',
      '{end_of_x_chart}',
    ].join('\n')
    expect(listCharts(file).map((c) => c.id)).toEqual(['unica'])
    expect(splitCho(file).charts[0]?.inner).toContain('{start_of_x_chart:nota}')
    expect(splitCho(file).charts[0]?.inner).toContain('[G]linha')
  })

  it('stays one chart without rescanning the tab at every fence', () => {
    const fences = Array.from({ length: 4000 }, () => '{start_of_x_chart:nota}')
    const file = ['{start_of_x_chart:unica}', '{sot}', ...fences, '{eot}', '[G]linha', '{end_of_x_chart}'].join('\n')
    const started = performance.now()
    const charts = listCharts(file)
    const elapsed = performance.now() - started
    expect(charts.map((c) => c.id)).toEqual(['unica'])
    expect(splitCho(file).charts[0]?.inner).toContain('{start_of_x_chart:nota}')
    expect(elapsed).toBeLessThan(500)
  })
})

describe('an open tab does not hide the next chart', () => {
  it('keeps the next chart and each title when audio is saved', () => {
    const file = [
      '{start_of_x_chart:completa}',
      '{title:Completa}',
      '{sot}',
      'e|-----0-----|',
      '{start_of_x_chart:oferta}',
      '{title:Oferta}',
      '{x_chart_default:oferta}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    expect(listCharts(file).map((c) => c.id)).toEqual(['completa', 'oferta'])
    expect(parse(file).meta.title).toBe('Oferta')
    expect(parse(file, { chartId: 'completa' }).meta.title).toBe('Completa')
    const saved = setAudioUrl(file, 'https://cdn.example/a.m4a')
    expect(parse(saved).meta.title).toBe('Oferta')
    expect(parse(saved, { chartId: 'completa' }).meta.title).toBe('Completa')
    const completa = splitCho(saved).charts.find((c) => c.id === 'completa')
    const oferta = splitCho(saved).charts.find((c) => c.id === 'oferta')
    expect(completa?.inner).toContain('{title:Completa}')
    expect(completa?.inner).toContain('e|-----0-----|')
    expect(completa?.inner).not.toContain('Oferta')
    expect(oferta?.inner).toContain('{title:Oferta}')
    expect(oferta?.inner).toContain('{x_audio_sung:https://cdn.example/a.m4a}')
    expect(oferta?.inner).toContain('[C]oferta')
  })
})

describe('a write names one chart', () => {
  function pair(): string {
    return [
      '{start_of_x_chart:completa}',
      '{title:First}',
      '{artist:Local}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{title:Second}',
      '{x_chart_default:oferta}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
  }

  it('writeMeta({ title }) changes only the open chart', () => {
    const out = writeMeta(pair(), { title: 'Nova' })
    expect(parse(out).meta.title).toBe('Nova')
    expect(parse(out, { chartId: 'completa' }).meta.title).toBe('First')
    expect(out.slice(0, out.indexOf('{start_of_x_chart')).trim()).toBe('')
    expect(chartBlock(out, 'completa')).toContain('{artist:Local}')
    expect(chartBlock(out, 'oferta')).toContain('[C]oferta')
  })

  it('a subtitle spread does not copy the open title onto the sibling', () => {
    const file = pair()
    const out = writeMeta(file, { ...readMeta(file), subtitle: 'X' })
    expect(parse(out).meta.title).toBe('Second')
    expect(parse(out).meta.subtitle).toBe('X')
    expect(parse(out, { chartId: 'completa' }).meta.title).toBe('First')
    expect(parse(out, { chartId: 'completa' }).meta.subtitle).toBeUndefined()
    expect(chartBlock(out, 'completa')).toContain('{artist:Local}')
    expect(chartBlock(out, 'oferta')).not.toContain('{artist:Local}')
  })

  it('an explicit song artist edit wins over a later composer', () => {
    const src = '{artist:Local}\n{composer:Bach}\n[C]song'
    const out = writeMeta(src, { artist: 'Local' }, { target: 'song' })
    expect(parse(out).meta.artist).toBe('Local')
    expect(out).not.toContain('{composer:Bach}')
    expect(out).toContain('[C]song')
  })

  it('an explicit empty title clears a later short title', () => {
    const src = '{title:}\n{t:Second}\n[C]song'
    const out = writeMeta(src, { title: '' }, { target: 'song' })
    expect(parse(out).meta.title ?? '').toBe('')
    expect(parse(out).meta.title).not.toBe('Second')
    expect(out).not.toContain('Second')
    expect(out).toContain('[C]song')
  })
})

describe('a file with no chart pair still parses', () => {
  it('reads the whole text, including a jesus-style chart', () => {
    const src = loadFixture(JESUS_1)
    const view = parse(src)
    expect(view.meta.title).toBe('087 - Jesus, Tu És a minha vida')
    expect(view.sections.length).toBe(11)
    expect(listCharts(src)).toEqual([{ id: 'default', label: 'default', isDefault: true }])
  })
})

const ALIAS_ENVELOPE = [
  '{start_of_x_chart:completa}',
  '{t:Completa}',
  '{composer:Um}',
  '{key:G}',
  '[G]completa',
  '{end_of_x_chart}',
  '{start_of_x_chart:oferta}',
  '{t:Oferta}',
  '{composer:Dois}',
  '{x_chart_default:oferta}',
  '{key:C}',
  '{tempo:80}',
  '[C]oferta',
  '{end_of_x_chart}',
].join('\n')

function keepsAliases(source: string) {
  const oferta = chartBlock(source, 'oferta')
  const completa = chartBlock(source, 'completa')
  expect(oferta).toContain('{t:Oferta}')
  expect(oferta).toContain('{composer:Dois}')
  expect(oferta).not.toContain('{title:')
  expect(oferta).not.toContain('{artist:')
  expect(completa).toContain('{t:Completa}')
  expect(completa).toContain('{composer:Um}')
  expect(completa).not.toContain('{title:')
  expect(completa).not.toContain('{artist:')
}

describe('a tempo or strum save does not rewrite aliases', () => {
  it('setMeta sends only tempo on an N>1 file', () => {
    const session = createSourceSession({ source: ALIAS_ENVELOPE })
    session.setMeta({ tempo: '100' })
    const out = session.getSource()
    keepsAliases(out)
    expect(chartBlock(out, 'oferta')).toContain('{tempo:100}')
    expect(chartBlock(out, 'oferta')).not.toContain('{tempo:80}')
    expect(chartBlock(out, 'completa')).not.toContain('{tempo:')
    expect(parse(out).meta.tempo).toBe(100)
    expect(parse(out).meta.title).toBe('Oferta')
    expect(parse(out).meta.artist).toBe('Dois')
  })

  it('writeStrumPatterns sends only the strum fields', () => {
    const pat = parseXStrum('bpm=90;meter=4/4;grid=4;label=Nova;pat=DUDU')
    if (!pat) throw new Error('strum')
    const out = writeStrumPatterns(ALIAS_ENVELOPE, { activeIndex: 0, patterns: [pat] })
    keepsAliases(out)
    expect(chartBlock(out, 'oferta')).toContain('label=Nova')
    expect(chartBlock(out, 'completa')).not.toContain('label=Nova')
    expect(chartBlock(out, 'completa')).toBe(chartBlock(ALIAS_ENVELOPE, 'completa'))
  })
})

describe('notation inside tab or score is not the chart header', () => {
  it('readMeta ignores title, artist, audio, and x_chart_default', () => {
    for (const [open, close] of NOTATION_FENCES) {
      const src = [
        open,
        '{t:Hidden}',
        '{composer:Hidden}',
        '{x_audio_sung:https://cdn.example/hidden.m4a}',
        '{x_audio:https://cdn.example/alias.m4a}',
        '{x_chart_default:oferta}',
        close,
        '{title:Real}',
        '{artist:Shown}',
        '{x_audio_sung:https://cdn.example/real.m4a}',
      ].join('\n')
      const meta = readMeta(src)
      expect(meta.title).toBe('Real')
      expect(meta.artist).toBe('Shown')
      expect(meta.x_audio_sung).toBe('https://cdn.example/real.m4a')
      expect(meta.x_chart_default).toBeUndefined()
      expect(src.slice(src.indexOf(open), src.indexOf(close))).toContain('{t:Hidden}')
    }
  })

  it('setAudioUrl of a new URL or a clear wins over x_audio_sung inside tab', () => {
    const flat = ['{sot}', '{x_audio_sung:https://cdn.example/old.m4a}', '{eot}', '{title:Uma}', '[G]linha'].join('\n')
    const next = setAudioUrl(flat, 'https://cdn.example/new.m4a')
    expect(readMeta(next).x_audio_sung).toBe('https://cdn.example/new.m4a')
    expect(audioUrlOf(next)).toBe('https://cdn.example/new.m4a')
    expect(next.slice(next.indexOf('{sot}'), next.indexOf('{eot}'))).toContain('old.m4a')
    const cleared = setAudioUrl(flat, null)
    expect(readMeta(cleared).x_audio_sung).toBeUndefined()
    expect(audioUrlOf(cleared)).toBeNull()
    expect(cleared.slice(cleared.indexOf('{sot}'), cleared.indexOf('{eot}'))).toContain('old.m4a')

    const env = [
      '{start_of_x_chart:completa}',
      '{title:Completa}',
      '[G]c',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{sot}',
      '{x_audio_sung:https://cdn.example/old.m4a}',
      '{eot}',
      '{title:Oferta}',
      '{x_chart_default:oferta}',
      '[C]o',
      '{end_of_x_chart}',
    ].join('\n')
    const saved = setAudioUrl(env, 'https://cdn.example/new.m4a')
    expect(readMeta(saved).x_audio_sung).toBe('https://cdn.example/new.m4a')
    expect(betweenMarkers(chartBlock(saved, 'oferta'), '{sot}', '{eot}')).toContain('old.m4a')
    expect(chartBlock(saved, 'completa')).toBe(chartBlock(env, 'completa'))
    const gone = setAudioUrl(env, null)
    expect(readMeta(gone).x_audio_sung).toBeUndefined()
    expect(audioUrlOf(gone)).toBeNull()
    expect(betweenMarkers(chartBlock(gone, 'oferta'), '{sot}', '{eot}')).toContain('old.m4a')
    expect(chartBlock(gone, 'completa')).toBe(chartBlock(env, 'completa'))
  })
})

describe('replaceChart returns a file splitCho can read', () => {
  it('strips fences, keeps one self-marker, and does not put a removed marker back', () => {
    const file = [
      '{start_of_x_chart:completa}',
      '{title:Completa}',
      '{x_chart_default:completa}',
      '[G]completa',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{title:Oferta}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    const marked = [
      '{start_of_x_chart:oferta}',
      '{title:Nova}',
      '{x_chart_default:oferta}',
      '[C]nova',
      '{end_of_x_chart}',
    ].join('\n')
    const out = replaceChart(file, 'oferta', marked)
    expect(() => splitCho(out)).not.toThrow()
    expect(out.match(/\{start_of_x_chart:/g)).toHaveLength(2)
    expect(out.match(/\{end_of_x_chart\}/g)).toHaveLength(2)
    expect(listCharts(out).find((c) => c.isDefault)?.id).toBe('oferta')
    expect(chartBlock(out, 'oferta')).toContain('{x_chart_default:oferta}')
    expect(chartBlock(out, 'completa')).not.toContain('x_chart_default')
    expect(chartBlock(out, 'completa')).toContain('[G]completa')
    expect(parse(out).meta.title).toBe('Nova')

    const removed = chartDocument(TWO_CHART_SOURCE).replace('{x_chart_default:oferta}\n', '')
    const cleared = commitChartDocument(TWO_CHART_SOURCE, removed)
    expect(cleared).not.toContain('x_chart_default')
    expect(() => splitCho(cleared)).not.toThrow()
    expect(listCharts(cleared).find((c) => c.isDefault)?.id).toBe('completa')
    expect(chartBlock(cleared, 'oferta')).toContain('corpo da oferta')
    expect(chartBlock(cleared, 'completa')).toContain('corpo da completa')
  })

  it('keeps a half-typed default marker on the chart being edited', () => {
    const doc = chartDocument(TWO_CHART_SOURCE).replace('{x_chart_default:oferta}', '{x_chart_default:ofert}')
    const out = commitChartDocument(TWO_CHART_SOURCE, doc)
    expect(() => splitCho(out)).not.toThrow()
    expect(chartBlock(out, 'oferta')).toContain('{x_chart_default:ofert}')
    expect(chartBlock(out, 'oferta')).toContain('[C]corpo da oferta')
    expect(chartBlock(out, 'completa')).toContain('[G]corpo da completa')
    expect(out.slice(0, out.indexOf('{start_of_x_chart')).trim()).toBe('')
    expect(listCharts(out).find((c) => c.isDefault)?.id).toBe('oferta')
    expect(parse(out).source).toContain('{x_chart_default:ofert}')
    expect(parse(out).source).toContain('corpo da oferta')
    expect(parse(out).source).not.toContain('corpo da completa')
    const again = commitChartDocument(out, parse(out).source)
    expect(parse(again).source).toContain('{x_chart_default:ofert}')
    expect(parse(again).source).toContain('corpo da oferta')
    expect(chartBlock(again, 'completa')).toContain('corpo da completa')
  })

  it('writes the pinned chart when that block is not the one that opens', () => {
    const file = TWO_CHART_SOURCE.replace('{x_chart_default:oferta}\n', '')
    expect(listCharts(file).find((c) => c.isDefault)?.id).toBe('completa')
    const doc = chartDocument(file, 'oferta').replace('corpo da oferta', 'corpo pin')
    const out = commitChartDocument(file, doc, 'oferta')
    expect(chartBlock(out, 'oferta')).toContain('corpo pin')
    expect(chartBlock(out, 'oferta')).not.toContain('corpo da oferta')
    expect(chartBlock(out, 'completa')).toContain('corpo da completa')
    expect(chartBlock(out, 'completa')).not.toContain('corpo pin')
  })

  it('does not write a marker that names the sibling chart', () => {
    const doc = chartDocument(TWO_CHART_SOURCE).replace('{x_chart_default:oferta}', '{x_chart_default:completa}')
    const out = commitChartDocument(TWO_CHART_SOURCE, doc)
    expect(() => splitCho(out)).not.toThrow()
    expect(out).not.toContain('x_chart_default')
    expect(listCharts(out).find((c) => c.isDefault)?.id).toBe('completa')
    expect(chartBlock(out, 'oferta')).toContain('corpo da oferta')
    expect(chartBlock(out, 'completa')).toContain('corpo da completa')
  })
})

describe('no completed pair is one chart', () => {
  it('a title plus one unclosed start is the whole text and does not throw', () => {
    const src = '{title:Uma}\n{start_of_x_chart:completa}\n[G]linha\n'
    expect(() => splitCho(src)).not.toThrow()
    expect(listCharts(src)).toEqual([{ id: 'default', label: 'default', isDefault: true }])
    const view = parse(src)
    expect(view.meta.title).toBe('Uma')
    expect(view.source).toContain('{title:Uma}')
    expect(view.source).toContain('{start_of_x_chart:completa}')
    expect(view.source).toContain('[G]linha')
  })

  it('a completed pair plus other top-level text stays an error', () => {
    const outside = '{title:Fora}\n' + TWO_CHART_SOURCE
    expect(() => splitCho(outside)).toThrow(ChartEnvelopeError)
    expect(() => splitCho(outside)).toThrow(/outside chart blocks/)
    expect(() => listCharts(outside)).toThrow(/outside chart blocks/)
    expect(() => parse(outside)).toThrow(/outside chart blocks/)
    const between = [
      '{start_of_x_chart:completa}',
      '[G]completa',
      '{end_of_x_chart}',
      '{title:Fora}',
      '{start_of_x_chart:oferta}',
      '[C]oferta',
      '{end_of_x_chart}',
    ].join('\n')
    expect(() => splitCho(between)).toThrow(/outside chart blocks/)
  })
})

describe('ChartEnvelopeError is exported', () => {
  it('is the error a broken envelope throws', () => {
    const outside = '{title:Fora}\n' + TWO_CHART_SOURCE
    expect(ChartEnvelopeError).toBeInstanceOf(Function)
    try {
      listCharts(outside)
      throw new Error('listCharts should throw')
    } catch (err) {
      expect(err).toBeInstanceOf(ChartEnvelopeError)
    }
  })
})

describe('open fences stay an envelope', () => {
  const open = [
    '{start_of_x_chart:completa}',
    '{t:Completa}',
    '{composer:Um}',
    '{tempo:80}',
    '[G]completa',
    '{start_of_x_chart:oferta}',
    '{t:Oferta}',
    '{composer:Dois}',
    '{x_chart_default:oferta}',
    '{key:C}',
    '{duration:4:26}',
    '{tempo:90}',
    '[C]oferta',
  ].join('\n')

  it('keeps the ids when no end fence is present and nothing sits outside', () => {
    expect(listCharts(open).map((c) => c.id)).toEqual(['completa', 'oferta'])
    expect(listCharts(open).find((c) => c.isDefault)?.id).toBe('oferta')
    expect(parse(open).meta.title).toBe('Oferta')
    expect(parse(open).source).toContain('[C]oferta')
    expect(parse(open).source).not.toContain('[G]completa')
    expect(parse(open, { chartId: 'completa' }).meta.title).toBe('Completa')
  })

  it('a tempo or strum save does not hoist {t:} or {composer:} above the fence', () => {
    const session = createSourceSession({ source: open })
    session.setMeta({ tempo: '100' })
    const tempo = session.getSource()
    expect(tempo.slice(0, tempo.indexOf('{start_of_x_chart')).trim()).toBe('')
    expect(tempo).not.toContain('{title:')
    expect(tempo).not.toContain('{artist:')
    expect(tempo).toContain('{t:Completa}')
    expect(tempo).toContain('{composer:Um}')
    expect(tempo).toContain('{t:Oferta}')
    expect(tempo).toContain('{composer:Dois}')
    expect(splitCho(tempo).charts.find((c) => c.id === 'oferta')?.inner).toContain('{tempo:100}')
    expect(splitCho(tempo).charts.find((c) => c.id === 'oferta')?.inner).toContain('{duration:4:26}')
    expect(splitCho(tempo).charts.find((c) => c.id === 'completa')?.inner).toContain('{tempo:80}')

    const pat = parseXStrum('bpm=90;meter=4/4;grid=4;label=Nova;pat=DUDU')
    if (!pat) throw new Error('strum')
    const strum = writeStrumPatterns(open, { activeIndex: 0, patterns: [pat] })
    expect(strum.slice(0, strum.indexOf('{start_of_x_chart')).trim()).toBe('')
    expect(strum).not.toContain('{title:')
    expect(strum).not.toContain('{artist:')
    expect(strum).toContain('{t:Oferta}')
    expect(strum).toContain('{composer:Dois}')
    expect(strum).toContain('label=Nova')
    expect(splitCho(strum).charts.find((c) => c.id === 'completa')?.inner).not.toContain('label=Nova')
  })
})

describe('a paste keeps notation fences and refuses a second chart', () => {
  it('strips one wrapping pair and leaves a fence inside tab or score', () => {
    for (const [openFence, closeFence] of [
      ['{sot}', '{eot}'],
      ['{sos}', '{eos}'],
    ] as const) {
      const doc = [
        '{start_of_x_chart:oferta}',
        openFence,
        '{start_of_x_chart:nota}',
        'E|---',
        '{end_of_x_chart}',
        closeFence,
        '[G]linha',
        '{end_of_x_chart}',
      ].join('\n')
      const out = replaceChart(TWO_CHART_SOURCE, 'oferta', doc)
      expect(out).not.toBe(TWO_CHART_SOURCE)
      const inner = splitCho(out).charts.find((c) => c.id === 'oferta')?.inner ?? ''
      expect(inner).toContain('{start_of_x_chart:nota}')
      expect(inner).toContain('{end_of_x_chart}')
      expect(inner).toContain('[G]linha')
      expect(splitCho(out).charts.map((c) => c.id)).toEqual(['completa', 'oferta'])
      expect(chartBlock(out, 'completa')).toContain('corpo da completa')
    }
  })

  it('does not splice when another real chart fence remains', () => {
    const wrappedPair = [
      '{start_of_x_chart:completa}',
      '[G]a',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '[C]b',
      '{end_of_x_chart}',
    ].join('\n')
    expect(replaceChart(TWO_CHART_SOURCE, 'oferta', wrappedPair)).toBe(TWO_CHART_SOURCE)
  })
})

describe('a paste strips one pair with other lines around it', () => {
  it('keeps a comment after the end inside the open chart', () => {
    const doc = '{start_of_x_chart:oferta}\n[G]nova\n{end_of_x_chart}\n{comment:fim}'
    const out = replaceChart(TWO_CHART_SOURCE, 'oferta', doc)
    expect(out).not.toBe(TWO_CHART_SOURCE)
    const inner = splitCho(out).charts.find((c) => c.id === 'oferta')?.inner ?? ''
    expect(inner).toContain('[G]nova')
    expect(inner).toContain('{comment:fim}')
    expect(inner).not.toContain('start_of_x_chart')
    expect(inner).not.toContain('end_of_x_chart')
    expect(chartBlock(out, 'completa')).toContain('corpo da completa')
    expect(out.slice(0, out.indexOf('{start_of_x_chart')).trim()).toBe('')
    expect(() => splitCho(out)).not.toThrow()
  })

  it('keeps a comment before the start inside the open chart', () => {
    const doc = '{comment:antes}\n{start_of_x_chart:oferta}\n[G]nova\n{end_of_x_chart}'
    const out = replaceChart(TWO_CHART_SOURCE, 'oferta', doc)
    expect(out).not.toBe(TWO_CHART_SOURCE)
    const inner = splitCho(out).charts.find((c) => c.id === 'oferta')?.inner ?? ''
    expect(inner).toContain('{comment:antes}')
    expect(inner).toContain('[G]nova')
    expect(inner).not.toContain('start_of_x_chart')
    expect(chartBlock(out, 'completa')).toContain('corpo da completa')
    expect(out.slice(0, out.indexOf('{start_of_x_chart')).trim()).toBe('')
  })

  it('strips a title that sits before the only pair', () => {
    const mid = ['{title:Uma}', '{start_of_x_chart:oferta}', '[G]linha', '{end_of_x_chart}'].join('\n')
    const out = replaceChart(TWO_CHART_SOURCE, 'oferta', mid)
    expect(out).not.toBe(TWO_CHART_SOURCE)
    const inner = splitCho(out).charts.find((c) => c.id === 'oferta')?.inner ?? ''
    expect(inner).toContain('{title:Uma}')
    expect(inner).toContain('[G]linha')
    expect(inner).not.toContain('start_of_x_chart')
    expect(chartBlock(out, 'completa')).toContain('corpo da completa')
    expect(out.slice(0, out.indexOf('{start_of_x_chart')).trim()).toBe('')
  })
})

describe('a notation closer stops at the next chart fence', () => {
  it('lists chart b when the closer sits after that chart', () => {
    for (const [openFence, closeFence, row] of [
      ['{sos}', '{eos}', 'C4 D4 E4'],
      ['{sot}', '{eot}', 'e|-----0-----|'],
    ] as const) {
      const file = [
        '{start_of_x_chart:a}',
        openFence,
        row,
        '{end_of_x_chart}',
        '{start_of_x_chart:b}',
        closeFence,
        '[C]linha b',
        '{end_of_x_chart}',
      ].join('\n')
      expect(listCharts(file).map((c) => c.id)).toEqual(['a', 'b'])
      const a = splitCho(file).charts.find((c) => c.id === 'a')?.inner ?? ''
      const b = splitCho(file).charts.find((c) => c.id === 'b')?.inner ?? ''
      expect(a).toContain(row)
      expect(a).not.toContain('{end_of_x_chart}')
      expect(a).not.toContain('linha b')
      expect(b).toContain('[C]linha b')
      expect(b).toContain(closeFence)
      expect(b).not.toContain(row)
    }
  })
})

describe('alternating notation opens stay bounded', () => {
  it('lists a and b without rescanning each unmatched sos and sot', () => {
    const lines = ['{start_of_x_chart:a}', '{sot}', '{start_of_x_chart:b}']
    for (let i = 0; i < 36; i++) lines.push(i % 2 === 0 ? '{sos}' : '{sot}')
    const file = lines.join('\n')
    const started = performance.now()
    const charts = listCharts(file)
    const elapsed = performance.now() - started
    expect(charts.map((c) => c.id)).toEqual(['a', 'b'])
    expect(elapsed).toBeLessThan(500)
  })
})

describe('a later bare closer does not swallow the next chart', () => {
  it('stops at the end that closes the chart opened before the inner fence', () => {
    for (const [open, close] of [
      ['{sot}', '{eot}'],
      ['{sos}', '{eos}'],
    ] as const) {
      const file = [
        '{start_of_x_chart:completa}',
        open,
        '{start_of_x_chart:nota}',
        '{end_of_x_chart}',
        '{start_of_x_chart:oferta}',
        '{x_chart_default:oferta}',
        close,
      ].join('\n')
      expect(listCharts(file).map((c) => c.id)).toEqual(['completa', 'oferta'])
      expect(listCharts(file).find((c) => c.isDefault)?.id).toBe('oferta')
      const completa = splitCho(file).charts.find((c) => c.id === 'completa')?.inner ?? ''
      const oferta = splitCho(file).charts.find((c) => c.id === 'oferta')?.inner ?? ''
      expect(completa).not.toContain('oferta')
      expect(oferta).toContain('{x_chart_default:oferta}')
      expect(oferta).toContain(close)
    }
  })

  it('an end before the tab closer still leaves the following lyric outside', () => {
    const file = [
      '{start_of_x_chart:a}',
      '{sot}',
      '{end_of_x_chart}',
      '{eot}',
      '[G]fora',
      '{end_of_x_chart}',
    ].join('\n')
    expect(() => listCharts(file)).toThrow(/outside chart blocks/)
  })
})

describe('meta after an embedded closer stays notation', () => {
  it('does not read title, artist, audio, or the default marker before the real closer', () => {
    for (const [open, innerOpen, innerClose, close] of [
      ['{sot}', '{sos}', '{eos}', '{eot}'],
      ['{sos}', '{sot}', '{eot}', '{eos}'],
    ] as const) {
      const embedded = close === '{eot}' ? '{eot}' : '{eos}'
      const file = [
        '{start_of_x_chart:a}',
        '{title:Real}',
        '{artist:Shown}',
        '{x_audio_sung:https://cdn.example/real.m4a}',
        open,
        '{start_of_x_chart:nota}',
        innerOpen,
        embedded,
        innerClose,
        '{title:NOTATION}',
        '{artist:HIDDEN}',
        '{x_audio_sung:https://cdn.example/hidden.m4a}',
        '{x_chart_default:b}',
        close,
        '{end_of_x_chart}',
        '{start_of_x_chart:b}',
        '{title:Other}',
        '[C]b',
        '{end_of_x_chart}',
      ].join('\n')
      expect(() => listCharts(file)).not.toThrow()
      expect(listCharts(file).map((c) => c.id)).toEqual(['a', 'b'])
      expect(listCharts(file).find((c) => c.isDefault)?.id).toBe('a')
      const meta = readMeta(file)
      expect(meta.title).toBe('Real')
      expect(meta.artist).toBe('Shown')
      expect(meta.x_audio_sung).toBe('https://cdn.example/real.m4a')
      expect(meta.x_chart_default).toBeUndefined()
      expect(splitCho(file).charts.find((c) => c.id === 'a')?.inner).toContain('{title:NOTATION}')
    }
  })
})

describe('a reversed paste is not a chart pair', () => {
  it('leaves the file unchanged when the end comes before the start', () => {
    const doc = ['{comment:antes}', '{end_of_x_chart}', '{start_of_x_chart:oferta}', '{comment:depois}'].join('\n')
    expect(replaceChart(TWO_CHART_SOURCE, 'oferta', doc)).toBe(TWO_CHART_SOURCE)
  })

  it('still strips one pair that has other lines around it', () => {
    const doc = [
      '{comment:antes}',
      '{start_of_x_chart:x}',
      '{comment:meio}',
      '{end_of_x_chart}',
      '{comment:depois}',
    ].join('\n')
    const out = replaceChart(TWO_CHART_SOURCE, 'oferta', doc)
    expect(out).not.toBe(TWO_CHART_SOURCE)
    const inner = splitCho(out).charts.find((c) => c.id === 'oferta')?.inner ?? ''
    expect(inner).toContain('{comment:antes}')
    expect(inner).toContain('{comment:meio}')
    expect(inner).toContain('{comment:depois}')
    expect(inner).not.toContain('{start_of_x_chart:')
    expect(inner).not.toContain('{end_of_x_chart}')
    expect(chartBlock(out, 'completa')).toContain('corpo da completa')
    expect(out.slice(0, out.indexOf('{start_of_x_chart')).trim()).toBe('')
  })
})

describe('parse shares the notation boundary with readMeta', () => {
  it('keeps a title inside a closed tab or score out of the parsed chart', () => {
    for (const [open, innerOpen, innerClose, close] of [
      ['{sot}', '{sos}', '{eos}', '{eot}'],
      ['{sos}', '{sot}', '{eot}', '{eos}'],
    ] as const) {
      const embedded = close === '{eot}' ? '{eot}' : '{eos}'
      const file = [
        '{start_of_x_chart:a}',
        '{title:Real}',
        '{artist:Shown}',
        open,
        '{start_of_x_chart:nota}',
        innerOpen,
        embedded,
        innerClose,
        '{title:NOTATION}',
        '{artist:HIDDEN}',
        close,
        '{end_of_x_chart}',
      ].join('\n')
      expect(readMeta(file).title).toBe('Real')
      expect(readMeta(file).artist).toBe('Shown')
      expect(parse(file).meta.title).toBe('Real')
      expect(parse(file).meta.artist).toBe('Shown')

      const savedTitle = writeSongScopedMeta(file, { title: 'Changed' })
      expect(readMeta(savedTitle).title).toBe('Changed')
      expect(parse(savedTitle).meta.title).toBe('Changed')
      expect(parse(savedTitle).meta.artist).toBe('Shown')
      expect(savedTitle).toContain('{title:NOTATION}')

      const savedArtist = writeSongScopedMeta(file, { artist: 'Changed' })
      expect(readMeta(savedArtist).artist).toBe('Changed')
      expect(parse(savedArtist).meta.artist).toBe('Changed')
      expect(parse(savedArtist).meta.title).toBe('Real')
      expect(savedArtist).toContain('{artist:HIDDEN}')
    }
  })
})

describe('alternating notation openers do not grow the call stack', () => {
  it('lists one implicit chart for 8000 unmatched sos and sot lines', () => {
    const lines: string[] = []
    for (let i = 0; i < 8000; i++) lines.push(i % 2 === 0 ? '{sos}' : '{sot}')
    const file = lines.join('\n')
    expect(listCharts(file)).toEqual([{ id: 'default', label: 'default', isDefault: true }])
  })

  function openersThenCharts(openers: number): string {
    const lines = ['{start_of_x_chart:completa}']
    for (let i = 0; i < openers; i++) lines.push(i % 2 === 0 ? '{sos}' : '{sot}')
    lines.push(
      '{start_of_x_chart:nota}',
      '{end_of_x_chart}',
      '{start_of_x_chart:oferta}',
      '{eot}',
      '{end_of_x_chart}',
    )
    return lines.join('\n')
  }

  it('lists completa, nota, and oferta for 20 and 16000 alternating openers', () => {
    for (const n of [20, 16000]) {
      const file = openersThenCharts(n)
      expect(listCharts(file).map((c) => c.id)).toEqual(['completa', 'nota', 'oferta'])
      const completa = splitCho(file).charts.find((c) => c.id === 'completa')?.inner ?? ''
      expect(completa).not.toContain('oferta')
    }
  })
})

describe('a stray end in an implicit chart does not hide the title', () => {
  it('readMeta sees Real, and writing New removes it as the displayed title', () => {
    const src = ['{sot}', '{end_of_x_chart}', '{eot}', '{title:Real}'].join('\n')
    expect(parse(src).meta.title).toBe('Real')
    expect(readMeta(src).title).toBe('Real')
    const saved = writeSongScopedMeta(src, { title: 'New' })
    expect(parse(saved).meta.title).toBe('New')
    expect(readMeta(saved).title).toBe('New')
    expect(saved).not.toContain('{title:Real}')
  })

  it('ends the tab before the chart fence, so deleting it leaves the fence', () => {
    const src = '{sot}\n{end_of_x_chart}\n{title:Real}'
    const view = parse(src)
    const line = view.sections.find((s) => s.kind === 'tab')?.lines[0]
    expect(line?.li0).toBe(0)
    expect(line?.li1).toBe(0)
    const blocks = layoutChart(view)
    const bi = blocks.findIndex((b) => b.kind === 'tab')
    const removed = deleteBlock(src.split('\n'), blocks, bi)
    expect(removed?.lines.join('\n')).toBe('{end_of_x_chart}\n{title:Real}')
  })

  it('parse sees Real after a stray end with no tab closer, before any save', () => {
    const src = ['{sot}', '{end_of_x_chart}', '{title:Real}'].join('\n')
    expect(readMeta(src).title).toBe('Real')
    expect(parse(src).meta.title).toBe('Real')
    const saved = writeChartScopedMeta(src, { tempo: '100' })
    expect(parse(saved).meta.title).toBe('Real')
    expect(readMeta(saved).title).toBe('Real')
    expect(saved).toMatch(/\{tempo:100\}/)
  })
})
