import { describe, expect, it } from 'vitest'
import { chartDocument } from '../../src/core'

const TWO_BLOCKS = `{start_of_x_chart:completa}
{title:Uma}
{x_chart_label:Completa}
C    G
Meu farol
{end_of_x_chart}

{start_of_x_chart:oferta}
{title:Uma}
{x_chart_label:Oferta}
{x_chart_default:oferta}
[G]outra letra
{end_of_x_chart}
`

describe('chartDocument exported from the package root', () => {
  it('returns the requested block exactly as written, fences excluded', () => {
    const block = 'C    G\nMeu farol'
    const source = `{start_of_x_chart:completa}\n${block}\n{end_of_x_chart}\n`

    expect(chartDocument(source)).toBe(block)
  })

  it('keeps label, default marker, and tablature inside the block untouched', () => {
    const block = `{x_chart_label:Original}
{x_chart_default:original}
{sot}
e|---0---|
{x_chart_default}
{/sot}`
    const source = `{start_of_x_chart:original}\n${block}\n{end_of_x_chart}\n`

    expect(chartDocument(source, 'original')).toBe(block)
  })

  it('returns the whole file when it has no envelope', () => {
    const source = '{title:Uma}\nC    G\nMeu farol'

    expect(chartDocument(source)).toBe(source)
  })

  it('normalises only line endings', () => {
    const source = '{start_of_x_chart:completa}\r\nC    G\r\nMeu farol\r\n{end_of_x_chart}\r\n'

    expect(chartDocument(source)).toBe('C    G\nMeu farol')
    expect(chartDocument('C    G\rMeu farol')).toBe('C    G\nMeu farol')
  })

  it('falls back to the block that opens when the id does not exist', () => {
    expect(chartDocument(TWO_BLOCKS, 'nao-existe')).toContain('[G]outra letra')
  })
})
