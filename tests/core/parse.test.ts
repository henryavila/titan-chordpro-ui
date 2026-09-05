import { describe, expect, it } from 'vitest'
import { parse, renderHtml } from '../../src/core/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

describe('parse', () => {
  it('parse(jesus-1) yields meta.key G and lyrics with chords', () => {
    const view = parse(loadFixture(JESUS_1))
    expect(view.meta.key).toBe('G')
    expect(view.meta.title).toMatch(/Jesus/i)
    const lyricLines = view.sections.flatMap((s) => s.lines).filter((l) => l.type === 'lyrics')
    expect(lyricLines.length).toBeGreaterThan(0)
    const withChord = lyricLines.some(
      (l) => l.type === 'lyrics' && l.words.some((w) => w.chord),
    )
    expect(withChord).toBe(true)
  })

  it('empty source yields empty sections and does not throw', () => {
    const view = parse('')
    expect(view.sections.every((s) => s.lines.length === 0) || view.sections.length === 0 || view.sections.every((s) => s.lines.every((l) => l.type === 'empty'))).toBeTruthy()
    expect(() => renderHtml(view)).not.toThrow()
  })

  it('keeps rehearsal comments', () => {
    const view = parse(loadFixture(JESUS_1))
    const comments = view.sections
      .flatMap((s) => s.lines)
      .filter((l) => l.type === 'comment')
      .map((l) => (l.type === 'comment' ? l.text : ''))
    expect(comments.some((t) => /BEM SUAVE/i.test(t))).toBe(true)
    expect(comments.some((t) => /INTRODUÇÃO/i.test(t))).toBe(true)
  })

  it('parses tab sections from ele-vive fixture', () => {
    const view = parse(loadFixture('ministerio-tons/013-ele-vive-em-mim.cho'))
    const tabs = view.sections.filter((s) => s.kind === 'tab')
    expect(tabs.length).toBeGreaterThan(0)
  })
})
