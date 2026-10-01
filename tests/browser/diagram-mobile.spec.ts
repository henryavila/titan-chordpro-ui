import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

test('diagram instrument buttons are reachable by touch above the phone edge', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-diagram-hit]').first().tap()
  const choices = page.locator('[data-diagram-instrument]')
  await expect(choices).toHaveCount(3)
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport)
    for (const choice of await choices.all()) {
      const geometry = await choice.evaluate((el) => {
        const button = el.getBoundingClientRect()
        const panel = el.closest('[data-diagram-panel]')!.getBoundingClientRect()
        return {
          width: button.width,
          height: button.height,
          bottomClearance: panel.bottom - button.bottom,
          hit: document.elementFromPoint(button.x + button.width / 2, button.y + button.height / 2) === el,
        }
      })
      expect(geometry.width).toBeGreaterThanOrEqual(80)
      expect(geometry.height).toBeGreaterThanOrEqual(44)
      expect(geometry.bottomClearance).toBeGreaterThanOrEqual(32)
      expect(geometry.hit).toBe(true)
      await choice.tap()
      await expect(choice).toHaveAttribute('aria-pressed', 'true')
    }
  }
})

test('piano degrees remain circled when the consumer chooses a dark chord colour', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-titan-chordpro-root]').evaluate((el) => {
    ;(el as HTMLElement).style.setProperty('--chord', '#141820')
  })
  await page.locator('[data-diagram-hit]').first().tap()
  await page.locator('[data-diagram-instrument="piano"]').tap()
  const draw = page.locator('[data-diagram-draw]')
  await expect(draw.locator('.diagram-piano-degree')).not.toHaveCount(0)
  const badges = await draw.locator('.diagram-piano-degree-badge').count()
  const labels = await draw.locator('.diagram-piano-degree').count()
  expect(badges).toBe(labels)
  const selectedBlack = draw.locator('.diagram-piano-black-on').first()
  await expect(selectedBlack).toBeVisible()
  expect(await selectedBlack.evaluate((el) => getComputedStyle(el).fill)).toBe('rgb(20, 24, 32)')
  expect(Number(await selectedBlack.getAttribute('fill-opacity'))).toBeGreaterThan(0.5)
  await expect(draw.locator('.diagram-piano-degree-badge[fill="#FFFFFF"]')).not.toHaveCount(0)
})
