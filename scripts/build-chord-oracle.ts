#!/usr/bin/env npx tsx
/**
 * Unique `[...]` names in fixtures/sda → parse | UNPARSED | AMBIGUOUS.
 * Class comes from parseChordToken; this file does not keep a second QUALITY table.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseChordToken } from '../src/core/parse-chord'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'fixtures/sda')
const OUT = join(ROOT, 'tests/core/chord-oracle.table.json')
const TOKEN = /\[([^\[\]]+)\]/g

export type OracleRow = {
  name: string
  class: 'parse' | 'UNPARSED' | 'AMBIGUOUS'
  quality?: string
  bass?: string
}

export function extractNames(src: string): Set<string> {
  const names = new Set<string>()
  TOKEN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TOKEN.exec(src))) names.add(m[1] ?? '')
  names.delete('')
  return names
}

export function classifyOracleName(name: string): OracleRow {
  const result = parseChordToken(name)
  if (result.class !== 'parse') return { name, class: result.class }
  const row: OracleRow = { name, class: 'parse', quality: result.quality }
  if (result.bass) row.bass = result.bass
  return row
}

function uniqueFromSda(): string[] {
  const names = new Set<string>()
  for (const file of readdirSync(DIR).filter((n) => n.endsWith('.cho')).sort()) {
    for (const n of extractNames(readFileSync(join(DIR, file), 'utf8'))) names.add(n)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

export function buildOracleTable(): OracleRow[] {
  return uniqueFromSda().map(classifyOracleName)
}

function isCli(): boolean {
  if (process.env.VITEST) return false
  const entry = process.argv[1]
  if (!entry) return false
  return resolve(entry) === fileURLToPath(import.meta.url)
}

if (isCli()) {
  const rows = buildOracleTable()
  writeFileSync(OUT, `${JSON.stringify(rows, null, 2)}\n`)
  console.log(`wrote ${rows.length} names → ${OUT}`)
}
