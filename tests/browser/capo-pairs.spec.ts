import { expect, test } from '@playwright/test'

/**
 * Capo hint is a single row of soft chord chips (viewer pill language, quieter)
 * with horizontal scroll when the list does not fit — never wraps / grows height.
 */
test.describe('capo shape chips', () => {
  test('desktop: capo popover shows soft chips and scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/?chart=087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho&capo=2&dual=1&fit=0')
    await page.locator('[data-capo]').click()
    const hint = page.locator('[data-capo-hint]')
    await expect(hint).toBeVisible()
    const chips = page.locator('[data-capo-chip]')
    await expect(chips.first()).toHaveText('F')
    expect(await chips.count()).toBeGreaterThan(4)
    const style = await hint.evaluate((el) => {
      const cs = getComputedStyle(el)
      return {
        overflowX: cs.overflowX,
        whiteSpace: cs.whiteSpace,
        flexWrap: cs.flexWrap,
        height: el.getBoundingClientRect().height,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }
    })
    expect(style.overflowX).toMatch(/auto|scroll/)
    expect(style.flexWrap === 'nowrap' || style.flexWrap === '').toBe(true)
    expect(style.height).toBeLessThanOrEqual(28)
    // Narrow the popover content so a long song overflows and can scroll.
    expect(style.scrollWidth).toBeGreaterThanOrEqual(style.clientWidth)
  })

  test('phone: tone sheet chips stay one row with sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/?chart=087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho&capo=2&dual=0&fit=0')
    await page.locator('[data-tone]').click()
    const sheet = page.locator('[role="dialog"][aria-label="Tom e capotraste"]')
    await expect(sheet).toBeVisible()
    const hint = sheet.locator('[data-capo-hint]')
    await expect(hint).toBeVisible()
    await expect(sheet.locator('[data-capo-chip]').first()).toHaveText('F')
    const box = await hint.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.height).toBeLessThanOrEqual(28)
    const overflowX = await hint.evaluate((el) => getComputedStyle(el).overflowX)
    expect(overflowX).toMatch(/auto|scroll/)
  })
})
