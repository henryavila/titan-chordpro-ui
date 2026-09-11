import type { ThemeId } from '@henryavila/titan-chordpro-ui'
import type { ModesProp } from '@henryavila/titan-chordpro-ui/vue'

export type Surface = 'standalone' | 'site'
export type ListaMode = 'off' | 'juntas' | 'demanda'
export type DemoGroupId = 'incorporar' | 'criar' | 'acento' | 'host'

export type DemoPage = {
  id: 'standalone' | 'standalone-lista' | 'site' | 'site-lista'
  href: string
  surface: Surface
  lista: boolean
}

export type DemoLink = { href: string; label: string }

export type DemoEntry = {
  id: string
  href: string
  group: DemoGroupId
  kicker: string
  title: string
  blurb: string
  /** Compact `<ChordproViewer>` call for this composition. */
  call: string
  /** Named or hex swatch, when this demo is about the host primary. */
  swatch?: string
  /** Same cell, another file or prop — not a fifth state. */
  extra?: readonly DemoLink[]
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
    id: 'incorporar',
    title: 'Incorporar',
    lead: 'Standalone = a cifra é a tela. No shell = o consumer envolve. A apresentação é a lista ao vivo (`songs`), não outro componente.',
  },
  {
    id: 'criar',
    title: 'Criar',
    lead: 'Importar ou começar em branco. Vira a cifra do sistema.',
  },
  {
    id: 'acento',
    title: 'Acento',
    lead: 'O host escolhe uma cor. Soft, borda, glow e o anel de foco saem dela.',
  },
  {
    id: 'host',
    title: 'Não copie',
    lead: 'O ancestral sem altura. A guarda avisa; o dock cai abaixo da dobra.',
  },
]

export const DEMOS: readonly DemoEntry[] = [
  {
    id: 'standalone',
    href: '/standalone.html',
    group: 'incorporar',
    kicker: 'Standalone',
    title: 'Uma cifra',
    blurb: 'A cifra é a página. Rota 100dvh, sem shell.',
    call: `<ChordproViewer
  :source="cho"
  :song-id="id"
/>`,
    extra: [
      { href: '/standalone.html?song=013-ele-vive-em-mim', label: 'Partitura e TAB' },
      { href: '/standalone.html?modes=none', label: 'Só leitura' },
      { href: '/standalone.html?modes=local', label: 'Só para mim' },
      { href: '/standalone.html?modes=content', label: 'Para todos' },
    ],
  },
  {
    id: 'standalone-apresentacao',
    href: '/standalone-lista.html',
    group: 'incorporar',
    kicker: 'Standalone',
    title: 'Apresentação',
    blurb: 'Lista ao vivo: anterior, próxima, lugar por música. Cada item já traz o ChordPro.',
    call: `<ChordproViewer :songs="songs" />`,
    extra: [
      { href: '/standalone-lista.html?ensaio=demanda', label: 'Fontes sob demanda' },
    ],
  },
  {
    id: 'shell',
    href: '/site.html',
    group: 'incorporar',
    kicker: 'No shell',
    title: 'Uma cifra',
    blurb: 'O Vue no meio da página do consumer: conteúdo acima e abaixo. Não é iframe.',
    call: `<ChordproViewer
  :source="cho"
  :song-id="id"
  theme="light"
  theme-control="host"
/>`,
  },
  {
    id: 'shell-apresentacao',
    href: '/site-lista.html',
    group: 'incorporar',
    kicker: 'No shell',
    title: 'Apresentação',
    blurb: 'A mesma lista ao vivo, no shell do site. Trocar de música é do Titan.',
    call: `<ChordproViewer
  :songs="songs"
  theme="light"
  theme-control="host"
/>`,
  },
  {
    id: 'criar',
    href: '/standalone.html?criar=1',
    group: 'criar',
    kicker: 'Standalone',
    title: 'Cifra nova',
    blurb: 'Importar (link, arquivo, texto, PDF) ou começar em branco.',
    call: `<ChordproViewer
  source=""
  song-id="vazio"
  modes="content"
  :fetch-chart="fetchChart"
  :read-pdf="pdfText"
/>`,
  },
  {
    id: 'accent-verde',
    href: '/standalone.html?accent=verde',
    group: 'acento',
    kicker: 'Standalone',
    title: 'Verde',
    blurb: 'O par medido contra os dois temas. Default se o host não passa nada.',
    swatch: '#84DFA6',
    call: `<ChordproViewer
  :source="cho"
  :song-id="id"
  accent="verde"
/>`,
  },
  {
    id: 'accent-teal',
    href: '/standalone.html?accent=teal',
    group: 'acento',
    kicker: 'Standalone',
    title: 'Teal',
    blurb: 'O outro nome. Claro e escuro saem da mesma matiz.',
    swatch: '#6FD8E4',
    call: `<ChordproViewer
  :source="cho"
  :song-id="id"
  accent="teal"
/>`,
  },
  {
    id: 'accent-hex',
    href: '/standalone.html?accent=%234F46E5',
    group: 'acento',
    kicker: 'Standalone',
    title: 'Cor do host',
    blurb: 'Qualquer #hex. Light e dark derivam da matiz; o resto é variação.',
    swatch: '#4F46E5',
    call: `<ChordproViewer
  :source="cho"
  :song-id="id"
  accent="#4F46E5"
/>`,
  },
  {
    id: 'accent-shell',
    href: '/site.html?accent=teal&tema=claro',
    group: 'acento',
    kicker: 'No shell',
    title: 'Teal no claro',
    blurb: 'Mesma primária no papel do host. O teal escurece no tema light.',
    swatch: '#0E6E7D',
    call: `<ChordproViewer
  :source="cho"
  :song-id="id"
  accent="teal"
  theme="light"
  theme-control="host"
/>`,
  },
  {
    id: 'quebrar',
    href: '/standalone.html?quebrar=1',
    group: 'host',
    kicker: 'Não copie',
    title: 'Frame sem altura',
    blurb: 'O ancestral não tem height. A guarda avisa, o dock cai abaixo da dobra.',
    warn: true,
    call: `<ChordproViewer
  :source="cho"
  :song-id="id"
/>`,
  },
]

export function demosOf(group: DemoGroupId): DemoEntry[] {
  return DEMOS.filter((d) => d.group === group)
}

const INTENT = new Set(['ficha', 'ensaio', 'song', 'quebrar', 'tema', 'criar', 'modes', 'accent'])

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
  /** Host primary: named accent or `#hex`. */
  accent: string | null
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
    accent: p.get('accent'),
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
