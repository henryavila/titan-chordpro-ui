import type { ThemeId } from 'titan-chordpro-ui'
import type { ModesProp } from 'titan-chordpro-ui/vue'

export type Surface = 'standalone' | 'site'
export type ListaMode = 'off' | 'juntas' | 'demanda'
export type DemoGroupId = 'tocar' | 'escrever' | 'host'

export type DemoPage = {
  id: 'standalone' | 'standalone-lista' | 'site' | 'site-lista'
  href: string
  surface: Surface
  lista: boolean
}

export type DemoEntry = {
  id: string
  href: string
  group: DemoGroupId
  kicker: string
  title: string
  blurb: string
  warn?: boolean
}

export type DemoGroup = {
  id: DemoGroupId
  title: string
  lead: string
}

/**
 * The four HTML files. Everything else is a query on one of these — not a
 * fifth composition, and not a second-class "lab" list.
 */
export const PAGES: readonly DemoPage[] = [
  { id: 'standalone', href: '/standalone.html', surface: 'standalone', lista: false },
  { id: 'standalone-lista', href: '/standalone-lista.html', surface: 'standalone', lista: true },
  { id: 'site', href: '/site.html', surface: 'site', lista: false },
  { id: 'site-lista', href: '/site-lista.html', surface: 'site', lista: true },
]

export const GROUPS: readonly DemoGroup[] = [
  {
    id: 'tocar',
    title: 'Tocar',
    lead: 'A cifra é a página, ou mora numa ficha. Lista é prop, não outra montagem.',
  },
  {
    id: 'escrever',
    title: 'Escrever',
    lead: 'Quem grava para todos cria e importa. Quem só toca personaliza no celular, ou só lê.',
  },
  {
    id: 'host',
    title: 'Host',
    lead: 'O que a guarda faz quando o ancestral não tem altura. Não copie.',
  },
]

export const DEMOS: readonly DemoEntry[] = [
  {
    id: 'palco',
    href: '/standalone.html',
    group: 'tocar',
    kicker: 'Palco',
    title: 'Uma cifra',
    blurb: 'A cifra é a tela: palco, ensaio de pé, rota 100dvh.',
  },
  {
    id: 'palco-lista',
    href: '/standalone-lista.html',
    group: 'tocar',
    kicker: 'Palco',
    title: 'Ensaio',
    blurb: 'Lista, anterior e próxima. Cada música já traz o ChordPro.',
  },
  {
    id: 'ficha',
    href: '/site.html',
    group: 'tocar',
    kicker: 'Ficha',
    title: 'Uma cifra',
    blurb: 'Bloco 100dvh no meio da página, com conteúdo acima e abaixo. Não é iframe.',
  },
  {
    id: 'ficha-lista',
    href: '/site-lista.html',
    group: 'tocar',
    kicker: 'Ficha',
    title: 'Ensaio',
    blurb: 'A ficha passa o repertório. Trocar de música é do Titan.',
  },
  {
    id: 'partitura',
    href: '/standalone.html?song=013-ele-vive-em-mim',
    group: 'tocar',
    kicker: 'Palco',
    title: 'Partitura e TAB',
    blurb: '{sot} na 013 de produção — o editor de partitura abre daqui.',
  },
  {
    id: 'demanda',
    href: '/standalone-lista.html?ensaio=demanda',
    group: 'tocar',
    kicker: 'Palco',
    title: 'Lista que chega depois',
    blurb: 'Só metadados na abertura. loadSong lento, skeleton vivo, uma cifra falha de propósito.',
  },
  {
    id: 'nova',
    href: '/standalone.html?criar=1',
    group: 'escrever',
    kicker: 'Palco',
    title: 'Cifra nova',
    blurb: 'Importar (link, arquivo, texto, PDF) ou começar em branco. Vira a cifra do sistema.',
  },
  {
    id: 'nova-ficha',
    href: '/site.html?criar=1',
    group: 'escrever',
    kicker: 'Ficha',
    title: 'Cifra nova',
    blurb: 'O mesmo fluxo, dentro do chrome do site.',
  },
  {
    id: 'local',
    href: '/standalone.html?modes=local',
    group: 'escrever',
    kicker: 'Palco',
    title: 'Só para mim',
    blurb: 'Overlay neste celular. Sem “para todos”.',
  },
  {
    id: 'todos',
    href: '/standalone.html?modes=content',
    group: 'escrever',
    kicker: 'Palco',
    title: 'Para todos',
    blurb: 'Editar a cifra oficial. Salvar já publica.',
  },
  {
    id: 'leitura',
    href: '/standalone.html?modes=none',
    group: 'escrever',
    kicker: 'Palco',
    title: 'Só leitura',
    blurb: 'Sem chip de editar. O que um site público entrega.',
  },
  {
    id: 'quebrar',
    href: '/standalone.html?quebrar=1',
    group: 'host',
    kicker: 'Não copie',
    title: 'Frame sem altura',
    blurb: 'O ancestral não tem height. A guarda avisa, o dock cai abaixo da dobra.',
    warn: true,
  },
]

export function demosOf(group: DemoGroupId): DemoEntry[] {
  return DEMOS.filter((d) => d.group === group)
}

const INTENT = new Set(['ficha', 'ensaio', 'song', 'quebrar', 'tema', 'criar', 'modes'])

/** Old `/` + query bookmarks land on the matching named page. */
export function hubRedirect(search: string): string | null {
  const p = new URLSearchParams(search)
  if (![...p.keys()].some((key) => INTENT.has(key))) return null
  const ficha = p.get('ficha') === '1'
  const ensaio = p.get('ensaio')
  const criar = p.get('criar') === '1'
  const lista = criar
    ? false
    : ensaio === 'off'
      ? false
      : ensaio === 'juntas' || ensaio === 'demanda' || (ficha && !ensaio)
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
  /** Empty song + content mode: Importar / Começar em branco. */
  criar: boolean
  modes: ModesProp | null
}

export function labQuery(search: string): LabQuery {
  const p = new URLSearchParams(search)
  const tema = p.get('tema')
  const modes = p.get('modes')
  return {
    song: p.get('song'),
    tema: tema === 'claro' || tema === 'escuro' ? tema : null,
    quebrar: p.get('quebrar') === '1',
    carga: p.get('ensaio') === 'demanda' ? 'demanda' : 'juntas',
    criar: p.get('criar') === '1',
    modes:
      modes === 'none' || modes === 'local' || modes === 'content' || modes === 'both'
        ? modes
        : null,
  }
}

/** Creating a chart is always "for everyone". Otherwise the query, or both. */
export function writeModes(lab: LabQuery): ModesProp {
  if (lab.criar) return 'content'
  return lab.modes ?? 'both'
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
