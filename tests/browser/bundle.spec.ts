import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { unzip } from '../helpers/unzip-bundle'
import { audioTracksOf, layoutChart, parse, readScoreReference } from '../../src/core'

test('Cifra completa contains local audio, image, notation and slide artwork bytes', async ({ page }, info) => {
  await page.goto('/notation.html?pdf=1&bundle=1')
  await page.getByRole('button', { name: 'Exportar', exact: true }).click({ force: true })
  const downloaded = page.waitForEvent('download')
  await page.locator('[data-export="bundle"]').click()
  const download = await downloaded
  expect(download.suggestedFilename()).toMatch(/^cifra-completa-.*\.zip$/)
  const path = info.outputPath(download.suggestedFilename())
  await download.saveAs(path)
  const entries = unzip(await readFile(path))
  const manifest = JSON.parse(new TextDecoder().decode(entries.get('manifest.json')))
  const text = new TextDecoder().decode(entries.get(manifest.chart))
  expect(text).not.toMatch(/https?:|blob:|data:|\/\@fs/)
  expect(text).not.toContain('{x_titan_youtube:')
  expect(manifest.offline).toBe(true)
  expect(entries.get(audioTracksOf(text).sung!)).toEqual(new Uint8Array(await readFile('demo/ref-audio.wav')))
  expect(entries.get(audioTracksOf(text).playback!)).toEqual(new Uint8Array(await readFile('demo/ref-audio-playback.wav')))
  for (const block of layoutChart(parse(text))) {
    if (block.kind === 'image') expect(entries.get(block.src)).toEqual(new Uint8Array(await readFile('fixtures/assets/ele-vive-intro.png')))
    if (block.kind === 'score') {
      const ref = readScoreReference(block.text)
      if (ref) expect(entries.get(ref.src)).toEqual(new Uint8Array(await readFile('fixtures/notation/bends.gp')))
    }
  }
  expect(manifest.assets.flatMap((a: { roles: string[] }) => a.roles)).toEqual(expect.arrayContaining(['notation', 'chart-image', 'sung', 'playback', 'audio-cover', 'slide-cover', 'slide-background']))
  expect(new TextDecoder().decode(entries.get('ORIGEM.txt'))).toContain('abc123')
  for (const asset of manifest.assets) {
    expect(asset.path).not.toMatch(/(^\/|\.\.|\\)/)
    expect(entries.get(asset.path)?.length).toBeGreaterThan(0)
  }
})

test('an inaccessible audio stops export and offers a retry, without downloading an incomplete ZIP', async ({ page }) => {
  await page.route('**/ref-audio.wav*', route => route.request().resourceType() === 'script' ? route.continue() : route.fulfill({ status: 403, body: 'forbidden' }))
  let downloads = 0
  page.on('download', () => downloads++)
  await page.goto('/notation.html?pdf=1&bundle=1')
  await page.getByRole('button', { name: 'Exportar', exact: true }).click({ force: true })
  await page.locator('[data-export="bundle"]').click()
  const dialog = page.getByRole('dialog', { name: 'Exportar', exact: true })
  await expect(dialog.getByRole('alert')).toContainText('áudio')
  expect(downloads).toBe(0)
  await expect(page.locator('[data-export="bundle"]')).toBeEnabled()
  await page.unroute('**/ref-audio.wav*')
  const downloaded = page.waitForEvent('download')
  await page.locator('[data-export="bundle"]').click()
  await downloaded
})
