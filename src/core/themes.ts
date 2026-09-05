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
    '--cpv-canvas': '#0B0D12',
    '--cpv-veil': 'rgba(20,23,31,0.72)',
    '--cpv-veil-2': 'rgba(14,17,23,0.86)',
    '--cpv-line': 'rgba(255,255,255,0.10)',
    '--cpv-line-soft': 'rgba(255,255,255,0.06)',
    '--cpv-text': '#EAECF2',
    '--cpv-muted': '#888F9E',
    '--cpv-lyric': '#C4C9D4',
    '--cpv-hover': 'rgba(255,255,255,0.08)',
    '--cpv-surface': 'rgba(255,255,255,0.04)',
    '--cpv-surface-hover': 'rgba(255,255,255,0.09)',
    '--cpv-sel': 'rgba(255,255,255,0.10)',
    '--cpv-sel-line': 'rgba(255,255,255,0.22)',
    '--cpv-pill': '#E8EAF0',
    '--cpv-pill-ink': '#13161D',
    '--cpv-scrim': 'rgba(6,8,12,0.55)',
    '--cpv-danger': '#FF8574',
    '--cpv-danger-soft': 'rgba(255,133,116,0.14)',
    '--cpv-focus': '#9EB8FF',
    '--cpv-capo': '#96A0B4',
    '--cpv-capo-soft': 'rgba(150,160,180,0.12)',
    '--cpv-capo-edge': 'rgba(150,160,180,0.30)',
    '--cpv-shadow': '0 24px 60px -18px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.07)',
    '--cpv-chord': '#84DFA6',
    '--cpv-chord-ink': '#10131A',
    '--cpv-chord-soft': 'rgba(132,223,166,0.10)',
    '--cpv-chord-edge': 'rgba(132,223,166,0.30)',
    '--cpv-chord-hover': 'rgba(132,223,166,0.15)',
    '--cpv-chord-fill': 'rgba(132,223,166,0.17)',
    '--cpv-block': 'rgba(132,223,166,0.04)',
    '--cpv-block-line': 'rgba(132,223,166,0.16)',
    '--cpv-glow': 'rgba(132,223,166,0.06)',
  },
  light: {
    '--cpv-canvas': '#F5F6F8',
    '--cpv-veil': 'rgba(255,255,255,0.76)',
    '--cpv-veil-2': 'rgba(255,255,255,0.92)',
    '--cpv-line': 'rgba(19,22,29,0.12)',
    '--cpv-line-soft': 'rgba(19,22,29,0.07)',
    '--cpv-text': '#13161D',
    '--cpv-muted': '#5B6270',
    '--cpv-lyric': '#2B303B',
    '--cpv-hover': 'rgba(19,22,29,0.06)',
    '--cpv-surface': 'rgba(19,22,29,0.035)',
    '--cpv-surface-hover': 'rgba(19,22,29,0.075)',
    '--cpv-sel': 'rgba(19,22,29,0.07)',
    '--cpv-sel-line': 'rgba(19,22,29,0.20)',
    '--cpv-pill': '#1A1D26',
    '--cpv-pill-ink': '#FFFFFF',
    '--cpv-scrim': 'rgba(22,25,33,0.38)',
    '--cpv-danger': '#B02016',
    '--cpv-danger-soft': 'rgba(176,32,22,0.08)',
    '--cpv-focus': '#2563EB',
    '--cpv-capo': '#5B6270',
    '--cpv-capo-soft': 'rgba(91,98,112,0.09)',
    '--cpv-capo-edge': 'rgba(91,98,112,0.26)',
    '--cpv-shadow': '0 20px 44px -20px rgba(18,23,30,0.26), inset 0 1px 0 rgba(255,255,255,0.7)',
    '--cpv-chord': '#17713C',
    '--cpv-chord-ink': '#FFFFFF',
    '--cpv-chord-soft': 'rgba(23,113,60,0.10)',
    '--cpv-chord-edge': 'rgba(23,113,60,0.30)',
    '--cpv-chord-hover': 'rgba(23,113,60,0.15)',
    '--cpv-chord-fill': 'rgba(23,113,60,0.17)',
    '--cpv-block': 'rgba(23,113,60,0.04)',
    '--cpv-block-line': 'rgba(23,113,60,0.16)',
    '--cpv-glow': 'rgba(23,113,60,0.06)',
  },
} as const

/**
 * The chord colour is the one token the host may choose. Both accents were
 * measured against the two grounds: `#17713C` on `#F5F6F8` is ≈5.3:1 and
 * `#0E6E7D` ≈5.1:1 — AA for normal text either way.
 */
export type AccentId = 'verde' | 'teal'

const ACCENTS: Record<AccentId, Record<'light' | 'dark', { hex: string; rgb: string }>> = {
  verde: {
    dark: { hex: '#84DFA6', rgb: '132,223,166' },
    light: { hex: '#17713C', rgb: '23,113,60' },
  },
  teal: {
    dark: { hex: '#6FD8E4', rgb: '111,216,228' },
    light: { hex: '#0E6E7D', rgb: '14,110,125' },
  },
}

export function listAccents(): AccentId[] {
  return Object.keys(ACCENTS) as AccentId[]
}

/**
 * The seven derivatives all come from one RGB at fixed opacities, scaled by
 * `strength`. Deriving them means a host picks a colour, not a palette — the
 * relationships between fill, edge and glow stay as the design set them.
 */
export function accentVars(
  accent: AccentId | string = 'verde',
  mode: 'light' | 'dark' = 'dark',
  strength = 1,
): Record<string, string> {
  const a = ACCENTS[accent as AccentId] ?? ACCENTS.verde
  const { hex, rgb } = a[mode]
  const k = Math.max(0.5, Math.min(1.5, strength))
  // Two decimals is what the design tokens are written in, so strength 1
  // reproduces them character for character; a scaled value keeps what it needs.
  const f = (o: number) => {
    const n = Number((o * k).toFixed(3))
    const places = Math.max(2, (String(n).split('.')[1] ?? '').length)
    return `rgba(${rgb},${n.toFixed(places)})`
  }
  return {
    '--cpv-chord': hex,
    '--cpv-chord-ink': mode === 'light' ? '#FFFFFF' : '#10131A',
    '--cpv-chord-soft': f(0.1),
    '--cpv-chord-edge': f(0.3),
    '--cpv-chord-hover': f(0.15),
    '--cpv-chord-fill': f(0.17),
    '--cpv-block': f(0.04),
    '--cpv-block-line': f(0.16),
    '--cpv-glow': f(0.06),
  }
}

export function themeCssVars(
  theme: 'light' | 'dark' | 'print',
  accent: AccentId | string = 'verde',
  strength = 1,
): Record<string, string> {
  const mode = theme === 'print' ? 'light' : theme
  return { ...THEME_VARS[mode], ...accentVars(accent, mode, strength) }
}

export function cssVarsString(
  theme: 'light' | 'dark' | 'print',
  accent: AccentId | string = 'verde',
  strength = 1,
): string {
  const vars = themeCssVars(theme, accent, strength)
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
}
