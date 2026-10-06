import type { ThemeId } from './types'

const KNOWN: ThemeId[] = ['light', 'dark', 'print', 'default', 'stage']

export function listThemes(): string[] {
  return ['light', 'dark', 'print', 'default']
}

export function resolveTheme(theme: ThemeId | string, prefersDark = false): 'light' | 'dark' | 'print' {
  if (theme === 'auto') return prefersDark ? 'dark' : 'light'
  if (theme === 'default') return 'light'
  if (theme === 'stage') return 'dark'
  if (theme === 'light' || theme === 'dark' || theme === 'print') return theme
  throw unknownTheme(theme)
}

export function assertTheme(theme: string): ThemeId {
  if (theme === 'auto') return 'auto'
  if ((KNOWN as string[]).includes(theme)) return theme as ThemeId
  throw unknownTheme(theme)
}

function unknownTheme(theme: string): Error {
  return new Error(`Unknown theme "${theme}". Known: ${listThemes().join(', ')}`)
}

export const THEME_VARS = {
  dark: {
    '--titan-chordpro-canvas': '#0B0D12',
    '--titan-chordpro-veil': 'rgba(20,23,31,0.72)',
    '--titan-chordpro-veil-2': 'rgba(14,17,23,0.86)',
    '--titan-chordpro-line': 'rgba(255,255,255,0.10)',
    '--titan-chordpro-line-soft': 'rgba(255,255,255,0.06)',
    '--titan-chordpro-text': '#EAECF2',
    '--titan-chordpro-muted': '#888F9E',
    '--titan-chordpro-lyric': '#C4C9D4',
    '--titan-chordpro-hover': 'rgba(255,255,255,0.08)',
    '--titan-chordpro-surface': 'rgba(255,255,255,0.04)',
    '--titan-chordpro-surface-hover': 'rgba(255,255,255,0.09)',
    '--titan-chordpro-sel': 'rgba(255,255,255,0.10)',
    '--titan-chordpro-sel-line': 'rgba(255,255,255,0.22)',
    '--titan-chordpro-pill': '#E8EAF0',
    '--titan-chordpro-pill-ink': '#13161D',
    '--titan-chordpro-scrim': 'rgba(6,8,12,0.55)',
    '--titan-chordpro-danger': '#FF8574',
    '--titan-chordpro-danger-soft': 'rgba(255,133,116,0.14)',
    '--titan-chordpro-capo': '#6E7686',
    '--titan-chordpro-capo-soft': 'rgba(110,118,134,0.10)',
    '--titan-chordpro-capo-edge': 'rgba(110,118,134,0.22)',
    '--titan-chordpro-shadow': '0 24px 60px -18px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.07)',
    '--titan-chordpro-chord': '#84DFA6',
    '--titan-chordpro-chord-ink': '#10131A',
    '--titan-chordpro-chord-soft': 'rgba(132,223,166,0.10)',
    '--titan-chordpro-chord-edge': 'rgba(132,223,166,0.30)',
    '--titan-chordpro-chord-hover': 'rgba(132,223,166,0.15)',
    '--titan-chordpro-chord-fill': 'rgba(132,223,166,0.17)',
    '--titan-chordpro-block': 'rgba(132,223,166,0.04)',
    '--titan-chordpro-block-line': 'rgba(132,223,166,0.16)',
    '--titan-chordpro-glow': 'rgba(132,223,166,0.06)',
  },
  light: {
    '--titan-chordpro-canvas': '#F5F6F8',
    '--titan-chordpro-veil': 'rgba(255,255,255,0.76)',
    '--titan-chordpro-veil-2': 'rgba(255,255,255,0.92)',
    '--titan-chordpro-line': 'rgba(19,22,29,0.12)',
    '--titan-chordpro-line-soft': 'rgba(19,22,29,0.07)',
    '--titan-chordpro-text': '#13161D',
    '--titan-chordpro-muted': '#5B6270',
    '--titan-chordpro-lyric': '#2B303B',
    '--titan-chordpro-hover': 'rgba(19,22,29,0.06)',
    '--titan-chordpro-surface': 'rgba(19,22,29,0.035)',
    '--titan-chordpro-surface-hover': 'rgba(19,22,29,0.075)',
    '--titan-chordpro-sel': 'rgba(19,22,29,0.07)',
    '--titan-chordpro-sel-line': 'rgba(19,22,29,0.20)',
    '--titan-chordpro-pill': '#1A1D26',
    '--titan-chordpro-pill-ink': '#FFFFFF',
    '--titan-chordpro-scrim': 'rgba(22,25,33,0.38)',
    '--titan-chordpro-danger': '#B02016',
    '--titan-chordpro-danger-soft': 'rgba(176,32,22,0.08)',
    '--titan-chordpro-capo': '#8D94A0',
    '--titan-chordpro-capo-soft': 'rgba(141,148,160,0.08)',
    '--titan-chordpro-capo-edge': 'rgba(141,148,160,0.20)',
    '--titan-chordpro-shadow': '0 20px 44px -20px rgba(18,23,30,0.26), inset 0 1px 0 rgba(255,255,255,0.7)',
    '--titan-chordpro-chord': '#17713C',
    '--titan-chordpro-chord-ink': '#FFFFFF',
    '--titan-chordpro-chord-soft': 'rgba(23,113,60,0.10)',
    '--titan-chordpro-chord-edge': 'rgba(23,113,60,0.30)',
    '--titan-chordpro-chord-hover': 'rgba(23,113,60,0.15)',
    '--titan-chordpro-chord-fill': 'rgba(23,113,60,0.17)',
    '--titan-chordpro-block': 'rgba(23,113,60,0.04)',
    '--titan-chordpro-block-line': 'rgba(23,113,60,0.16)',
    '--titan-chordpro-glow': 'rgba(23,113,60,0.06)',
  },
} as const

/**
 * The chord colour is the one token the host may choose. Both named accents
 * were measured against the two grounds: `#17713C` on `#F5F6F8` is ≈5.3:1 and
 * `#0E6E7D` ≈5.1:1 — AA for normal text either way.
 *
 * A host that is not verde/teal passes a hex (`#4F46E5`) or `rgb(r,g,b)`.
 * Light and dark are derived from that hue at the same lightnesses the named
 * pair uses, so fills/edges/glow still come from one RGB.
 */
export type AccentId = 'verde' | 'teal'
export type AccentProp = AccentId | string

type Swatch = { hex: string; rgb: string }

const ACCENTS: Record<AccentId, Record<'light' | 'dark', Swatch>> = {
  verde: {
    dark: { hex: '#84DFA6', rgb: '132,223,166' },
    light: { hex: '#17713C', rgb: '23,113,60' },
  },
  teal: {
    dark: { hex: '#6FD8E4', rgb: '111,216,228' },
    light: { hex: '#0E6E7D', rgb: '14,110,125' },
  },
}

/** Lightness of verde light / verde dark — the dual-theme pair from one hue. */
const LIGHT_L = 0.27
const DARK_L = 0.7

export function listAccents(): AccentId[] {
  return Object.keys(ACCENTS) as AccentId[]
}

function hexOf(r: number, g: number, b: number): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase()
}

function swatch(r: number, g: number, b: number): Swatch {
  return { hex: hexOf(r, g, b), rgb: `${Math.round(r)},${Math.round(g)},${Math.round(b)}` }
}

function parseColor(input: string): { r: number; g: number; b: number } | null {
  const s = input.trim()
  const hex = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex && hex[1]) {
    let h = hex[1]
    if (h.length === 3) h = [...h].map((c) => c + c).join('')
    return {
      r: Number.parseInt(h.slice(0, 2), 16),
      g: Number.parseInt(h.slice(2, 4), 16),
      b: Number.parseInt(h.slice(4, 6), 16),
    }
  }
  const rgb = s.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (rgb) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) }
  }
  return null
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) / 6
  else if (max === G) h = ((B - R) / d + 2) / 6
  else h = ((R - G) / d + 4) / 6
  return { h, s, l }
}

function hue2rgb(p: number, q: number, t: number): number {
  let T = t
  if (T < 0) T += 1
  if (T > 1) T -= 1
  if (T < 1 / 6) return p + (q - p) * 6 * T
  if (T < 1 / 2) return q
  if (T < 2 / 3) return p + (q - p) * (2 / 3 - T) * 6
  return p
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) {
    const v = l * 255
    return { r: v, g: v, b: v }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  }
}

function resolveAccent(accent: string, mode: 'light' | 'dark'): Swatch {
  if (accent === 'verde' || accent === 'teal') return ACCENTS[accent][mode]
  const c = parseColor(accent)
  if (!c) return ACCENTS.verde[mode]
  const { h, s } = rgbToHsl(c.r, c.g, c.b)
  const { r, g, b } = hslToRgb(h, s, mode === 'light' ? LIGHT_L : DARK_L)
  return swatch(r, g, b)
}

/**
 * The derivatives all come from one RGB at fixed opacities, scaled by
 * `strength`. Deriving them means a host picks a colour, not a palette — the
 * relationships between fill, edge, glow and the focus ring stay as the
 * design set them. `--focus` is the primary itself: the ring sits on the
 * canvas, where that colour was already measured to AA.
 */
export function accentVars(
  accent: AccentProp = 'verde',
  mode: 'light' | 'dark' = 'dark',
  strength = 1,
): Record<string, string> {
  const { hex, rgb } = resolveAccent(accent, mode)
  const k = Math.max(0.5, Math.min(1.5, strength))
  // Two decimals is what the design tokens are written in, so strength 1
  // reproduces them character for character; a scaled value keeps what it needs.
  const f = (o: number) => {
    const n = Number((o * k).toFixed(3))
    const places = Math.max(2, (String(n).split('.')[1] ?? '').length)
    return `rgba(${rgb},${n.toFixed(places)})`
  }
  return {
    '--titan-chordpro-chord': hex,
    '--titan-chordpro-chord-ink': mode === 'light' ? '#FFFFFF' : '#10131A',
    '--titan-chordpro-chord-soft': f(0.1),
    '--titan-chordpro-chord-edge': f(0.3),
    '--titan-chordpro-chord-hover': f(0.15),
    '--titan-chordpro-chord-fill': f(0.17),
    '--titan-chordpro-block': f(0.04),
    '--titan-chordpro-block-line': f(0.16),
    '--titan-chordpro-glow': f(0.06),
    // Focus is the same primary: the ring sits on the canvas, where --chord
    // was already measured to AA. A leftover blue is not a variation.
    '--titan-chordpro-focus': hex,
  }
}

export function themeCssVars(
  theme: 'light' | 'dark' | 'print',
  accent: AccentProp = 'verde',
  strength = 1,
): Record<string, string> {
  const mode = theme === 'print' ? 'light' : theme
  return { ...THEME_VARS[mode], ...accentVars(accent, mode, strength) }
}

export function cssVarsString(
  theme: 'light' | 'dark' | 'print',
  accent: AccentProp = 'verde',
  strength = 1,
): string {
  const vars = themeCssVars(theme, accent, strength)
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
}
