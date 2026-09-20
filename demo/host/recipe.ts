import type { Lens, ThemeId } from '@henryavila/titan-chordpro-ui'
import type { EditMode, ModesProp } from '@henryavila/titan-chordpro-ui/vue'
import { resolveEditMode } from '@henryavila/titan-chordpro-ui/vue'

export type Surface = 'standalone' | 'site'
export type ListaMode = 'off' | 'juntas' | 'demanda'
export type DemoGroupId = 'incorporar' | 'editar' | 'criar' | 'acento' | 'host'

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
    id: 'editar',
    title: 'Editar',
    lead: 'Um `editMode` por mount. Frontend = local (overlay + sugerir). Backend = persisted (oficial + fila).',
  },
  {
    id: 'criar',
    title: 'Criar',
    lead: 'Importar ou começar em branco. Vira a cifra do sistema (`editMode=persisted`).',
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
    blurb: 'A cifra é a página. Rota 100dvh, sem shell. Default = editMode local.',
    call: `<ChordproViewer
  :source="cho"
  :song-id="id"
  edit-mode="local"
/>`,
    extra: [
      { href: '/standalone.html?song=013-ele-vive-em-mim', label: 'Partitura e TAB' },
      { href: '/standalone.html?audio=1', label: 'Cantado e playback' },
    ],
  },
  {
    id: 'standalone-apresentacao',
    href: '/standalone-lista.html',
    group: 'incorporar',
    kicker: 'Standalone',
    title: 'Apresentação',
    blurb: 'Lista ao vivo: anterior, próxima, lugar por música. Cada item já traz o ChordPro.',
    call: `<ChordproViewer :songs="songs" edit-mode="local" />`,
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
  edit-mode="local"
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
  edit-mode="local"
  theme="light"
  theme-control="host"
/>`,
  },
  {
    id: 'edit-local',
    href: '/standalone.html?editMode=local',
    group: 'editar',
    kicker: 'Frontend',
    title: 'Só para mim + sugerir',
    blurb:
      'Overlay no aparelho. Edite uma linha, abra Minha versão → Sugerir. Depois abra “Para todos” (mesmo song) e revise.',
    call: `<ChordproViewer
  :source="cho"
  :song-id="id"
  edit-mode="local"
  actor-key="demo-musico"
/>`,
  },
  {
    id: 'edit-persisted',
    href: '/standalone.html?editMode=persisted',
    group: 'editar',
    kicker: 'Backend / admin',
    title: 'Para todos + fila',
    blurb:
      'Salvar grava o oficial (`save-content`). Menu · Sugestões dos músicos: preview, Aceitar lote / item.',
    call: `<ChordproViewer
  :source="cho"
  :song-id="id"
  edit-mode="persisted"
/>`,
  },
  {
    id: 'edit-none',
    href: '/standalone.html?editMode=none',
    group: 'editar',
    kicker: 'Leitura',
    title: 'Sem edição',
    blurb: 'Só leitura — sem botão Editar.',
    call: `<ChordproViewer
  :source="cho"
  :song-id="id"
  edit-mode="none"
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
  edit-mode="persisted"
  :fetch-chart="fetchChart"
  :fetch-youtube-duration="fetchYoutubeDuration"
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
    blurb: 'Segundo nome medido. Soft e borda saem do mesmo matiz.',
    swatch: '#2DD4BF',
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
    title: 'Hex do host',
    blurb: 'Qualquer `#hex` / `rgb()`. O Titan deriva soft, edge e glow.',
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

const INTENT = new Set([
  'ficha',
  'ensaio',
  'song',
  'quebrar',
  'tema',
  'criar',
  'modes',
  'editMode',
  'edit-mode',
  'accent',
  'lens',
  'comentarios',
])

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
  /** Empty song + persisted mode: Importar / Começar em branco. */
  criar: boolean
  /** Preferred query: editMode=local|persisted|none */
  editMode: EditMode | null
  /** @deprecated query `modes=` — still parsed for old links */
  modes: ModesProp | null
  /** Host primary: named accent or `#hex`. */
  accent: string | null
  /** Reading lens for the demo / singer URL. */
  lens: Lens | null
  /** Hide rehearsal comments in the reading projection. */
  hideComments: boolean
  /** Paint swipe rails in the rehearsal chart. */
  zonas: boolean
  /** Stamp rehearsal audio on the demo chart: one track, both, or none. */
  audio: false | 'cantado' | 'playback' | 'ambos'
}

function parseEditMode(raw: string | null): EditMode | null {
  if (raw === 'local' || raw === 'persisted' || raw === 'none') return raw
  return null
}

function parseModes(raw: string | null): ModesProp | null {
  if (
    raw === 'none' ||
    raw === 'local' ||
    raw === 'content' ||
    raw === 'both' ||
    raw === 'persisted'
  ) {
    return raw
  }
  return null
}

export function labQuery(search: string): LabQuery {
  const p = new URLSearchParams(search)
  const tema = p.get('tema')
  const lens = p.get('lens')
  return {
    song: p.get('song'),
    tema: tema === 'claro' || tema === 'escuro' ? tema : null,
    quebrar: p.get('quebrar') === '1',
    carga: p.get('ensaio') === 'demanda' ? 'demanda' : 'juntas',
    criar: p.get('criar') === '1',
    editMode: parseEditMode(p.get('editMode') ?? p.get('edit-mode')),
    modes: parseModes(p.get('modes')),
    accent: p.get('accent'),
    lens: lens === 'none' || lens === 'letra' || lens === 'nashville' ? lens : null,
    hideComments: p.get('comentarios') === '0',
    zonas: p.get('zonas') === '1',
    audio: parseDemoAudio(p.get('audio')),
  }
}

function parseDemoAudio(raw: string | null): LabQuery['audio'] {
  if (raw === '1' || raw === 'ambos') return 'ambos'
  if (raw === 'cantado' || raw === 'sung') return 'cantado'
  if (raw === 'playback') return 'playback'
  return false
}

/** Creating a chart is always persisted. Otherwise editMode / modes query, or local. */
export function writeEditMode(lab: LabQuery): EditMode {
  if (lab.criar) return 'persisted'
  return resolveEditMode({ editMode: lab.editMode ?? undefined, modes: lab.modes ?? undefined })
}

/** @deprecated use writeEditMode */
export function writeModes(lab: LabQuery): ModesProp {
  return writeEditMode(lab)
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
