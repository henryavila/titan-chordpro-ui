import { describe, expect, it } from 'vitest'
import {
  layoutChart, memoryStore, notationBlockIds, notationKey, parse,
  readNotationPreferences, readUserPreferences, STORE_KEYS,
  updateUserPreferences, writeNotationPreferences,
} from '../../src/core'
import { ELE_VIVE_IMG, loadFixture } from '../helpers/load-fixture'

describe('reader preferences', () => {
  it('keeps global choices in one validated record and does not read the old keys', () => {
    const store = memoryStore({ 'cpv:prefs': '{"theme":"dark"}', 'cpv:tab-rhythm': 'none' })
    expect(readUserPreferences(store)).toEqual({})
    updateUserPreferences(store, { theme: 'light', tabRhythm: 'base' })
    expect(readUserPreferences(store)).toEqual({ theme: 'light', tabRhythm: 'base' })
    updateUserPreferences(store, { tabRhythm: undefined })
    expect(readUserPreferences(store)).toEqual({ theme: 'light' })
    expect(store.get(STORE_KEYS.prefs)).toBe('{"theme":"light"}')
  })

  it('keys notation by its content rather than its source line', () => {
    const blocks = layoutChart(parse(loadFixture(ELE_VIVE_IMG)))
    const before = notationBlockIds(blocks)
    const moved = blocks.map(block => ({ ...block, li0: block.li0 + 8, li1: block.li1 + 8 }))
    expect(notationBlockIds(moved)).toEqual(before)
    expect(before.filter(Boolean).length).toBeGreaterThan(1)
    expect(new Set(before.filter(Boolean)).size).toBe(before.filter(Boolean).length)
  })

  it('isolates notation by song and host store without touching source or suggestions', () => {
    const first = memoryStore({ 'cpv:my:song': 'unchanged' })
    const second = memoryStore()
    const choices = { solo: { view: 'score' as const, collapsed: true } }
    writeNotationPreferences(first, 'song/1', choices)
    expect(readNotationPreferences(first, 'song/1')).toEqual(choices)
    expect(readNotationPreferences(first, 'song/2')).toEqual({})
    expect(readNotationPreferences(second, 'song/1')).toEqual({})
    expect(first.get('cpv:my:song')).toBe('unchanged')
    expect(notationKey('song/1')).toBe('cpv:notation:song%2F1')
  })
})
