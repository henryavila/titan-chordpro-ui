import type { AccentProp, ChartStore, Lens, ThemeId } from '@henryavila/titan-chordpro-ui'
import type { LoadSong, SetlistSong } from './use/useSetlist'

export type { LoadSong, SetlistSong, Lens }

/** A score the host already has on file, offered when inserting `{image:}`. */
export type ImageChoice = { file: string; label?: string }

/** How a save lands: on this phone only, or on the chart everyone reads. */
export type WriteMode = 'local' | 'content'
export type ModesProp = 'none' | 'local' | 'content' | 'both'

export type ViewerCapabilities = { sourcePane?: boolean }

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
   * Which edit surfaces this host turns on.
   * Default `local`: only "Só para mim". `content` / `both` is how the host
   * activates "Para todos" (emits `save-content` for the consumer to persist).
   */
  modes?: ModesProp
  /** Whether a reader may send their adjustments to whoever owns the chart. */
  suggestions?: boolean
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

export type ChordproViewerEmits = {
  'update:source': [value: string]
  /** Request only in host mode: the host accepts by updating its theme prop. */
  'update:theme': [value: ThemeId]
  'update:mode': [value: 'view' | 'edit']
  'update:lens': [value: Lens]
  'update:hideComments': [value: boolean]
  dirty: [value: boolean]
  save: [value: string]
  /** A "for everyone" save: this text is the chart from now on. */
  'save-content': [value: string]
  state: [value: Record<string, unknown>]
}
