import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { expandDemoHtml } from '../../demo/boot-html'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('demo PWA wiring', () => {
  it('self-hosts Sora and Space Mono, without Google Fonts', () => {
    const css = readFileSync(join(root, 'src/vue/fonts.css'), 'utf8')
    expect(css).toContain("font-family: Sora")
    expect(css).toContain("font-family: 'Space Mono'")
    expect(css).toContain("url('./fonts/sora-latin-400.woff2')")
    expect(readFileSync(join(root, 'src/vue/titan-chordpro.css'), 'utf8')).toContain(
      "@import './fonts.css'",
    )
    expect(readFileSync(join(root, 'demo/boot-shell.css'), 'utf8')).toContain(
      "@import '../src/vue/fonts.css'",
    )
    const boot = readFileSync(join(root, 'demo/boot-html.ts'), 'utf8')
    expect(boot).not.toContain('fonts.googleapis.com')
  })

  it('leaves a boot page without Google Fonts after expanding markers', () => {
    const html = expandDemoHtml(readFileSync(join(root, 'demo/standalone.html'), 'utf8'))
    expect(html).toContain('titan-chordpro-boot')
    expect(html).not.toContain('fonts.googleapis.com')
  })

  it('registers a Workbox SW on the static pages build, as an MPA', () => {
    const vite = readFileSync(join(root, 'vite.config.ts'), 'utf8')
    expect(vite).toContain('VitePWA')
    expect(vite).toContain('navigateFallback: null')
    expect(vite).toContain("display: 'standalone'")
    expect(vite).toContain("globPatterns")
  })
})
