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
