#!/usr/bin/env node
/**
 * Unique `[...]` names in fixtures/sda → parse | UNPARSED | AMBIGUOUS.
 * Quality only; 7+ and quote junk are not guessed as a voicing.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..'
const DIR = join(ROOT, 'fixtures/sda')
const OUT = join(ROOT, 'tests/core/chord-oracle.table.json')
const TOKEN = /\[([^\[\]]+)\]/g

/** Canonical quality for a fully consumed suffix. No 7+ → aug/maj7. */
const QUALITY = {
  '': 'major',
  M: 'major',
  m: 'm',
  2: 'sus2',
  4: 'sus4',
  5: '5',
  6: '6',
  '6(9)': '6add9',
  7: '7',
  '7(4)': '7sus4',
  '7(9)': '9',
  '7M': 'maj7',
  '7M(9)': 'maj9',
  '7sus4': '7sus4',
  9: 'add9',
  dim: 'dim',
  m6: 'm6',
  M7: 'maj7',
  m7: 'm7',
  'm7(11)': 'm11',
  m9: 'm9',
  maj7: 'maj7',
  sus: 'sus4',
  sus2: 'sus2',
  sus4: 'sus4',
  'º': 'dim',
  '°': 'dim',
}

const AMBIGUOUS_SUFFIX = new Set(['7+', 'm(3b)'])

export function extractNames(src) {
  const names = new Set()
  TOKEN.lastIndex = 0
  let m
  while ((m = TOKEN.exec(src))) names.add(m[1])
  return names
}

export function classifyOracleName(name) {
  const token = String(name ?? '').trim()
  if (!token || /["'’]/.test(token)) return { name, class: 'UNPARSED' }

  let chord = token
  let bass
  const slash = token.indexOf('/')
  if (slash >= 0) {
    chord = token.slice(0, slash)
    bass = token.slice(slash + 1)
    if (!/^[A-G](?:#|b)?$/.test(bass)) return { name, class: 'AMBIGUOUS' }
  }

  const root = chord.match(/^([A-G](?:#|b)?)(.*)$/)
  if (!root) return { name, class: 'UNPARSED' }
  const suffix = root[2]
  if (AMBIGUOUS_SUFFIX.has(suffix) || suffix.includes('+')) return { name, class: 'AMBIGUOUS' }
  if (!Object.prototype.hasOwnProperty.call(QUALITY, suffix)) return { name, class: 'UNPARSED' }

  const row = { name, class: 'parse', quality: QUALITY[suffix] }
  if (bass) row.bass = bass
  return row
}

function uniqueFromSda() {
  const names = new Set()
  for (const file of readdirSync(DIR).filter((n) => n.endsWith('.cho')).sort()) {
    for (const n of extractNames(readFileSync(join(DIR, file), 'utf8'))) names.add(n)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

const rows = uniqueFromSda().map(classifyOracleName)
writeFileSync(OUT, `${JSON.stringify(rows, null, 2)}\n`)
console.log(`wrote ${rows.length} names → ${OUT}`)
