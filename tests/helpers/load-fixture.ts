import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

export function loadFixture(rel: string): string {
  return readFileSync(join(root, 'fixtures', rel), 'utf8')
}

export const JESUS_1 = 'sda/087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho'
export const ENTREGA_1 = 'sda/078-entrega-h310.cho'
export const ESCUTA = 'sda/084-escuta-meu-clamor.cho'
export const ELE_VIVE = 'sda/013-ele-vive-em-mim.cho'
/** Image + {sos} — not in the demo list; production 013 has TAB only. */
export const ELE_VIVE_IMG = '013-ele-vive-em-mim-partitura.cho'

/** Scroll is gated on `{duration:}`. Tests that roll a chart without one in the file use this. */
export function withDuration(src: string, duration = '04:26'): string {
  return `{duration: ${duration}}\n${withoutDuration(src)}`
}

export function withoutDuration(src: string): string {
  return String(src ?? '').replace(/^\s*\{\s*duration\s*:[^}]*\}\s*\n?/gim, '')
}
