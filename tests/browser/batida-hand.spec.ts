import { expect, test } from '@playwright/test'

/**
 * Hand physics in the batida editor: empty until anchor, picker lists only
 * legal directions, save blocked until complete.
 */
test('batida editor anchors direction and filters picker choices', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('#host-modes').selectOption('content')
  await page.locator('[data-edit]').click()
  await expect(page.locator('[data-batida-create]')).toBeVisible()
  await page.locator('[data-batida-create]').click()
  await expect(page.locator('[data-batida-sheet]')).toBeVisible()
  // Desktop: centered modal, not a narrow side dock.
  const box = await page.locator('[data-batida-sheet]').boundingBox()
  expect(box).toBeTruthy()
  expect(box!.width).toBeGreaterThan(520)
  const mid = box!.x + box!.width / 2
  expect(mid).toBeGreaterThan(1280 * 0.35)
  expect(mid).toBeLessThan(1280 * 0.65)
  await expect(page.locator('[data-batida-density]')).toContainText('por tempo')
  await expect(page.locator('[data-batida-save]')).toBeDisabled()
  await expect(page.locator('[data-batida-slot="0"]')).toContainText(/vazio/i)

  await page.locator('[data-batida-slot="0"]').click()
  await expect(page.locator('[data-batida-picker]')).toBeVisible()
  await expect(page.locator('[data-batida-pick-dirs]')).toBeVisible()
  await expect(page.locator('[data-batida-dir-col="down"]')).toBeVisible()
  await expect(page.locator('[data-batida-dir-col="up"]')).toBeVisible()
  await expect(page.locator('[data-batida-choice]')).toHaveCount(10)

  await page.locator('[data-batida-dir-col="down"] [data-batida-choice="hit"]').first().click()
  await expect(page.locator('[data-batida-picker]')).toHaveCount(0)
  await expect(page.locator('[data-batida-save]')).toBeEnabled()
  await expect(page.locator('[data-batida-slot="1"]')).toContainText(/passa/i)
  await expect(page.locator('[data-batida-restart]')).toBeVisible()

  // Wrong first direction → restart creation
  await page.locator('[data-batida-restart]').click()
  await expect(page.locator('[data-batida-slot="0"]')).toContainText(/vazio/i)
  await expect(page.locator('[data-batida-save]')).toBeDisabled()

  await page.locator('[data-batida-slot="0"]').click()
  await expect(page.locator('[data-batida-pick-dirs]')).toBeVisible()
  await expect(page.locator('[data-batida-choice]')).toHaveCount(10)
  await page.locator('[data-batida-dir-col="up"] [data-batida-choice="hit"]').first().click()
  await expect(page.locator('[data-batida-save]')).toBeEnabled()

  await page.locator('[data-batida-slot="1"]').click()
  await expect(page.locator('[data-batida-picker]')).toBeVisible()
  await expect(page.locator('[data-batida-pick-dirs]')).toHaveCount(0)
  await expect(page.locator('[data-batida-choice]')).toHaveCount(5)
  await expect(page.locator('[data-batida-picker]')).toContainText(/só ↓/)

  await page.locator('[data-batida-picker] button[aria-label="Fechar"]').click()
  await expect(page.locator('[data-batida-picker]')).toHaveCount(0)
  await page.locator('[data-batida-save]').click()
  await expect(page.locator('[data-batida-sheet]')).toHaveCount(0)
  await expect(page.locator('[data-batida-edit-chrome]')).toBeVisible()
})
