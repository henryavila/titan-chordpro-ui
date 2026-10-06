import { describe, expect, it } from 'vitest'
import { chartIdFromLabel } from '../../src/core/chart-id'

describe('chartIdFromLabel', () => {
  it('folds the label into the chart id grammar', () => {
    expect(chartIdFromLabel('Louvor', [])).toBe('louvor')
    expect(chartIdFromLabel('Oferta curta', [])).toBe('oferta_curta')
    expect(chartIdFromLabel('Hinário', [])).toBe('hinario')
    expect(chartIdFromLabel('  Versão 2 ', [])).toBe('versao_2')
  })

  it('falls back when the label has no letters or digits', () => {
    expect(chartIdFromLabel('', [])).toBe('versao')
    expect(chartIdFromLabel('---', [])).toBe('versao')
  })

  it('keeps a digit-leading label', () => {
    expect(chartIdFromLabel('082 Rei', [])).toBe('082_rei')
  })

  it('suffixes a taken id', () => {
    expect(chartIdFromLabel('Louvor', ['louvor'])).toBe('louvor_2')
    expect(chartIdFromLabel('Louvor', ['louvor', 'louvor_2'])).toBe('louvor_3')
  })

  it('stops the stem at 48 characters before the suffix', () => {
    const label = 'a'.repeat(80)
    expect(chartIdFromLabel(label, [])).toBe('a'.repeat(48))
    expect(chartIdFromLabel(label, ['a'.repeat(48)])).toBe(`${'a'.repeat(48)}_2`)
  })
})
