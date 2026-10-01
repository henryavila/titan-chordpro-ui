import { expect, test } from '@playwright/test'

for (const engine of ['svg', 'html5'] as const) {
  test(`${engine}: excerpts across ties render without changing the original score`, async ({ page }) => {
    await page.goto('/notation.html')
    const result = await page.evaluate(async ({ root, engine }) => {
      const { loadNotation } = await import(`${root}/src/vue/chart/notation-loader.ts`)
      const { drawNotation, PAPER_PALETTE } = await import(`${root}/src/vue/chart/notation-renderer.ts`)
      const { model } = await import(`${root}/node_modules/@coderline/alphatab/dist/alphaTab.core.mjs`)
      const url = (await import(`${root}/fixtures/notation/full-song.gp?url`)).default
      const score = await loadNotation(new Uint8Array(await (await fetch(url)).arrayBuffer()))
      const before = model.JsonConverter.scoreToJson(score)
      const failures: string[] = []
      // 7–11 cuts an incoming tie in this upstream fixture; 3–11 is the reported
      // interval. Include a tail, a single bar and the complete score afterwards.
      for (const mode of ['tab', 'score'] as const) {
        for (const [start, end] of [[3, 11], [7, 11], [9, 11], [11, 11], [7, score.masterBars.length], [1, score.masterBars.length]]) {
          try {
            const systems = await drawNotation(score, { src: url, track: 1, start, end }, { engine, mode, width: 600, scale: 1.1, palette: PAPER_PALETTE })
            if (!systems.length || systems[0].first !== start || systems.at(-1).last !== end) failures.push(`${mode} ${start}–${end}: wrong bars`)
          } catch (e) { failures.push(`${mode} ${start}–${end}: ${e instanceof Error ? e.message : e}`) }
        }
      }
      return { failures, unchanged: before === model.JsonConverter.scoreToJson(score) }
    }, { root: `/@fs${process.cwd()}`, engine })
    expect(result).toEqual({ failures: [], unchanged: true })
  })
}
