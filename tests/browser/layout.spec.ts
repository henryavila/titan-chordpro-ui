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
 * Things jsdom cannot answer, because it gives every element zero height:
 * whether the page actually starts moving, and where the beat badge lands on
 * a wide screen.
 */
test('the page starts moving at once, and the beat badge hangs off the column', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()
  const scroll = page.locator('.cpv-scroll')

  // The old scroll stood dead still until the music had covered a whole
  // anchor of paper — 25 to 96 seconds on the fixture corpus. It now eases
  // into the anchor instead, so the page is alive from the first second.
  await page.locator('.cpv-chord').first().click()
  await page.keyboard.press(' ')
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop), { timeout: 4000 }).toBeGreaterThan(0)
  // Nothing is drawn across the chart while it is being read.
  await expect(page.locator('.cpv-guide')).toHaveCount(0)
  // The bar at the top is what says the scroll is running.
  await expect(page.locator('.cpv-progress')).toHaveClass(/is-live/)
  await page.keyboard.press(' ')
  await expect(page.locator('.cpv-progress')).not.toHaveClass(/is-live/)

  // The badge belongs to the chart, not to the window: at 1280 the column is
  // 980 wide, so the far corner of the glass is 150px of empty background away.
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

/**
 * A chart that fits the frame has nowhere to go, and the control has to say
 * so: pressing Rolar and watching nothing happen, forever, is the worst answer
 * the viewer can give.
 */
test('Rolar goes dead when the chart fits the frame, and comes back when it does not', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()
  const roll = page.locator('[data-scroll]')

  // The fixture is far taller than the frame: the control is live, and the
  // click offers to carry the scroll with it.
  await expect(roll).toBeEnabled()
  await page.locator('[data-met-btn]').click()
  await expect(page.locator('[data-met-run]')).toContainText('Iniciar com a rolagem')
  // One bar of count-in before the chart moves, on a chart that has a scroll.
  await page.locator('[data-met-run]').click()
  await expect(page.locator('[data-met-countin]')).toBeVisible()
  await page.keyboard.press('m')

  // Shrink the chart until it fits: the control goes dead and says why.
  await page.locator('[data-cpv-root]').evaluate((el) => {
    ;(el as HTMLElement).style.height = '4000px'
  })
  await expect(roll).toBeDisabled()
  await expect(roll).toHaveAttribute('title', /cabe na tela/)
  // Nothing starts, by button or by keyboard.
  await roll.click({ force: true })
  await page.keyboard.press(' ')
  await expect(page.locator('.cpv-progress')).not.toHaveClass(/is-live/)

  await page.locator('[data-cpv-root]').evaluate((el) => {
    ;(el as HTMLElement).style.height = ''
  })
  await expect(roll).toBeEnabled()
})

/**
 * A scroll offset is snapped to whole pixels. At the speed a chart really
 * moves — 5 px/s and under — that meant the page stood dead still for eleven
 * frames and then teleported a pixel, six times a second: calm to look at in a
 * screenshot, and a discrete movement to the vestibular system every time.
 * The whole pixels go to `scrollTop`; the remainder rides a composited
 * transform, which is not snapped.
 */
test('the chart moves continuously, never a pixel at a time', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 860 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()
  await page.locator('.cpv-chord').first().click()
  await page.keyboard.press(' ')

  const seen = await page.evaluate(
    () =>
      new Promise<number[]>((res) => {
        const el = document.querySelector('.cpv-scroll') as HTMLElement
        const col = document.querySelector('.cpv-page') as HTMLElement
        const out: number[] = []
        const t0 = performance.now()
        const tick = () => {
          // Where the paper actually is: the snapped half plus the carried half.
          const m = new DOMMatrixReadOnly(getComputedStyle(col).transform)
          out.push(Number((el.scrollTop - m.m42).toFixed(4)))
          if (performance.now() - t0 < 2500) requestAnimationFrame(tick)
          else res(out)
        }
        requestAnimationFrame(tick)
      }),
  )

  expect(seen.length).toBeGreaterThan(60)
  const steps = seen.slice(1).map((y, i) => y - seen[i]!)
  const moved = steps.filter((d) => d > 0).length
  // Quantised, fewer than one frame in ten moved at all. It is now every frame.
  expect(moved / steps.length).toBeGreaterThan(0.8)
  // And no frame carries a whole-pixel jump, which is the thing being felt.
  expect(Math.max(...steps)).toBeLessThan(0.9)
  // Monotone: the carrier must never hand back a pixel it already gave.
  expect(Math.min(...steps)).toBeGreaterThanOrEqual(0)

  // Stopping puts the paper back on the scroller alone, so ordinary reading
  // and the scrollbar are never left riding a transform.
  await page.keyboard.press(' ')
  await expect
    .poll(() => page.locator('.cpv-page').evaluate((el) => (el as HTMLElement).style.transform))
    .toBe('')
})

/**
 * The phone dock is a fixed row of touch targets with no room to spare: adding
 * Tela cheia to it squashed the two neighbours that could shrink down to 33px
 * on a 390px phone, and pushed the last button off the edge at 320px. Neither
 * shows up in a screenshot of the common width.
 */
test('every dock control stays reachable across phone widths', async ({ page }) => {
  for (const width of [320, 360, 375, 390, 412, 430, 470]) {
    await page.setViewportSize({ width, height: 860 })
    await page.goto('/')
    await page.locator('.cpv-chord').first().waitFor()

    const dock = await page.evaluate(() => {
      const row = document.querySelector('[data-scroll]')!.parentElement as HTMLElement
      const boxes = [...row.querySelectorAll('button')].map((b) => {
        const r = b.getBoundingClientRect()
        return { label: b.getAttribute('aria-label') ?? b.textContent ?? '', w: r.width, h: r.height, right: r.right, left: r.left }
      })
      return { overflow: row.scrollWidth - row.clientWidth, boxes, frame: window.innerWidth }
    })

    expect(dock.overflow, `${width}px overflows its frame`).toBeLessThanOrEqual(0)
    for (const b of dock.boxes) {
      expect(b.left, `${width}px: "${b.label}" off the left edge`).toBeGreaterThanOrEqual(0)
      expect(b.right, `${width}px: "${b.label}" off the right edge`).toBeLessThanOrEqual(dock.frame)
      // The paired A−/A+ share one target and are allowed to be narrower; every
      // control that stands alone keeps a thumb-sized box.
      if (!/tipografia/i.test(b.label)) {
        expect(b.h, `${width}px: "${b.label}" is ${b.h}px tall`).toBeGreaterThanOrEqual(40)
        expect(b.w, `${width}px: "${b.label}" is ${b.w}px wide`).toBeGreaterThanOrEqual(40)
      }
    }
  }
})

test('Tela cheia is on the dock itself, and not also buried in Mais', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 860 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()

  const fsBtn = page.locator('[data-fs]')
  await expect(fsBtn).toBeVisible()

  // Drawn, not typed. `⤢` put 6.5px of ink on screen next to neighbours
  // drawing 12.4 — half the size — and how much ink a symbol character paints
  // is the font's decision, so no font-size could have fixed it.
  const ink = await page.evaluate(() => {
    const box = (sel: string) => {
      const r = document.querySelector(sel)!.getBoundingClientRect()
      return Math.max(r.width, r.height)
    }
    const c = document.createElement('canvas').getContext('2d')!
    const glyph = (sel: string) => {
      const el = document.querySelector(sel) as HTMLElement
      const cs = getComputedStyle(el)
      c.font = `${cs.fontSize} ${cs.fontFamily}`
      const m = c.measureText((el.textContent ?? '').trim())
      return Math.max(
        m.actualBoundingBoxRight + m.actualBoundingBoxLeft,
        m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
      )
    }
    return { full: box('[data-fs] .cpv-icon-full'), theme: glyph('[data-theme-btn]') }
  })

  // Within a quarter of the theme glyph: the dock's icons have to read as one
  // set, and half-size is what the eye catches first.
  expect(Math.abs(ink.full - ink.theme) / ink.theme).toBeLessThan(0.25)

  // The same control in two places on one screen is clutter, not redundancy.
  // Scoped to the sheet's own rows: the dock button carries the same label.
  await page.getByRole('button', { name: 'Mais controles' }).click()
  await expect(page.locator('.cpv-more-item').first()).toBeVisible()
  await expect(page.locator('.cpv-more-item', { hasText: 'Tela cheia' })).toHaveCount(0)
})
