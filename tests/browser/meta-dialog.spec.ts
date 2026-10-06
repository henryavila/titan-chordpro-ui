import { expect, test } from '@playwright/test'

/**
 * Edit mode must expose a dedicated metadata door — duration/time/key cannot
 * live only in the source pane.
 */
test('content edit opens the metadata dialog and writes duration', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await expect(page.locator('[data-edit]')).toBeVisible()
  await page.locator('[data-edit]').click()
  await expect(page.locator('[data-meta-open]')).toBeVisible()
  await page.locator('[data-meta-open]').click()
  await expect(page.locator('[data-meta-dialog]')).toBeVisible()
  await expect(page.locator('[data-meta-duration]')).toBeVisible()
  await expect(page.locator('[data-meta-time="4/4"]')).toBeVisible()
  await page.locator('[data-meta-duration]').fill('05:12')
  await page.locator('[data-meta-time="4/4"]').click()
  await page.locator('[data-meta-apply]').click()
  await expect(page.locator('[data-meta-dialog]')).toHaveCount(0)
  await expect(page.locator('[data-meta-open]')).toContainText('05:12')
})

test('local edit also opens the metadata dialog', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('#host-modes').selectOption('local')
  await page.locator('[data-edit]').click()
  await expect(page.locator('[data-meta-open]')).toBeVisible()
  await page.locator('[data-meta-open]').click()
  await expect(page.locator('[data-meta-dialog]')).toBeVisible()
  await expect(page.locator('[data-meta-restart]')).toHaveCount(0)
  await page.locator('[data-meta-duration]').fill('05:12')
  await page.locator('[data-meta-apply]').click()
  await expect(page.locator('[data-meta-dialog]')).toHaveCount(0)
  await expect(page.locator('[data-meta-open]')).toContainText('05:12')
})

test('Começar de novo requires explicit confirm before opening Nova cifra', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('[data-edit]').click()
  await page.locator('[data-meta-open]').click()
  await expect(page.locator('[data-meta-dialog]')).toBeVisible()
  await expect(page.locator('[data-meta-restart]')).toBeVisible()

  await page.locator('[data-meta-restart]').click()
  await expect(page.locator('[data-new-chart]')).toHaveCount(0)
  await expect(page.locator('[data-meta-restart-confirm]')).toBeVisible()
  await expect(page.getByText('Substituir esta cifra?')).toBeVisible()

  await page.locator('[data-meta-restart-cancel]').click()
  await expect(page.locator('[data-meta-restart-confirm]')).toHaveCount(0)
  await expect(page.locator('[data-meta-dialog]')).toBeVisible()

  await page.locator('[data-meta-restart]').click()
  await page.locator('[data-meta-restart-confirm]').click()
  await expect(page.locator('[data-meta-dialog]')).toHaveCount(0)
  await expect(page.locator('[data-new-chart]')).toBeVisible()
  await expect(page.locator('[data-nova-blank]')).toBeVisible()
  await expect(page.locator('[data-nova-url]')).toBeVisible()

  await page.locator('[data-new-chart] button[aria-label="Fechar"]').click()
  await expect(page.locator('[data-new-chart]')).toHaveCount(0)
  await expect(page.getByText(/Escuta meu clamor|Escuta/i).first()).toBeVisible()
})

test('desktop shows the main fields and complementary actions side by side without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('[data-edit]').click()
  await page.locator('[data-meta-open]').click()

  const layout = await page.locator('[data-meta-dialog]').evaluate((dialog) => {
    const body = dialog.querySelector('.titan-chordpro-meta-body') as HTMLElement
    const chart = dialog.querySelector('.titan-chordpro-meta-chart') as HTMLElement
    const extras = dialog.querySelector('.titan-chordpro-meta-extras') as HTMLElement
    return {
      canScroll: body.scrollHeight > body.clientHeight + 2,
      chartRight: chart.getBoundingClientRect().right,
      extrasLeft: extras.getBoundingClientRect().left,
    }
  })
  expect(layout.canScroll).toBe(false)
  expect(layout.chartRight).toBeLessThan(layout.extrasLeft)
  await expect(page.locator('[data-meta-duration]')).toBeInViewport()
  await expect(page.locator('[data-meta-source]')).toBeInViewport()
  await expect(page.locator('[data-meta-restart]')).toBeInViewport()
  await expect(page.locator('[data-meta-apply]')).toBeInViewport()
})

test('phone keeps the chart form, references and actions in reachable tabs', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  await page.locator('[data-edit]').click()
  await page.locator('[data-meta-open]').click()

  await expect(page.locator('[data-meta-tab="chart"]')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-meta-tab="chart"]')).toBeFocused()
  await expect(page.locator('[data-meta-duration]')).toBeVisible()
  await page.locator('[data-meta-duration]').fill('05:12')
  await page.locator('.titan-chordpro-meta-body').evaluate((body) => { body.scrollTop = body.scrollHeight })
  await page.locator('[data-meta-tab="extras"]').click()
  await expect(page.locator('[data-meta-tab="extras"]')).toHaveAttribute('aria-selected', 'true')
  expect(await page.locator('.titan-chordpro-meta-body').evaluate((body) => body.scrollTop)).toBe(0)
  await expect(page.locator('[data-meta-source]')).toBeVisible()
  await expect(page.locator('[data-meta-restart]')).toBeVisible()
  await page.locator('[data-meta-source]').fill('https://example.com/chart')
  await expect(page.locator('[data-meta-apply]')).toBeInViewport()
  await page.locator('[data-meta-tab="chart"]').click()
  await expect(page.locator('[data-meta-duration]')).toHaveValue('05:12')
  await page.locator('[data-meta-tab="chart"]').press('ArrowRight')
  await expect(page.locator('[data-meta-tab="extras"]')).toBeFocused()
  await expect(page.locator('[data-meta-source]')).toHaveValue('https://example.com/chart')
  const overflow = await page.locator('[data-meta-dialog]').evaluate((dialog) => dialog.scrollWidth > dialog.clientWidth)
  expect(overflow).toBe(false)
})

for (const width of [390, 1280]) {
  test(`dark metadata keeps quiet field borders and a full-size reference input at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto('/')
    await page.locator('#host-theme').selectOption('dark')
    await page.locator('[data-edit]').click()
    await page.locator('[data-meta-open]').click()

    const borders = await page.locator('[data-meta-dialog]').evaluate((dialog) => {
      const duration = dialog.querySelector('[data-meta-duration]')?.parentElement?.parentElement
      const tempo = dialog.querySelector('.titan-chordpro-meta-rhythm > div')
      const key = dialog.querySelector('[data-meta-key-shown]')?.parentElement?.parentElement
      const time = dialog.querySelector('[data-meta-time="4/4"]')
      return [duration, tempo, key, time].map((el) => getComputedStyle(el!).borderColor)
    })
    for (const color of borders) {
      const alpha = Number(color.match(/,\s*([\d.]+)\)$/)?.[1] ?? 1)
      expect(alpha).toBeLessThanOrEqual(0.15)
    }

    if (width === 390) await page.locator('[data-meta-tab="extras"]').click()
    const reference = await page.locator('[data-meta-source]').evaluate((input) => ({
      height: input.getBoundingClientRect().height,
      border: getComputedStyle(input).borderColor,
      padding: getComputedStyle(input).paddingLeft,
    }))
    expect(reference.height).toBe(40)
    expect(reference.border).toBe('rgba(255, 255, 255, 0.1)')
    expect(reference.padding).toBe('12px')
  })
}
