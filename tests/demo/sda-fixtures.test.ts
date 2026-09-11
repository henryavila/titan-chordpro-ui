import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { bundledFixtures } from '../../demo/host/charts'
import { parse, songDurationSec } from '../../src/core/index'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const dir = join(root, 'fixtures/sda')

function choFiles(): string[] {
  return readdirSync(dir)
    .filter((n) => n.endsWith('.cho'))
    .sort()
}

describe('fixtures/sda — corpus de produção para validar a aplicação', () => {
  it('guarda uma cifra viva por arquivo, sem inventar chart', () => {
    const files = choFiles()
    expect(files.length).toBe(148)
    expect(new Set(files).size).toBe(files.length)
  })

  it('cada cifra parseia e quase todas declaram {duration:} do song', () => {
    const files = choFiles()
    let withDur = 0
    for (const name of files) {
      const src = readFileSync(join(dir, name), 'utf8')
      expect(src.includes('\r'), name).toBe(false)
      const view = parse(src)
      expect(view.sections.length, name).toBeGreaterThan(0)
      if (songDurationSec(view.meta.duration) != null) withDur++
    }
    // 4 songs no dump não têm duration (028, 029, 094, 098)
    expect(withDur).toBe(144)
  })

  it('cataloga origem e política no manifest da pasta', () => {
    const man = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as {
      files: Array<{ path: string; chordpro_id: number; duration_action: string }>
    }
    expect(man.files).toHaveLength(148)
    expect(man.files.every((f) => choFiles().includes(f.path))).toBe(true)
    expect(man.files.filter((f) => f.duration_action === 'insert')).toHaveLength(118)
  })

  it('é a única lista do demo — cifras antigas ficam de fora', () => {
    const f = bundledFixtures()
    const ids = Object.keys(f).filter((k) => k !== 'vazio')
    expect(ids).toHaveLength(148)
    expect(f['001-tudo-que-ha-de-bom-em-mim']).toContain('{duration: 03:03}')
    expect(f['013-ele-vive-em-mim']).toMatch(/\{sot/i)
    expect(f['013-ele-vive-em-mim-partitura']).toBeUndefined()
    expect(f['escuta-meu-clamor-sda-86']).toBeUndefined()
    expect(f['jesus-tu-es-a-minha-vida-1']).toBeUndefined()
    expect(f['entrega-1']).toBeUndefined()
  })
})
