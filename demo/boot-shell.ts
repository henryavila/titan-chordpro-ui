/** Shared boot shell for the static HTML expand and BootShell.vue. No Vite import. */

function text(value: string): string {
  return value.replace(/[&<>]/g, (ch) => (ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : '&gt;'))
}

const KNOWN_THEMES = new Set(['standalone', 'site'])

function themeAttr(theme: string): string {
  // Known tokens have nothing to escape. Still escape every other value.
  if (KNOWN_THEMES.has(theme)) return theme
  return text(theme)
}

export function bootShellHtml(theme: string, title: string, message: string): string {
  return [
    `<div class="titan-chordpro-boot" data-boot-theme="${themeAttr(theme)}" data-boot-shell role="status" aria-busy="true" aria-live="polite">`,
    '  <div class="titan-chordpro-boot-head">',
    '    <span class="titan-chordpro-boot-kicker">titan-chordpro-ui</span>',
    `    <span class="titan-chordpro-boot-title">${text(title)}</span>`,
    '  </div>',
    '  <div class="titan-chordpro-boot-page">',
    '    <div class="titan-chordpro-boot-spin" aria-hidden="true"></div>',
    `    <p class="titan-chordpro-boot-msg">${text(message)}</p>`,
    '  </div>',
    '</div>',
  ].join('\n')
}
