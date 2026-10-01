import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

for (const unavailable of [true, false]) {
  test(`real demo inserts and saves notation with randomUUID ${unavailable ? 'unavailable' : 'available'}`, async ({ page, browserName }) => {
    await page.addInitScript(missing => {
      if (missing) Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
      localStorage.setItem('titan-chordpro:editSeen', '1')
    }, unavailable)
    await page.goto('/demo-insertion.html?editMode=persisted')
    expect(await page.evaluate(() => typeof crypto.randomUUID)).toBe(unavailable ? 'undefined' : 'function')
    await page.locator('[data-edit]').click()
    if (await page.locator('[data-mode-content]').count()) await page.locator('[data-mode-content]').click()
    for (const file of ['notes.gp', 'chords.gp']) {
      await page.locator('[data-insert]').first().click()
      await page.getByRole('button', { name: 'Guitar Pro / MusicXML', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Solo de Guitar Pro ou MusicXML' })
      const input = dialog.locator('input[type="file"]')
      // iOS Files disables some .gp files when the picker filters by extension.
      // The app validates the selected file after the picker returns it.
      await expect(input).not.toHaveAttribute('accept')
      if (file === 'notes.gp') {
        const [invalidChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          dialog.getByRole('button', { name: 'Escolher arquivo', exact: true }).click(),
        ])
        await invalidChooser.setFiles('fixtures/notation/LICENSE.alphatab')
        await expect(dialog.getByRole('alert')).toContainText('Escolha um arquivo Guitar Pro ou MusicXML')
        await expect(dialog.getByRole('button', { name: 'Salvar trecho na cifra' })).toBeDisabled()
      }
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        dialog.getByRole('button', { name: 'Escolher arquivo', exact: true }).click(),
      ])
      await chooser.setFiles(`fixtures/notation/${file}`)
      await expect(dialog.locator('.titan-chordpro-notation-paper svg').first()).toBeVisible()
      await expect(dialog.getByRole('textbox', { name: 'Nome do trecho' })).toHaveValue('Solo')
      await dialog.getByRole('textbox', { name: 'Nome do trecho' }).fill(`Entrada ${file}`)
      await dialog.getByRole('button', { name: 'Salvar trecho na cifra' }).click()
      await expect(dialog.getByRole('alert')).toHaveCount(0)
      await expect(dialog).toHaveCount(0)
    }
    await expect(page.locator('[data-external-score]')).toHaveCount(2)
    await expect(page.locator('[data-external-score] svg').first()).toBeVisible()
    await page.locator('[data-source]').click()
    const source = await page.getByRole('textbox', { name: 'Fonte ChordPro' }).inputValue()
    const refs = [...source.matchAll(/\{x_titan_score: src="(solos\/[^"\s]+\.gp)"/g)].map(m => m[1]!)
    expect(source).toContain('name="Entrada notes.gp"')
    expect(source).toContain('name="Entrada chords.gp"')
    expect(refs).toHaveLength(2)
    expect(new Set(refs).size).toBe(2)
    const stored = await page.evaluate(async keys => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('titan-chordpro-demo', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      try {
        const blobs = await Promise.all(keys.map(key => new Promise<Blob | { bytes: ArrayBuffer; type: string } | undefined>((resolve, reject) => {
          const request = db.transaction('score-images', 'readonly').objectStore('score-images').get(key)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })))
        return Promise.all(blobs.map(async blob => blob ? Array.from(new Uint8Array(blob instanceof Blob ? await blob.arrayBuffer() : blob.bytes)) : null))
      } finally { db.close() }
    }, refs)
    // Inserting at the first slot puts the second file before the first.
    expect(stored).toEqual(['chords.gp', 'notes.gp'].map(file => [...readFileSync(`fixtures/notation/${file}`)]))
    await page.getByRole('button', { name: 'Fechar painel de source' }).click()
    await page.locator('[data-save]').click()
    await expect(page.locator('[data-save]')).toHaveCount(0)
    await page.locator('[data-read]').click()
    await expect(page.locator('[data-edit]')).toBeVisible()
    await expect(page.locator('[data-external-score]')).toHaveCount(2)
    await expect(page.locator('[data-external-score] [role="alert"]')).toHaveCount(0)
    const card = page.locator('.titan-chordpro-notation-card').filter({ hasText: 'Entrada chords.gp' })
    await expect(card.locator('.titan-chordpro-notation-title')).toHaveText('Entrada chords.gp')
    await expect(card).not.toContainText(/Tom do arquivo|Steel Guitar|compassos/)
    await card.getByRole('button', { name: 'Ocultar Entrada chords.gp' }).click()
    await expect(card.locator('.titan-chordpro-notation-title')).toBeVisible()
    await expect(card.locator('[data-external-score]')).toBeHidden()
    await card.getByRole('button', { name: 'Mostrar Entrada chords.gp' }).click()
    await expect(card.locator('.titan-chordpro-notation-paper svg').first()).toBeVisible()
    // Cover backward compatibility with the demo's former Blob storage format.
    // Chromium can write that format; the WebKit failure is why new writes use bytes.
    if (browserName === 'chromium') await page.evaluate(async key => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('titan-chordpro-demo', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('score-images', 'readwrite')
          const store = tx.objectStore('score-images')
          const request = store.get(key)
          request.onsuccess = () => store.put(new Blob([request.result.bytes], { type: request.result.type }), key)
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      } finally { db.close() }
    }, refs[0]!)
    // The demo does not persist chart text; restore it through its source editor
    // after reload, proving that the original files resolve from durable storage.
    await page.reload()
    await page.locator('[data-edit]').click()
    await page.locator('[data-source]').click()
    await page.getByRole('textbox', { name: 'Fonte ChordPro' }).fill(source)
    await page.getByRole('button', { name: 'Fechar painel de source' }).click()
    await expect(page.locator('[data-external-score]')).toHaveCount(2)
    for (const block of await page.locator('[data-external-score]').all()) {
      await expect(block.locator('.titan-chordpro-notation-paper svg').first()).toBeVisible()
      await expect(block.getByRole('alert')).toHaveCount(0)
    }
  })
}
