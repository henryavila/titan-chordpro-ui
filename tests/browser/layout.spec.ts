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

  // Where native fullscreen exists — which is the case in both engines here —
  // the button is on the dock and nowhere else. Where it does not, it is on
  // neither: see the immersive tests below.
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

/**
 * The bug this guards: on a phone the fullscreen button lit up, raised a toast
 * and moved nothing. Native fullscreen is unreachable on iPhone Safari and in
 * an embed with no permission, and the fallback was `position:fixed` on a root
 * that already filled the page plus 6px of padding — measured, a 20px gain on
 * an 844px screen. What is actually winnable is the band the viewer's own
 * chrome reserves: 82px above and 134px below, a quarter of the screen.
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

for (const native of [true, false]) {
  test(`immersive hands the chrome's band back to the chart ${native ? 'with' : 'without'} native fullscreen`, async ({ page }) => {
    if (!native) {
      // iPhone Safari, and any embed with no `allow="fullscreen"`: the request
      // is not merely refused, the method is not there to call.
      await page.addInitScript(() => {
        Reflect.deleteProperty(Element.prototype, 'requestFullscreen')
        Reflect.deleteProperty(Element.prototype, 'webkitRequestFullscreen')
        Object.defineProperty(document, 'fullscreenEnabled', { get: () => false })
      })
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.locator('.cpv-chord').first().waitFor()

    const before = await immersiveSpot(page)
    expect(before.padTop + before.padBottom).toBeGreaterThan(180)
    expect(before.dockGone).toBe(false)
    // The button exists only where it does something the gesture does not.
    // Without native fullscreen the two put the same frame away, and a second
    // control for the same act is clutter in a row that was already full.
    expect(before.label).toBe(native ? 'Tela cheia' : null)

    // So the way in is the button where there is one, and the gesture where
    // that is all there is.
    if (native) await page.locator('[data-fs]').click()
    else await tapChart(page)
    await page.waitForTimeout(600)
    const after = await immersiveSpot(page)

    expect(after.dockGone).toBe(true)
    expect(after.label).toBe(native ? 'Sair da tela cheia' : null)
    // The way back has to be on screen — the gesture is invisible otherwise —
    // and said once, not twice: the standing hint, and no toast over it.
    await expect(page.locator('.cpv-chrome-hint')).toHaveText('Toque na cifra para mostrar os controles')
    await expect(page.locator('.cpv-toast')).toHaveCount(0)
    // The reserve is gone, not merely trimmed — and what is left is the edge
    // the eye needs plus the phone's safe area.
    expect(after.padTop).toBeLessThan(40)
    // The bottom keeps only the band the exit hint is drawn in — 42px measured
    // — so the last line of the song never ends up under it.
    expect(after.padBottom).toBeLessThan(60)
    const won = before.padTop + before.padBottom - (after.padTop + after.padBottom)
    expect(won).toBeGreaterThan(150)
    // Which the chart actually takes: the first line climbs by most of it.
    expect(before.firstRowY - after.firstRowY).toBeGreaterThan(60)

    // A tap on the chart is the way back, and it lands exactly where it left.
    await tapChart(page)
    await page.waitForTimeout(600)
    expect(await immersiveSpot(page)).toEqual(before)
  })
}

test('immersive mid-song holds the line the reader was on, and the top stays the top', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.cpv-chord').first().waitFor()

  // Collapsing the reserve moves every pixel of the chart. Standing at the top
  // of the song is a place, not an offset: giving the band back must not shove
  // the reader into the first verse.
  await page.locator('[data-fs]').click()
  await page.waitForTimeout(500)
  expect((await immersiveSpot(page)).scrollTop).toBe(0)
  await tapChart(page)
  await page.waitForTimeout(500)
  expect((await immersiveSpot(page)).scrollTop).toBe(0)

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
  await tapChart(page)
  await page.waitForTimeout(600)
  expect((await immersiveSpot(page)).scrollTop).toBe(800)
})

test('a cross-origin embed with no fullscreen permission is told so, and still gets its frame back', async ({ page }) => {
  const warnings: string[] = []
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()) })
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/')
  // Measured in both engines: the default Permissions Policy allowlist for
  // `fullscreen` is `self`, so a same-origin frame inherits it and needs no
  // attribute. Only a cross-origin one is refused — `localhost` and
  // `127.0.0.1` are the same server and different origins, which is the whole
  // trick here.
  await page.evaluate(() => {
    const f = document.createElement('iframe')
    f.src = 'http://localhost:5187/'
    f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:9999'
    document.body.appendChild(f)
  })
  const inner = page.frameLocator('iframe')
  await inner.locator('.cpv-chord').first().waitFor()
  const frame = page.frames().find((f) => f.url().startsWith('http://localhost:5187'))!

  // The shape the whole diagnosis rests on: every method present, permission not.
  expect(await frame.evaluate(() => ({
    hasMethod: !!(Element.prototype.requestFullscreen ?? (Element.prototype as unknown as Record<string, unknown>).webkitRequestFullscreen),
    enabled: document.fullscreenEnabled ?? (document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled,
  }))).toEqual({ hasMethod: true, enabled: false })
  // Said out loud, because it fails in silence and reads as a bug in the viewer.
  expect(warnings.join('\n')).toContain('allow="fullscreen"')

  // `position:fixed` cannot escape a frame, so the browser chrome is out of
  // reach here — and a button that could only repeat the gesture is not shown.
  await expect(inner.locator('[data-fs]')).toHaveCount(0)
  // The viewer's own band is still winnable, and the gesture still wins it.
  const pad = () => inner.locator('.cpv-page').evaluate((el) => parseFloat(getComputedStyle(el).paddingTop))
  expect(await pad()).toBeGreaterThan(60)
  await tapChart(inner)
  await page.waitForTimeout(600)
  expect(await pad()).toBeLessThan(40)
  await expect(inner.locator('.cpv-chrome-hint')).toHaveText('Toque na cifra para mostrar os controles')

})

/**
 * The iPhone-in-an-embed case, which has no road of its own: an iframe never
 * paints outside its box, and iPhone Safari has no element fullscreen to ask
 * for. The page that owns the frame is the only one that can give the screen,
 * so the viewer asks — and offers the button only after a host has said it
 * knows how.
 */
test('in an embed with no fullscreen API, the host gives the screen and the viewer asks for it', async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(Element.prototype, 'requestFullscreen')
    Reflect.deleteProperty(Element.prototype, 'webkitRequestFullscreen')
    Object.defineProperty(document, 'fullscreenEnabled', { get: () => false })
    Object.defineProperty(document, 'webkitFullscreenEnabled', { get: () => false })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  // A host implementing the contract: answer `hello`, move the one element it
  // owns, confirm. That is the whole of it.
  await page.evaluate(() => {
    const f = document.createElement('iframe')
    f.src = '/'
    f.style.cssText = 'position:absolute;left:0;top:100px;width:390px;height:600px;border:0'
    const tell = (msg: Record<string, unknown>) =>
      f.contentWindow?.postMessage({ source: 'titan-chordpro-host', ...msg }, '*')
    window.addEventListener('message', (e) => {
      if (e.source !== f.contentWindow) return
      const m = e.data as { source?: string; type?: string; on?: boolean }
      if (m?.source !== 'titan-chordpro') return
      if (m.type === 'hello') return tell({ type: 'capabilities', expandFrame: true })
      if (m.type === 'expand') {
        f.style.cssText = m.on
          ? 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483000'
          : 'position:absolute;left:0;top:100px;width:390px;height:600px;border:0'
        tell({ type: 'expanded', on: m.on === true })
      }
    })
    document.body.appendChild(f)
  })

  const inner = page.frameLocator('iframe')
  await inner.locator('.cpv-chord').first().waitFor()
  const frameBox = () => page.locator('iframe').evaluate((f) => {
    const r = f.getBoundingClientRect()
    return { pos: getComputedStyle(f).position, y: Math.round(r.y), h: Math.round(r.height) }
  })

  // The button is back — not because this is a phone, but because there is now
  // something for it to win that a tap on the chart cannot.
  await expect(inner.locator('[data-fs]')).toHaveAttribute('aria-label', 'Tela cheia')
  expect(await frameBox()).toEqual({ pos: 'absolute', y: 100, h: 600 })

  await inner.locator('[data-fs]').click()
  await page.waitForTimeout(700)
  // The host moved its own element; the viewer never touched it.
  expect(await frameBox()).toEqual({ pos: 'fixed', y: 0, h: 844 })
  // And the viewer's own chrome went with it, so the chart has the whole phone.
  expect(await inner.locator('.cpv-page').evaluate((el) => parseFloat(getComputedStyle(el).paddingTop))).toBeLessThan(40)
  await expect(inner.locator('[data-fs]')).toHaveAttribute('aria-label', 'Sair da tela cheia')

  // The way out is the gesture, not the button: on a phone the dock went with
  // the rest of the chrome, and the standing hint is what says so. One tap
  // gives the host its frame back too.
  expect(await inner.locator('[data-fs]').evaluate((el) => ({
    opacity: getComputedStyle(el.closest('.cpv-chrome')!).opacity,
    pointer: getComputedStyle(el).pointerEvents,
  }))).toEqual({ opacity: '0', pointer: 'none' })
  await tapChart(inner)
  await page.waitForTimeout(700)
  expect(await frameBox()).toEqual({ pos: 'absolute', y: 100, h: 600 })

  // A host that collapses the frame on its own — a back gesture, a close
  // button of its own — has to take immersive down with it.
  await inner.locator('[data-fs]').click()
  await page.waitForTimeout(700)
  expect((await frameBox()).pos).toBe('fixed')
  await page.evaluate(() => {
    const f = document.querySelector('iframe') as HTMLIFrameElement
    f.style.cssText = 'position:absolute;left:0;top:100px;width:390px;height:600px;border:0'
    f.contentWindow?.postMessage({ source: 'titan-chordpro-host', type: 'expanded', on: false }, '*')
  })
  await page.waitForTimeout(700)
  await expect(inner.locator('[data-fs]')).toHaveAttribute('aria-label', 'Tela cheia')
  expect(await inner.locator('.cpv-page').evaluate((el) => parseFloat(getComputedStyle(el).paddingTop))).toBeGreaterThan(60)
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
