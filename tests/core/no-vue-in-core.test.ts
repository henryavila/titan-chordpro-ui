import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { describe, expect, it } from 'vitest'

const coreDir = join(dirname(fileURLToPath(import.meta.url)), '../../src/core')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (p.endsWith('.ts')) out.push(p)
  }
  return out
}

describe('A14 no Vue in core', () => {
  it('src/core has no vue imports', () => {
    const files = walk(coreDir)
    const hits: string[] = []
    for (const f of files) {
      const text = readFileSync(f, 'utf8')
      if (/from ['"]vue['"]/.test(text) || /from ['"]vue\//.test(text)) hits.push(f)
    }
    expect(hits).toEqual([])
  })
})
