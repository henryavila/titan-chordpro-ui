import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import { memoryStore, STORE_KEYS } from '../../src/core'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

const mounted: ReturnType<typeof mount>[] = []
afterEach(() => { mounted.splice(0).forEach(w => w.unmount()); vi.restoreAllMocks() })
function viewer(props = {}) {
  const w = mount(ChordproViewer, { props: { source: loadFixture(JESUS_1), autoHide: false, storage: memoryStore(), ...props }, attachTo: document.body })
  mounted.push(w)
  return w
}
const appearance = (w: ReturnType<typeof viewer>) => w.get('[data-cpv-root]').attributes('data-theme')

for (const dark of [true, false]) {
  describe(`system ${dark ? 'dark' : 'light'}`, () => {
    function system() {
      vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: dark, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList)
    }
    it('keeps auto standalone and uses theme as fallback until a preference exists', async () => {
      system()
      const w = viewer()
      expect(appearance(w)).toBe(dark ? 'dark' : 'light')
      await w.setProps({ theme: 'light' })
      expect(appearance(w)).toBe('light')
      await w.get('[data-theme-btn]').trigger('click')
      expect(appearance(w)).toBe('dark')
      await w.setProps({ theme: 'light' })
      expect(appearance(w)).toBe('dark')
    })
    it('host prop wins saved preference; requests do not change it or storage', async () => {
      system()
      const storage = memoryStore()
      const saved = JSON.stringify({ theme: 'dark', bias: 1, futurePreference: 'keep' })
      storage.set(STORE_KEYS.prefs, saved)
      const w = viewer({ theme: 'light', themeControl: 'host', storage })
      await flushPromises()
      expect(appearance(w)).toBe('light')
      await w.get('[data-theme-btn]').trigger('click')
      expect(w.emitted('update:theme')).toEqual([['dark']])
      expect(appearance(w)).toBe('light')
      await w.setProps({ theme: 'auto' })
      expect(appearance(w)).toBe(dark ? 'dark' : 'light')
      await w.setProps({ theme: 'dark' })
      expect(appearance(w)).toBe('dark')
      await w.setProps({ theme: 'light', themeControl: 'preference' })
      expect(appearance(w)).toBe('dark')
      expect(JSON.parse(storage.get(STORE_KEYS.prefs)!)).toMatchObject({ theme: 'dark', futurePreference: 'keep' })
    })
    it('host without prefs returns to current prop fallback and does not persist requests', async () => {
      system()
      const storage = memoryStore()
      const w = viewer({ theme: 'light', themeControl: 'host', storage })
      await w.get('[data-theme-btn]').trigger('click')
      expect(storage.get(STORE_KEYS.prefs)).toBeNull()
      await w.setProps({ theme: 'auto', themeControl: 'preference' })
      expect(appearance(w)).toBe(dark ? 'dark' : 'light')
    })
  })
}

it('host keyboard request follows the same policy and preserves other preference keys', async () => {
  const storage = memoryStore()
  storage.set(STORE_KEYS.prefs, JSON.stringify({ theme: 'stage', futurePreference: 42 }))
  const w = viewer({ theme: 'light', themeControl: 'host', storage })
  await w.get('[data-cpv-root]').trigger('keydown', { key: 't' })
  expect(w.emitted('update:theme')).toEqual([['dark']])
  expect(appearance(w)).toBe('light')
  await w.get('[data-cpv-root]').trigger('keydown', { key: 'a' })
  await flushPromises()
  expect(JSON.parse(storage.get(STORE_KEYS.prefs)!)).toMatchObject({ theme: 'stage', futurePreference: 42, fit: true })
})


it('repairs malformed preferences when the musician makes a new choice', async () => {
  const storage = memoryStore()
  storage.set(STORE_KEYS.prefs, '{')
  const w = viewer({ theme: 'light', storage })
  await w.get('[data-theme-btn]').trigger('click')
  await w.get('[data-cpv-root]').trigger('keydown', { key: 'a' })
  await flushPromises()
  expect(JSON.parse(storage.get(STORE_KEYS.prefs)!)).toMatchObject({ theme: 'dark', fit: true })
})
