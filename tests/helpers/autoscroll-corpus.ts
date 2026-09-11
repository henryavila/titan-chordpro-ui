/**
 * Diversified production charts for auto-scroll. A fix that only holds on one
 * song is the bug this set exists to catch. Roles are why the chart is here,
 * not a description of the current implementation.
 */
export const AUTOSCROLL_CORPUS = [
  { rel: 'sda/009-verdadeira-alegria.cho', role: 'curta, 135 BPM, {duration: 02:40}' },
  { rel: 'sda/088-minha-ofertinha.cho', role: 'curta, 136 BPM, quase cabe na tela' },
  { rel: 'sda/087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho', role: 'comentários de ensaio + intro x/// longa' },
  { rel: 'sda/013-ele-vive-em-mim.cho', role: 'TAB + intro x/// exacta' },
  { rel: 'sda/005-tua-vontade.cho', role: '6/8 composto' },
  { rel: 'sda/018-te-agradeco.cho', role: '6/8 lento (40 BPM)' },
  { rel: 'sda/084-escuta-meu-clamor.cho', role: '3/4, tom menor' },
  { rel: 'sda/060-deixai-vir-a-mim-os-pequeninos-h588.cho', role: '3/4 hinário, cauda [D]x' },
  { rel: 'sda/082-o-rei-vem-vindo.cho', role: '3/4 sem x///' },
  { rel: 'sda/002-em-gratidao.cho', role: 'refrões iguais, poucas linhas' },
  { rel: 'sda/078-entrega-h310.cho', role: 'caudas cantadas' },
  { rel: 'sda/014-em-ti.cho', role: 'muitos {c:} de ensaio' },
  { rel: 'sda/052-fidelidade-e-missao.cho', role: 'só caudas, sem intro tocada' },
  { rel: 'sda/015-esconderijo.cho', role: 'linhas esparsas — o ajuste muda a folha' },
  { rel: 'sda/010-adora-lo.cho', role: 'densa' },
  { rel: 'sda/094-maranata-ja-2024.cho', role: 'longa' },
  { rel: 'sda/044-eu-creio.cho', role: 'muitos x/// e muita letra' },
] as const

/** Subset the browser actually mounts — real layout, not a height model. */
export const AUTOSCROLL_BROWSER = [
  'sda/009-verdadeira-alegria.cho',
  'sda/088-minha-ofertinha.cho',
  'sda/087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho',
  'sda/013-ele-vive-em-mim.cho',
  'sda/005-tua-vontade.cho',
  'sda/084-escuta-meu-clamor.cho',
  'sda/014-em-ti.cho',
  'sda/015-esconderijo.cho',
] as const

export type ScrollSurface = {
  fit: boolean
  capo: number
  dual: boolean
  topPad: number
  bottomPad: number
  width: number
  viewport: number
}

export const BASE_SURFACE: ScrollSurface = {
  fit: true,
  capo: 0,
  dual: true,
  topPad: 80,
  bottomPad: 140,
  width: 900,
  viewport: 700,
}

/**
 * UI states that change paper without changing the music. Auto-scroll has to
 * keep the same clock in every one of them — that is the isolation.
 */
export const SCROLL_SURFACES: { name: string; patch: Partial<ScrollSurface> }[] = [
  { name: 'leitura (ajuste ligado)', patch: {} },
  { name: 'sem ajuste', patch: { fit: false } },
  { name: 'capo 3 dual', patch: { capo: 3, dual: true } },
  { name: 'capo 3 sem dual', patch: { capo: 3, dual: false } },
  { name: 'pad compacto', patch: { topPad: 48 } },
  { name: 'pad folgado', patch: { topPad: 160 } },
  { name: 'telefone', patch: { width: 390, viewport: 844, topPad: 96 } },
  { name: 'desktop largo', patch: { width: 1280, viewport: 900, topPad: 72 } },
  {
    name: 'telefone + capo dual + ajuste',
    patch: { width: 390, viewport: 844, topPad: 96, capo: 3, dual: true, fit: true },
  },
  {
    name: 'telefone + capo dual sem ajuste',
    patch: { width: 390, viewport: 844, topPad: 96, capo: 3, dual: true, fit: false },
  },
]
