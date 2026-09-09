import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { layoutChartFull, parse } from '../../src/core'

const source = readFileSync(new URL('../../fixtures/escuta-meu-clamor-sda-86.cho', import.meta.url), 'utf8')
const rows = (semitones = 0, capo = 0) => layoutChartFull(parse(source), { semitones, capo }).blocks
  .flatMap(b => b.kind === 'stanza' || b.kind === 'chorus' ? b.rows : [])

async function checkGeometry(page: Page, semitones = 0, capo = 0) {
  const expected = rows(semitones, capo)
  await expect(page.locator('.cpv-chord').first()).toHaveText(expected.flatMap(r => r.segs).find(s => s.chord)!.chord)
  const actual = await page.locator('.cpv-row').evaluateAll(elements => elements.map(row => {
    const chords = Array.from(row.querySelectorAll('.cpv-chord'))
    const failures: string[] = []
    for (const lane of ['.cpv-chord', '.cpv-shape']) {
      const boxes = Array.from(row.querySelectorAll(lane))
      boxes.slice(1).forEach((b, i) => {
        const a = boxes[i]!, ar = a.getBoundingClientRect(), br = b.getBoundingClientRect()
        if (Math.abs(ar.y - br.y) < 1 && br.x - ar.right < 3.5)
          failures.push(`${a.textContent}/${b.textContent}: ${(br.x - ar.right).toFixed(2)}px`)
      })
    }
    for (const chord of chords) {
      const lyric = chord.closest('.cpv-word')!.querySelector('.cpv-lyric')!
      if (Math.abs(chord.getBoundingClientRect().x - lyric.getBoundingClientRect().x) > 1)
        failures.push(`anchor ${chord.textContent}`)
    }
    for (const word of row.querySelectorAll('.cpv-reading-word')) {
      const ys = [...word.querySelectorAll('.cpv-lyric')].map(el => el.getBoundingClientRect().y)
      if (Math.max(...ys) - Math.min(...ys) > 1) failures.push('word broken at internal chord')
    }
    // The clearance a chord reserves cannot depend on where it landed: a chord
    // inside a word used to get a thinner one, which is what made two chords in
    // "cura" collide in the first place.
    const reserves = new Set([...row.querySelectorAll('.cpv-chord-stack')]
      .map(el => getComputedStyle(el).paddingRight))
    if (reserves.size > 1) failures.push(`uneven chord reserve: ${[...reserves].join(' / ')}`)
    const flow = row.querySelector('.cpv-reading-flow')!
    if (flow.scrollWidth > flow.clientWidth + 1) failures.push('reading flow overflows container')
    return {
      failures,
      lyric: [...row.querySelectorAll('.cpv-lyric')].map(e => e.textContent).join(''),
      chords: chords.map(e => e.textContent),
      shapes: [...row.querySelectorAll('.cpv-shape')].map(e => e.textContent),
    }
  }))
  expect(actual.flatMap(r => r.failures)).toEqual([])
  expect(actual.map(r => r.lyric)).toEqual(expected.map(r => r.plain))
  expect(actual.map(r => r.chords)).toEqual(expected.map(r => r.segs.filter(s => s.chord).map(s => s.chord)))
  expect(actual.map(r => r.shapes)).toEqual(expected.map(r => r.segs.filter(s => s.hasShape).map(s => s.shape)))
}

for (const width of [1280, 375]) {
  test(`real fixture geometry, fonts, transpose/capo and resize at ${width}px`, async ({ page }, info) => {
    expect(createHash('sha256').update(source).digest('hex')).toBe('d7d80be43cac373bf4615b8c0413c14b96a62804a57972da1173054ed38b3be2')
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.locator('.cpv-chord').first().waitFor()
    // No webfont stylesheet exists yet: exercise the standalone fallback.
    await page.evaluate(() => document.fonts.ready)
    await checkGeometry(page)
    for (const [a, b] of [['Bm', 'E'], ['B', 'E'], ['Em7/D', 'A'], ['Fsus4', 'F']]) {
      const pairs = await page.locator('.cpv-row').evaluateAll(elements => elements.flatMap(row => {
        const ch = [...row.querySelectorAll('.cpv-chord')]
        return ch.slice(1).map((el, i) => [ch[i]!.textContent, el.textContent])
      }))
      expect(pairs).toContainEqual([a, b])
    }
    await page.locator('#load-fonts').click()
    await expect(page.locator('#fonts-state')).toHaveText('loaded')
    await checkGeometry(page)
    // Embed font contract, independent choices for lyric, controls and chords.
    await page.locator('[data-cpv-root]').evaluate(el => {
      const style = (el as HTMLElement).style
      style.setProperty('--cpv-font-lyrics', 'Figtree, sans-serif')
      // CSS-wide inherit belongs on font-family, not on a custom property.
      style.fontFamily = 'inherit'
      style.setProperty('--cpv-font-chords', 'Sora, sans-serif')
    })
    expect(await page.locator('.cpv-lyric').first().evaluate(el => getComputedStyle(el).fontFamily)).toContain('Figtree')
    expect(await page.locator('[data-theme-btn]').first().evaluate(el => getComputedStyle(el).fontFamily)).toContain('Arial')
    expect(await page.locator('.cpv-chord').first().evaluate(el => getComputedStyle(el).fontFamily)).toContain('Sora')
    await checkGeometry(page)
    // Keyboard is the same user control on phone and desktop.
    await page.locator('#load-fonts').blur()
    await page.keyboard.press('+')
    await page.keyboard.press('+')
    await checkGeometry(page, 2)
    // The desktop capo control persists its value through the subsequent resize.
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.locator('[data-capo]').click()
    await page.getByRole('button', { name: 'Capo acima', exact: true }).click()
    await page.getByRole('button', { name: 'Capo acima', exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(page.locator('.cpv-shape').first()).toBeVisible()
    await checkGeometry(page, 2, 2)
    await page.setViewportSize({ width: 320, height: 900 })
    await checkGeometry(page, 2, 2)
    await page.locator('[data-cpv-root]').evaluate(el => {
      const s = (el as HTMLElement).style
      s.setProperty('--cpv-font-lyrics', 'UnavailableTestFont, serif')
      s.setProperty('--cpv-font-chords', 'UnavailableTestFont, monospace')
    })
    await checkGeometry(page, 2, 2)
    await page.setViewportSize({ width, height: 900 })
    await checkGeometry(page, 2, 2)
    const screenshot = info.outputPath('reading.png')
    await page.screenshot({ path: screenshot })
    await info.attach('reading', { path: screenshot, contentType: 'image/png' })
  })
}

test('controlled auto follows system changes, explicit host theme wins old preference', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cpv:prefs', JSON.stringify({ theme: 'dark' })))
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  const root = page.locator('[data-cpv-root]')
  await expect(root).toHaveAttribute('data-theme', 'light')
  await page.locator('#host-theme').selectOption('auto')
  await expect(root).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(root).toHaveAttribute('data-theme', 'light')
  await page.locator('#host-control').selectOption('preference')
  await expect(root).toHaveAttribute('data-theme', 'dark')
})


test('font tokens reach edit lyrics and pills while source remains monospace', async ({ page }) => {
  await page.goto('/')
  await page.locator('#load-fonts').click()
  await expect(page.locator('#fonts-state')).toHaveText('loaded')
  await page.locator('[data-cpv-root]').evaluate(el => {
    const s = (el as HTMLElement).style
    s.setProperty('--cpv-font-controls', 'Figtree, sans-serif')
    s.setProperty('--cpv-font-lyrics', 'Sora, sans-serif')
    s.setProperty('--cpv-font-chords', 'Figtree, sans-serif')
  })
  await page.locator('[data-edit]').click()
  await expect(page.locator('.cpv-editrow').first()).toBeVisible()
  expect(await page.locator('.cpv-editrow').first().evaluate(el => getComputedStyle(el).fontFamily)).toContain('Sora')
  expect(await page.locator('.cpv-pill').first().evaluate(el => getComputedStyle(el).fontFamily)).toContain('Figtree')
  expect(await page.locator('[data-theme-btn]').first().evaluate(el => getComputedStyle(el).fontFamily)).toContain('Figtree')
  await page.locator('.cpv-editrow').first().click()
  expect(await page.getByRole('textbox', { name: 'Letra desta linha' }).evaluate(el => getComputedStyle(el).fontFamily)).toContain('Sora')
  await page.getByRole('textbox', { name: 'Letra desta linha' }).press('Escape')
  await page.locator('[data-source]').click()
  expect(await page.locator('.cpv-src textarea').evaluate(el => getComputedStyle(el).fontFamily)).toContain('monospace')
})


test('personal marker stays clickable outside horizontal flow and reverts the real edit', async ({ page }) => {
  await page.goto('/')
  await page.locator('#host-modes').selectOption('local')
  await page.locator('[data-edit]').click()
  const pick = page.locator('[data-mode-local]')
  if (await pick.isVisible()) await pick.click()
  await page.locator('.cpv-editrow').filter({ hasText: 'Eu oro pela' }).click()
  const input = page.getByRole('textbox', { name: 'Letra desta linha' })
  const original = await input.inputValue()
  await input.fill(`${original} (meu)`)
  await input.press('Enter')
  await page.locator('[data-read]').click()
  const row = page.locator('.cpv-row').filter({ hasText: '(meu)' })
  const marker = row.locator('[data-mine-dot]')
  await marker.scrollIntoViewIfNeeded()
  expect(await marker.evaluate(el => {
    const r = el.getBoundingClientRect()
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
  })).toBe(true)
  await marker.click()
  await expect(page.locator('.cpv-row').filter({ hasText: '(meu)' })).toHaveCount(0)
  expect(await page.locator('.cpv-row').evaluateAll(rows => rows.map(row =>
    [...row.querySelectorAll('.cpv-lyric')].map(el => el.textContent).join(''),
  ))).toContain(original)
})

/**
 * Two things jsdom cannot answer, because it gives every element zero height:
 * whether the reading line stays out of the way once the chart is moving, and
 * where the beat badge actually lands on a wide screen.
 */
test('the reading line answers and withdraws, and the beat badge hangs off the column', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()
  const guide = page.locator('.cpv-guide')
  const scroll = page.locator('.cpv-scroll')

  // At the top the chart stands still while the playhead walks to the line.
  // That is the one moment the line has something to say, and it says it.
  await page.locator('.cpv-chord').first().click()
  await page.keyboard.press(' ')
  await expect(guide).toBeVisible()
  await expect(page.locator('.cpv-guide-label')).toContainText('espera até aqui')

  // Reading further in, the chart is moving and the line has no business
  // across the words: it used to be drawn through the whole song.
  await page.keyboard.press(' ')
  await scroll.evaluate((el) => (el.scrollTop = 600))
  await page.keyboard.press(' ')
  await expect(guide).toBeHidden()

  // Dragging is the musician asking where the music is. It answers, briefly.
  await scroll.evaluate((el) => (el.scrollTop = 900))
  await expect(guide).toBeVisible()
  await expect(guide).toBeHidden({ timeout: 4000 })
  await page.keyboard.press(' ')

  // The badge belongs to the chart, not to the window: at 1280 the column is
  // 880 wide, so the far corner of the glass is 200px of empty background away.
  await page.keyboard.press('m')
  const badge = page.locator('[data-met-pulse]')
  await expect(badge).toBeVisible()
  const box = await badge.evaluate((el) => {
    const col = document.querySelector('.cpv-page')!.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    return { fromColumn: Math.abs(b.right - col.right), fromGlass: window.innerWidth - b.right }
  })
  // The few px left over are the badge's own scale on beat one, which grows it
  // about its centre. At the window's edge this gap would be 16px.
  expect(box.fromColumn).toBeLessThan(12)
  expect(box.fromGlass).toBeGreaterThan(120)
})
