import { inject, ref, type InjectionKey } from 'vue'
import { browserStore, readUserPreferences, updateUserPreferences, type ChartStore } from '@henryavila/titan-chordpro-ui'

export function createNoteNamesPreference(store: ChartStore) {
  const value = ref(readUserPreferences(store).noteNames ?? false)
  function set(next: boolean) {
    value.value = next
    updateUserPreferences(store, { noteNames: next })
  }
  return { value, set }
}

export const noteNamesKey: InjectionKey<ReturnType<typeof createNoteNamesPreference>> = Symbol('note-names')
export function useNoteNames() {
  return inject(noteNamesKey, undefined) ?? createNoteNamesPreference(browserStore())
}
