import { expect, test } from '@playwright/test'

test('Só letra hides chords and keeps the lyric', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()
  await page.locator('[data-reading=letra]').click()
  await expect(page.locator('[data-reading=letra]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.cpv-chord')).toHaveCount(0)
  await expect(page.locator('.cpv-lyric').first()).toBeVisible()
  await expect(page.locator('.cpv-lyric').first()).not.toHaveText(/^\s*$/)
  const lyrics = (await page.locator('.cpv-lyric').allTextContents()).join('')
  expect(lyrics).not.toMatch(/x\/+/)
  expect(lyrics).not.toMatch(/(^|\s)\/+(\s|$)/)
})

test('host lens=letra opens already in Só letra', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.goto('/?lens=letra')
  await page.locator('.cpv-lyric').first().waitFor()
  await expect(page.locator('[data-reading=letra]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.cpv-chord')).toHaveCount(0)
})

test('host lens=none opens Cifra even when prefs were Letra', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.addInitScript(() => {
    localStorage.setItem('cpv:prefs', JSON.stringify({ lens: 'letra' }))
  })
  await page.goto('/?lens=none')
  await page.locator('.cpv-chord').first().waitFor()
  await expect(page.locator('[data-reading=cifra]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-reading=letra]')).toHaveAttribute('aria-pressed', 'false')
})

test('phone Letra is one tap on the dock, not through Mais', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()
  await expect(page.getByRole('dialog', { name: 'Mais controles' })).toHaveCount(0)
  await page.locator('[data-reading=letra]').click()
  await expect(page.locator('[data-reading=letra]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.cpv-chord')).toHaveCount(0)
  await page.getByRole('button', { name: 'Mais controles' }).click()
  const mais = page.getByRole('dialog', { name: 'Mais controles' })
  await expect(mais).toBeVisible()
  await expect(mais).toContainText('Nashville')
  await expect(mais).toContainText('Comentários de ensaio')
  await expect(mais).not.toContainText('Lentes de leitura')
})

test('Só letra survives changing song in the setlist', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.goto('/?lista=1&lens=letra')
  await page.locator('[data-setlist-open]').first().waitFor()
  await expect(page.locator('[data-reading=letra]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.cpv-chord')).toHaveCount(0)
  await page.locator('[data-song-next]').click()
  await expect(page.locator('[data-chart-title]')).toContainText(/Jesus/i)
  await expect(page.locator('[data-reading=letra]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.cpv-chord')).toHaveCount(0)
})

test('Só letra keeps at most one blank line between sung blocks', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.goto('/?lens=letra')
  await page.locator('.cpv-block').first().waitFor()
  await expect(page.locator('[data-cpv-root]')).toHaveAttribute('data-cpv-lens', 'letra')

  const measured = await page.evaluate(() => {
    const root = document.querySelector('[data-cpv-root]') as HTMLElement
    const blocks = [...root.querySelectorAll('.cpv-block')] as HTMLElement[]
    const lyric = root.querySelector('.cpv-lyric') as HTMLElement
    const lyricPx = parseFloat(getComputedStyle(lyric).fontSize)
    const margins = blocks.map((el) => parseFloat(getComputedStyle(el).marginBottom))
    // Gap between consecutive chart siblings (comment/stanza/chorus) — empty air only.
    const body = root.querySelector('.cpv-blockbody') as HTMLElement
    const kids = [...body.children] as HTMLElement[]
    const siblingGaps: number[] = []
    for (let i = 0; i < kids.length - 1; i++) {
      const a = kids[i]!.getBoundingClientRect()
      const b = kids[i + 1]!.getBoundingClientRect()
      siblingGaps.push(b.top - a.bottom)
    }
    const pad = getComputedStyle(blocks[0]!).paddingTop
    return {
      lyricPx,
      maxMargin: Math.max(0, ...margins),
      maxSiblingGap: Math.max(0, ...siblingGaps),
      padTop: parseFloat(pad),
      blockCount: blocks.length,
    }
  })

  expect(measured.blockCount).toBeGreaterThan(1)
  // blockGap is exactly one lyric line.
  expect(measured.maxMargin).toBeLessThanOrEqual(measured.lyricPx + 0.5)
  expect(measured.maxSiblingGap).toBeLessThanOrEqual(measured.lyricPx + 0.5)
  // Compact block padding — not the cifra box (12px).
  expect(measured.padTop).toBeLessThanOrEqual(6)
})
