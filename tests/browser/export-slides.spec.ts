import { expect, test } from '@playwright/test'

test('Exportar offers LouvorJA slides next to CHO and PDF', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Exportar').click()
  await expect(page.locator('[data-export="cho"]')).toBeVisible()
  await expect(page.locator('[data-export="pdf"]')).toBeVisible()
  const slides = page.locator('[data-export="slides"]')
  await expect(slides).toBeVisible()
  await expect(slides).toContainText('Slide Louvor JA')
})

test('generating slides finishes and downloads a .slja', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Exportar').click()
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.locator('[data-export="slides"]').click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.slja$/)
  const path = await download.path()
  expect(path).toBeTruthy()
})
