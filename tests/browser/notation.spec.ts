import { expect, test } from '@playwright/test'
for (const file of ['notes.gp', 'notes.gp5', 'bends.musicxml', 'bends.gp', 'piano.musicxml']) {
  test(`renders ${file}, switches notation and fits a phone`, async ({ page }, info) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.setViewportSize({ width: 900, height: 900 })
    await page.goto(`/notation.html?file=${file}`)
    await expect(page.locator('.cpv-notation-paper svg').first()).toBeVisible({ timeout: 30000 })
    await expect(page.getByRole('status')).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
    const partitura = page.getByRole('button', { name: 'Partitura', exact: true })
    await partitura.click()
    await expect(partitura).toHaveAttribute('aria-pressed', 'true')
    await page.setViewportSize({ width: 375, height: 850 })
    await expect(page.getByRole('option', { name: 'Automático (110%)' })).toHaveCount(1)
    await expect(page.locator('.cpv-notation-paper svg').first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
    const tab = page.getByRole('button', { name: 'TAB', exact: true })
    if (file === 'piano.musicxml') {
      await expect(tab).toBeDisabled()
      await expect(page.getByText('Este arquivo não traz posições nas cordas para exibir TAB.')).toBeVisible()
    }
    if (file.endsWith('.gp') || file.endsWith('.gp5')) await expect(tab).toBeEnabled()
    if (await tab.isEnabled()) { await tab.click(); await expect(tab).toHaveAttribute('aria-pressed', 'true') }
    await page.getByLabel('Zoom do solo').selectOption('1.5')
    await expect(page.getByLabel('Zoom do solo')).toHaveValue('1.5')
    await page.screenshot({ path: info.outputPath(`${file}-phone.png`), fullPage: true })
    expect(errors).toEqual([])
  })
}
test('edits the selected excerpt and saves the reference', async ({ page }) => {
  await page.goto('/notation.html?edit=1&file=bends.musicxml')
  await expect(page.getByLabel('Faixa', { exact: true })).toBeVisible()
  await page.getByLabel('Primeiro compasso').fill('2')
  await page.getByLabel('Último compasso').fill('2')
  await page.getByRole('button', { name: 'Salvar trecho na cifra' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-saved', /track=1 start=2 end=2/)
})

test('uploads an original Guitar Pro file and stores only its reference', async ({ page }) => {
  await page.goto('/notation.html?edit=1')
  await expect(page.getByLabel('Faixa', { exact: true })).toBeVisible()
  await page.locator('input[type="file"]').setInputFiles('fixtures/notation/notes.gp')
  await expect(page.getByRole('button', { name: 'Salvar trecho na cifra' })).toBeEnabled()
  await page.getByRole('button', { name: 'Salvar trecho na cifra' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-saved', '{sos: src="stored/solo.gp" track=1 start=1 end=1}\n{eos}')
})

test('Titan renders only the selected bars, without file furniture, and follows theme changes', async ({ page }, info) => {
  await page.goto('/notation.html?file=chords.gp&start=2&end=2&dark=1')
  const system = page.locator('.cpv-notation-system')
  await expect(system.first()).toBeVisible()
  expect(await system.count()).toBe(1)
  await expect(system).toHaveAttribute('data-first-bar', '2')
  await expect(system).toHaveAttribute('data-last-bar', '2')
  await expect(page.locator('.cpv-notation-paper')).not.toContainText(/rendered by|Tuning|Copyright/)
  await expect(page.locator('.cpv-notation-paper .at-chord-diagram')).toHaveCount(0)
  const notation = page.locator('.cpv-notation-paper')
  await expect.poll(async () => (await notation.innerHTML()).toLowerCase()).toContain('#eaecf2')
  await page.screenshot({ path: info.outputPath('titan-solo-dark.png') })
  await page.locator('#toggle-theme').click()
  await expect.poll(async () => (await notation.innerHTML()).toLowerCase()).toContain('#13161d')
  await expect.poll(async () => (await notation.innerHTML()).toLowerCase()).not.toContain('#eaecf2')
  expect(await notation.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  await page.screenshot({ path: info.outputPath('titan-solo-light.png') })
})
