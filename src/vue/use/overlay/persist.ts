import {
  absorbInto,
  checkUpdate,
  isTuneOp,
  STORE_KEYS,
  readStoredJson as readStored,
  writeStoredJson as writeStored,
} from '@henryavila/titan-chordpro-ui'
import type { ChartStore, Overlay, Suggestion, TuneOp } from '@henryavila/titan-chordpro-ui'

export type UpdatePlan = NonNullable<ReturnType<typeof checkUpdate>>

export function readActorName(store: ChartStore): string {
  return String(readStored<string>(store, STORE_KEYS.actorName, '') || '').trim()
}

export function saveActorName(store: ChartStore, name: string): void {
  writeStored(store, STORE_KEYS.actorName, name)
}

export function normalizeSug(s: Suggestion): Suggestion {
  return {
    ...s,
    status: s.status ?? 'pending',
    resolvedOps: s.resolvedOps ?? [],
    ops: s.ops ?? [],
  }
}

export function normalizeSuggestionList(list: Suggestion[]): Suggestion[] {
  return list.map(normalizeSug)
}

/** `injected === undefined` means the host did not pass a queue; read the store. */
export function readSuggestionList(
  store: ChartStore,
  injected: Suggestion[] | undefined,
  mirror: Suggestion[] | null,
): Suggestion[] {
  if (injected !== undefined) return (mirror ?? injected).map(normalizeSug)
  return readStored<Suggestion[]>(store, STORE_KEYS.suggestions, []).map(normalizeSug)
}

export function writeStoredSuggestions(store: ChartStore, list: Suggestion[]): void {
  writeStored(store, STORE_KEYS.suggestions, list.map(normalizeSug))
}

export function notifySuggestionQueue(
  onQueue: ((q: Suggestion[]) => void) | undefined,
  list: Suggestion[],
): void {
  try {
    onQueue?.(list)
  } catch {
    /* host failure stays with the host */
  }
}

/**
 * Denied or failing storage is not the reader's problem: the overlay stays
 * live for this session either way. Empty ops are the caller's decision.
 */
export function putOverlayValue(store: ChartStore, key: string, next: Overlay | null): Overlay | null {
  if (next) writeStored(store, key, next)
  else {
    try {
      store.remove(key)
    } catch {
      /* the host's own failure stays with the host */
    }
  }
  return next
}

export function saveOverlayValue(store: ChartStore, key: string, next: Overlay | null): Overlay | null {
  const keep = next && next.ops.length ? next : null
  return putOverlayValue(store, key, keep)
}

export type LoadChartOverlayDeps = {
  store: ChartStore
  key: string
  /** Key at each write. A read uses `key`; a write asks again, as the closure did. */
  keyNow: () => string
  base: string
  version: string
  setOverlay: (next: Overlay | null) => void
  setUpdate: (next: UpdatePlan | null) => void
  setShowOriginal: (next: boolean) => void
  toast: (msg: string) => void
}

/**
 * Reading a chart: adopt what was stored, drop what the official text has
 * since absorbed, and ask before reapplying anything onto a new version.
 */
export function loadChartOverlay(deps: LoadChartOverlayDeps): TuneOp | null {
  let ov = readStored<Overlay | null>(deps.store, deps.key, null)
  if (!ov || !Array.isArray(ov.ops) || !ov.ops.length) ov = null
  const base = deps.base

  const abs = absorbInto(ov, base, deps.version)
  if (abs.absorbed) ov = putOverlayValue(deps.store, deps.keyNow(), abs.overlay)

  const upd = checkUpdate(ov, base, deps.version)
  // Nothing of ours moved: silently follow the new version.
  if (!upd && ov && ov.baseVersion !== deps.version) {
    ov = putOverlayValue(deps.store, deps.keyNow(), { ...ov, baseVersion: deps.version })
  }
  deps.setOverlay(ov)
  deps.setUpdate(upd)
  deps.setShowOriginal(false)

  if (abs.absorbed && !upd) {
    const n = abs.absorbed
    window.setTimeout(
      () =>
        deps.toast(
          n === 1 ? 'Um dos seus ajustes virou oficial' : `${n} dos seus ajustes viraram oficiais`,
        ),
      30,
    )
  }
  return (ov?.ops.find(isTuneOp) as TuneOp | undefined) ?? null
}

export function applyOfficial(deps: {
  text: string
  reconcile: boolean
  setSrc: (text: string) => void
  setVersion: (version: string) => void
  onSaveContent?: (text: string) => void
  reload: () => void
  onBaseChange: () => void
}): void {
  deps.setSrc(deps.text)
  deps.setVersion(`v${Date.now().toString(36)}`)
  if (deps.onSaveContent) {
    try {
      deps.onSaveContent(deps.text)
    } catch {
      /* the host's own failure is not the reader's problem */
    }
  }
  // A save from inside the editor keeps the draft: only a change that came
  // from elsewhere re-reads what the reader still holds over it.
  if (deps.reconcile) deps.reload()
  deps.onBaseChange()
}
