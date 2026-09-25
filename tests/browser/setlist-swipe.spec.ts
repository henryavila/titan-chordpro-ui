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

test('the next stamp sits above the finger at mid-screen, not under the hand', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1')
  await page.locator('[data-setlist-open]').first().waitFor()

  const fingerY = await page.evaluate(() => {
    const el = document.querySelector('[data-cpv-root]') as HTMLElement
    const r = el.getBoundingClientRect()
    const x = r.left + r.width * 0.95
    const y = r.top + r.height * 0.5
    const down = { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', isPrimary: true }
    el.dispatchEvent(new PointerEvent('pointerdown', { ...down, clientX: x, clientY: y }))
    window.dispatchEvent(new PointerEvent('pointermove', { ...down, clientX: x - 48, clientY: y + 6 }))
    window.dispatchEvent(new PointerEvent('pointermove', { ...down, clientX: x - 160, clientY: y + 8 }))
    return y
  })

  const stamp = page.locator('.cpv-swipe-stamp')
  await expect(stamp).toBeVisible()
  const box = await stamp.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.y + box!.height).toBeLessThan(fingerY - 40)
  expect(box!.y).toBeGreaterThan(40)
})

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

async function touchDownOnRootAt(
  page: import('@playwright/test').Page,
  sel: string,
) {
  return page.evaluate((selector) => {
    const btn = document.querySelector(selector) as HTMLElement
    const root = document.querySelector('[data-cpv-root]') as HTMLElement
    const r = btn.getBoundingClientRect()
    const x = r.left + Math.min(12, r.width / 2)
    const y = r.top + r.height / 2
    const base = {
      bubbles: true,
      cancelable: true,
      pointerId: 9,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientX: x,
      clientY: y,
    }
    const ev = new PointerEvent('pointerdown', base)
    root.dispatchEvent(ev)
    const prevented = ev.defaultPrevented
    window.dispatchEvent(new PointerEvent('pointerup', base))
    window.dispatchEvent(new PointerEvent('pointercancel', base))
    return prevented
  }, sel)
}

test('rails stop above the phone dock so Rolar and Mais keep their rectangle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1')
  await page.locator('[data-scroll]').waitFor()
  const overlap = await page.evaluate(() => {
    const stack = document.querySelector('.cpv-phone-stack') as HTMLElement
    const s = stack.getBoundingClientRect()
    return [...document.querySelectorAll('.cpv-swipe-rail')].some((rail) => {
      const r = rail.getBoundingClientRect()
      return r.bottom > s.top + 0.5 && r.top < s.bottom && r.right > s.left && r.left < s.right
    })
  })
  expect(overlap).toBe(false)
})

test('a touch on Rolar at the left rail x does not arm swipe and still rolls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1')
  await page.locator('[data-scroll]').waitFor()
  expect(await touchDownOnRootAt(page, '[data-scroll]')).toBe(false)
  await expect(page.locator('[data-song-swipe]')).toHaveCount(0)
  await page.locator('[data-scroll]').evaluate((el) => (el as HTMLButtonElement).click())
  await expect(page.locator('[data-scroll]')).toHaveAttribute('aria-label', 'Parar')
})

test('a touch on Mais at the right rail x opens the sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1')
  await page.locator('[data-more]').waitFor()
  expect(await touchDownOnRootAt(page, '[data-more]')).toBe(false)
  await expect(page.locator('[data-song-swipe]')).toHaveCount(0)
  await page.locator('[data-more]').evaluate((el) => (el as HTMLButtonElement).click())
  await expect(page.getByRole('dialog', { name: 'Mais controles' })).toBeVisible()
})
