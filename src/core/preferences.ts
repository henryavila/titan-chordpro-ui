import type { ChartBlock, Lens, ThemeId } from './types'
import { isTabRhythm, readScoreReference, type TabRhythm } from './score-reference'
import { STORE_KEYS, type ChartStore } from './storage'

/** Device/account reading choices. Chart text and suggestions never live here. */
export type UserPreferences = {
  theme?: ThemeId
  bias?: number
  fit?: boolean
  metSound?: boolean
  metStrumSound?: boolean
  metPulseHead?: boolean
  metFollow?: boolean
  metCountIn?: boolean
  lens?: Lens
  hideComments?: boolean
  diagramInstrument?: 'guitar' | 'ukulele' | 'piano'
  tabRhythm?: TabRhythm
  noteNames?: boolean
  /** Last reading was the whole-song staff, when that song has one. */
  partitura?: boolean
}

const themes = new Set(['light', 'dark', 'auto', 'print', 'default', 'stage'])
const lenses = new Set(['none', 'nashville', 'letra'])
const instruments = new Set(['guitar', 'ukulele', 'piano'])
const booleanFields = ['fit', 'metSound', 'metStrumSound', 'metPulseHead', 'metFollow', 'metCountIn', 'hideComments', 'noteNames', 'partitura'] as const

export function readUserPreferences(store: ChartStore): UserPreferences {
  let raw: unknown
  try { raw = JSON.parse(store.get(STORE_KEYS.prefs) ?? '{}') } catch { return {} }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const p = raw as Record<string, unknown>
  const out: UserPreferences = {}
  if (themes.has(String(p.theme))) out.theme = p.theme as ThemeId
  if (typeof p.bias === 'number' && Number.isFinite(p.bias)) out.bias = p.bias
  for (const key of booleanFields) if (typeof p[key] === 'boolean') out[key] = p[key]
  if (lenses.has(String(p.lens))) out.lens = p.lens as Lens
  if (instruments.has(String(p.diagramInstrument))) out.diagramInstrument = p.diagramInstrument as UserPreferences['diagramInstrument']
  if (isTabRhythm(p.tabRhythm)) out.tabRhythm = p.tabRhythm
  return out
}

export function updateUserPreferences(store: ChartStore, patch: Partial<UserPreferences>): UserPreferences {
  const next = { ...readUserPreferences(store), ...patch }
  for (const key of Object.keys(next) as Array<keyof UserPreferences>) if (next[key] === undefined) delete next[key]
  try {
    if (Object.keys(next).length) store.set(STORE_KEYS.prefs, JSON.stringify(next))
    else store.remove(STORE_KEYS.prefs)
  } catch { /* current reactive state remains usable when storage is denied */ }
  return next
}

export type NotationChoice = { view?: 'tab' | 'score'; collapsed?: boolean }
export type NotationPreferences = Record<string, NotationChoice>

export function notationKey(songId: string): string {
  return `${STORE_KEYS.notationPrefix}${encodeURIComponent(songId)}`
}

/** Stable across line insertions and display-only changes to a score directive. */
export function notationBlockIds(blocks: readonly ChartBlock[]): Array<string | null> {
  const seen = new Map<string, number>()
  return blocks.map(block => {
    let identity: string
    if (block.kind === 'score') {
      let ref: ReturnType<typeof readScoreReference> = null
      try { ref = readScoreReference(block.text) } catch { /* inline or invalid score */ }
      identity = ref
        ? JSON.stringify(['score', ref.src, ref.track, ref.start, ref.end ?? null])
        : JSON.stringify(['score-inline', block.text])
    } else if (block.kind === 'tab') identity = JSON.stringify(['tab', block.text])
    else if (block.kind === 'image') identity = JSON.stringify(['image', block.src])
    else return null
    const occurrence = seen.get(identity) ?? 0
    seen.set(identity, occurrence + 1)
    return `${identity}#${occurrence}`
  })
}

export function readNotationPreferences(store: ChartStore, songId: string): NotationPreferences {
  let raw: unknown
  try { raw = JSON.parse(store.get(notationKey(songId)) ?? '{}') } catch { return {} }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: NotationPreferences = {}
  for (const [id, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const v = value as Record<string, unknown>
    const choice: NotationChoice = {}
    if (v.view === 'tab' || v.view === 'score') choice.view = v.view
    if (typeof v.collapsed === 'boolean') choice.collapsed = v.collapsed
    if (Object.keys(choice).length) out[id] = choice
  }
  return out
}

export function writeNotationPreferences(store: ChartStore, songId: string, choices: NotationPreferences): void {
  try {
    if (Object.keys(choices).length) store.set(notationKey(songId), JSON.stringify(choices))
    else store.remove(notationKey(songId))
  } catch { /* keep this session's choices */ }
}
