import { inject, ref, type InjectionKey } from 'vue'
import { browserStore, isTabRhythm, STORE_KEYS, type ChartStore, type TabRhythm } from '@henryavila/titan-chordpro-ui'

export const TAB_RHYTHM_OPTIONS = [
  { value: 'extended', label: 'Ritmo estendido' },
  { value: 'base', label: 'Ritmo na base' },
  { value: 'none', label: 'Sem ritmo' },
]
export function createTabRhythmPreference(store: ChartStore) {
  const value = ref<TabRhythm | undefined>()
  try { const saved = store.get(STORE_KEYS.tabRhythm); if (isTabRhythm(saved)) value.value = saved } catch { /* unavailable */ }
  function set(next: string | number) {
    value.value = isTabRhythm(next) ? next : undefined
    try {
      if (value.value) store.set(STORE_KEYS.tabRhythm, value.value)
      else store.remove(STORE_KEYS.tabRhythm)
    } catch { /* keep the session preference */ }
  }
  return { value, set }
}
export const tabRhythmKey: InjectionKey<ReturnType<typeof createTabRhythmPreference>> = Symbol('tab-rhythm')
export function useTabRhythm() {
  return inject(tabRhythmKey, undefined) ?? createTabRhythmPreference(browserStore())
}
