import { expect, test } from '@playwright/test'

type Audit = { stems: Array<{ duration: number; dots: number; rects: number[][] }>; symbols: string[]; beams: Array<{ durations: number[]; polygons: number[][][] }> }
for (const rhythm of ['base', 'extended']) for (const engine of ['svg', 'html5']) {
  test(`${rhythm} ${engine}: whole through sixty-fourth retain distinct durations`, async ({ page }, info) => {
    await page.goto(`/rhythm-audit.html?rhythm=${rhythm}&engine=${engine}`)
    await expect(page.locator('body')).toHaveAttribute('data-audit', /stems/)
    const audit: Audit = JSON.parse((await page.locator('body').getAttribute('data-audit'))!)
    const half = audit.stems.filter(stem => stem.duration === 2)
    const quarter = audit.stems.filter(stem => stem.duration === 4)
    expect(half).toHaveLength(4)
    expect(quarter).toHaveLength(4)
    // The fixture places these notes on the same string: half notes must have
    // one stroke each, independently of their proportional spacing.
    expect(half.every(stem => stem.rects.length === 1)).toBe(true)
    expect(quarter.every(stem => stem.rects.length === 1)).toBe(true)
    expect(audit.stems.some(stem => stem.duration === 1)).toBe(false)
    const polygons = audit.beams.flatMap(beam => beam.polygons)
    for (const [duration, levels] of [[8, 1], [16, 2], [32, 3], [64, 4]]) {
      const strokes = audit.stems.filter(stem => stem.duration === duration)
      expect(strokes).toHaveLength(4)
      const drawnLevels = strokes.map(stem => polygons.filter(polygon => Math.abs(polygon[0]![0]! - stem.rects[0]![0]!) < 2).length)
      expect(Math.max(...drawnLevels)).toBe(levels)
    }
    for (const duration of ['Whole', 'Half', 'Quarter', '8th', '16th', '32nd', '64th'])
      expect(audit.symbols).toContain(`Rest${duration}`)
    await page.screenshot({ path: info.outputPath(`durations-${rhythm}-${engine}.png`), fullPage: true })
  })
}

for (const rhythm of ['base', 'extended']) for (const engine of ['svg', 'html5']) {
  test(`${rhythm} ${engine}: preserves dots, flags, triplets and quintuplets`, async ({ page }, info) => {
    for (const file of ['rhythm', 'tuplets']) {
      await page.goto(`/rhythm-audit.html?rhythm=${rhythm}&engine=${engine}&file=${file}`)
      await expect(page.locator('body')).toHaveAttribute('data-audit', /stems/)
      const audit: Audit = JSON.parse((await page.locator('body').getAttribute('data-audit'))!)
      expect(audit.symbols).toContain('Tuplet3')
      if (file === 'tuplets') expect(audit.symbols).toContain('Tuplet5')
      else {
        expect(audit.symbols).toContain('AugmentationDot')
        expect(audit.symbols).toContain('Flag8thDown')
        expect(audit.stems.some(stem => stem.duration === 4 && stem.dots === 1)).toBe(true)
      }
      await page.screenshot({ path: info.outputPath(`${file}-${rhythm}-${engine}.png`), fullPage: true })
    }
  })
}

test('no-rhythm TAB still hides stems, flags, beams and duration dots', async ({ page }) => {
  await page.goto('/rhythm-audit.html?rhythm=none&file=rhythm')
  await expect(page.locator('body')).toHaveAttribute('data-audit', /stems/)
  const audit: Audit = JSON.parse((await page.locator('body').getAttribute('data-audit'))!)
  expect(audit.stems).toHaveLength(0)
  expect(audit.beams).toHaveLength(0)
  expect(audit.symbols).not.toContain('AugmentationDot')
  expect(audit.symbols.some(symbol => symbol.startsWith('Flag'))).toBe(false)
})

for (const engine of ['svg', 'html5']) {
  test(`${engine}: half stems are 50 percent and do not grow when extended`, async ({ page }) => {
    const audits: Record<string, Audit> = {}
    for (const mode of ['base', 'extended']) {
      await page.goto(`/rhythm-audit.html?rhythm=${mode}&engine=${engine}`)
      await expect(page.locator('body')).toHaveAttribute('data-audit', /stems/)
      audits[mode] = JSON.parse((await page.locator('body').getAttribute('data-audit'))!)
    }
    const stems = (mode: string, duration: number) => audits[mode]!.stems.filter(stem => stem.duration === duration)
    const baseQuarter = stems('base', 4)
    for (let i = 0; i < 4; i++) {
      const baseHalf = stems('base', 2)[i]!
      const extendedHalf = stems('extended', 2)[i]!
      expect(baseHalf.rects).toHaveLength(1)
      expect(extendedHalf.rects).toHaveLength(1)
      const quarterHeight = baseQuarter[i]!.rects[0]![3]!
      expect(baseHalf.rects[0]![3]).toBeCloseTo(quarterHeight / 2, 6)
      expect(extendedHalf.rects[0]![3]).toBeCloseTo(baseHalf.rects[0]![3]!, 6)
      expect(extendedHalf.rects[0]![1]).toBeCloseTo(baseHalf.rects[0]![1]!, 6)
      expect(stems('extended', 4)[i]!.rects[0]![3]).toBeGreaterThanOrEqual(quarterHeight)
    }
    // notes.gp places its notes on the bottom string, so there may be no extra
    // distance to extend. rhythm.gp supplies quarters on higher strings.
    for (const mode of ['base', 'extended']) {
      await page.goto(`/rhythm-audit.html?rhythm=${mode}&engine=${engine}&file=rhythm`)
      await expect(page.locator('body')).toHaveAttribute('data-audit', /stems/)
      audits[mode] = JSON.parse((await page.locator('body').getAttribute('data-audit'))!)
    }
    const height = (stem: Audit['stems'][number]) => stem.rects.reduce((sum, rect) => sum + rect[3]!, 0)
    expect(stems('extended', 4).some((stem, i) => height(stem) > height(stems('base', 4)[i]!))).toBe(true)
    for (const [i, stem] of stems('base', 2).entries()) {
      expect(height(stems('extended', 2)[i]!)).toBeCloseTo(height(stem), 6)
      expect(stem.rects).toHaveLength(1)
    }
  })
}
