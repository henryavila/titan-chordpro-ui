import type { Plugin } from 'vite'

/**
 * Static flash markup for the demo pages. Markers in each HTML file expand
 * here, before any module runs, to the same font tags and boot shell the
 * pages used to repeat.
 */
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap'

const FONT_LINES = [
  '<link rel="preconnect" href="https://fonts.googleapis.com" />',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
  '<link',
  `  href="${FONT_HREF}"`,
  '  rel="stylesheet"',
  '  media="print"',
  `  onload="this.media='all'"`,
  '/>',
  '<noscript>',
  '  <link',
  `    href="${FONT_HREF}"`,
  '    rel="stylesheet"',
  '  />',
  '</noscript>',
]

function indentLines(lines: string[], indent: string): string {
  return lines.map((line) => indent + line).join('\n')
}

function quotedAttrs(raw: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const match of raw.matchAll(/([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/g)) {
    const name = match[1]
    if (name) out.set(name, match[2] ?? '')
  }
  return out
}

function hasToken(raw: string, token: string): boolean {
  return new RegExp(`(?:^|\\s)${token}(?=\\s|$)`).test(raw)
}

function requiredAttr(attrs: Map<string, string>, name: string, marker: string): string {
  const value = attrs.get(name)
  if (!value) throw new Error(`${marker} is missing ${name}`)
  return value
}

function text(value: string): string {
  return value.replace(/[&<>]/g, (ch) => (ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : '&gt;'))
}

function bootLines(theme: string, title: string, message: string): string[] {
  return [
    `<div class="titan-chordpro-boot" data-boot-theme="${theme}" data-boot-shell role="status" aria-busy="true" aria-live="polite">`,
    '  <div class="titan-chordpro-boot-head">',
    '    <span class="titan-chordpro-boot-kicker">titan-chordpro-ui</span>',
    `    <span class="titan-chordpro-boot-title">${text(title)}</span>`,
    '  </div>',
    '  <div class="titan-chordpro-boot-page">',
    '    <div class="titan-chordpro-boot-spin" aria-hidden="true"></div>',
    `    <p class="titan-chordpro-boot-msg">${text(message)}</p>`,
    '  </div>',
    '</div>',
  ]
}

/** Replace demo font and boot markers. Pages without markers are unchanged. */
export function expandDemoHtml(html: string): string {
  const withFonts = html.replace(
    /^([ \t]*)<!--\s*titan-demo-fonts\b(.*?)-->[ \t]*$/gm,
    (_line, indent: string, raw: string) => {
      const media = requiredAttr(quotedAttrs(raw), 'media', 'titan-demo-fonts')
      if (media !== 'print') throw new Error('titan-demo-fonts media must be "print"')
      return indentLines(FONT_LINES, indent)
    },
  )
  return withFonts.replace(
    /^([ \t]*)<!--\s*titan-demo-boot\b(.*?)-->[ \t]*$/gm,
    (_line, indent: string, raw: string) => {
      if (!hasToken(raw, 'data-boot-shell')) {
        throw new Error('titan-demo-boot is missing data-boot-shell')
      }
      const attrs = quotedAttrs(raw)
      const theme = requiredAttr(attrs, 'theme', 'titan-demo-boot')
      if (theme !== 'standalone' && theme !== 'site') {
        throw new Error(`titan-demo-boot theme must be standalone or site, got ${theme}`)
      }
      const title = requiredAttr(attrs, 'title', 'titan-demo-boot')
      const message = requiredAttr(attrs, 'message', 'titan-demo-boot')
      return indentLines(bootLines(theme, title, message), indent)
    },
  )
}

export function demoBootHtmlPlugin(): Plugin {
  return {
    name: 'titan-demo-boot-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return expandDemoHtml(html)
      },
    },
  }
}
