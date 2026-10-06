import type { TitanChordproIconName } from '../../icon/paths'

export type ChartOrigin = 'url' | 'file' | 'text'

export const CHART_ORIGINS: Array<{ id: ChartOrigin; title: string; hint: string; icon: TitanChordproIconName }> = [
  { id: 'url', title: 'Cifra Club', hint: 'Link da página', icon: 'link' },
  { id: 'file', title: 'Arquivo', hint: '.cho, texto ou PDF', icon: 'fileInput' },
  { id: 'text', title: 'Texto', hint: 'Colar a cifra', icon: 'alignLeft' },
]
