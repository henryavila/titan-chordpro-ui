import { expect, test } from '@playwright/test'

/**
 * Batida guitar one-shots: preload on create; toggle + Ouvir in the editor;
 * same toggle on the metronome panel when playing in view.
 */
test('create sheet and metronome both drive Som da batida', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('#host-modes').selectOption('content')
  await page.locator('[data-edit]').click()
  await page.locator('[data-batida-create]').click()
  await expect(page.locator('[data-batida-sheet]')).toBeVisible()
  await expect(page.locator('[data-batida-sound]')).toBeVisible()
  await expect(page.locator('[data-batida-preview]')).toBeDisabled()
  // Play sits on the grid bar (next to the slots), not above the meta prose.
  await expect(page.locator('[data-batida-beats]')).toBeVisible()

  await page.locator('[data-batida-sound]').click()
  await expect(page.locator('[data-batida-sound]')).toContainText('Som')

  await page.locator('[data-batida-slot="0"]').click()
  await page.locator('[data-batida-dir-col="down"] [data-batida-choice="hit"]').first().click()
  await expect(page.locator('[data-batida-preview]')).toBeEnabled()
  await page.locator('[data-batida-preview]').click()
  await expect(page.locator('[data-batida-preview]')).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(400)
  await page.locator('[data-batida-preview]').click()
  await expect(page.locator('[data-batida-preview]')).toHaveAttribute('aria-pressed', 'false')

  await page.locator('[data-batida-save]').click()
  await expect(page.locator('[data-batida-sheet]')).toHaveCount(0)

  // View mode: edit chrome hides the metronome sheet.
  await page.locator('[data-read]').click()
  await expect(page.locator('[data-met-btn]')).toBeVisible()
  await expect(page.locator('[data-strum-btn]')).toBeVisible()

  await page.locator('[data-met-btn]').click()
  // Editor left strum sound on → Fonte shows Batida selected.
  await expect(page.locator('[data-met-source="batida"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-ensaio-batida]')).toBeVisible()

  // Start closes the panel (onPanelClose); the dock chip keeps the live BPM.
  await page.locator('[data-met-run]').click()
  await expect(page.locator('[data-met-source="batida"]')).toHaveCount(0)
  await expect(page.locator('[data-met-btn]')).toContainText(/BPM/i)
})
