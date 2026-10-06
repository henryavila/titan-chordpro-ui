import { expect, test } from '@playwright/test'

for (const engine of ['svg', 'html5']) for (const format of ['letter', 'solfege']) {
  test(`${engine}: imported notes receive aligned ${format} names`, async ({ page }) => {
    await page.goto(`/rhythm-audit.html?engine=${engine}&format=${format}`)
    await expect(page.locator('body')).toHaveAttribute('data-note-names', /names/)
    const systems: Array<{ width: number; names: Array<{ x: number; text: string }> }> =
      JSON.parse((await page.locator('body').getAttribute('data-note-names'))!)
    const names = systems.flatMap(system => system.names)
    expect(names.length).toBeGreaterThan(10)
    expect(names.every(name => (format === 'letter' ? /^[A-G]/ : /^(Dó|Ré|Mi|Fá|Sol|Lá|Si)/).test(name.text))).toBe(true)
    expect(names.some(name => name.text === (format === 'letter' ? 'F#' : 'Fá♯'))).toBe(true)
    for (const system of systems) for (const name of system.names) {
      expect(name.x).toBeGreaterThanOrEqual(0)
      expect(name.x).toBeLessThanOrEqual(system.width)
    }
  })
}
