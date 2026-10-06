import { describe, expect, it } from 'vitest'
import { listCharts } from '../../src/core'
import { allFixtures } from '../../demo/host/charts-all'
import { songsFor, versionPair } from '../../demo/host/charts'
import { applyVariants, joinCharts } from '../../demo/host/chart-variants'

describe('fixture variants become one song', () => {
  it('joins two real charts without dropping either body', () => {
    const file = joinCharts([
      { id: 'padrao', label: 'Padrão', source: '{title:Uma}\n[C]padrao\n', isDefault: true },
      { id: 'oferta', label: 'Oferta', source: '{title:Uma}\n[G]oferta\n' },
    ])
    const charts = listCharts(file)
    expect(charts.map((chart) => chart.label)).toEqual(['Padrão', 'Oferta'])
    expect(charts.find((chart) => chart.isDefault)?.id).toBe('padrao')
    expect(file).toContain('[C]padrao')
    expect(file).toContain('[G]oferta')
  })

  it('folds the SDA pairs and drops the sibling file from the catalog', () => {
    const fixtures = allFixtures()
    expect(fixtures['009-verdadeira-alegria-versao-muralhas']).toBeUndefined()
    expect(fixtures['006-poder-do-amor-h407-versao-hinario-2022']).toBeUndefined()
    const alegria = fixtures['009-verdadeira-alegria'] ?? ''
    const charts = listCharts(alegria)
    expect(charts.map((chart) => chart.label)).toEqual(['Padrão', 'Muralhas'])
    expect(alegria).toContain('alegria')
    expect(charts.find((chart) => chart.isDefault)?.id).toBe('padrao')

    const songs = songsFor(fixtures, 'juntas') ?? []
    const song = songs.find((item) => item.id === '009-verdadeira-alegria')
    expect(song?.chartId).toBe('padrao')
    expect(song?.source).toContain('{x_chart_label:Muralhas}')
    expect(songs[0]?.source).toMatch(/start_of_x_chart/)
  })

  it('pairs Poder do Amor with versions and one song without', () => {
    const pair = versionPair(songsFor(allFixtures(), 'juntas') ?? [])
    expect(pair.map((song) => song.id)).toEqual([
      '006-poder-do-amor-original',
      '001-tudo-que-ha-de-bom-em-mim',
    ])
    expect(listCharts(pair[0]?.source ?? '').map((chart) => chart.label)).toEqual(['Original', 'Hinário'])
    expect(pair[0]?.chartId).toBe('original')
    expect(pair[1]?.source).not.toMatch(/start_of_x_chart/)
    expect(pair[1]?.chartId).toBeUndefined()
  })
})
