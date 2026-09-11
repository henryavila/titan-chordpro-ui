import { expect, test, type Page } from '@playwright/test'
import {
  barsAtPx,
  buildTimeline,
  clockOf,
  contentOrigin,
  layoutChartFull,
  parse,
  runSec,
  scrollAtPlayhead,
} from '../../src/core'
import { AUTOSCROLL_BROWSER } from '../helpers/autoscroll-corpus'
import { loadFixture } from '../helpers/load-fixture'

/**
 * Real DOM, real chrome, real capo legend. A compact of the title strip or a
 * new dual lane that steals intro time fails here — the core suite cannot see CSS.
 *
 * Expected values come from `{duration:}` / `x///` / the rule that chrome is
 * not music. Not from whatever the current padding happens to be.
 */

type Surface = { name: string; fit: boolean; capo: number; dual: boolean }

const SURFACES: Surface[] = [
  { name: 'ajuste', fit: true, capo: 0, dual: true },
  { name: 'sem ajuste', fit: false, capo: 0, dual: true },
  { name: 'capo dual', fit: true, capo: 3, dual: true },
  { name: 'capo sem dual', fit: true, capo: 3, dual: false },
]

function fileOf(rel: string) {
  return rel.replace(/^sda\//, '')
}

function queryOf(rel: string, s: Surface) {
  const q = new URLSearchParams()
  q.set('chart', fileOf(rel))
  q.set('fit', s.fit ? '1' : '0')
  q.set('capo', String(s.capo))
  q.set('dual', s.dual ? '1' : '0')
  return `/?${q.toString()}`
}

type Measured = {
  doc: number
  viewport: number
  padTop: number
  legend: boolean
  firstTop: number
  blocks: { top: number; h: number }[]
}

async function measure(page: Page): Promise<Measured> {
  await page.locator('[data-block]').first().waitFor()
  return page.evaluate(() => {
    const el = document.querySelector('.cpv-scroll') as HTMLElement
    const pageEl = document.querySelector('.cpv-page') as HTMLElement
    const base = el.getBoundingClientRect().top - el.scrollTop
    const nodes = [...el.querySelectorAll('[data-block]')] as HTMLElement[]
    return {
      doc: el.scrollHeight,
      viewport: el.clientHeight,
      padTop: parseFloat(getComputedStyle(pageEl).paddingTop) || 0,
      legend: !!document.querySelector('[data-legend]'),
      firstTop: nodes[0] ? nodes[0].getBoundingClientRect().top - base : 0,
      blocks: nodes.map((n) => {
        const r = n.getBoundingClientRect()
        return { top: r.top - base, h: Math.max(1, r.height) }
      }),
    }
  })
}

function timelineOf(rel: string, s: Surface, m: Measured) {
  const view = parse(loadFixture(rel))
  const laid = layoutChartFull(view, { capo: s.capo, dual: s.dual })
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
  return { view, laid, clock, t, run: runSec(t, clock.durationSec) }
}

test.describe('auto-scroll vs chrome, ajuste, capo, dual', () => {
  test.describe.configure({ timeout: 90_000 })

  for (const rel of AUTOSCROLL_BROWSER) {
    test(`${fileOf(rel)}: chrome is not music, in every surface`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      const exacts: number[] = []
      const runs: number[] = []
      for (const s of SURFACES) {
        await page.goto(queryOf(rel, s))
        const m = await measure(page)
        const { laid, clock, t, run } = timelineOf(rel, s, m)
        const label = `${rel} ${s.name}`

        expect(m.blocks.length, `${label} data-block count`).toBe(laid.blocks.length)
        expect(barsAtPx(t, m.firstTop), `${label} time at first block`).toBeCloseTo(0, 5)
        expect(contentOrigin(t), `${label} origin`).toBeCloseTo(m.firstTop, 0)
        expect(scrollAtPlayhead(t, 0, m.viewport), `${label} scroll at t=0`).toBe(0)
        expect(m.firstTop, `${label} first block below pad`).toBeGreaterThan(m.padTop - 1)

        if (s.capo > 0 && s.dual) expect(m.legend, `${label} dual legend`).toBe(true)
        if (s.capo === 0) expect(m.legend, `${label} no legend without capo`).toBe(false)

        exacts.push(t.exact)
        runs.push(run)
        if (clock.durationSec && !t.over) expect(run, label).toBeCloseTo(clock.durationSec, 1)
      }
      const e0 = exacts[0] ?? 0
      const r0 = runs[0] ?? 0
      for (const n of exacts) expect(n, rel).toBeCloseTo(e0, 5)
      for (const n of runs) expect(n, rel).toBeCloseTo(r0, 1)
    })
  }

  test('desktop: dual legend and pad still do not steal the intro', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    for (const rel of [
      'sda/013-ele-vive-em-mim.cho',
      'sda/087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho',
    ] as const) {
      for (const s of SURFACES) {
        await page.goto(queryOf(rel, s))
        const m = await measure(page)
        const { t } = timelineOf(rel, s, m)
        expect(barsAtPx(t, m.firstTop), `${rel} ${s.name}`).toBeCloseTo(0, 5)
        expect(scrollAtPlayhead(t, 0, m.viewport)).toBe(0)
      }
    }
  })

  test('clicking Ajuste changes the paper, not the clock', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const rel = 'sda/015-esconderijo.cho'
    const s: Surface = { name: 'ajuste', fit: true, capo: 0, dual: true }
    await page.goto(queryOf(rel, s))
    const before = await measure(page)
    const a = timelineOf(rel, s, before)
    await page.locator('[data-fit]').click()
    await expect
      .poll(async () => (await measure(page)).doc)
      .not.toBe(before.doc)
    const after = await measure(page)
    const b = timelineOf(rel, { ...s, name: 'sem ajuste', fit: false }, after)
    expect(b.t.exact).toBeCloseTo(a.t.exact, 5)
    expect(b.run).toBeCloseTo(a.run, 1)
    expect(barsAtPx(b.t, after.firstTop)).toBeCloseTo(0, 5)
    expect(after.doc).not.toBe(before.doc)
  })

  test('009 without fit: at 20s the first verse is still on the phone screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const rel = 'sda/009-verdadeira-alegria.cho'
    const s: Surface = { name: 'sem ajuste', fit: false, capo: 0, dual: true }
    await page.goto(queryOf(rel, s))
    const m = await measure(page)
    const { t, run, clock } = timelineOf(rel, s, m)
    expect(clock.durationSec).toBe(160)
    expect(run).toBeCloseTo(160, 1)
    const first = m.blocks[0]
    expect(first).toBeDefined()
    const verseSec = barsAtPx(t, m.blocks[1]?.top ?? t.doc) - barsAtPx(t, first!.top)
    expect(verseSec).toBeGreaterThan(25)
    const scroll = scrollAtPlayhead(t, 20 / run, m.viewport)
    expect(first!.top + first!.h - scroll).toBeGreaterThan(40)
  })
})
