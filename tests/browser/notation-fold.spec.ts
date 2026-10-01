import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { clockOf, parse } from '../../src/core'
const duration = clockOf(parse(readFileSync('fixtures/sda/084-escuta-meu-clamor.cho', 'utf8'))).durationSec!

test('the reader keeps each solo view and fold across visits, independently by song', async ({ page }) => {
  await page.goto('/notation.html?pdf=1&file=gp')
  await expect(page.locator('.cpv-notation-system').first()).toBeVisible()
  await page.getByRole('button', { name: 'Partitura', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Partitura', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.locator('[data-toggle-notation]').click()
  await expect(page.locator('[data-toggle-notation]')).toHaveAttribute('aria-expanded', 'false')
  await page.reload()
  await expect(page.locator('[data-toggle-notation]')).toHaveAttribute('aria-expanded', 'false')
  await page.locator('[data-toggle-notation]').click()
  await expect(page.getByRole('button', { name: 'Partitura', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.goto('/notation.html?pdf=1&file=xml')
  await expect(page.locator('.cpv-notation-system').first()).toBeVisible()
  await expect(page.locator('[data-toggle-notation]')).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'TAB', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.goto('/notation.html?pdf=1&file=gp')
  await expect(page.locator('.cpv-notation-system').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Partitura', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

async function progress(page: Page) {
  return page.locator('.cpv-progress > span').evaluate(el => parseFloat((el as HTMLElement).style.width) / 100)
}
async function toggle(page: Page) {
  // The fold control can be above the viewport. Do not let Playwright seek
  // the song by scrolling it into view before testing the fold itself.
  await page.locator('[data-toggle-notation]').first().evaluate((el: HTMLButtonElement) => el.click())
}
for (const width of [390, 1280]) {
  test(`folding a large reference preserves a running clock at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.addInitScript(() => localStorage.setItem('cpv:user-preferences', JSON.stringify({ metFollow: false })))
    await page.goto('/notation.html?pdf=1&file=piano-long')
    await expect(page.locator('.cpv-notation-system').first()).toBeVisible()
    await expect(page.locator('[data-external-score] [role="status"]')).toHaveCount(0)
    await page.clock.install()
    await page.clock.pauseAt(new Date(Date.now() + 1000))
    await page.locator('.cpv-scroll').evaluate(el => { el.scrollTop = el.scrollHeight * 0.65 })
    await page.getByRole('button', { name: 'Rolar', exact: true }).first().evaluate((el: HTMLButtonElement) => el.click())
    await page.clock.runFor(2000)
    await expect(page.getByRole('button', { name: 'Parar', exact: true }).first()).toBeVisible()
    const before = await progress(page)
    expect(before).toBeGreaterThan(0.1)
    expect(before).toBeLessThan(0.98)
    const height = await page.locator('.cpv-scroll').evaluate(el => el.scrollHeight)
    const visibleRow = await page.locator('.cpv-reading-row').evaluateAll(rows => rows.findIndex(el => {
      const r = el.getBoundingClientRect(); return r.top > 180 && r.top < 600
    }))
    const rowTop = visibleRow >= 0 ? await page.locator('.cpv-reading-row').nth(visibleRow).evaluate(el => el.getBoundingClientRect().top) : null
    await toggle(page)
    if (rowTop !== null) expect(Math.abs(await page.locator('.cpv-reading-row').nth(visibleRow).evaluate(el => el.getBoundingClientRect().top) - rowTop)).toBeLessThan(2)
    await page.clock.runFor(100)
    await expect(page.locator('[data-toggle-notation]').first()).toHaveAttribute('aria-expanded', 'false')
    expect(await page.locator('.cpv-scroll').evaluate(el => el.scrollHeight)).toBeLessThan(height - 100)
    // Progress is painted once per second, so allow one display tick. No
    // unmarked-row estimate is used: seconds come from the fixture duration.
    expect(Math.abs(await progress(page) - before)).toBeLessThan(1.2 / duration)
    await page.clock.runFor(2000)
    const after = await progress(page)
    expect(after - before).toBeGreaterThan(1 / duration)
    expect(after - before).toBeLessThan(3.2 / duration)
    await toggle(page)
    await page.clock.runFor(100)
    expect(Math.abs(await progress(page) - after)).toBeLessThan(1.2 / duration)
    await expect(page.getByRole('button', { name: 'Parar', exact: true }).first()).toBeVisible()
    await expect(page.locator('[data-external-score]')).toBeVisible()
  })
}
test('paused fold keeps the same lyric on screen, and reopening restores the reference', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/notation.html?pdf=1&file=piano-long')
  await expect(page.locator('.cpv-notation-system').first()).toBeVisible()
  const row = page.locator('.cpv-reading-row').nth(4)
  await row.evaluate(el => {
    const scroll = el.closest('.cpv-scroll')!
    scroll.scrollTop += el.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 300
  })
  const before = await row.evaluate(el => el.getBoundingClientRect().top)
  await toggle(page)
  await expect(page.locator('[data-toggle-notation]').first()).toHaveAttribute('aria-expanded', 'false')
  expect(Math.abs(await row.evaluate(el => el.getBoundingClientRect().top) - before)).toBeLessThan(2)
  await toggle(page)
  await expect(page.locator('[data-toggle-notation]').first()).toHaveAttribute('aria-expanded', 'true')
  expect(Math.abs(await row.evaluate(el => el.getBoundingClientRect().top) - before)).toBeLessThan(2)
})

test('folding while the playhead is inside the reference retains its remaining time', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => localStorage.setItem('cpv:user-preferences', JSON.stringify({ metFollow: false })))
  await page.goto('/notation.html?pdf=1&file=piano-long')
  await expect(page.locator('.cpv-notation-system').first()).toBeVisible()
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  await page.getByRole('button', { name: 'Rolar', exact: true }).first().evaluate((el: HTMLButtonElement) => el.click())
  await page.clock.runFor(1000)
  const before = await progress(page)
  await toggle(page)
  await page.clock.runFor(100)
  expect(Math.abs(await progress(page) - before)).toBeLessThan(1.2 / duration)
  await page.clock.runFor(1000)
  expect(await progress(page) - before).toBeLessThan(2.2 / duration)
  await expect(page.getByRole('button', { name: 'Parar', exact: true }).first()).toBeVisible()
})

for (const width of [390, 1280]) {
  test(`fold control stays inside a wide card with its title at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/notation.html?pdf=1&file=piano-long')
    const card = page.locator('.cpv-notation-card').first()
    await expect(card.locator('.cpv-notation-system').first()).toBeVisible()
    const button = card.locator('[data-toggle-notation]')
    await expect(card.locator('.cpv-notation-title')).toHaveText('Solo')
    await expect(card).not.toContainText(/Tom do arquivo|compassos/)
    const bounds = (await card.boundingBox())!
    const content = await page.locator('.cpv-page').evaluate(el => el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight))
    if (width === 1280) expect(bounds.width).toBeGreaterThan(content + 100)
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
    expect(await button.locator('..').evaluate(el => getComputedStyle(el).position)).toBe('static')
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(card.locator('.cpv-notation-title')).toBeVisible()
    await expect(card.locator('[data-external-score]')).toBeHidden()
    expect((await card.boundingBox())!.height).toBeLessThan(80)
    await page.screenshot({ path: info.outputPath(`named-folded-${width}.png`) })
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(card.locator('.cpv-notation-system').first()).toBeVisible()
    await page.screenshot({ path: info.outputPath(`named-expanded-${width}.png`) })
  })
}
