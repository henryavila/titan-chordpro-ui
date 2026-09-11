#!/usr/bin/env node
/**
 * Refresh `src/pdf/font-data.ts` from the Latin static TTF next to it.
 * Re-download the faces first if you bump the fontsource version:
 *
 *   curl -fsSL https://cdn.jsdelivr.net/fontsource/fonts/sora@5.3.0/latin-400-normal.ttf -o src/pdf/fonts/Sora-Regular.ttf
 *   curl -fsSL https://cdn.jsdelivr.net/fontsource/fonts/sora@5.3.0/latin-600-normal.ttf -o src/pdf/fonts/Sora-SemiBold.ttf
 *   curl -fsSL https://cdn.jsdelivr.net/fontsource/fonts/space-mono@5.3.0/latin-400-normal.ttf -o src/pdf/fonts/SpaceMono-Regular.ttf
 *   curl -fsSL https://cdn.jsdelivr.net/fontsource/fonts/space-mono@5.3.0/latin-700-normal.ttf -o src/pdf/fonts/SpaceMono-Bold.ttf
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/pdf/fonts')
const files = {
  SORA_REGULAR: 'Sora-Regular.ttf',
  SORA_SEMIBOLD: 'Sora-SemiBold.ttf',
  SPACE_MONO_REGULAR: 'SpaceMono-Regular.ttf',
  SPACE_MONO_BOLD: 'SpaceMono-Bold.ttf',
}
const lines = [
  '/** Latin static TTF (fontsource). Generated — run scripts/embed-pdf-fonts.mjs to refresh. */',
  '',
]
for (const [name, file] of Object.entries(files)) {
  const b64 = readFileSync(join(dir, file)).toString('base64')
  lines.push(`export const ${name} = "${b64}"`, '')
}
writeFileSync(join(dir, '../font-data.ts'), lines.join('\n'))
