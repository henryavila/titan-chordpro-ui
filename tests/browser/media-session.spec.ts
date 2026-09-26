import { expect, test, type Page } from '@playwright/test'

type HandlerKind = 'none' | 'fn'

async function mediaSnap(page: Page) {
  return page.evaluate(() => {
    const ms = navigator.mediaSession
    const m = ms?.metadata
    return {
      available: 'mediaSession' in navigator,
      title: m?.title ?? '',
      artist: m?.artist ?? '',
      album: m?.album ?? '',
      sizes: m ? Array.from(m.artwork ?? []).map((a) => a.sizes) : [],
      state: ms?.playbackState ?? 'none',
      pageTitle: document.title,
    }
  })
}

async function captureMediaHandlers(page: Page) {
  await page.addInitScript(`(() => {
    const capture = Object.create(null)
    window.__cpvMediaHandlers = capture
    function install(target) {
      if (!target || typeof target.setActionHandler !== 'function') return
      if (target.setActionHandler.__cpvWrapped) return
      const orig = target.setActionHandler
      const wrapped = function (action, handler) {
        capture[action] = handler
        return orig.call(this, action, handler)
      }
      wrapped.__cpvWrapped = true
      try {
        target.setActionHandler = wrapped
      } catch (e) {
        Object.defineProperty(target, 'setActionHandler', { configurable: true, value: wrapped })
      }
    }
    if (window.MediaSession) install(window.MediaSession.prototype)
    install(navigator.mediaSession)
  })()`)
}

async function handlerKind(page: Page, action: string): Promise<HandlerKind> {
  return page.evaluate(
    `(() => {
      const capture = window.__cpvMediaHandlers
      const h = capture && capture[${JSON.stringify(action)}]
      return h == null ? 'none' : 'fn'
    })()`,
  )
}

async function fireAction(page: Page, action: string) {
  await page.evaluate(
    `(() => {
      const capture = window.__cpvMediaHandlers
      const fn = capture && capture[${JSON.stringify(action)}]
      if (typeof fn === 'function') fn({ action: ${JSON.stringify(action)} })
    })()`,
  )
}

async function waitBound(page: Page, action: string) {
  await expect.poll(async () => handlerKind(page, action)).toBe('fn')
}

test('complete rehearsal publishes song title and 1024 cover, not the page name', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?audio=1&editMode=none&chart=100-nasce-em-mim.cho')
  const player = page.locator('[data-audio-ref]')
  await player.waitFor()
  const idle = await mediaSnap(page)
  expect(idle.available, 'Media Session API missing').toBe(true)
  expect(idle.title).toBe('Nasce em Mim')
  expect(idle.album).toBe('Cantado')
  expect(idle.sizes).toContain('1024x1024')
  expect(idle.pageTitle).not.toBe('Nasce em Mim')

  await player.locator('[data-audio-open]').click()
  await expect(player.locator('[data-audio-title]')).toHaveText('Nasce em Mim')
  await player.locator('[data-audio-play]').click()
  await expect(player.locator('[data-icon=pause]')).toBeVisible()
  await expect.poll(async () => (await mediaSnap(page)).state).toBe('playing')
  const live = await mediaSnap(page)
  expect(live.title).toBe('Nasce em Mim')
  expect(live.sizes).toContain('1024x1024')

  await player.locator('[data-audio-kind=playback]').click()
  await expect(player.locator('[data-audio-kind=playback]')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await mediaSnap(page)).album).toBe('Playback')
  const pb = await mediaSnap(page)
  expect(pb.title).toBe('Nasce em Mim')
  expect(pb.sizes).toContain('1024x1024')

  const clock = player.locator('[data-audio-clock]')
  await player.locator('[data-audio-skip="1"]').click()
  await expect(clock).not.toHaveText('0:00')
  await player.locator('[data-audio-play]').click()
  await expect(player.locator('[data-icon=play]')).toBeVisible()
  await expect.poll(async () => (await mediaSnap(page)).state).toBe('paused')
})

test('without host cover, Media Session uses the packaged 512 art', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?audio=cantado&capa=0&editMode=none&chart=100-nasce-em-mim.cho')
  await page.locator('[data-audio-ref]').waitFor()
  const snap = await mediaSnap(page)
  expect(snap.available).toBe(true)
  expect(snap.title).toBe('Nasce em Mim')
  expect(snap.album).toBe('Cantado')
  expect(snap.sizes).toContain('512x512')
})

test('consumer defaultAudioArt fills the session when the chart has no cover', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?audio=cantado&capa=0&artDefault=1&editMode=none&chart=100-nasce-em-mim.cho')
  await page.locator('[data-audio-ref]').waitFor()
  const snap = await mediaSnap(page)
  expect(snap.available).toBe(true)
  expect(snap.title).toBe('Nasce em Mim')
  expect(snap.sizes).toContain('1024x1024')
  await page.locator('[data-audio-open]').click()
  const src = await page.locator('[data-audio-art] img').getAttribute('src')
  expect(src).toBeTruthy()
  await expect(page.locator('[data-audio-art] img')).not.toHaveAttribute('data-audio-art-default')
})

test('a single chart does not bind lock-screen skip-song', async ({ page }) => {
  await captureMediaHandlers(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?audio=1&editMode=none&chart=100-nasce-em-mim.cho')
  await page.locator('[data-audio-ref]').waitFor()
  await waitBound(page, 'play')
  expect(await handlerKind(page, 'previoustrack')).toBe('none')
  expect(await handlerKind(page, 'nexttrack')).toBe('none')
})

test('setlist nexttrack on the lock screen opens the next song', async ({ page }) => {
  await captureMediaHandlers(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1&audio=1&editMode=none')
  await page.locator('[data-audio-ref]').waitFor()
  await expect.poll(async () => (await mediaSnap(page)).title).toBe('O Rei vem vindo')
  await waitBound(page, 'play')
  await waitBound(page, 'previoustrack')
  await waitBound(page, 'nexttrack')
  expect(await handlerKind(page, 'seekforward')).toBe('none')
  expect(await handlerKind(page, 'seekbackward')).toBe('none')

  await fireAction(page, 'nexttrack')
  await expect.poll(async () => (await mediaSnap(page)).title).toBe('Jesus, Tu És a minha vida')
  expect(await handlerKind(page, 'previoustrack')).toBe('fn')
  expect(await handlerKind(page, 'nexttrack')).toBe('fn')
})

test('setlist previoustrack returns to the song that was playing', async ({ page }) => {
  await captureMediaHandlers(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1&audio=1&editMode=none')
  await page.locator('[data-audio-ref]').waitFor()
  await fireAction(page, 'nexttrack')
  await expect.poll(async () => (await mediaSnap(page)).title).toBe('Jesus, Tu És a minha vida')
  await fireAction(page, 'previoustrack')
  await expect.poll(async () => (await mediaSnap(page)).title).toBe('O Rei vem vindo')
  expect(await handlerKind(page, 'previoustrack')).toBe('fn')
  expect(await handlerKind(page, 'nexttrack')).toBe('fn')
})

test('setlist nexttrack restarts the clock on a different track', async ({ page }) => {
  await captureMediaHandlers(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1&audio=1&editMode=none')
  const player = page.locator('[data-audio-ref]')
  await player.waitFor()
  await player.locator('[data-audio-open]').click()
  await player.locator('[data-audio-play]').click()
  await expect(player.locator('[data-icon=pause]')).toBeVisible()
  await player.locator('[data-audio-skip="1"]').click()
  const clock = player.locator('[data-audio-clock]')
  await expect(clock).not.toHaveText('0:00')
  const before = await mediaSnap(page)
  expect(before.title).toBe('O Rei vem vindo')
  await waitBound(page, 'nexttrack')
  await fireAction(page, 'nexttrack')
  await expect.poll(async () => (await mediaSnap(page)).title).toBe('Jesus, Tu És a minha vida')
  if (!(await player.locator('[data-audio-clock]').isVisible())) {
    await player.locator('[data-audio-open]').click()
  }
  await expect(player.locator('[data-audio-clock]')).toHaveText('0:00')
})

test('a set keeps ±10 s on the in-app player and skip-song on the lock screen', async ({
  page,
}) => {
  await captureMediaHandlers(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lista=1&audio=1&editMode=none')
  const player = page.locator('[data-audio-ref]')
  await player.waitFor()
  await waitBound(page, 'nexttrack')
  expect(await handlerKind(page, 'seekforward')).toBe('none')
  await player.locator('[data-audio-open]').click()
  await player.locator('[data-audio-play]').click()
  await expect(player.locator('[data-icon=pause]')).toBeVisible()
  expect((await mediaSnap(page)).title).toBe('O Rei vem vindo')
  await player.locator('[data-audio-skip="1"]').click()
  await expect(player.locator('[data-audio-clock]')).not.toHaveText('0:00')
  await expect.poll(async () => (await mediaSnap(page)).title).toBe('O Rei vem vindo')
})
