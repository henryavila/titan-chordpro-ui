import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

for (const file of ['gp', 'xml']) {
  for (const mode of ['TAB', 'Partitura', 'Nenhum']) {
    test(`PDF ${file}: ${mode}`, async ({ page }, info) => {
      await page.goto(`/notation.html?pdf=1&file=${file}`)
      await page.getByRole('button', { name: 'Exportar', exact: true }).click({ force: true })
      await page.locator('[data-export="pdf"]').click()
      await expect(page.locator('[data-pdf-confirm]')).toBeVisible()
      await page.getByRole('radio', { name: mode, exact: true }).check()
      const downloaded = page.waitForEvent('download')
      await page.locator('[data-pdf-download]').click()
      const download = await downloaded
      const path = info.outputPath(`${file}-${mode}.pdf`)
      await download.saveAs(path)
      const pdf = await readFile(path)
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
      expect(pdf.includes(Buffer.from('/Subtype /Image'))).toBe(mode !== 'Nenhum')
      await expect(page.locator('[data-pdf-notation]')).toHaveCount(0)
    })
  }
}
test('a missing TAB keeps the choice open and allows retry with Partitura', async ({ page }) => {
  await page.goto('/notation.html?pdf=1&file=piano')
  await page.getByRole('button', { name: 'Exportar', exact: true }).click({ force: true })
  await page.locator('[data-export="pdf"]').click()
  await page.getByRole('radio', { name: 'TAB', exact: true }).check()
  await page.locator('[data-pdf-download]').click()
  await expect(page.getByRole('dialog', { name: 'Exportar', exact: true }).getByRole('alert')).toContainText('Escolha Partitura ou Nenhum')
  await page.getByRole('radio', { name: 'Partitura', exact: true }).check()
  const downloaded = page.waitForEvent('download')
  await page.locator('[data-pdf-download]').click()
  await downloaded
})

test('a long MusicXML excerpt continues on multiple PDF pages', async ({ page }, info) => {
  await page.goto('/notation.html?pdf=1&file=piano-long')
  await page.getByRole('button', { name: 'Exportar', exact: true }).click({ force: true })
  await page.locator('[data-export="pdf"]').click()
  await page.getByRole('radio', { name: 'Partitura', exact: true }).check()
  const downloaded = page.waitForEvent('download')
  await page.locator('[data-pdf-download]').click()
  const file = await downloaded
  const path = info.outputPath('long-partitura.pdf')
  await file.saveAs(path)
  const data = (await readFile(path)).toString('latin1')
  expect((data.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(2)
  expect((data.match(/\/Subtype \/Image/g) ?? []).length).toBeGreaterThan(3)
})
