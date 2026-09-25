import { describe, expect, it } from 'vitest'
import { exportCho } from '../../src/core/index'

/** Same N>1 file as `TWO_CHART_SOURCE` in charts-envelope.test.ts. */
const TWO_CHART_SOURCE = `{start_of_x_chart:completa}
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

describe('exportCho chart scope', () => {
  it('exports the whole envelope by default', () => {
    const out = exportCho(TWO_CHART_SOURCE)
    expect(out).toContain('{start_of_x_chart:completa}')
    expect(out).toContain('{start_of_x_chart:oferta}')
    expect(out).toContain('corpo da completa')
    expect(out).toContain('corpo da oferta')
  })

  it('exports only the named chart document when scope is chart', () => {
    const out = exportCho(TWO_CHART_SOURCE, { scope: 'chart', chartId: 'oferta' })
    expect(out).toContain('corpo da oferta')
    expect(out).toContain('{key:C}')
    expect(out).not.toContain('corpo da completa')
    expect(out).not.toMatch(/start_of_x_chart/)
    expect(out).not.toContain('{end_of_x_chart}')
  })

  it('scope file keeps both charts even when chartId is passed', () => {
    const out = exportCho(TWO_CHART_SOURCE, { scope: 'file', chartId: 'oferta' })
    expect(out).toContain('{start_of_x_chart:completa}')
    expect(out).toContain('{start_of_x_chart:oferta}')
  })
})
