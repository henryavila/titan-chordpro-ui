import { describe, expect, it } from 'vitest'
import { listCharts } from '../../src/core/index'

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
