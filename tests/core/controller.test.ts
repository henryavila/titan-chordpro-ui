import { describe, expect, it } from 'vitest'
import { createTitanChordproController } from '../../src/core/index'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

describe('createTitanChordproController', () => {
  it('subscribe/dispatch transpose updates state + html', () => {
    const c = createTitanChordproController({ source: loadFixture(JESUS_1) })
    const seen: string[] = []
    const unsub = c.subscribe((s) => seen.push(s.html))
    const before = c.getState().html
    c.dispatch({ type: 'transpose', delta: 2 })
    const after = c.getState()
    expect(after.transposeSemitones).toBe(2)
    expect(after.displayKey).toBe('A')
    expect(after.html).not.toBe(before)
    expect(after.html).toContain('titan-chordpro')
    expect(seen.length).toBeGreaterThan(1)
    unsub()
  })

  it('entering edit resets transpose', () => {
    const c = createTitanChordproController({ source: loadFixture(JESUS_1) })
    c.dispatch({ type: 'transpose', delta: 3 })
    c.dispatch({ type: 'setMode', mode: 'edit' })
    expect(c.getState().transposeSemitones).toBe(0)
    expect(c.getState().mode).toBe('edit')
    expect(c.getState().fit).toBe(false)
  })
})
