import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

/** Names inside `export type { … } from './public'`. */
function typeNames(text: string): string[] {
  const block = text.match(/export type \{([^}]*)\} from '\.\/public'/)?.[1] ?? ''
  return block.split(',').map((name) => name.trim()).filter(Boolean).sort()
}

describe('published Vue types', () => {
  it('public.ts imports no relative file: pack-vue ships it alone as public.d.ts', () => {
    expect(read('src/vue/public.ts')).not.toMatch(/from '\.\.?\//)
  })

  it('the packed index.d.ts exports every type the Vue entry exports', () => {
    expect(typeNames(read('scripts/pack-vue.ts'))).toEqual(typeNames(read('src/vue/index.ts')))
  })
})
