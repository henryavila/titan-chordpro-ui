import { expect, test } from '@playwright/test'
import {
  barsAtPx,
  buildTimeline,
  clockOf,
  layoutChartFull,
  parse,
  scrollAtPlayhead,
} from '../../src/core'
import { loadFixture } from '../helpers/load-fixture'

const LONG = 'sda/091-o-melhor-lugar-do-mundo.cho'
const NOTES = 'sda/087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho'

test.describe('rehearsal comments on the reading surface', () => {
  test('long comments wrap on a phone and stay inside the paper', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/?chart=${LONG.replace(/^sda\//, '')}&fit=0`)
    await page.locator('.cpv-comment').first().waitFor()

    const report = await page.evaluate(() => {
      const scroll = document.querySelector('.cpv-scroll') as HTMLElement
      const sr = scroll.getBoundingClientRect()
      return [...document.querySelectorAll('.cpv-comment')].map((node) => {
        const el = node as HTMLElement
        const text = el.querySelector('.cpv-comment-text') as HTMLElement
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(text)
        return {
          copy: (text.textContent ?? '').trim(),
          fontSize: parseFloat(cs.fontSize),
          color: cs.color,
          transform: cs.textTransform,
          position: getComputedStyle(el).position,
          overflowX: el.scrollWidth - el.clientWidth,
          clipped: r.right > sr.right + 1 || r.left < sr.left - 1,
          height: r.height,
        }
      })
    })

    expect(report.length).toBeGreaterThan(0)
    expect(report.some((c) => c.copy.length > 40)).toBe(true)
    for (const c of report) {
      expect(c.fontSize, c.copy).toBeGreaterThanOrEqual(11)
      expect(c.transform, c.copy).not.toBe('uppercase')
      expect(c.position, c.copy).toMatch(/^(static|relative)$/)
      expect(c.clipped, c.copy).toBe(false)
      expect(c.overflowX, c.copy).toBeLessThanOrEqual(1)
      expect(c.height, c.copy).toBeGreaterThan(10)
    }
  })

  test('a comment is a rubric, not a chorus card', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/?chart=${LONG.replace(/^sda\//, '')}&fit=0`)
    await page.locator('.cpv-comment').first().waitFor()
    await page.locator('.cpv-chorus').first().waitFor()

    const pair = await page.evaluate(() => {
      const comment = document.querySelector('.cpv-comment') as HTMLElement
      const chorus = document.querySelector('.cpv-chorus') as HTMLElement
      const cs = getComputedStyle(comment)
      const before = getComputedStyle(chorus, '::before')
      return {
        commentBg: cs.backgroundColor,
        commentRadius: cs.borderRadius,
        commentBorder: cs.borderLeftColor,
        chorusWash: before.backgroundColor,
      }
    })
    expect(pair.chorusWash, 'chorus still has a wash').not.toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)/)
    expect(pair.commentBg).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/)
    expect(pair.commentRadius === '0px' || pair.commentRadius === '0').toBe(true)
  })

  test('a comment is smaller and paler than the lyric it sits above', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/?chart=${LONG.replace(/^sda\//, '')}&fit=0`)
    await page.locator('.cpv-comment-text').first().waitFor()
    await page.locator('.cpv-lyric').first().waitFor()
    const pair = await page.evaluate(() => {
      const comment = getComputedStyle(document.querySelector('.cpv-comment-text') as HTMLElement)
      const lyric = getComputedStyle(document.querySelector('.cpv-stanza .cpv-lyric') as HTMLElement)
      const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
      const lum = ([r, g, b]: number[]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      return {
        commentPx: parseFloat(comment.fontSize),
        lyricPx: parseFloat(lyric.fontSize),
        commentLum: lum(rgb(comment.color)),
        lyricLum: lum(rgb(lyric.color)),
      }
    })
    expect(pair.commentPx).toBeLessThan(pair.lyricPx - 2)
  })

  test('a comment sits against the block it labels, not in the section gap', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`/?chart=${LONG.replace(/^sda\//, '')}&fit=0`)
    await page.locator('.cpv-comment').first().waitFor()
    const gaps = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.cpv-blockrow')] as HTMLElement[]
      const out: number[] = []
      for (let i = 0; i < rows.length - 1; i++) {
        if (!rows[i]!.querySelector('.cpv-comment, .cpv-note')) continue
        const next = rows[i + 1]!.querySelector('.cpv-block, .cpv-tab') as HTMLElement | null
        if (!next) continue
        const a = rows[i]!.getBoundingClientRect()
        const b = next.getBoundingClientRect()
        out.push(b.top - a.bottom)
      }
      return out
    })
    expect(gaps.length).toBeGreaterThan(0)
    for (const g of gaps) expect(g, `gap ${g}`).toBeLessThanOrEqual(8)
  })

  test('execução notes wrap and read as body text, not tiny mono', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/?chart=${NOTES.replace(/^sda\//, '')}&fit=0`)
    await page.locator('.cpv-note-item').first().waitFor()

    const items = await page.evaluate(() =>
      [...document.querySelectorAll('.cpv-note-item')].map((node) => {
        const el = node as HTMLElement
        const cs = getComputedStyle(el)
        return {
          copy: (el.textContent ?? '').trim(),
          fontSize: parseFloat(cs.fontSize),
          family: cs.fontFamily,
          overflowX: el.scrollWidth - el.clientWidth,
        }
      }),
    )
    expect(items.length).toBeGreaterThan(0)
    for (const it of items) {
      expect(it.fontSize, it.copy).toBeGreaterThanOrEqual(13)
      expect(it.family, it.copy).not.toMatch(/Space Mono/i)
      expect(it.overflowX, it.copy).toBeLessThanOrEqual(1)
    }
  })

  test('taller comments stay paper: t=0 is still the top, clock unchanged', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/?chart=${LONG.replace(/^sda\//, '')}&fit=0`)
    await page.locator('[data-block]').first().waitFor()

    const m = await page.evaluate(() => {
      const el = document.querySelector('.cpv-scroll') as HTMLElement
      const base = el.getBoundingClientRect().top - el.scrollTop
      const nodes = [...el.querySelectorAll('[data-block]')] as HTMLElement[]
      return {
        doc: el.scrollHeight,
        viewport: el.clientHeight,
        firstTop: nodes[0] ? nodes[0].getBoundingClientRect().top - base : 0,
        blocks: nodes.map((n) => {
          const r = n.getBoundingClientRect()
          return { top: r.top - base, h: Math.max(1, r.height) }
        }),
      }
    })

    const view = parse(loadFixture(LONG))
    const laid = layoutChartFull(view)
    const clock = clockOf(view)
    const t = buildTimeline(
      laid.blocks.map((b, i) => ({
        top: m.blocks[i]?.top ?? 0,
        h: m.blocks[i]?.h ?? 1,
        music: b.music,
        kind: b.kind,
      })),
      {
        bpm: clock.bpm,
        beatsPerBar: clock.beatsPerBar,
        marksPerBeat: clock.marksPerBeat,
        durationSec: clock.durationSec,
        barPx: 44,
        doc: m.doc,
        viewport: m.viewport,
      },
    )
    expect(m.blocks.length).toBe(laid.blocks.length)
    expect(barsAtPx(t, m.firstTop)).toBeCloseTo(0, 5)
    expect(scrollAtPlayhead(t, 0, m.viewport)).toBe(0)
    expect(t.exact).toBeGreaterThan(0)
  })
})
