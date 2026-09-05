import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

export function loadFixture(rel: string): string {
  return readFileSync(join(root, 'fixtures', rel), 'utf8')
}

export const JESUS_1 = 'jesus-tu-es-a-minha-vida-1.cho'
