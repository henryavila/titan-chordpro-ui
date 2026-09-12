/** Interactive identity bar (overlay chrome). */
export type ViewHeadModel = {
  variant: 'phone' | 'wide'
  pageMax: string
  hitClass: string
  setlistOn: boolean
  posLabel: string
  nextChip: string
  title: string
  subtitle: string
  phoneSub: string
  hasKey: boolean
  hasReset: boolean
  toneLabel: string
  playingKey: string
  songKeyCaption: string
  hasCapo: boolean
  capoBtnLabel: string
  capoLabel: string
  capoHint: string
  mapOn: boolean
  twin: boolean
  canRewrite: boolean
  metaKey: string
  metaTempo: string | number | undefined
  metaTime: string | undefined
  metaDuration: string | undefined
  canWinScreen: boolean
  fs: boolean
  fsTitle: string
}
