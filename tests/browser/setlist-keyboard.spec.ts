import { expect, test } from '@playwright/test'

/**
 * Compact setlist docks with flex-end. Soft keyboards shrink the visual
 * viewport; without pinning the overlay, a short filtered list sits behind
 * the keyboard. Controllable visualViewport mock — desktop Chromium has no
 * real soft keyboard.
 */
test('compact setlist stays above a simulated soft keyboard', async ({ page }) => {
  await page.addInitScript(() => {
    let height = window.innerHeight
    const listeners = new Map<string, Set<() => void>>()
    const vv = {
      get width() {
        return window.innerWidth
      },
      get height() {
        return height
      },
      offsetLeft: 0,
      offsetTop: 0,
      scale: 1,
      addEventListener(type: string, fn: () => void) {
        if (!listeners.has(type)) listeners.set(type, new Set())
        listeners.get(type)!.add(fn)
      },
      removeEventListener(type: string, fn: () => void) {
        listeners.get(type)?.delete(fn)
      },
      dispatchEvent() {
        return true
      },
    }
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })
    ;(window as unknown as { __shrinkVV: (h: number) => void }).__shrinkVV = (h: number) => {
      height = h
      listeners.get('resize')?.forEach((fn) => fn())
    }
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=busca')
  await page.locator('[data-setlist-open]').first().waitFor()
  await page.locator('[data-setlist-open]').first().click()
  await page.locator('[data-setlist-search]').waitFor()

  // Narrow the list so the sheet is short — the case that used to hide behind the keyboard.
  const needle = await page.locator('[data-setlist-item]').first().locator('span').nth(1).locator('span').first().innerText()
  await page.locator('[data-setlist-search]').fill(needle.slice(0, Math.min(18, needle.length)))
  await expect(page.locator('[data-setlist-item]').first()).toBeVisible()

  // Searching lifts the sheet to the top — overlay keyboards often never resize visualViewport.
  await expect
    .poll(async () => page.locator('[data-setlist-overlay]').evaluate((el) => getComputedStyle(el).alignItems))
    .toBe('flex-start')
  const lifted = await page.evaluate(() => {
    const root = document.querySelector('.cpv-root') as HTMLElement
    const dialog = document.querySelector('[aria-label="Lista do ensaio"]') as HTMLElement
    // Harness keeps a small host toolbar above the chart — measure inside the viewer.
    return Math.round(dialog.getBoundingClientRect().top - root.getBoundingClientRect().top)
  })
  expect(lifted).toBeLessThanOrEqual(12)

  const before = await page.locator('[data-setlist-overlay]').evaluate((el) => (el as HTMLElement).style.bottom)
  expect(before === '' || before === '0px').toBe(true)

  await page.evaluate(() => {
    ;(window as unknown as { __shrinkVV: (h: number) => void }).__shrinkVV(500)
  })

  const place = await page.evaluate(() => {
    const overlay = document.querySelector('[data-setlist-overlay]') as HTMLElement
    const dialog = overlay.querySelector('[role="dialog"]') as HTMLElement
    const or = overlay.getBoundingClientRect()
    const dr = dialog.getBoundingClientRect()
    return {
      bottom: overlay.style.bottom,
      overlayBottom: Math.round(or.bottom),
      dialogBottom: Math.round(dr.bottom),
      dialogTop: Math.round(dr.top),
      itemVisible: !!document.querySelector('[data-setlist-item]'),
      searchTop: Math.round(
        (document.querySelector('[data-setlist-search]') as HTMLElement).getBoundingClientRect().top,
      ),
    }
  })

  expect(place.bottom).toBe('344px')
  expect(place.overlayBottom).toBeLessThanOrEqual(500)
  // Sheet docks to the overlay floor (≤ visual viewport). A few px of border
  // rounding on the harness chrome is fine; the old bug hid the whole sheet.
  expect(place.dialogBottom).toBeLessThanOrEqual(place.overlayBottom + 8)
  expect(place.dialogTop).toBeGreaterThanOrEqual(0)
  expect(place.searchTop).toBeLessThan(500)
  expect(place.itemVisible).toBe(true)
  expect(place.dialogBottom).toBeGreaterThan(place.dialogTop)
})
