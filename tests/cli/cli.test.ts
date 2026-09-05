import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { describe, expect, it } from 'vitest'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const cli = join(root, 'src/cli/index.ts')

describe('CLI', () => {
  it('accepts .cho html/parse smoke on jesus-1', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cpv-'))
    const cho = join(dir, 'song.cho')
    writeFileSync(cho, loadFixture(JESUS_1))
    const htmlOut = join(dir, 'out.html')
    const jsonOut = join(dir, 'view.json')
    execFileSync('pnpm', ['exec', 'tsx', cli, 'html', cho, '--theme', 'default', '-o', htmlOut], {
      cwd: root,
      stdio: 'pipe',
    })
    execFileSync('pnpm', ['exec', 'tsx', cli, 'parse', cho, '-o', jsonOut], { cwd: root, stdio: 'pipe' })
    expect(existsSync(htmlOut)).toBe(true)
    expect(readFileSync(htmlOut, 'utf8')).toContain('Jesus')
    const view = JSON.parse(readFileSync(jsonOut, 'utf8'))
    expect(view.meta.key).toBe('G')
  })

  it('accepts .chordpro and .onsong extensions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cpv-'))
    const chordpro = join(dir, 'song.chordpro')
    const onsong = join(dir, 'song.onsong')
    writeFileSync(chordpro, loadFixture(JESUS_1))
    writeFileSync(
      onsong,
      `Title: Test\nKey: C\n\nC     G\nHello there\n`,
    )
    const a = join(dir, 'a.html')
    const b = join(dir, 'b.json')
    execFileSync('pnpm', ['exec', 'tsx', cli, 'html', chordpro, '-o', a], { cwd: root, stdio: 'pipe' })
    execFileSync('pnpm', ['exec', 'tsx', cli, 'parse', onsong, '-o', b], { cwd: root, stdio: 'pipe' })
    expect(readFileSync(a, 'utf8')).toContain('cpv')
    const view = JSON.parse(readFileSync(b, 'utf8'))
    expect(view.sections.length).toBeGreaterThan(0)
  })
})
