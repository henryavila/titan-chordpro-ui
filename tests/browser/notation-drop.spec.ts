import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

async function transfer(page: Page, names: string[]) {
  const files = names.map(name => ({ name, bytes: Array.from(readFileSync(`fixtures/notation/${name}`)) }))
  return page.evaluateHandle(files => {
    const data = new DataTransfer()
    for (const file of files) data.items.add(new File([new Uint8Array(file.bytes)], file.name))
    return data
  }, files)
}

for (const name of ['notes.gp', 'bends.musicxml']) {
  test(`drops ${name}, previews and saves only after confirmation`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/notation.html?edit=1&new=1')
    const zone = page.locator('.titan-chordpro-import-score-file')
    const dataTransfer = await transfer(page, [name])
    await zone.dispatchEvent('dragenter', { dataTransfer })
    await expect(zone).toHaveClass(/--dragging/)
    const button = zone.getByRole('button')
    await button.dispatchEvent('dragenter', { dataTransfer })
    await button.dispatchEvent('dragleave', { dataTransfer })
    await expect(zone).toHaveClass(/--dragging/)
    await page.screenshot({ path: info.outputPath('drop-highlight.png') })
    await zone.dispatchEvent('dragleave', { dataTransfer })
    await expect(zone).not.toHaveClass(/--dragging/)
    await zone.dispatchEvent('dragenter', { dataTransfer })
    await zone.dispatchEvent('drop', { dataTransfer })
    await expect(zone).not.toHaveClass(/--dragging/)
    await expect(zone).toContainText(name)
    await expect(page.locator('.titan-chordpro-notation-paper svg').first()).toBeVisible()
    await expect(page.locator('body')).not.toHaveAttribute('data-saved')
    await page.getByRole('button', { name: 'Salvar trecho na cifra' }).click()
    await expect(page.locator('body')).toHaveAttribute('data-saved', /src="stored\/solo.gp" track=1 start=1/)
    await dataTransfer.dispose()
  })
}

test('rejects multiple files and unsupported files without replacing the current solo', async ({ page }) => {
  await page.goto('/notation.html?edit=1')
  const zone = page.locator('.titan-chordpro-import-score-file')
  const save = page.getByRole('button', { name: 'Salvar trecho na cifra' })
  await expect(save).toBeEnabled()
  const original = await zone.locator('strong').textContent()
  const multiple = await transfer(page, ['notes.gp', 'bends.musicxml'])
  await zone.dispatchEvent('drop', { dataTransfer: multiple })
  await expect(page.getByRole('alert')).toContainText('apenas um arquivo')
  const unsupported = await page.evaluateHandle(() => {
    const data = new DataTransfer()
    data.items.add(new File([''], 'documento.pdf'))
    return data
  })
  await zone.dispatchEvent('drop', { dataTransfer: unsupported })
  await expect(page.getByRole('alert')).toContainText('Escolha um arquivo Guitar Pro ou MusicXML')
  await expect(zone.locator('strong')).toHaveText(original!)
  await expect(save).toBeEnabled()
  await expect(page.locator('.titan-chordpro-notation-paper svg').first()).toBeVisible()
  await multiple.dispose()
  await unsupported.dispose()
})
