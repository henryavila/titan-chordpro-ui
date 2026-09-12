import { expect, test } from '@playwright/test'

test('Só letra hides chords and keeps the lyric', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()
  await page.locator('[data-lens-btn]').click()
  await page.locator('[data-lens=letra]').click()
  await expect(page.locator('[data-lens-btn]')).toContainText('Só letra')
  await expect(page.locator('.cpv-chord')).toHaveCount(0)
  await expect(page.locator('.cpv-lyric').first()).toBeVisible()
  await expect(page.locator('.cpv-lyric').first()).not.toHaveText(/^\s*$/)
  const lyrics = (await page.locator('.cpv-lyric').allTextContents()).join('')
  expect(lyrics).not.toMatch(/x\/+/)
  expect(lyrics).not.toMatch(/(^|\s)\/+(\s|$)/)
})

test('host lens=letra opens already in Só letra', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.goto('/?lens=letra')
  await page.locator('.cpv-lyric').first().waitFor()
  await expect(page.locator('[data-lens-btn]')).toContainText('Só letra')
  await expect(page.locator('.cpv-chord')).toHaveCount(0)
})

test('Só letra survives changing song in the setlist', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.goto('/?lista=1&lens=letra')
  await page.locator('[data-setlist-open]').first().waitFor()
  await expect(page.locator('[data-lens-btn]')).toContainText('Só letra')
  await expect(page.locator('.cpv-chord')).toHaveCount(0)
  await page.locator('[data-song-next]').click()
  await expect(page.locator('[data-chart-title]')).toContainText(/Jesus/i)
  await expect(page.locator('[data-lens-btn]')).toContainText('Só letra')
  await expect(page.locator('.cpv-chord')).toHaveCount(0)
})
