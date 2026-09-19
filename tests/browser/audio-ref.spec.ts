import { expect, test } from '@playwright/test'

test('reference player is a music transport, not Rolar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?audio=1')
  const player = page.locator('[data-audio-ref]')
  await player.waitFor()
  await expect(player).toContainText('Referência')
  await expect(player.locator('[data-icon=play]')).toBeVisible()
  await expect(page.locator('[data-scroll] [data-icon=chevronsDown]')).toBeVisible()
  await expect(page.locator('[data-scroll] [data-icon=play]')).toHaveCount(0)

  await player.locator('[data-audio-play]').click()
  await expect(player.locator('[data-icon=pause]')).toBeVisible()

  const clock = player.locator('[data-audio-clock]')
  await player.locator('[data-audio-skip="1"]').click()
  await expect(clock).not.toHaveText('0:00')
})
