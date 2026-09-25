/**
 * Where the viewer's state is kept between visits.
 *
 * The component owns every behaviour built on this — the personal overlay, the
 * suggestion queue, the per-song tempo, the reading preferences. It does not
 * own the storage those behaviours land in: a host embedding the viewer may
 * want them on the device, on the user's account, or nowhere at all. So the
 * package writes through this seam and the consumer decides the destination.
 *
 * The calls are synchronous on purpose. A host that persists to a server does
 * the round trip behind `set` and answers from its own cache: the reading
 * surface can never block on the network mid-rehearsal, and the suggestion
 * flow is fire-and-forget by design (SPEC §6 — the musician sees "sent" and
 * nothing else, no status and no acceptance notice).
 */
export type ChartStore = {
  /** The stored string, or `null` when nothing was ever written. */
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

/** Every key the package writes, so a host can route or namespace them. */
export const STORE_KEYS = {
  /** Reading preferences: theme, type bias, fit mode, metronome toggles. */
  prefs: 'cpv:prefs',
  /** `"1"` once the fit-mode hint has actually been seen. */
  fitSeen: 'cpv:fitSeen',
  /** `"1"` once the three touch rules of the editor have been shown. */
  editSeen: 'cpv:editSeen',
  /** Manual tempo per song, so one chart's BPM never leaks into the next. */
  bpm: 'cpv:bpm',
  /** Suggestions waiting for whoever owns the chart. */
  suggestions: 'cpv:sug',
  /** Last display name typed when sending a suggestion. */
  actorName: 'cpv:actor-name',
  /** Prefix of the reader's personal version: `cpv:my:{songId}:{chartId}`. */
  overlayPrefix: 'cpv:my:',
} as const

/**
 * Chart slot on the overlay key. An omitted id and `default` are one slot —
 * the implicit chart of a file with no envelope.
 */
function overlayChartId(chartId?: string): string {
  const id = String(chartId ?? '').trim()
  return id && id !== 'default' ? id : 'default'
}

/**
 * A colon would make this component look like the key separator.
 * A percent would look like an encoded colon. Ids with neither stay literal —
 * encoding them would move an existing slot.
 */
function overlayPart(id: string): string {
  return id.includes(':') || id.includes('%') ? encodeURIComponent(id) : id
}

/** The key a given chart's personal version is stored under. */
export function overlayKey(songId: string, chartId?: string): string {
  return `${STORE_KEYS.overlayPrefix}${overlayPart(songId)}:${overlayPart(overlayChartId(chartId))}`
}

/** `cpv:my:{songId}` before chart slots, with the same song encoding as `overlayKey`. */
export function songLegacyKey(songId: string): string {
  return `${STORE_KEYS.overlayPrefix}${overlayPart(songId)}`
}

/**
 * The default: `localStorage`, and silence when it is denied. Storage refused
 * by a private window or a blocked third-party frame is a lost convenience,
 * never a failure the reader should be told about. Nothing is touched until a
 * method is called, so importing the package is safe on a server.
 */
export function browserStore(): ChartStore {
  return {
    get(key) {
      try {
        return localStorage.getItem(key)
      } catch {
        return null
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value)
      } catch {
        /* storage denied — this session keeps the value, the next one will not */
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key)
      } catch {
        /* storage denied */
      }
    },
  }
}

/** A store that forgets on reload: server rendering, tests, kiosk mode. */
export function memoryStore(seed: Record<string, string> = {}): ChartStore {
  const map = new Map(Object.entries(seed))
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value)
    },
    remove: (key) => {
      map.delete(key)
    },
  }
}

/** Reads JSON through a store, falling back on anything unreadable. */
export function readJson<T>(store: ChartStore, key: string, fallback: T): T {
  try {
    const raw = store.get(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** Writes JSON through a store; a host that throws is never the reader's problem. */
export function writeJson(store: ChartStore, key: string, value: unknown): void {
  try {
    store.set(key, JSON.stringify(value))
  } catch {
    /* the host's own failure stays with the host */
  }
}
