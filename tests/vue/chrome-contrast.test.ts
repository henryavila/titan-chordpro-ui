import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/vue/cpv.css'), 'utf8')

describe('chrome contrast vs template', () => {
  it('buttons reset UA black via color-scheme + explicit --text', () => {
    expect(css).toMatch(/color-scheme:\s*dark/)
    expect(css).toMatch(/color-scheme:\s*light/)
    expect(css).toMatch(/\.cpv-root button[\s\S]*?color:\s*var\(--text\)/)
    expect(css).toMatch(/appearance:\s*none/)
  })

  it('play/stop icons inherit color instead of initial currentColor black', () => {
    expect(css).toMatch(/\.cpv-icon-play[\s\S]*?color:\s*inherit/)
    expect(css).toMatch(/background-color:\s*currentColor/)
  })
})
