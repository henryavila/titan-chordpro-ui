import { expect, test } from '@playwright/test'

/**
 * Edit mode must expose a dedicated metadata door — duration/time/key cannot
 * live only in the source pane.
 */
test('content edit opens the metadata dialog and writes duration', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await expect(page.locator('[data-edit]')).toBeVisible()
  await page.locator('[data-edit]').click()
  await expect(page.locator('[data-meta-open]')).toBeVisible()
  await page.locator('[data-meta-open]').click()
  await expect(page.locator('[data-meta-dialog]')).toBeVisible()
  await expect(page.locator('[data-meta-duration]')).toBeVisible()
  await expect(page.locator('[data-meta-time="4/4"]')).toBeVisible()
  await page.locator('[data-meta-duration]').fill('05:12')
  await page.locator('[data-meta-time="4/4"]').click()
  await page.locator('[data-meta-apply]').click()
  await expect(page.locator('[data-meta-dialog]')).toHaveCount(0)
  await expect(page.locator('[data-meta-open]')).toContainText('05:12')
})

test('local edit also opens the metadata dialog', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('#host-modes').selectOption('local')
  await page.locator('[data-edit]').click()
  await expect(page.locator('[data-meta-open]')).toBeVisible()
  await page.locator('[data-meta-open]').click()
  await expect(page.locator('[data-meta-dialog]')).toBeVisible()
  await expect(page.locator('[data-meta-restart]')).toHaveCount(0)
  await page.locator('[data-meta-duration]').fill('05:12')
  await page.locator('[data-meta-apply]').click()
  await expect(page.locator('[data-meta-dialog]')).toHaveCount(0)
  await expect(page.locator('[data-meta-open]')).toContainText('05:12')
})

test('Começar de novo requires explicit confirm before opening Nova cifra', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('[data-edit]').click()
  await page.locator('[data-meta-open]').click()
  await expect(page.locator('[data-meta-dialog]')).toBeVisible()
  await expect(page.locator('[data-meta-restart]')).toBeVisible()

  await page.locator('[data-meta-restart]').click()
  await expect(page.locator('[data-new-chart]')).toHaveCount(0)
  await expect(page.locator('[data-meta-restart-confirm]')).toBeVisible()
  await expect(page.getByText('Substituir esta cifra?')).toBeVisible()

  await page.locator('[data-meta-restart-cancel]').click()
  await expect(page.locator('[data-meta-restart-confirm]')).toHaveCount(0)
  await expect(page.locator('[data-meta-dialog]')).toBeVisible()

  await page.locator('[data-meta-restart]').click()
  await page.locator('[data-meta-restart-confirm]').click()
  await expect(page.locator('[data-meta-dialog]')).toHaveCount(0)
  await expect(page.locator('[data-new-chart]')).toBeVisible()
  await expect(page.locator('[data-nova-blank]')).toBeVisible()
  await expect(page.locator('[data-nova-url]')).toBeVisible()

  await page.locator('[data-new-chart] button[aria-label="Fechar"]').click()
  await expect(page.locator('[data-new-chart]')).toHaveCount(0)
  await expect(page.getByText(/Escuta meu clamor|Escuta/i).first()).toBeVisible()
})
