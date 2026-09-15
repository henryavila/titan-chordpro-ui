import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { layoutChartFull, parse } from '../../src/core'

const source = readFileSync(new URL('../../fixtures/sda/084-escuta-meu-clamor.cho', import.meta.url), 'utf8')
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
    expect(createHash('sha256').update(source).digest('hex')).toBe('65280dffc3eedb99f0d7a3eae0a39b0eb57e629066cdd0586f0e90fe1a56bd2c')
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
    // Phone dock keeps fit on the row; theme lives in Mais. Desktop keeps theme
    // on the wide bar. Either control proves the chrome still inherits Arial.
    const chromeFont = width < 640 ? '[data-fit]' : '[data-theme-btn]'
    expect(await page.locator(chromeFont).first().evaluate(el => getComputedStyle(el).fontFamily)).toContain('Arial')
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


test('editor spaces a voiceless intro like reading — pills do not pile', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/?chart=played')
  await page.locator('[data-edit]').click()
  const pick = page.locator('[data-mode-content]')
  if (await pick.count()) await pick.click()
  const pills = page.locator('[data-played] .cpv-pill--flow')
  await expect(pills).toHaveCount(5)
  await expect(pills).toHaveText(['G/D', 'D7(4)', 'G', 'C/E', 'D/F#'])
  const failures = await pills.evaluateAll((els) => {
    const fails: string[] = []
    const boxes = els.map((e) => e.getBoundingClientRect())
    for (let i = 1; i < boxes.length; i++) {
      const a = boxes[i - 1]!
      const b = boxes[i]!
      if (Math.abs(a.y - b.y) < 1 && b.x - a.right < 3.5) {
        fails.push(`${els[i - 1]!.textContent}/${els[i]!.textContent}: ${(b.x - a.right).toFixed(2)}px`)
      }
    }
    return fails
  })
  expect(failures, 'editor pills on the reported intro overlapped').toEqual([])
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

  // Rolar starts a silent count-in; the chart joins on the downbeat. The old
  // scroll then stood dead still until the music had covered a whole anchor
  // of paper — 25 to 96 seconds on the fixture corpus. It now eases into the
  // anchor instead, so the page is alive from the first beat of the song.
  await page.locator('.cpv-chord').first().click()
  await page.keyboard.press(' ')
  await expect(page.locator('[data-met-countin]')).toBeVisible()
  await expect(page.locator('.cpv-progress')).not.toHaveClass(/is-live/)
  await expect(page.locator('.cpv-progress')).toHaveClass(/is-live/, { timeout: 6000 })
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop), { timeout: 4000 }).toBeGreaterThan(0)
  // Nothing is drawn across the chart while it is being read.
  await expect(page.locator('.cpv-guide')).toHaveCount(0)
  await page.keyboard.press(' ')
  await expect(page.locator('.cpv-progress')).not.toHaveClass(/is-live/)

  // The count belongs to the chart, on the left of the column — not the
  // far corner of the glass, which at 1280 is 150px of empty background.
  await page.keyboard.press('m')
  const count = page.locator('[data-met-count]')
  await expect(count).toBeVisible()
  const box = await count.evaluate((el) => {
    const col = document.querySelector('.cpv-page')!.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    return { leftOfColumn: col.left - b.right, fromGlass: b.left }
  })
  expect(box.leftOfColumn).toBeGreaterThan(-8)
  expect(box.fromGlass).toBeLessThan(200)
})

/**
 * On a phone the beat column is an overlay on padX. Growing left padding to
 * 44px while the click ran shoved the chart right and left a dead gutter.
 */
test('phone beat count overlays the margin — page left pad does not jump to 44px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()

  const before = await page.locator('.cpv-page').evaluate((el) => {
    const cs = getComputedStyle(el)
    return { left: parseFloat(cs.paddingLeft), right: parseFloat(cs.paddingRight) }
  })
  expect(before.left).toBeLessThan(30)
  expect(before.left).toBe(before.right)

  await page.locator('[data-scroll]').click()
  await expect(page.locator('[data-met-count]')).toBeVisible()

  const after = await page.locator('.cpv-page').evaluate((el) => {
    const cs = getComputedStyle(el)
    const count = document.querySelector('[data-met-count]')!.getBoundingClientRect()
    const page = el.getBoundingClientRect()
    return {
      left: parseFloat(cs.paddingLeft),
      right: parseFloat(cs.paddingRight),
      countLeft: count.left - page.left,
    }
  })
  expect(after.left, 'reserved 44px gutter would push the chart').toBe(before.left)
  expect(after.right).toBe(before.right)
  expect(after.countLeft).toBeGreaterThanOrEqual(0)
  expect(after.countLeft, '12px left parked the 20px cells on the lyric').toBeLessThan(8)

  const entrada = page.locator('[data-met-countin]')
  await expect(entrada).toBeVisible()
  const fill = await entrada.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(fill === 'transparent' || fill === 'rgba(0, 0, 0, 0)', 'entrada sat on the lyric with no fill').toBe(false)

  const beats = await page.locator('.cpv-met-beat').evaluateAll((els) =>
    els.map((el) => {
      const bg = getComputedStyle(el).backgroundColor
      const empty = bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)'
      return { empty, now: el.classList.contains('is-now') }
    }),
  )
  expect(beats.length).toBeGreaterThan(1)
  const idle = beats.filter((b) => !b.now)
  const live = beats.filter((b) => b.now)
  expect(idle.length).toBeGreaterThan(0)
  expect(live.length).toBe(1)
  for (const b of idle) {
    expect(b.empty, 'idle beat kept a box on the lyric').toBe(true)
  }
  expect(live[0]!.empty, 'pulse has no fill').toBe(false)
})

test('tela cheia: beat column stays flush left, entrada is a filled badge', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()
  await page.locator('[data-fs]').click()
  await page.waitForTimeout(400)

  const padBefore = await page.locator('.cpv-page').evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft))
  await page.locator('[data-scroll]').click()
  await expect(page.locator('[data-met-count]')).toBeVisible()

  const spot = await page.evaluate(() => {
    const pageEl = document.querySelector('.cpv-page')!
    const count = document.querySelector('[data-met-count]')!
    const entrada = document.querySelector('[data-met-countin]')
    const pr = pageEl.getBoundingClientRect()
    const cr = count.getBoundingClientRect()
    const cs = getComputedStyle(pageEl)
    return {
      padLeft: parseFloat(cs.paddingLeft),
      countLeft: cr.left - pr.left,
      entradaBg: entrada ? getComputedStyle(entrada).backgroundColor : '',
    }
  })
  expect(spot.padLeft, 'tela cheia must not grow a left gutter for the click').toBe(padBefore)
  expect(spot.countLeft).toBeGreaterThanOrEqual(0)
  expect(spot.countLeft, '12px left on 8px padX puts the cells on the lyric').toBeLessThan(8)
  expect(spot.entradaBg === 'transparent' || spot.entradaBg === 'rgba(0, 0, 0, 0)').toBe(false)
})

/**
 * The bug this guards: Rolar started the chart at once and left the metronome
 * sitting there. They are one rehearsal: count-in, then the page, pulse on,
 * oscillator off until the panel arms it.
 */
test('Rolar starts a silent count-in before the chart moves', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()

  await page.locator('[data-scroll]').click()
  await expect(page.locator('[data-met-count]')).toBeVisible()
  await expect(page.locator('[data-met-countin]')).toBeVisible()
  await expect(page.locator('.cpv-head-hit-1, .cpv-head-hit-n')).toHaveCount(0)
  await expect(page.locator('[data-scroll]')).toContainText('Parar')
  await expect(page.locator('.cpv-progress')).not.toHaveClass(/is-live/)

  await page.locator('[data-met-btn]').click()
  await expect(page.locator('[data-met-source="mute"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-met-sound]')).toContainText('Só pulso visual')
  await page.locator('[aria-label="Fechar"]').click()

  await expect(page.locator('.cpv-progress')).toHaveClass(/is-live/, { timeout: 6000 })
  await expect(page.locator('[data-met-countin]')).toHaveCount(0)
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
  await expect(page.locator('[data-met-source="mute"]')).toHaveAttribute('aria-pressed', 'true')
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
  // Count-in holds the paper still for a bar; the continuity under test is
  // the motion after the song has started, not the wait before it.
  await expect(page.locator('.cpv-progress')).toHaveClass(/is-live/, { timeout: 6000 })

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

    const labeled = await page.locator('[data-scroll]').textContent()
    if (width >= 360) {
      expect(labeled, `${width}px hid Rolar and left a hole`).toMatch(/Rolar|Parar/)
    } else {
      expect((labeled ?? '').trim(), `${width}px should drop the word`).toBe('')
    }
  }
})

/**
 * Hiding "Rolar" used to park ~50px in a flex spacer after a 44px play
 * triangle. If the word cannot fit, leftover must be shared — not one canyon
 * between the primary control and the rest of the dock.
 */
test('dock leftover is not a hole after Rolar', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 860 })
    await page.goto('/')
    await page.locator('.cpv-chord').first().waitFor()

    const gaps = await page.evaluate(() => {
      const row = document.querySelector('[data-scroll]')!.parentElement as HTMLElement
      const items = [...row.children].filter(
        (el) => el instanceof HTMLElement && (el.tagName === 'BUTTON' || el.querySelector('button')),
      ) as HTMLElement[]
      const boxes = items.map((el) => el.getBoundingClientRect())
      return boxes.slice(1).map((b, i) => Math.round(b.left - boxes[i]!.right))
    })

    expect(gaps.length, `${width}px: dock row collapsed`).toBeGreaterThanOrEqual(3)
    const max = Math.max(...gaps)
    const min = Math.min(...gaps)
    expect(max - min, `${width}px: gaps ${gaps.join(', ')} left a canyon after Rolar`).toBeLessThanOrEqual(16)
  }
})

test('Tela cheia is on the header, and not also buried in Mais', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 860 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()

  // Where native fullscreen exists — which is the case in both engines here —
  // the button is on the header and nowhere else. Where it does not, it is on
  // neither: see the immersive tests below.
  const fsBtn = page.locator('[data-fs]')
  await expect(fsBtn).toBeVisible()
  const place = await fsPlace(page)
  expect(place.count).toBe(1)
  expect(place.fromTop, 'Tela cheia left the header').toBeLessThan(80)
  expect(place.fromBottom, 'Tela cheia sat on the dock').toBeGreaterThan(120)

  // Drawn, not typed. `⤢` put 6.5px of ink on screen next to neighbours
  // drawing 12.4 — half the size — and how much ink a symbol character paints
  // is the font's decision, so no font-size could have fixed it.
  const ink = await page.evaluate(() => {
    const box = (sel: string) => {
      const el = document.querySelector(sel)
      const ico = el?.querySelector('.cpv-ico') ?? el
      const r = ico!.getBoundingClientRect()
      return Math.max(r.width, r.height)
    }
    return { full: box('[data-fs]'), fit: box('[data-fit]') }
  })

  // Within a quarter of the dock glyph: the header and dock icons have to
  // read as one set, and half-size is what the eye catches first.
  expect(Math.abs(ink.full - ink.fit) / ink.fit).toBeLessThan(0.25)

  // The same control in two places on one screen is clutter, not redundancy.
  await page.getByRole('button', { name: 'Mais controles' }).click()
  await expect(page.locator('.cpv-more-item').first()).toBeVisible()
  await expect(page.locator('.cpv-more-item', { hasText: 'Tela cheia' })).toHaveCount(0)
})

/** Offset of Tela cheia from the viewer root — header is near the top. */
const fsPlace = (page: Page) => page.evaluate(() => {
  const labels = new Set(['Tela cheia', 'Sair da tela cheia', 'Modo imersivo', 'Sair do modo imersivo'])
  const btns = [...document.querySelectorAll('button')].filter(
    (el) => el.hasAttribute('data-fs') || labels.has(el.getAttribute('aria-label') ?? ''),
  )
  const btn = btns[0]
  const root = document.querySelector('[data-cpv-root]') as HTMLElement
  if (!btn) return { count: 0, fromTop: Infinity, fromBottom: Infinity }
  const br = btn.getBoundingClientRect()
  const rr = root.getBoundingClientRect()
  return {
    count: btns.length,
    fromTop: Math.round(br.top - rr.top),
    fromBottom: Math.round(rr.bottom - br.bottom),
  }
})

/**
 * The bug this guards: on desktop Editar was a floating chip at
 * `right:16px; bottom:22px` of the glass. Narrow desktop made it look glued
 * to the bar; a wide notebook parked it in the empty corner. Phone already
 * kept it in the dock. Geometry, not just the DOM: the button's box has to
 * sit inside the same chrome that holds Rolar.
 */
test('Editar sits inside the bottom bar on desktop, not floating beside it', async ({ page }) => {
  for (const width of [640, 768, 1024, 1280, 1600]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.locator('.cpv-chord').first().waitFor()

    const place = await page.evaluate(() => {
      const edit = document.querySelector('[data-edit]') as HTMLElement | null
      const bar = document.querySelector('[data-scroll]')?.closest('.cpv-chrome') as HTMLElement | null
      if (!edit || !bar) return { missing: true, chip: !!document.querySelector('.cpv-edit-chip') }
      const er = edit.getBoundingClientRect()
      const br = bar.getBoundingClientRect()
      return {
        missing: false,
        chip: !!document.querySelector('.cpv-edit-chip'),
        count: document.querySelectorAll('[data-edit]').length,
        inBar: bar.contains(edit),
        position: getComputedStyle(edit).position,
        inside:
          er.top >= br.top - 1 &&
          er.bottom <= br.bottom + 1 &&
          er.left >= br.left - 1 &&
          er.right <= br.right + 1,
      }
    })

    expect(place.missing, `${width}px: Editar is gone`).toBe(false)
    expect(place.chip, `${width}px still paints the floating chip`).toBe(false)
    expect(place.count, `${width}px: more than one Editar`).toBe(1)
    expect(place.inBar, `${width}px: Editar is not in the Rolar bar`).toBe(true)
    expect(place.position, `${width}px: Editar is still absolutely positioned`).not.toBe('absolute')
    expect(place.inside, `${width}px: Editar floats outside the bar`).toBe(true)
  }
})

/**
 * The bug this guards: Editar sat in a green pill (`--chord-soft` fill,
 * `--chord-edge` stroke, `--chord` ink) next to the dock ghosts. And `✎`
 * painted 12.2 × 8.9 next to a 12.7 × 12.7 neighbour glyph — the short axis
 * is what the eye reads as "the icon is smaller". Same class as `⤢`: a
 * symbol character's ink is the font's decision. Fit may be lit when on; the
 * ghost sibling for paint is Mais.
 */
test('Edit on the dock is a sibling of the other icons, not a highlight', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 860 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()

  const look = await page.evaluate(() => {
    const paint = (sel: string) => {
      const s = getComputedStyle(document.querySelector(sel)!)
      return { bg: s.backgroundColor, color: s.color }
    }
    const box = (sel: string) => {
      const el = document.querySelector(sel)
      const ico = el?.querySelector('.cpv-ico') ?? el
      const r = ico!.getBoundingClientRect()
      return { w: r.width, h: r.height }
    }
    const editInk = box('[data-edit]')
    const fit = box('[data-fit]')
    const fitSize = Math.max(fit.w, fit.h)
    return {
      edit: paint('[data-edit]'),
      more: paint('[aria-label="Mais controles"]'),
      editInk,
      fitSize,
    }
  })

  expect(look.edit, 'edit must not wear the chord highlight').toEqual(look.more)

  // Both axes, not just the longer one: ✎ already matched on width and failed
  // on height, which is the thing that made the pencil look smaller.
  expect(Math.abs(look.editInk.w - look.fitSize) / look.fitSize).toBeLessThan(0.25)
  expect(Math.abs(look.editInk.h - look.fitSize) / look.fitSize).toBeLessThan(0.25)
})

/**
 * Tela cheia used to flip zen on a phone, hiding Rolar / Tom / Mais the
 * moment a musician asked for the screen. The button wins the *browser* (or
 * host) chrome; the Titan controls stay, because a live set cannot be played
 * from a blank chart.
 */
test('Tela cheia on a phone keeps the live controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()

  await page.locator('[data-fs]').click()
  await page.waitForTimeout(600)

  const after = await immersiveSpot(page)
  expect(after.dockGone, 'tela cheia hid the dock').toBe(false)
  expect(after.label).toBe('Sair da tela cheia')
  await expect(page.locator('.cpv-chrome-hint')).toHaveCount(0)

  const roll = page.locator('[data-scroll]')
  await expect(roll).toBeVisible()
  expect(await roll.evaluate((el) => getComputedStyle(el).pointerEvents)).not.toBe('none')
  await expect(page.getByRole('button', { name: 'Mais controles' })).toBeVisible()
  await expect(page.locator('[data-tone]')).toBeVisible()

  // Usable, not merely painted: Mais still opens on top of the chart.
  await page.getByRole('button', { name: 'Mais controles' }).click()
  await expect(page.locator('.cpv-more-item').first()).toBeVisible()
})

/**
 * The bug this guards: on a phone the fullscreen button lit up, raised a toast
 * and moved nothing. Native fullscreen is unreachable on iPhone Safari, and
 * the fallback was `position:fixed` on a root that already filled the page
 * plus 6px of padding — measured, a 20px gain on an 844px screen. What is
 * actually winnable is the band the viewer's own chrome reserves: 82px above
 * and 134px below, a quarter of the screen. On a standalone page that already
 * fills the viewport, the button stays away; the gesture still wins that band.
 */
/**
 * A real finger: `pointerdown` and then `click`. The two are not interchangeable
 * — the viewer reads the chrome's state on the pointer down, before waking has
 * had a chance to answer for it, and a bare click skips exactly the step that
 * once made a tap hide the controls it was reaching for.
 */
const tapChart = async (scope: Page | ReturnType<Page['frameLocator']>) => {
  const page = scope.locator('.cpv-page')
  await page.dispatchEvent('pointerdown')
  await page.dispatchEvent('click')
}

const immersiveSpot = (page: Page) => page.evaluate(() => {
  const pg = document.querySelector('.cpv-page') as HTMLElement
  const row = document.querySelector('.cpv-row') as HTMLElement
  const scroll = document.querySelector('.cpv-scroll') as HTMLElement
  const dock = document.querySelector('[data-scroll]')!.closest('.cpv-chrome')!
  const btn = document.querySelector('[data-fs]')
  const cs = getComputedStyle(pg)
  return {
    padTop: parseFloat(cs.paddingTop),
    padBottom: parseFloat(cs.paddingBottom),
    firstRowY: Math.round(row.getBoundingClientRect().y),
    scrollTop: scroll.scrollTop,
    dockGone: dock.classList.contains('is-hidden'),
    label: btn?.getAttribute('aria-label') ?? null,
  }
})

test('Tela cheia wins the screen and a tap still hides the chrome without leaving', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()

  const before = await immersiveSpot(page)
  expect(before.dockGone).toBe(false)
  expect(before.label).toBe('Tela cheia')

  await page.locator('[data-fs]').click()
  await page.waitForTimeout(600)
  const inFs = await immersiveSpot(page)
  expect(inFs.dockGone).toBe(false)
  expect(inFs.label).toBe('Sair da tela cheia')
  await expect(page.locator('.cpv-chrome-hint')).toHaveCount(0)

  // Zen is a separate gesture: hide our chrome, keep the screen the button won.
  // Padding stays — reclaiming the band used to jump the chart under the eye.
  await tapChart(page)
  await page.waitForTimeout(600)
  const zen = await immersiveSpot(page)
  expect(zen.dockGone).toBe(true)
  expect(zen.label).toBe('Sair da tela cheia')
  await expect(page.locator('.cpv-chrome-hint')).toHaveCount(0)
  await expect(page.locator('.cpv-toast')).toHaveText('Toque na tela para mostrar os controles')
  expect(zen.padTop).toBe(inFs.padTop)
  expect(zen.padBottom).toBe(inFs.padBottom)
  expect(zen.firstRowY).toBe(inFs.firstRowY)

  await tapChart(page)
  await page.waitForTimeout(600)
  const shown = await immersiveSpot(page)
  expect(shown.dockGone).toBe(false)
  expect(shown.label).toBe('Sair da tela cheia')
  expect(shown.padTop).toBe(inFs.padTop)
  expect(shown.firstRowY).toBe(inFs.firstRowY)

  await page.locator('[data-fs]').click()
  await page.waitForTimeout(600)
  expect(await immersiveSpot(page)).toEqual(before)
})

test('a tap hides the chrome without jumping the chart when there is no screen to win', async ({ page }) => {
  // iPhone Safari: the request is not merely refused, the method is not
  // there to call. The button stays off; the gesture is what hides the frame.
  await page.addInitScript(() => {
    Reflect.deleteProperty(Element.prototype, 'requestFullscreen')
    Reflect.deleteProperty(Element.prototype, 'webkitRequestFullscreen')
    Object.defineProperty(document, 'fullscreenEnabled', { get: () => false })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()

  const before = await immersiveSpot(page)
  expect(before.padTop + before.padBottom).toBeGreaterThan(180)
  expect(before.dockGone).toBe(false)
  expect(before.label).toBe(null)

  await tapChart(page)
  await page.waitForTimeout(600)
  const after = await immersiveSpot(page)

  expect(after.dockGone).toBe(true)
  expect(after.label).toBe(null)
  await expect(page.locator('.cpv-chrome-hint')).toHaveCount(0)
  await expect(page.locator('.cpv-toast')).toHaveText('Toque na tela para mostrar os controles')
  expect(after.padTop).toBe(before.padTop)
  expect(after.padBottom).toBe(before.padBottom)
  expect(after.firstRowY).toBe(before.firstRowY)
  expect(after.scrollTop).toBe(before.scrollTop)

  await tapChart(page)
  await page.waitForTimeout(600)
  expect(await immersiveSpot(page)).toEqual(before)
})

test('immersive mid-song holds the line the reader was on, and the top stays the top', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()

  // Entering tela cheia still moves padding a little (the fs chrome is
  // tighter). Standing at the top of the song is a place, not an offset.
  await page.locator('[data-fs]').click()
  await page.waitForTimeout(500)
  expect((await immersiveSpot(page)).scrollTop).toBe(0)
  await page.locator('[data-fs]').click()
  await page.waitForTimeout(500)

  // Mid-song the pixel under their eye is what has to survive.
  await page.evaluate(() => { (document.querySelector('.cpv-scroll') as HTMLElement).scrollTop = 800 })
  await page.waitForTimeout(200)
  const line = () => page.evaluate(() => {
    const sc = document.querySelector('.cpv-scroll') as HTMLElement
    const eye = sc.getBoundingClientRect().top + sc.clientHeight * 0.4
    return ([...document.querySelectorAll('.cpv-lyric')] as HTMLElement[])
      .map((w) => ({ text: w.textContent, d: Math.abs(w.getBoundingClientRect().top - eye) }))
      .sort((a, b) => a.d - b.d)[0]?.text
  })
  const was = await line()
  await page.locator('[data-fs]').click()
  await page.waitForTimeout(600)
  expect(await line()).toBe(was)
  await page.locator('[data-fs]').click()
  await page.waitForTimeout(600)
  expect((await immersiveSpot(page)).scrollTop).toBe(800)
})

/**
 * Composition A: the Vue component on a host page. No iframe. On iPhone there
 * is no Fullscreen API, but pinning the root covers the host nav — that is a
 * screen the tap-on-chart gesture cannot take, so the button earns its place.
 */
test('in a host page without native fullscreen, the button pins the viewer over the host chrome', async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(Element.prototype, 'requestFullscreen')
    Reflect.deleteProperty(Element.prototype, 'webkitRequestFullscreen')
    Object.defineProperty(document, 'fullscreenEnabled', { get: () => false })
    Object.defineProperty(document, 'webkitFullscreenEnabled', { get: () => false })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?ficha=1')
  await page.locator('.cpv-chord').first().waitFor()

  const rootBox = () => page.locator('.cpv-root').evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { pos: getComputedStyle(el).position, y: Math.round(r.y), h: Math.round(r.height) }
  })
  const dockBox = () => page.locator('[data-scroll]').evaluate((el) => {
    const r = el.closest('.cpv-chrome')!.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom }
  })

  // A real ficha has article above and below. The chart is not the first
  // screen — its dock starts under the fold. Tela cheia lives in the chart
  // header, which is what peeks in.
  expect(await page.locator('#host-above').evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(120)
  expect(await page.locator('#host-below').evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(120)
  const atLoad = await rootBox()
  expect(atLoad.pos).toBe('relative')
  expect(atLoad.y).toBeGreaterThan(40)
  expect((await dockBox()).bottom).toBeGreaterThan(844)

  await expect(page.locator('[data-fs]')).toHaveAttribute('aria-label', 'Tela cheia')
  const before = await rootBox()

  await page.locator('[data-fs]').click()
  await page.waitForTimeout(700)
  const pinned = await rootBox()
  expect(pinned.pos).toBe('fixed')
  expect(pinned.y).toBe(0)
  expect(pinned.h).toBeGreaterThanOrEqual(840)
  // The host chrome is gone. Ours stays: a live set needs Rolar and Tom.
  // Top pad (from the measured head) keeps the lyric under the name.
  expect(await page.locator('.cpv-page').evaluate((el) => parseFloat(getComputedStyle(el).paddingTop))).toBeGreaterThan(40)
  await expect(page.locator('[data-fs]')).toHaveAttribute('aria-label', 'Sair da tela cheia')
  expect(await page.locator('[data-fs]').evaluate((el) => ({
    opacity: getComputedStyle(el.closest('.cpv-chrome')!).opacity,
    pointer: getComputedStyle(el).pointerEvents,
  }))).toEqual({ opacity: '1', pointer: 'auto' })
  await expect(page.locator('[data-scroll]')).toBeVisible()
  expect(await page.locator('[data-scroll]').evaluate((el) => getComputedStyle(el).pointerEvents)).not.toBe('none')

  // Tap hides our chrome. It must not dump the musician back onto the ficha
  // — that is the gesture they will hit mid-chorus.
  await tapChart(page)
  await page.waitForTimeout(700)
  const zen = await rootBox()
  expect(zen.pos).toBe('fixed')
  expect(zen.y).toBe(0)
  await expect(page.locator('[data-fs]')).toHaveAttribute('aria-label', 'Sair da tela cheia')
  expect(await page.locator('[data-fs]').evaluate((el) =>
    getComputedStyle(el.closest('.cpv-chrome')!).opacity)).toBe('0')
  await expect(page.locator('[data-cpv-zen-title]')).toContainText(/Escuta/i)
  expect(await page.locator('[data-cpv-zen-title]').evaluate((el) => getComputedStyle(el).position)).toMatch(
    /absolute|fixed/,
  )

  await tapChart(page)
  await page.waitForTimeout(700)
  const shown = await rootBox()
  expect(shown.pos).toBe('fixed')
  expect(shown.y).toBe(0)
  expect(await page.locator('[data-fs]').evaluate((el) =>
    getComputedStyle(el.closest('.cpv-chrome')!).opacity)).toBe('1')
  await expect(page.locator('[data-cpv-zen-title]')).toHaveCount(0)
  expect(await page.locator('.cpv-page').evaluate((el) => parseFloat(getComputedStyle(el).paddingTop))).toBeGreaterThan(40)

  await page.locator('[data-fs]').click()
  await page.waitForTimeout(700)
  const after = await rootBox()
  expect(after.pos).toBe('relative')
  expect(after.y).toBeGreaterThan(40)
  await expect(page.locator('[data-fs]')).toHaveAttribute('aria-label', 'Tela cheia')

  // Parking the 100dvh frame puts the dock on the fold. On iPhone that is
  // already the whole site screen — pinning would win nothing.
  await page.locator('#host-frame').evaluate((el) => el.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(300)
  expect((await rootBox()).y).toBeLessThan(8)
  expect((await dockBox()).bottom).toBeLessThanOrEqual(844 + 2)
})

test('parking a ficha with native fullscreen keeps Tela cheia in the header', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?ficha=1')
  await page.locator('.cpv-chord').first().waitFor()

  const atLoad = await fsPlace(page)
  expect(atLoad.count).toBe(1)
  expect(atLoad.fromTop).toBeLessThan(80)
  expect(atLoad.fromBottom).toBeGreaterThan(120)

  await page.locator('#host-frame').evaluate((el) => el.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(300)

  const parked = await fsPlace(page)
  expect(parked.count).toBe(1)
  expect(parked.fromTop, 'parking sent Tela cheia to the dock').toBeLessThan(80)
  expect(parked.fromBottom).toBeGreaterThan(120)
})

test('on a desktop the fullscreen control is in the top bar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()

  const place = await fsPlace(page)
  expect(place.count).toBe(1)
  expect(place.fromTop, 'desktop Tela cheia sat in the bottom bar').toBeLessThan(80)
  expect(place.fromBottom).toBeGreaterThan(120)
})

test('rotating a parked ficha to landscape keeps Tela cheia at the top', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?ficha=1')
  await page.locator('.cpv-chord').first().waitFor()
  await page.locator('#host-frame').evaluate((el) => el.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(300)

  await page.setViewportSize({ width: 844, height: 390 })
  await page.waitForTimeout(400)

  const place = await fsPlace(page)
  expect(place.count).toBe(1)
  expect(place.fromTop, 'landscape sent Tela cheia to the bottom bar').toBeLessThan(90)
  expect(place.fromBottom).toBeGreaterThan(80)
})

/**
 * A tap while the chrome is away is a request to SEE it, whatever put it away.
 *
 * It used to be a toggle, and during auto-scroll that made the controls
 * unreachable: `pointerdown` woke the idle auto-hide and brought them back, the
 * `click` right behind it read "they are up" and hid them again, and 2.6s later
 * the auto-hide took them anyway. Every other tap made it worse and none of
 * them held.
 */
test('during auto-scroll, a tap brings the controls back — every time, not every other time', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?autoHide=1')
  await page.locator('.cpv-chord').first().waitFor()
  const dockGone = () => page.locator('[data-scroll]').evaluate((el) =>
    el.closest('.cpv-chrome')!.classList.contains('is-hidden'))

  // Started from the keyboard on purpose: a mouse resting over the chart keeps
  // firing `pointermove` as the page scrolls under it, and the viewer never
  // goes idle. No finger rests on a phone.
  await page.keyboard.press('Space')
  await expect.poll(dockGone, { timeout: 6000 }).toBe(true)

  for (let i = 0; i < 3; i++) {
    await tapChart(page)
    await page.waitForTimeout(400)
    expect(await dockGone(), `tap ${i + 1} left the controls hidden`).toBe(false)
    // And the auto-hide still does its job afterwards, or it would not be one.
    await expect.poll(dockGone, { timeout: 6000 }).toBe(true)
  }
})
