import type {
  AccentProp,
  ChartStore,
  Lens,
  SaveStrumPresetPayload,
  StrumPreset,
  Suggestion,
  SuggestionStatus,
  ThemeId,
} from '@henryavila/titan-chordpro-ui'
import type { LoadSong, SetlistSong } from './use/useSetlist'

export type { LoadSong, SetlistSong, Lens, SaveStrumPresetPayload, StrumPreset }

/** A score the host already has on file, offered when inserting `{image:}`. */
export type ImageChoice = { file: string; label?: string }

/**
 * Active write role while editing: personal overlay on this device, or the
 * official chart the host persists (`save-content`).
 */
export type WriteMode = 'local' | 'persisted'
/** Host mount role — one value per instance. Orthogonal to chrome `mode` (view|edit). */
export type EditMode = 'local' | 'persisted' | 'none'
/**
 * @deprecated Use `editMode`. `content` → `persisted`; `both` warns and maps to `local`.
 */
export type ModesProp = 'none' | 'local' | 'content' | 'both' | 'persisted'

/** Chrome rehearsal profile — orthogonal to reading `lens`. */
export type RehearsalFocus = 'off' | 'batida'

let bothWarned = false

/** Resolve the single write role for this mount (editMode wins over deprecated modes). */
export function resolveEditMode(props: {
  editMode?: EditMode
  modes?: ModesProp
}): EditMode {
  if (props.editMode) return props.editMode
  const m = props.modes ?? 'local'
  if (m === 'none') return 'none'
  if (m === 'persisted' || m === 'content') return 'persisted'
  if (m === 'both') {
    if (!bothWarned && typeof console !== 'undefined') {
      bothWarned = true
      console.warn(
        '[titan-chordpro-ui] modes="both" is deprecated; use editMode="local" or editMode="persisted". Treating as local.',
      )
    }
    return 'local'
  }
  return 'local'
}

export type ViewerCapabilities = {
  sourcePane?: boolean
  /**
   * Host-owned strum presets on the Batida sheet (list + “Salvar como preset”).
   * Off by default — pass `true` and feed `strumPresets`.
   */
  batidaPresets?: boolean
}

/** Cover or lyric-slide background the host wants in the `.slja`. */
export type SlideImage = Blob | ArrayBuffer | Uint8Array

/**
 * Host-facing props of `<ChordproViewer>`. Test-only knobs stay off this type.
 */
export type ChordproViewerProps = {
  source?: string
  mode?: 'view' | 'edit'
  /** Initial fallback in preference mode; authoritative value in host mode. */
  theme?: ThemeId
  /** Default preference: musician choice persists. Host: prop always wins. */
  themeControl?: 'preference' | 'host'
  /**
   * Reading lens: chord names, Nashville degrees, or lyrics only.
   * `'letra'` is the singer view (no chords / tab / score). Survives song
   * changes in a setlist; the musician can still switch from the UI.
   */
  lens?: Lens
  /**
   * Hide rehearsal `{c:}` comments in the reading projection only.
   * Same lifetime as `lens` — persists across songs in a setlist.
   */
  hideComments?: boolean
  /**
   * Rehearsal chrome focus. `'batida'` opens Ensaio Batida (strip + batida
   * sound on Rolar). Orthogonal to `lens`. Session-scoped by default; song
   * changes reset to `off` unless the host keeps the prop set.
   */
  rehearsalFocus?: RehearsalFocus
  loading?: boolean
  autoHide?: boolean
  /**
   * Whether the chart is fitted to the space it has before the musician says
   * anything. On by default; a host that wants the chart at its written size
   * passes `false`. Either way the reader's own toggle wins from then on.
   */
  fitDefault?: boolean
  canEdit?: boolean
  autoInvertScores?: boolean
  /** Maps a `{image:}` reference to a URL the host can serve. */
  resolveImage?: (src: string) => string
  /**
   * Write role for this mount. One value — the host already knows frontend vs
   * backend. Default `local`. `persisted` enables official saves + suggestion queue.
   * Orthogonal to chrome `mode` (`view` | `edit`).
   */
  editMode?: EditMode
  /**
   * @deprecated Use `editMode`. `content` maps to `persisted`; `both` → `local` + warning.
   */
  modes?: ModesProp
  /** Whether a reader may send their adjustments to whoever owns the chart. */
  suggestions?: boolean
  /**
   * Opaque id stamped on suggestions from this mount (host-scoped). Used to
   * filter “minhas sugestões” without auth inside the package.
   */
  actorKey?: string
  /**
   * Optional display name prefilled on “Sugerir”. The musician can edit it;
   * the typed name is stamped on the suggestion and shown to the reviewer.
   */
  actorName?: string
  /**
   * Full suggestion queue mirror (all statuses). When set, wins over ChartStore
   * for reads; mutations emit `update:suggestionQueue` for the host to persist.
   */
  suggestionQueue?: Suggestion[]
  /** Identity of the chart, so a personal version follows the right song. */
  songId?: string
  /**
   * The rehearsal list. Two or more turn the mode on: the reader gets the
   * list, prev/next and a place kept per song. With one, or none, nothing of
   * it appears and `source` remains the chart on screen.
   * A song that ships its `source` plays offline; the rest are asked for.
   */
  songs?: SetlistSong[]
  /**
   * Asked for a song's ChordPro when the list did not carry it. The viewer
   * keeps what comes back, and prefetches the neighbours so changing song in a
   * rehearsal never waits on the network.
   */
  loadSong?: LoadSong
  /** Version of the official chart: a bump asks the reader what to keep. */
  version?: string
  /** Scores the host can serve, offered when a `{image:}` block is inserted. */
  images?: ImageChoice[]
  /**
   * Colour of the chords, and of everything derived from them.
   * Named `verde` / `teal`, or any host hex / `rgb()` — light and dark are
   * derived from that hue.
   */
  accent?: AccentProp
  /** 0.5–1.5 over the derived fills, edges and glow. The hue does not move. */
  accentStrength?: number
  /**
   * Warn — in the console and on screen — when the host embeds the viewer
   * without giving its parent a height, so the frame collapses to the
   * `min-height` floor and the control bar falls below the fold.
   * Off only for a host that knowingly composes the frame some other way.
   */
  surfaceGuard?: boolean
  /**
   * Where what the viewer remembers is kept. Default is this device's
   * `localStorage`; a host that keeps them on the account passes its own.
   */
  storage?: ChartStore
  capabilities?: ViewerCapabilities
  /**
   * Host catalog of strum presets for the Batida sheet. The package does not
   * ship or persist these — the consumer owns storage and passes the list.
   * Requires `capabilities.batidaPresets: true`.
   */
  strumPresets?: StrumPreset[]
  /**
   * Fetches the page behind a link, for "new chart · import". The browser
   * cannot reach another site from inside the viewer, so this is the host's
   * backend. Without it the Link tab says so rather than pretending.
   */
  fetchChart?: (url: string) => Promise<string>
  /**
   * Fetches a YouTube watch page (or already-parsed duration) so a Cifra Club
   * import can fill `{duration:}`. The core parses the HTML; the host does the
   * network. Without it, duration stays a manual field.
   */
  fetchYoutubeDuration?: (videoId: string) => Promise<string>
  /**
   * Reads a PDF that has text. `pdfText` from `titan-chordpro-ui/pdf` does it;
   * it is a prop so the optional `pdfjs-dist` only loads for a host that wants
   * PDF import. Without it, PDFs are refused up front.
   */
  readPdf?: (file: File) => Promise<string>
  /**
   * Cover JPEG/PNG for the `.slja` (LouvorJA `imagens\Capa.jpg`).
   * Omitted → the package default.
   */
  coverImage?: SlideImage
  /**
   * Background for every lyric slide (`imagens\slides.jpg`).
   * Omitted → the package default. The host overrides both independently.
   */
  slidesImage?: SlideImage
}

export type { SuggestionStatus }

export type ChordproViewerEmits = {
  'update:source': [value: string]
  /** Request only in host mode: the host accepts by updating its theme prop. */
  'update:theme': [value: ThemeId]
  'update:mode': [value: 'view' | 'edit']
  'update:lens': [value: Lens]
  'update:hideComments': [value: boolean]
  'update:rehearsalFocus': [value: RehearsalFocus]
  dirty: [value: boolean]
  save: [value: string]
  /** Official chart save (`editMode="persisted"`). */
  'save-content': [value: string]
  'suggestion-created': [Suggestion]
  'suggestion-accepted': [
    {
      id: string
      songId: string
      opIds: string[]
      status: SuggestionStatus
      officialText: string
    },
  ]
  'suggestion-refused': [
    {
      id: string
      songId: string
      opIds: string[]
      status: SuggestionStatus
    },
  ]
  'update:suggestionQueue': [Suggestion[]]
  /**
   * Musician asked to persist the current batida draft as a preset.
   * Host assigns `id` (if omitted), stores it, and refreshes `strumPresets`.
   */
  'save-strum-preset': [value: SaveStrumPresetPayload]
  state: [value: Record<string, unknown>]
}
