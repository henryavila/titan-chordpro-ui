import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse, renderHtml, listThemes } from '../../src/core/index'
import { ELE_VIVE_IMG, JESUS_1, loadFixture } from '../helpers/load-fixture'

const snapDir = join(dirname(fileURLToPath(import.meta.url)), '__snapshots__')
const snapPath = join(snapDir, 'jesus-1-default.html')

function classTokens(html: string): Set<string> {
  const tokens = new Set<string>()
  for (const match of html.matchAll(/\bclass="([^"]*)"/g)) {
    for (const token of match[1]!.split(/\s+/)) {
      if (token) tokens.add(token)
    }
  }
  return tokens
}

function expectTitanClasses(html: string, required: string[]) {
  const tokens = classTokens(html)
  for (const name of required) {
    expect(tokens.has(name), name).toBe(true)
  }
  for (const token of tokens) {
    expect(
      token === 'titan-chordpro' || token.startsWith('titan-chordpro-'),
      token,
    ).toBe(true)
  }
  expect(html).not.toMatch(/data-cpv-/)
}

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
    expect(html).toContain('data-titan-chordpro-scroll')
    expect(html).toContain('data-theme="light"')
  })

  it('emits the §4.2 class names', () => {
    const jesus = renderHtml(parse(loadFixture(JESUS_1)), { theme: 'default' })
    expectTitanClasses(jesus, [
      'titan-chordpro',
      'titan-chordpro--default',
      'titan-chordpro-note',
      'titan-chordpro-note-label',
      'titan-chordpro-note-item',
      'titan-chordpro-comment',
      'titan-chordpro-comment-dot',
      'titan-chordpro-comment-text',
      'titan-chordpro-stanza',
      'titan-chordpro-row',
      'titan-chordpro-word',
      'titan-chordpro-chord-box',
      'titan-chordpro-chord',
      'titan-chordpro-chord--tight',
      'titan-chordpro-chord--empty',
      'titan-chordpro-lyric',
    ])

    const chart = renderHtml(parse(loadFixture(ELE_VIVE_IMG)), { theme: 'default' })
    expectTitanClasses(chart, [
      'titan-chordpro-chorus',
      'titan-chordpro-tab',
      'titan-chordpro-score',
      'titan-chordpro-image',
    ])
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
    const htmlChords = (html.match(/class="titan-chordpro-chord(?: |")/g) ?? []).length
    expect(htmlChords).toBeGreaterThanOrEqual(sourceChords)
  })
})
