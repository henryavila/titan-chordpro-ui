import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { diffOps, normalizeSource, writeScoreReference } from '../../src/core'

const songId = '001-tudo-que-ha-de-bom-em-mim'
const source = normalizeSource(readFileSync('fixtures/sda/001-tudo-que-ha-de-bom-em-mim.cho', 'utf8'))
const score = writeScoreReference({ src: 'private/solo.gp', track: 1, start: 1, end: 1, name: 'Solo de entrada' })
const bytes = readFileSync('fixtures/notation/notes.gp')
const suggestion = {
  id: 'score-review', songId, title: 'Tudo que há de bom em mim', at: 1, baseVersion: 'v1', actorName: 'Ana',
  ops: diffOps(source, `${source}\n${score}`, { transpose: 0, capo: 0 }),
  scoreAttachments: [{ src: 'private/solo.gp', filename: 'solo.gp', base64: bytes.toString('base64') }],
}

test('review draws the attached score and accepts its published file', async ({ page }) => {
  await page.addInitScript((value) => localStorage.setItem('cpv:sug', JSON.stringify([value])), suggestion)
  await page.goto('/demo-insertion.html?editMode=persisted')
  await page.locator('[data-queue-chip]').click()
  await page.locator('[data-q-song]').click()
  await page.locator('[data-q-sug]').click()
  const review = page.locator('[data-q-score-review]')
  await expect(review).toContainText('Solo de entrada')
  await expect(review).toContainText('solo.gp')
  await expect(review.locator('.cpv-notation-paper svg').first()).toBeVisible()
  await page.locator('[data-q-accept]').click()
  await expect(page.locator('[data-q-op]')).toHaveCount(0)
  const queue = await page.evaluate(() => JSON.parse(localStorage.getItem('cpv:sug') || '[]'))
  expect(queue[0].status).toBe('accepted')
})

test('demo sends an imported score from the musician tab to the reviewer tab', async ({ page, context }) => {
  await page.addInitScript(() => localStorage.setItem('cpv:editSeen', '1'))
  await page.goto('/demo-insertion.html?editMode=local')
  await page.locator('[data-edit]').click()
  await page.locator('[data-insert-at]').first().click()
  await page.getByRole('button', { name: 'Guitar Pro / MusicXML', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Solo de Guitar Pro ou MusicXML' })
  await dialog.locator('input[type="file"]').setInputFiles('fixtures/notation/notes.gp')
  await expect(dialog.locator('.cpv-notation-paper svg').first()).toBeVisible()
  await dialog.getByRole('button', { name: 'Salvar trecho na cifra' }).click()
  await page.locator('[data-read]').click()
  const reviewer = await context.newPage()
  await reviewer.goto('/demo-insertion.html?editMode=persisted')
  await page.locator('[data-open-my]').click()
  await page.locator('[data-suggest-name]').fill('Ana')
  await page.locator('[data-suggest]').click()
  await page.locator('[data-suggest]').click()
  await expect(page.locator('[data-my-panel]')).toHaveCount(0)

  await expect(reviewer.locator('[data-queue-chip]')).toBeVisible()
  await reviewer.locator('[data-queue-chip]').click()
  await reviewer.locator('[data-q-song]').click()
  await reviewer.locator('[data-q-sug]').click()
  await expect(reviewer.locator('[data-q-score-review] .cpv-notation-paper svg').first()).toBeVisible()
  await reviewer.locator('[data-q-accept]').click()
  await expect(reviewer.locator('[data-q-op]')).toHaveCount(0)
  await reviewer.reload()
  await expect(reviewer.locator('[data-external-score] .cpv-notation-paper svg').first()).toBeVisible()
})
