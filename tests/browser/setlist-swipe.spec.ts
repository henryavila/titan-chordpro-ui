import { expect, test } from '@playwright/test'

/** Finger on the right rail. Centre starts must not count. */
async function swipeFrom(
  page: import('@playwright/test').Page,
  dx: number,
  dy: number,
  along: number,
) {
  await page.evaluate(
    ({ dx, dy, along }) => {
      const el = document.querySelector('[data-cpv-root]') as HTMLElement
      const r = el.getBoundingClientRect()
      const x = r.left + r.width * along
      const y = r.top + r.height * 0.4
      const down = { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', isPrimary: true }
      el.dispatchEvent(new PointerEvent('pointerdown', { ...down, clientX: x, clientY: y }))
      window.dispatchEvent(
        new PointerEvent('pointermove', { ...down, clientX: x + dx * 0.3, clientY: y + dy * 0.3 }),
      )
      window.dispatchEvent(new PointerEvent('pointermove', { ...down, clientX: x + dx, clientY: y + dy }))
    },
    { dx, dy, along },
  )
}

async function liftFrom(
  page: import('@playwright/test').Page,
  dx: number,
  dy: number,
  along: number,
) {
  await page.evaluate(
    ({ dx, dy, along }) => {
      const el = document.querySelector('[data-cpv-root]') as HTMLElement
      const r = el.getBoundingClientRect()
      const x = r.left + r.width * along
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
    { dx, dy, along },
  )
}

test('swipe left from the right rail paints the next stamp and commits past the line', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1')
  await page.locator('[data-setlist-open]').first().waitFor()
  await expect(page.locator('[data-chart-title]').first()).toContainText(/Rei/i)

  await swipeFrom(page, -160, 8, 0.95)
  const veil = page.locator('[data-song-swipe]')
  await expect(veil).toBeVisible()
  await expect(veil).toHaveAttribute('data-intent', 'next')
  await expect(veil).toHaveAttribute('data-armed', '1')
  await expect(veil).toContainText(/Solte para ir/i)

  await liftFrom(page, -160, 8, 0.95)
  await expect(page.locator('[data-chart-title]').first()).toContainText(/Jesus/i)
  await expect(page.locator('[data-song-swipe]')).toHaveCount(0)
  await expect(page.locator('[data-cpv-root]')).not.toHaveAttribute('data-swipe')
})

test('a horizontal drag from the centre of the chart does not change song', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1')
  await page.locator('[data-setlist-open]').first().waitFor()
  await expect(page.locator('[data-chart-title]').first()).toContainText(/Rei/i)

  await swipeFrom(page, -160, 8, 0.5)
  await expect(page.locator('[data-song-swipe]')).toHaveCount(0)
  await liftFrom(page, -160, 8, 0.5)
  await expect(page.locator('[data-chart-title]').first()).toContainText(/Rei/i)
})

test('scrolling the chart down from the centre does not change song', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1')
  await page.locator('[data-setlist-open]').first().waitFor()
  await expect(page.locator('[data-chart-title]').first()).toContainText(/Rei/i)

  await swipeFrom(page, 18, 180, 0.5)
  await expect(page.locator('[data-song-swipe]')).toHaveCount(0)
  await liftFrom(page, 18, 180, 0.5)
  await expect(page.locator('[data-chart-title]').first()).toContainText(/Rei/i)
})
