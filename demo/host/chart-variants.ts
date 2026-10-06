/**
 * Same song, more than one fixture file. The demo joins them into one
 * envelope so the Cifra chip can switch. The files in fixtures/sda stay
 * one chart each.
 */
export type ChartVariant = {
  /** Fixture id (filename without extension). */
  file: string
  id: string
  label: string
}

export type VariantGroup = {
  /** Song id that remains in the catalog. */
  id: string
  /** Opens on this cifra. */
  chartId: string
  charts: ChartVariant[]
}

export const VARIANT_GROUPS: readonly VariantGroup[] = [
  {
    id: '009-verdadeira-alegria',
    chartId: 'padrao',
    charts: [
      { file: '009-verdadeira-alegria', id: 'padrao', label: 'Padrão' },
      { file: '009-verdadeira-alegria-versao-muralhas', id: 'muralhas', label: 'Muralhas' },
    ],
  },
  {
    id: '006-poder-do-amor-original',
    chartId: 'original',
    charts: [
      { file: '006-poder-do-amor-original', id: 'original', label: 'Original' },
      { file: '006-poder-do-amor-h407-versao-hinario-2022', id: 'hinario', label: 'Hinário' },
    ],
  },
  {
    id: '087-jesus-tu-es-a-minha-vida-sobe-o-tom-original',
    chartId: 'sobe',
    charts: [
      { file: '087-jesus-tu-es-a-minha-vida-sobe-o-tom-original', id: 'sobe', label: 'Sobe o tom' },
      {
        file: '087-jesus-tu-es-a-minha-vida-nao-sobe-o-tom-nao-sobe-o-tom',
        id: 'nao_sobe',
        label: 'Não sobe o tom',
      },
    ],
  },
  {
    id: 'h031-jesus-tu-es-a-minha-vida',
    chartId: 'padrao',
    charts: [
      { file: 'h031-jesus-tu-es-a-minha-vida', id: 'padrao', label: 'Padrão' },
      {
        file: 'h031-jesus-tu-es-a-minha-vida-nao-sobe-o-tom-nao-sobe-o-tom',
        id: 'nao_sobe',
        label: 'Não sobe o tom',
      },
    ],
  },
]

export function joinCharts(
  parts: { id: string; label: string; source: string; isDefault?: boolean }[],
): string {
  return (
    parts
      .map((part) => {
        const body = part.source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim()
        const head = [
          `{start_of_x_chart:${part.id}}`,
          `{x_chart_label:${part.label}}`,
          ...(part.isDefault ? [`{x_chart_default:${part.id}}`] : []),
        ]
        return [...head, body, `{end_of_x_chart}`].join('\n')
      })
      .join('\n\n') + '\n'
  )
}

/** Fold variant files into the kept song id. Missing files leave the map alone. */
export function applyVariants(fixtures: Record<string, string>): Record<string, string> {
  const next = { ...fixtures }
  for (const group of VARIANT_GROUPS) {
    const parts = group.charts.map((chart) => ({
      ...chart,
      source: next[chart.file],
    }))
    if (parts.some((part) => typeof part.source !== 'string' || !part.source.trim())) continue
    next[group.id] = joinCharts(
      parts.map((part) => ({
        id: part.id,
        label: part.label,
        source: part.source as string,
        isDefault: part.id === group.chartId,
      })),
    )
    for (const chart of group.charts) {
      if (chart.file !== group.id) delete next[chart.file]
    }
  }
  return next
}
