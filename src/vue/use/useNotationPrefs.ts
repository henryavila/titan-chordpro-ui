import { ref, watch, type Ref } from 'vue'
import {
  readNotationPreferences,
  writeNotationPreferences,
  type ChartStore,
  type NotationPreferences,
} from '@henryavila/titan-chordpro-ui'

export type NotationChoicePatch = { view?: 'tab' | 'score'; collapsed?: boolean }

/** This reader's tab/score fold, keyed by song and notation block. */
export function useNotationPrefs(store: ChartStore, songId: Ref<string>) {
  const choices = ref<NotationPreferences>({})

  function save(id: string, patch: NotationChoicePatch) {
    const current = choices.value[id] ?? {}
    const next = { ...current, ...patch }
    const all = { ...choices.value }
    if (next.view === undefined && next.collapsed !== true) delete all[id]
    else all[id] = next
    choices.value = all
    writeNotationPreferences(store, songId.value, all)
  }

  watch(songId, (id) => {
    choices.value = readNotationPreferences(store, id)
  }, { immediate: true })

  return { choices, save }
}
