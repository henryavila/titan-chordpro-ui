import { expect, test } from '@playwright/test'

/**
 * Capo hint is a single line of new shapes from the song — no prose, no wrap,
 * so the tone / capo block keeps a stable height.
 */
test.describe('capo shape list', () => {
  test('desktop: capo popover shows one line of new shapes', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/?chart=087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho&capo=2&dual=1&fit=0')
    await page.locator('[data-capo]').click()
    const hint = page.locator('[data-capo-hint]')
    await expect(hint).toBeVisible()
    const text = await hint.innerText()
    expect(text).toMatch(/^F · /)
    expect(text).toMatch(/A#|Bb/)
    expect(text).not.toMatch(/Você toca|Soa|Formas de/)
    const style = await hint.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { whiteSpace: cs.whiteSpace, overflow: cs.overflow, textOverflow: cs.textOverflow }
    })
    expect(style.whiteSpace).toBe('nowrap')
    expect(style.overflow).toBe('hidden')
    expect(style.textOverflow).toBe('ellipsis')
  })

  test('phone: tone sheet hint stays one line and does not grow the dialog', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/?chart=087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho&capo=2&dual=0&fit=0')
    await page.locator('[data-tone]').click()
    const sheet = page.locator('[role="dialog"][aria-label="Tom e capotraste"]')
    await expect(sheet).toBeVisible()
    const hint = sheet.locator('[data-capo-hint]')
    await expect(hint).toBeVisible()
    const text = await hint.innerText()
    expect(text).toMatch(/^F · /)
    expect(text).not.toMatch(/\n/)
    const box = await hint.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.height).toBeLessThanOrEqual(24)
  })
})
