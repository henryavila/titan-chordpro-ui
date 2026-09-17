import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '../../src')

/** The one file allowed to name the browser's storage. */
const SEAM = 'core/storage.ts'

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(ts|vue)$/.test(p)) out.push(p)
  }
  return out
}

/**
 * The package owns the behaviour built on stored state; the consumer owns
 * where it lands. A direct `localStorage` call anywhere else closes that seam
 * again and silently pins a host's data to one device.
 */
describe('storage goes through the host seam', () => {
  it('only core/storage.ts touches localStorage', () => {
    const hits = walk(srcDir)
      .filter((f) => relative(srcDir, f).split('\\').join('/') !== SEAM)
      .filter((f) => /\blocalStorage\s*\./.test(readFileSync(f, 'utf8')))
      .map((f) => relative(srcDir, f))

    expect(hits).toEqual([])
  })

  it('every key the package writes is declared in STORE_KEYS', async () => {
    const { STORE_KEYS } = await import('../../src/core/storage')
    const declared = Object.values(STORE_KEYS)

    const used = new Set<string>()
    for (const f of walk(srcDir)) {
      for (const m of readFileSync(f, 'utf8').matchAll(/['"`](cpv:[a-zA-Z0-9:-]*)/g)) {
        if (m[1]) used.add(m[1])
      }
    }

    expect([...used].filter((k) => !declared.includes(k as never))).toEqual([])
  })
})
