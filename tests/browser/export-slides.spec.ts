import { expect, test } from '@playwright/test'

test('Exportar offers LouvorJA slides and PowerPoint next to CHO and PDF', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Exportar').click()
  await expect(page.locator('[data-export="cho"]')).toBeVisible()
  await expect(page.locator('[data-export="pdf"]')).toBeVisible()
  const slides = page.locator('[data-export="slides"]')
  await expect(slides).toBeVisible()
  await expect(slides).toContainText('Slide Louvor JA')
  const ppsx = page.locator('[data-export="ppsx"]')
  await expect(ppsx).toBeVisible()
  await expect(ppsx).toContainText('PowerPoint')
  await expect(ppsx).toContainText('Abre direto em apresentação')
  await expect(ppsx).toContainText('letra em caixa alta')
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

test('generating PowerPoint finishes and downloads a .ppsx', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Exportar').click()
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.locator('[data-export="ppsx"]').click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.ppsx$/)
  const path = await download.path()
  expect(path).toBeTruthy()
})
