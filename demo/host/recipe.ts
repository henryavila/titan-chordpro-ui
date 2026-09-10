import type { ThemeId } from 'titan-chordpro-ui'

export type Surface = 'standalone' | 'site'
export type ListaMode = 'off' | 'juntas' | 'demanda'

export type DemoPage = {
  id: 'standalone' | 'standalone-lista' | 'site' | 'site-lista'
  href: string
  surface: Surface
  lista: boolean
  kicker: string
  title: string
  useWhen: string
  snippet: string
}

/**
 * The four mounts a consumer actually chooses. Other knobs (theme, edit,
 * lazy load, broken frame) stay as lab flags on these pages — not more pages.
 */
export const DEMOS: readonly DemoPage[] = [
  {
    id: 'standalone',
    href: '/standalone.html',
    surface: 'standalone',
    lista: false,
    kicker: 'Standalone',
    title: 'Uma cifra',
    useWhen:
      'A cifra é a tela: palco, ensaio de pé, rota 100dvh. O host não põe shell em volta.',
    snippet: `<div class="cifra-live">
  <ChordproViewer :source="cho" :song-id="id" />
</div>`,
  },
  {
    id: 'standalone-lista',
    href: '/standalone-lista.html',
    surface: 'standalone',
    lista: true,
    kicker: 'Standalone',
    title: 'Com lista',
    useWhen:
      'O mesmo palco. A lista é prop do host — o Titan não busca repertório sozinho.',
    snippet: `<ChordproViewer
  :songs="repertorio"
  :load-song="buscarCifra"
/>`,
  },
  {
    id: 'site',
    href: '/site.html',
    surface: 'site',
    lista: false,
    kicker: 'Dentro de um site',
    title: 'Uma cifra',
    useWhen:
      'Ficha do site com conteúdo acima e abaixo. O viewer é um bloco 100dvh no fluxo, com snap. Não é iframe.',
    snippet: `<div class="ficha">
  <!-- letra, vídeo, arquivos… -->
  <div class="cifra-frame">
    <ChordproViewer :source="cho" :song-id="id" />
  </div>
</div>`,
  },
  {
    id: 'site-lista',
    href: '/site-lista.html',
    surface: 'site',
    lista: true,
    kicker: 'Dentro de um site',
    title: 'Com lista',
    useWhen:
      'A ficha passa o repertório. Trocar de música é do Titan; qual ensaio existe é do host.',
    snippet: `<div class="cifra-frame">
  <ChordproViewer :songs="repertorio" :load-song="buscarCifra" />
</div>`,
  },
]

export const LAB = [
  {
    href: '/standalone.html?quebrar=1',
    title: 'Frame sem altura',
    note: 'O ancestral não tem height — surfaceGuard avisa. Não copie isto.',
  },
  {
    href: '/standalone-lista.html?ensaio=demanda',
    title: 'Lista sob demanda',
    note: 'songs só com metadados; loadSong traz a cifra (e uma que não chega).',
  },
] as const

const INTENT = new Set(['ficha', 'ensaio', 'song', 'quebrar', 'tema'])

/** Old `/` + query bookmarks land on the matching named page. */
export function hubRedirect(search: string): string | null {
  const p = new URLSearchParams(search)
  if (![...p.keys()].some((key) => INTENT.has(key))) return null
  const ficha = p.get('ficha') === '1'
  const ensaio = p.get('ensaio')
  const lista =
    ensaio === 'off' ? false : ensaio === 'juntas' || ensaio === 'demanda' || (ficha && !ensaio)
  const page = ficha
    ? lista
      ? '/site-lista.html'
      : '/site.html'
    : lista
      ? '/standalone-lista.html'
      : '/standalone.html'
  p.delete('ficha')
  if (ensaio === 'off' || ensaio === 'juntas') p.delete('ensaio')
  const q = p.toString()
  return q ? `${page}?${q}` : page
}

export type LabQuery = {
  song: string | null
  tema: 'claro' | 'escuro' | null
  quebrar: boolean
  carga: 'juntas' | 'demanda'
}

export function labQuery(search: string): LabQuery {
  const p = new URLSearchParams(search)
  const tema = p.get('tema')
  return {
    song: p.get('song'),
    tema: tema === 'claro' || tema === 'escuro' ? tema : null,
    quebrar: p.get('quebrar') === '1',
    carga: p.get('ensaio') === 'demanda' ? 'demanda' : 'juntas',
  }
}

export function hostTheme(surface: Surface, tema: LabQuery['tema']): ThemeId {
  if (tema === 'claro') return 'light'
  if (tema === 'escuro') return 'dark'
  return surface === 'site' ? 'light' : 'auto'
}

/** Ficha → palco of the same list mode, keeping lab flags. */
export function palcoHref(lista: boolean, search: string): string {
  const page = lista ? '/standalone-lista.html' : '/standalone.html'
  const p = new URLSearchParams(search)
  p.delete('ficha')
  const q = p.toString()
  return q ? `${page}?${q}` : page
}
