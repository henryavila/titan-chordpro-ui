import { describe, expect, it } from 'vitest'
import { memoryStore, STORE_KEYS } from '../../src/core'
import { createTabRhythmPreference } from '../../src/vue/use/useTabRhythm'

describe('personal TAB presentation', () => {
  it('persists separately from edits and lets a host isolate accounts', () => {
    const first = memoryStore({ 'cpv:my:song': 'unchanged source' })
    const second = memoryStore()
    const pref = createTabRhythmPreference(first)
    expect(pref.value.value).toBeUndefined()
    pref.set('base')
    expect(createTabRhythmPreference(first).value.value).toBe('base')
    expect(createTabRhythmPreference(second).value.value).toBeUndefined()
    expect(first.get('cpv:my:song')).toBe('unchanged source')
    pref.set('default')
    expect(JSON.parse(first.get(STORE_KEYS.prefs) ?? '{}')).not.toHaveProperty('tabRhythm')
  })
  it('ignores corrupt data and retains the preference when storage is denied', () => {
    expect(createTabRhythmPreference(memoryStore({ [STORE_KEYS.prefs]: JSON.stringify({ tabRhythm: 'invalid' }) })).value.value).toBeUndefined()
    const fail = () => { throw new Error('denied') }
    const pref = createTabRhythmPreference({ get: fail, set: fail, remove: fail })
    pref.set('none')
    expect(pref.value.value).toBe('none')
    pref.set('default')
    expect(pref.value.value).toBeUndefined()
  })
})
