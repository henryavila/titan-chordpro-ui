import type { ChartMeta, KeyRewriteOffer } from '@henryavila/titan-chordpro-ui'

export type FichaFrom = 'url' | 'arquivo' | 'texto' | 'blank' | 'save'

export type FichaOpen = {
  source: string
  meta: ChartMeta
  keyEdit: boolean
  keyRewrite: KeyRewriteOffer | null
  from: FichaFrom
  note: string
}
