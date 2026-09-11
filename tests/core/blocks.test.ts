import { describe, expect, it } from 'vitest'
import { layoutChart, parse } from '../../src/core/index'
import { ELE_VIVE, ELE_VIVE_IMG, JESUS_1, loadFixture } from '../helpers/load-fixture'

describe('CRLF sources', () => {
  it('normalises line endings so no \\r leaks into lyrics', () => {
    // Exercise the transport encoding explicitly: Git may check the real
    // fixture out with LF. The fixture file and its musical content stay intact.
    const raw = loadFixture(ELE_VIVE).replace(/\r?\n/g, '\r\n')
    expect(raw).toContain('\r')
    const view = parse(raw)
    expect(view.source).not.toContain('\r')
    const lyrics = view.sections
      .flatMap((s) => s.lines)
      .filter((l) => l.type === 'lyrics')
      .flatMap((l) => (l.type === 'lyrics' ? l.words.map((w) => w.lyric) : []))
    expect(lyrics.some((t) => t.includes('\r'))).toBe(false)
  })

  it('still reads the tab string labels written in the file', () => {
    // `.` never matches `\r`, so a CRLF file used to fall through to the
    // default e/B/G/D/A/E labels and keep the letter as a fret mark.
    const tab = layoutChart(parse(loadFixture(ELE_VIVE))).find((b) => b.kind === 'tab')
    expect(tab?.kind).toBe('tab')
    if (tab?.kind !== 'tab') return
    expect(tab.staves.map((s) => s.label)).toEqual(['E', 'B', 'G', 'E', 'A', 'E'])
    expect(tab.staves[0]?.tokens[0]?.kind).toBe('gap')
  })
})

describe('reading-surface blocks', () => {
  it('renders {image:} as its own block, with the reference untouched', () => {
    const blocks = layoutChart(parse(loadFixture(ELE_VIVE_IMG)))
    const images = blocks.filter((b) => b.kind === 'image')
    expect(images.length).toBe(3)
    expect(images[0]?.kind === 'image' && images[0].src).toBe('assets/ele-vive-intro.png')
  })

  it('keeps a {sos} score block whole, with its key and tempo', () => {
    const score = layoutChart(parse(loadFixture(ELE_VIVE_IMG))).find((b) => b.kind === 'score')
    expect(score?.kind).toBe('score')
    if (score?.kind !== 'score') return
    expect(score.scoreKey).toBe('G')
    expect(score.scoreTempo).toBe('72')
    expect(score.text).toContain('{eos}')
  })

  it('takes #~ lines out of the reading surface instead of singing them', () => {
    const src = ['{title: T}', '', '[C]linha viva', '', '#~ [C]linha oculta', '#~ segunda oculta'].join('\n')
    const blocks = layoutChart(parse(src))
    expect(blocks.map((b) => b.kind)).toEqual(['stanza'])
    const flat = JSON.stringify(blocks)
    expect(flat).not.toContain('oculta')
    // The lines survive in the parse output, so an editor can bring them back.
    const hidden = parse(src).sections.flatMap((s) => s.lines).filter((l) => l.type === 'hidden')
    expect(hidden).toHaveLength(1)
    expect(hidden[0]?.type === 'hidden' && hidden[0].texts).toEqual(['[C]linha oculta', 'segunda oculta'])
  })

  it('treats #^ and #capo: as marks, never as lyrics', () => {
    const src = ['{title: T}', '', '#capo:2', '#^+2', '[D]linha'].join('\n')
    const blocks = layoutChart(parse(src))
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.kind).toBe('stanza')
    if (blocks[0]?.kind !== 'stanza') return
    expect(blocks[0].rows).toHaveLength(1)
    expect(blocks[0].rows[0]?.plain).toBe('linha')
  })

  it('groups loose comments into one Execução note and keeps labels apart', () => {
    const blocks = layoutChart(parse(loadFixture(JESUS_1)))
    const note = blocks.find((b) => b.kind === 'note')
    expect(note?.kind === 'note' && note.items.length).toBeGreaterThan(1)
    const labels = blocks.filter((b) => b.kind === 'comment')
    expect(labels.some((b) => b.kind === 'comment' && /INTRODUÇÃO/i.test(b.text))).toBe(true)
  })
})

describe('block source spans and musical weight', () => {
  it('anchors every block on the source lines it came from', () => {
    const src = loadFixture(ELE_VIVE)
    const lines = parse(src).source.split('\n')
    for (const b of layoutChart(parse(src))) {
      expect(b.li0).toBeGreaterThanOrEqual(0)
      expect(b.li1).toBeGreaterThanOrEqual(b.li0)
      expect(b.li1).toBeLessThan(lines.length)
    }
  })

  it('counts the beats a chart writes and the bars a tab draws', () => {
    const blocks = layoutChart(parse(loadFixture(ELE_VIVE)))
    const tab = blocks.find((b) => b.kind === 'tab')
    expect(tab?.music.bars).toBeGreaterThan(0)
    const counted = blocks.find((b) => b.music.beats > 0)
    expect(counted).toBeDefined()
    // The x/// intro of this chart is exactly 32 beats over its two rows.
    expect(counted?.music.beats).toBe(32)
  })
})
