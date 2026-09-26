import { expect, test, type Page } from '@playwright/test'

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
