import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  AUTOSCROLL_CLOCK_TEST_FILES,
  AUTOSCROLL_FORBIDDEN_IN_CLOCK_TESTS,
} from '../helpers/autoscroll-real-data'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('auto-scroll clock tests never use the unmarked-row estimate as expected time', () => {
  it('forbids BEATS_PER_ROW and 8-pulses-per-line in the clock files', () => {
    const hits: string[] = []
    for (const rel of AUTOSCROLL_CLOCK_TEST_FILES) {
      if (rel.endsWith('autoscroll-real-data.ts')) continue
      const text = readFileSync(join(root, rel), 'utf8')
      for (const re of AUTOSCROLL_FORBIDDEN_IN_CLOCK_TESTS) {
        if (re.test(text)) hits.push(`${rel} matches ${re}`)
      }
    }
    expect(hits, hits.join('\n')).toEqual([])
  })
})
