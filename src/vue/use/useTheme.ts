import { THEME_VARS, accentVars } from 'titan-chordpro-ui'
import type { AccentProp, ThemeId } from 'titan-chordpro-ui'

export function applyThemeVars(
  el: HTMLElement,
  mode: 'light' | 'dark',
  accent: AccentProp = 'verde',
  strength = 1,
) {
  const vars = { ...THEME_VARS[mode], ...accentVars(accent, mode, strength) }
  for (const [k, v] of Object.entries(vars)) {
    el.style.setProperty(k, v)
    el.style.setProperty(k.replace('--cpv-', '--'), v)
  }
  el.style.background = vars['--cpv-canvas']
}

export function themeGlyph(theme: ThemeId | string): string {
  if (theme === 'auto') return '◐'
  if (theme === 'light') return '○'
  return '●'
}

export function themeLabel(theme: ThemeId | string): string {
  if (theme === 'auto') return 'Auto'
  if (theme === 'light') return 'Claro'
  return 'Escuro'
}

export function cycleTheme(current: ThemeId | string): ThemeId {
  const o: ThemeId[] = ['auto', 'light', 'dark']
  const i = o.indexOf(current as ThemeId)
  return o[(i + 1) % 3] ?? 'auto'
}
