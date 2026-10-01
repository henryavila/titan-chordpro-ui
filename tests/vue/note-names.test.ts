import { describe, expect, it } from 'vitest'
import { memoryStore, STORE_KEYS } from '../../src/core'
import { createNoteNamesPreference } from '../../src/vue/use/useNoteNames'

describe('musical note names preference', () => {
  it('persists on the device without changing the song or TAB rhythm', () => {
    const store = memoryStore({ 'cpv:my:song': 'unchanged source', [STORE_KEYS.prefs]: JSON.stringify({ tabRhythm: 'base' }) })
    const preference = createNoteNamesPreference(store)
    expect(preference.value.value).toBe(false)
    preference.set(true)
    expect(createNoteNamesPreference(store).value.value).toBe(true)
    expect(JSON.parse(store.get(STORE_KEYS.prefs)!)).toEqual({ tabRhythm: 'base', noteNames: true })
    expect(store.get('cpv:my:song')).toBe('unchanged source')
    preference.set(false)
    expect(createNoteNamesPreference(store).value.value).toBe(false)
  })
})
