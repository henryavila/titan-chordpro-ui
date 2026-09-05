import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse, renderHtml, listThemes } from '../../src/core/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

const snapDir = join(dirname(fileURLToPath(import.meta.url)), '__snapshots__')
const snapPath = join(snapDir, 'jesus-1-default.html')

describe('renderHtml', () => {
  it('snapshot for jesus-1 theme default', () => {
    const html = renderHtml(parse(loadFixture(JESUS_1)), { theme: 'default' })
    mkdirSync(snapDir, { recursive: true })
    let expected: string | null = null
    try {
      expected = readFileSync(snapPath, 'utf8')
    } catch {
      writeFileSync(snapPath, html)
      expected = html
    }
    expect(html).toBe(expected)
    expect(html).toContain('data-cpv-scroll')
    expect(html).toContain('cpv')
  })

  it('does not strip rehearsal comments', () => {
    const html = renderHtml(parse(loadFixture(JESUS_1)), { theme: 'default' })
    expect(html).toMatch(/INTRODUÇÃO/i)
    expect(html).toMatch(/BEM SUAVE/i)
  })

  it('unknown theme throws', () => {
    expect(() => renderHtml(parse(''), { theme: 'neon' })).toThrow(/Unknown theme/)
  })

  it('print and dark keep lyric text', () => {
    const view = parse(loadFixture(JESUS_1))
    const strip = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')
    const light = strip(renderHtml(view, { theme: 'light' }))
    const dark = strip(renderHtml(view, { theme: 'dark' }))
    const print = strip(renderHtml(view, { theme: 'print' }))
    expect(dark).toContain('Tu És a minha')
    expect(print).toContain('Tu És a minha')
    expect(light).toContain('Tu És a minha')
  })

  it('listThemes includes light dark print', () => {
    const list = listThemes()
    expect(list).toEqual(expect.arrayContaining(['light', 'dark', 'print']))
  })

  it('counts chord tokens from source brackets', () => {
    const src = loadFixture(JESUS_1)
    const html = renderHtml(parse(src), { theme: 'default' })
    const sourceChords = (src.match(/\[[^\]]+\]/g) ?? []).length
    const htmlChords = (html.match(/class="chord /g) ?? []).length
    expect(htmlChords).toBeGreaterThanOrEqual(sourceChords)
  })
})
