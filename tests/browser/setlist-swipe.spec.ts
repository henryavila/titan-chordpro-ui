import { expect, test } from '@playwright/test'

/** Finger sequence on the chart. Mouse drag must not count — only touch. */
async function swipe(page: import('@playwright/test').Page, dx: number, dy: number) {
  await page.evaluate(
    ({ dx, dy }) => {
      const el = document.querySelector('[data-cpv-scroll]') as HTMLElement
      const r = el.getBoundingClientRect()
      const x = r.left + r.width * 0.72
      const y = r.top + r.height * 0.4
      const down = { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', isPrimary: true }
      el.dispatchEvent(new PointerEvent('pointerdown', { ...down, clientX: x, clientY: y }))
      window.dispatchEvent(
        new PointerEvent('pointermove', { ...down, clientX: x + dx * 0.3, clientY: y + dy * 0.3 }),
      )
      window.dispatchEvent(new PointerEvent('pointermove', { ...down, clientX: x + dx, clientY: y + dy }))
    },
    { dx, dy },
  )
}

async function lift(page: import('@playwright/test').Page, dx: number, dy: number) {
  await page.evaluate(
    ({ dx, dy }) => {
      const el = document.querySelector('[data-cpv-scroll]') as HTMLElement
      const r = el.getBoundingClientRect()
      const x = r.left + r.width * 0.72
      const y = r.top + r.height * 0.4
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: 'touch',
          isPrimary: true,
          clientX: x + dx,
          clientY: y + dy,
        }),
      )
    },
    { dx, dy },
  )
}

test('swipe left paints the next stamp and commits past the line', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1')
  await page.locator('[data-setlist-open]').first().waitFor()
  await expect(page.locator('[data-chart-title]').first()).toContainText(/Rei/i)

  await swipe(page, -160, 8)
  const veil = page.locator('[data-song-swipe]')
  await expect(veil).toBeVisible()
  await expect(veil).toHaveAttribute('data-intent', 'next')
  await expect(veil).toHaveAttribute('data-armed', '1')
  await expect(veil).toContainText(/Solte para ir/i)

  await lift(page, -160, 8)
  await expect(page.locator('[data-cpv-root]')).toHaveAttribute('data-swipe', /out-next|in-next|settle-next/)
  await expect(page.locator('[data-chart-title]').first()).toContainText(/Jesus/i)
  await expect(page.locator('[data-song-swipe]')).toHaveCount(0)
  await expect(page.locator('[data-cpv-root]')).not.toHaveAttribute('data-swipe')
})

test('scrolling the chart down does not change song', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1')
  await page.locator('[data-setlist-open]').first().waitFor()
  await expect(page.locator('[data-chart-title]').first()).toContainText(/Rei/i)

  await swipe(page, 18, 180)
  await expect(page.locator('[data-song-swipe]')).toHaveCount(0)
  await lift(page, 18, 180)
  await expect(page.locator('[data-chart-title]').first()).toContainText(/Rei/i)
})
