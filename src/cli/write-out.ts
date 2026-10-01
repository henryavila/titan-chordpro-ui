import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export function writeOut(dest: string, data: string | Uint8Array): void {
  const dir = dirname(dest)
  if (dir && dir !== '.') mkdirSync(dir, { recursive: true })
  writeFileSync(dest, data)
}
