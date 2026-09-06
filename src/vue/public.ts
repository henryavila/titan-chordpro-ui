import type { AccentProp, ChartStore, ThemeId } from 'titan-chordpro-ui'

/** A score the host already has on file, offered when inserting `{image:}`. */
export type ImageChoice = { file: string; label?: string }

/** How a save lands: on this phone only, or on the chart everyone reads. */
export type WriteMode = 'local' | 'content'
export type ModesProp = 'none' | 'local' | 'content' | 'both'

export type ViewerCapabilities = { sourcePane?: boolean }

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
  loading?: boolean
  autoHide?: boolean
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
   * Where what the viewer remembers is kept. Default is this device's
   * `localStorage`; a host that keeps them on the account passes its own.
   */
  storage?: ChartStore
  capabilities?: ViewerCapabilities
}

export type ChordproViewerEmits = {
  'update:source': [value: string]
  /** Request only in host mode: the host accepts by updating its theme prop. */
  'update:theme': [value: ThemeId]
  'update:mode': [value: 'view' | 'edit']
  dirty: [value: boolean]
  save: [value: string]
  /** A "for everyone" save: this text is the chart from now on. */
  'save-content': [value: string]
  state: [value: Record<string, unknown>]
}
