import { inject, ref, type InjectionKey } from 'vue'
import { browserStore, isTabRhythm, readUserPreferences, updateUserPreferences, type ChartStore, type TabRhythm } from '@henryavila/titan-chordpro-ui'

export const TAB_RHYTHM_OPTIONS = [
  { value: 'extended', label: 'Ritmo estendido' },
  { value: 'base', label: 'Ritmo na base' },
  { value: 'none', label: 'Sem ritmo' },
]
export function createTabRhythmPreference(store: ChartStore) {
  const value = ref<TabRhythm | undefined>()
  value.value = readUserPreferences(store).tabRhythm
  function set(next: string | number) {
    value.value = isTabRhythm(next) ? next : undefined
    updateUserPreferences(store, { tabRhythm: value.value })
  }
  return { value, set }
}
export const tabRhythmKey: InjectionKey<ReturnType<typeof createTabRhythmPreference>> = Symbol('tab-rhythm')
export function useTabRhythm() {
  return inject(tabRhythmKey, undefined) ?? createTabRhythmPreference(browserStore())
}
