import { expect, test, type Page } from '@playwright/test'
import { LIVE_CONTROL_SELECTORS, OVERLAY_THIEF_SEL } from '../helpers/overlay-hit'

/**
 * Regression bed for “part of the screen is stuck”: an extra overlay
 * (swipe rail, debug paint, veil) sits on a live control and eats the tap.
 *
 * The original: rehearsal rails were `top:0; bottom:0` with `touch-action:none`,
 * covering Rolar (left) and Mais (right) on iPhone PWA.
 */

const PHONES = [
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 860 },
] as const

type Finding = {
  sel: string
  where: string
  x: number
  y: number
  pointerEvents: string
  top: string
  thief: string | null
  prevented: boolean
}

async function probeLiveControls(page: Page): Promise<Finding[]> {
  return page.evaluate(
    ({ sels, thiefSel }) => {
      const out: Finding[] = []
      const describe = (el: Element | null) => {
        if (!el) return 'null'
        const id = el.id ? `#${el.id}` : ''
        const raw = typeof el.className === 'string' ? el.className.trim() : ''
        const cls = raw ? '.' + raw.split(/\s+/).slice(0, 3).join('.') : ''
        const name = el.getAttribute('aria-label') || ''
        return `${el.tagName.toLowerCase()}${id}${cls}${name ? ` "${name}"` : ''}`
      }
      const thiefOf = (hit: Element | null, control: Element) => {
        if (!hit) return 'miss'
        if (hit === control || control.contains(hit) || hit.contains(control)) return null
        const thief = hit.closest(thiefSel)
        if (!thief) return null
        const rail = thief.getAttribute('data-swipe-rail')
        if (rail) return `rail:${rail}`
        if (thief.hasAttribute('data-song-swipe')) return 'swipe-veil'
        const cls = typeof thief.className === 'string' ? thief.className.trim().split(/\s+/)[0] : ''
        return cls || thief.tagName.toLowerCase()
      }
      const samples = (r: DOMRect) => {
        const insetX = Math.min(12, Math.max(1, r.width / 2))
        const insetY = Math.min(12, Math.max(1, r.height / 2))
        return [
          { where: 'center', x: r.left + r.width / 2, y: r.top + r.height / 2 },
          { where: 'left', x: r.left + insetX, y: r.top + r.height / 2 },
          { where: 'right', x: r.right - insetX, y: r.top + r.height / 2 },
          { where: 'top', x: r.left + r.width / 2, y: r.top + insetY },
          { where: 'bottom', x: r.left + r.width / 2, y: r.bottom - insetY },
        ]
      }
      const live = (el: HTMLElement) => {
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false
        if (el.closest('.cpv-chrome.is-hidden')) return false
        const r = el.getBoundingClientRect()
        if (r.width < 8 || r.height < 8) return false
        if (el.hasAttribute('disabled')) return false
        return true
      }

      const root = document.querySelector('[data-cpv-root]') as HTMLElement | null
      for (const sel of sels) {
        const el = document.querySelector(sel) as HTMLElement | null
        if (!el || !live(el)) continue
        const pe = getComputedStyle(el).pointerEvents
        for (const pt of samples(el.getBoundingClientRect())) {
          const hit = document.elementFromPoint(pt.x, pt.y)
          let prevented = false
          if (root) {
            const ev = new PointerEvent('pointerdown', {
              bubbles: true,
              cancelable: true,
              pointerId: 21,
              pointerType: 'touch',
              isPrimary: true,
              button: 0,
              clientX: pt.x,
              clientY: pt.y,
            })
            root.dispatchEvent(ev)
            prevented = ev.defaultPrevented
            window.dispatchEvent(
              new PointerEvent('pointerup', {
                bubbles: true,
                pointerId: 21,
                pointerType: 'touch',
                isPrimary: true,
                button: 0,
                clientX: pt.x,
                clientY: pt.y,
              }),
            )
          }
          out.push({
            sel,
            where: pt.where,
            x: pt.x,
            y: pt.y,
            pointerEvents: pe,
            top: describe(hit),
            thief: thiefOf(hit, el),
            prevented,
          })
        }
      }
      return out
    },
    { sels: [...LIVE_CONTROL_SELECTORS], thiefSel: OVERLAY_THIEF_SEL },
  )
}

async function railDockOverlap(page: Page) {
  return page.evaluate(() => {
    const stack =
      (document.querySelector('.cpv-phone-stack') as HTMLElement | null) ??
      (document.querySelector('[data-scroll]')?.closest('.cpv-chrome') as HTMLElement | null)
    if (!stack) return { overlap: false, reason: 'no-dock' }
    const s = stack.getBoundingClientRect()
    const hits = [...document.querySelectorAll('.cpv-swipe-rail')].flatMap((rail) => {
      const r = rail.getBoundingClientRect()
      const overlap =
        r.bottom > s.top + 0.5 && r.top < s.bottom && r.right > s.left && r.left < s.right
      return overlap
        ? [{ rail: rail.getAttribute('data-swipe-rail'), railBottom: r.bottom, dockTop: s.top }]
        : []
    })
    return { overlap: hits.length > 0, hits }
  })
}

function assertNoThieves(findings: Finding[], label: string) {
  const stolen = findings.filter((f) => f.thief || f.pointerEvents === 'none' || f.prevented)
  expect(stolen, `${label}: ${JSON.stringify(stolen, null, 2)}`).toEqual([])
}

for (const vp of PHONES) {
  test(`${vp.name} setlist: no overlay steals Rolar, Mais, list, or header`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/?lista=1')
    await page.locator('[data-scroll]').waitFor()
    expect(await railDockOverlap(page)).toMatchObject({ overlap: false })
    const findings = await probeLiveControls(page)
    expect(findings.some((f) => f.sel === '[data-scroll]'), 'Rolar missing').toBe(true)
    expect(findings.some((f) => f.sel === '[data-more]'), 'Mais missing').toBe(true)
    assertNoThieves(findings, `${vp.name} setlist`)
  })

  test(`${vp.name} setlist + audio: headphones in the dock stay tappable`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/?lista=1&audio=1')
    await page.locator('[data-scroll]').waitFor()
    expect(await railDockOverlap(page)).toMatchObject({ overlap: false })
    const findings = await probeLiveControls(page)
    assertNoThieves(findings, `${vp.name} audio`)
  })

  test(`${vp.name} setlist + zonas: debug paint does not cover the dock`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/?lista=1&zonas=1')
    await page.locator('[data-scroll]').waitFor()
    await expect(page.locator('[data-cpv-root]')).toHaveClass(/is-swipe-debug/)
    expect(await railDockOverlap(page)).toMatchObject({ overlap: false })
    const findings = await probeLiveControls(page)
    assertNoThieves(findings, `${vp.name} zonas`)
  })
}

test('tablet setlist (128px rails): dock and header stay above the rails', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/?lista=1')
  await page.locator('[data-scroll]').waitFor()
  expect(await railDockOverlap(page)).toMatchObject({ overlap: false })
  const findings = await probeLiveControls(page)
  expect(findings.some((f) => f.sel === '[data-scroll]')).toBe(true)
  assertNoThieves(findings, 'tablet setlist')
})

test('single chart (no setlist): dock is not under a leftover rail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('[data-scroll]').waitFor()
  expect(await page.locator('.cpv-swipe-rail').count()).toBe(0)
  const findings = await probeLiveControls(page)
  assertNoThieves(findings, 'single chart')
})

test('after closing Mais, Rolar is still the hit at its own rectangle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1')
  await page.locator('[data-more]').waitFor()
  await page.locator('[data-more]').evaluate((el) => (el as HTMLButtonElement).click())
  await expect(page.getByRole('dialog', { name: 'Mais controles' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Mais controles' })).toHaveCount(0)
  const findings = await probeLiveControls(page)
  assertNoThieves(findings, 'after Mais')
})


