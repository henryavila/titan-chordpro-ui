import { expect, test } from '@playwright/test'

/**
 * Phone identity bar with a rehearsal list AND capo used to spend every
 * leftover pixel on "TOM Ab · capo 1" + tela cheia, leaving the title as
 * "O…". The name keeps a 12rem floor; the bar wraps rather than collapsing.
 * Tela cheia stays on the right of its flex line; a wrapped second line
 * pins its items to the edges (space-between + margin-left:auto on fs).
 */
test('setlist + capo keeps a readable title on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1')
  await page.locator('[data-chart-title]').waitFor()
  await expect(page.locator('[data-setlist-open]').first()).toContainText('1/2')
  await expect(page.locator('[data-cpv-head] [data-icon=listMusic]')).toHaveCount(0)
  await expect(page.locator('[data-tone]')).toContainText(/capo/i)
  await page.locator('[data-tone]').click()
  await page.getByRole('button', { name: 'Capo acima', exact: true }).click()
  await page.getByRole('button', { name: 'Fechar' }).click()
  await expect(page.locator('[data-tone]')).toContainText(/capo\s*2/i)
  await expect(page.locator('[data-chart-title]')).toContainText('O Rei vem vindo')
  const box = await page.locator('[data-chart-title]').boundingBox()
  expect(box?.width ?? 0, 'title collapsed under the capo pill').toBeGreaterThanOrEqual(160)
  await page.screenshot({ path: test.info().outputPath('phone-head.png'), clip: { x: 0, y: 0, width: 390, height: 180 } })
})

test('wrapped phone head pins tom left and tela cheia right', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1')
  const head = page.locator('[data-cpv-head]')
  await head.waitFor()
  await expect(page.locator('[data-fs]')).toBeVisible()

  const place = await page.evaluate(() => {
    const el = document.querySelector('[data-cpv-head]') as HTMLElement
    const tone = el.querySelector('[data-tone]') as HTMLElement
    const fs = el.querySelector('[data-fs]') as HTMLElement
    const title = el.querySelector('[data-chart-title]') as HTMLElement
    const hr = el.getBoundingClientRect()
    const tr = tone.getBoundingClientRect()
    const fr = fs.getBoundingClientRect()
    const titleBottom = title.getBoundingClientRect().bottom
    return {
      wrapped: tr.top > titleBottom + 4,
      toneLeft: Math.round(tr.left - hr.left),
      fsRight: Math.round(hr.right - fr.right),
      fsAfterTone: fr.left > tr.right,
      justify: getComputedStyle(el).justifyContent,
      toneH: Math.round(tr.height),
      radius: parseFloat(getComputedStyle(el).borderRadius),
    }
  })

  expect(place.justify).toBe('space-between')
  expect(place.wrapped, 'tom stayed on the title row').toBe(true)
  expect(place.fsAfterTone).toBe(true)
  expect(place.toneH).toBeLessThanOrEqual(30)
  expect(place.radius).toBeGreaterThan(0)
  // Within a few pixels of the head padding — pinned to the line ends.
  expect(place.toneLeft).toBeLessThanOrEqual(18)
  expect(place.fsRight).toBeLessThanOrEqual(12)
})

/**
 * Edit reused the old full-bleed strip after the view head became a floating
 * card. Metadados sat outside the action cluster and landed alone on a middle
 * row; the subtitle repeated the same key/BPM chip the door already shows.
 */
test('edit head is a floating card and keeps Metadados with the actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('[data-edit]').click()
  const content = page.locator('[data-mode-content], button:has-text("Para todos")').first()
  if (await content.count()) await content.click()
  const head = page.locator('[data-cpv-head]')
  await expect(head).toBeVisible()
  await expect(page.locator('[data-edit-badge]')).toBeVisible()
  await expect(page.locator('[data-meta-open]')).toBeVisible()

  const place = await page.evaluate(() => {
    const el = document.querySelector('[data-cpv-head]') as HTMLElement
    const root = document.querySelector('[data-cpv-root]') as HTMLElement
    const acts = el.querySelector('.cpv-head-edit-acts') as HTMLElement
    const meta = el.querySelector('[data-meta-open]') as HTMLElement
    const title = el.querySelector('[data-chart-title]') as HTMLElement
    const hr = el.getBoundingClientRect()
    const rr = root.getBoundingClientRect()
    const ar = acts.getBoundingClientRect()
    const mr = meta.getBoundingClientRect()
    const sub = el.querySelector('.cpv-head-sub')
    return {
      radius: parseFloat(getComputedStyle(el).borderRadius),
      barH: Math.round(hr.height),
      width: Math.round(hr.width),
      rootW: Math.round(rr.width),
      fromTop: Math.round(hr.top - rr.top),
      metaInActs: acts.contains(meta),
      metaTop: Math.round(mr.top - hr.top),
      actsTop: Math.round(ar.top - hr.top),
      titleText: title?.textContent ?? '',
      subText: sub?.textContent?.trim() ?? '',
      justify: getComputedStyle(el).justifyContent,
    }
  })

  expect(place.radius).toBeGreaterThan(0)
  expect(place.fromTop).toBeGreaterThan(4)
  expect(place.metaInActs).toBe(true)
  expect(place.metaTop).toBe(place.actsTop)
  // Subtitle must not repeat the Metadados chip (key · BPM · time · duration).
  expect(place.subText).not.toMatch(/\d+\s*BPM/i)
  expect(place.barH).toBeLessThanOrEqual(110)
  await page.screenshot({ path: test.info().outputPath('edit-head-phone.png'), clip: { x: 0, y: 0, width: 390, height: 200 } })
})

test('wide floating head may grow past the reading column when capo is on', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto('/?lista=1')
  const head = page.locator('[data-cpv-head]')
  await head.waitFor()
  await expect(page.locator('[data-chart-title]')).toContainText('O Rei vem vindo')
  await expect(page.locator('[data-cpv-head] [data-icon=listMusic]')).toHaveCount(0)
  const place = await page.evaluate(() => {
    const headEl = document.querySelector('[data-cpv-head]') as HTMLElement
    const root = document.querySelector('[data-cpv-root]') as HTMLElement
    const fs = headEl.querySelector('[data-fs]') as HTMLElement | null
    const hr = headEl.getBoundingClientRect()
    const rr = root.getBoundingClientRect()
    const fr = fs?.getBoundingClientRect()
    return {
      fromTop: Math.round(hr.top - rr.top),
      width: Math.round(hr.width),
      fsRight: fr ? Math.round(hr.right - fr.right) : 99,
      fsInHead: !!fs,
      radius: parseFloat(getComputedStyle(headEl).borderRadius),
      titleW: Math.round((document.querySelector('[data-chart-title]') as HTMLElement).getBoundingClientRect().width),
    }
  })
  expect(place.titleW).toBeGreaterThanOrEqual(160)
  expect(place.width).toBeGreaterThan(500)
  expect(place.fromTop).toBeGreaterThan(4)
  expect(place.radius).toBeGreaterThan(0)
  expect(place.fsInHead).toBe(true)
  expect(place.fsRight, 'Tela cheia wrapped to the left of the card').toBeLessThanOrEqual(16)
  await page.screenshot({ path: test.info().outputPath('wide-head.png'), clip: { x: 0, y: 0, width: 800, height: 160 } })
})

test('zen pins a plain song name — not a second card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('[data-cpv-head]').waitFor()
  await expect(page.locator('[data-cpv-zen-title]')).toHaveCount(0)
  await expect(page.locator('[data-chart-title]')).toContainText(/Escuta/i)
  const chart = page.locator('.cpv-page')
  await chart.dispatchEvent('pointerdown')
  await chart.dispatchEvent('click')
  await expect(page.locator('.cpv-toast')).toHaveText('Toque na tela para mostrar os controles')
  await expect.poll(async () =>
    page.locator('[data-cpv-head]').evaluate((el) => getComputedStyle(el.closest('.cpv-chrome')!).opacity),
  ).toBe('0')
  const zen = page.locator('[data-cpv-zen-title]')
  await expect(zen).toContainText(/Escuta/i)
  expect(await zen.evaluate((el) => getComputedStyle(el).position)).toMatch(/absolute|fixed/)
  expect(await zen.locator('.cpv-veil, button').count()).toBe(0)
  expect(await page.locator('[data-scroll]').evaluate((el) =>
    el.closest('.cpv-chrome')!.classList.contains('is-hidden'))).toBe(true)
  await page.screenshot({ path: test.info().outputPath('zen-title.png'), clip: { x: 0, y: 0, width: 390, height: 180 } })
  const y0 = (await zen.boundingBox())!.y
  await page.locator('[data-cpv-scroll]').evaluate((el) => {
    (el as HTMLElement).scrollTop = 220
  })
  const y1 = (await zen.boundingBox())!.y
  expect(Math.abs(y1 - y0), 'plain name left the head band while scrolling').toBeLessThan(2)
  await page.screenshot({ path: test.info().outputPath('zen-title-scrolled.png'), clip: { x: 0, y: 0, width: 390, height: 180 } })
})
