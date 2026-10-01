import { expect, test } from '@playwright/test'

test('the real chart stays styled and scrollable across reading, themes and editing', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.goto('/?fit=0')

  const root = page.locator('[data-titan-chordpro-root]')
  const scroll = page.locator('[data-titan-chordpro-scroll]')
  const chord = page.locator('.titan-chordpro-chord').first()
  await expect(chord).toBeVisible()

  const reading = await page.evaluate(() => {
    const root = document.querySelector('[data-titan-chordpro-root]') as HTMLElement
    const scroll = document.querySelector('[data-titan-chordpro-scroll]') as HTMLElement
    const chord = document.querySelector('.titan-chordpro-chord') as HTMLElement
    return {
      background: getComputedStyle(root).backgroundColor,
      chord: getComputedStyle(chord).color,
      overflow: getComputedStyle(scroll).overflowY,
      viewportHeight: scroll.clientHeight,
      contentHeight: scroll.scrollHeight,
      frameHeight: document.querySelector('#host-frame')!.clientHeight,
    }
  })
  expect(reading.background).toBe('rgb(245, 246, 248)')
  expect(reading.chord).toBe('rgb(23, 113, 60)')
  expect(reading.overflow).toBe('auto')
  expect(reading.viewportHeight).toBeGreaterThanOrEqual(reading.frameHeight - 2)
  expect(reading.contentHeight).toBeGreaterThan(reading.viewportHeight)

  await page.locator('#host-theme').selectOption('dark')
  await expect(root).toHaveAttribute('data-theme', 'dark')
  await expect.poll(() => root.evaluate(el => getComputedStyle(el).backgroundColor))
    .toBe('rgb(11, 13, 18)')
  await expect.poll(() => chord.evaluate(el => getComputedStyle(el).color))
    .toBe('rgb(132, 223, 166)')

  await page.locator('[data-edit]').click()
  const persisted = page.locator('[data-mode-content]')
  if (await persisted.count()) await persisted.click()
  const pill = page.locator('.titan-chordpro-editrow .titan-chordpro-pill').first()
  await expect(pill).toBeVisible()
  expect(await pill.evaluate(el => getComputedStyle(el).color)).toBe('rgb(132, 223, 166)')
  await expect(scroll).toBeVisible()
})
