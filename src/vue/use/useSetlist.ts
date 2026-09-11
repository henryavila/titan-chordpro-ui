import { computed, ref, type Ref } from 'vue'
import { sheetBpm } from '@henryavila/titan-chordpro-ui'

/** One entry of the rehearsal list, as the host describes it. */
export type SetlistSong = {
  id: string
  title: string
  subtitle?: string
  key?: string
  /** `{tempo:}` when the host already knows it, even without the ChordPro. */
  tempo?: string | number
  /** The ChordPro itself, when the host already has it. */
  source?: string
}

/** `{tempo:72}` from a chart body — enough to label the list without a parse. */
function bpmFromCho(source: string | undefined): string {
  const m = String(source ?? '').match(/\{\s*tempo\s*:\s*([^}]+)\}/i)
  const n = sheetBpm(m?.[1]?.trim())
  return n ? String(n) : ''
}

function bpmLabelOf(song: SetlistSong, cached?: string): string {
  const host = sheetBpm(song.tempo)
  if (host) return String(host)
  return bpmFromCho(song.source ?? cached)
}

export type LoadSong = (id: string, song: SetlistSong) => Promise<string> | string

/** Where a musician left a song: tone, capo, speed and place on the page. */
export type SongSpot = {
  offset: number
  capo: number
  mul: number
  top: number
  u: number
}

export type SetlistOpts = {
  songs: Ref<SetlistSong[] | undefined>
  loadSong: Ref<LoadSong | undefined>
}

/**
 * A rehearsal is a list, not one chart at a time.
 *
 * The host describes the songs; whoever has the ChordPro on hand ships it in
 * `source`, and the rest are asked for through `loadSong` and kept. Two songs
 * turn the mode on — with one, or none, the viewer behaves exactly as it always
 * did, and none of this is on screen.
 *
 * Changing song is not the same as receiving a new chart: tone, capo, speed and
 * place are put down for the song leaving and picked back up for the one
 * arriving, so coming back to something already rehearsed lands where it stopped.
 */
export function useSetlist(opts: SetlistOpts) {
  const index = ref(0)
  const cache = ref<Record<string, string>>({})
  const busy = ref<Record<string, true>>({})
  const failed = ref<Record<string, true>>({})
  const seen = ref<Record<string, true>>({})
  const spots = ref<Record<string, SongSpot>>({})

  const listOpen = ref(false)
  const query = ref('')
  const endOffer = ref(false)

  /** Set by `go`, consumed once by whoever reloads the chart. */
  let pendingRestore: SongSpot | null = null
  /** In-flight ids, kept off reactive state so a race cannot double-fetch. */
  const inFlight = new Set<string>()

  const list = computed<SetlistSong[]>(() => {
    const raw = opts.songs.value
    if (!Array.isArray(raw)) return []
    const out: SetlistSong[] = []
    const used = new Set<string>()
    for (const item of raw) {
      if (!item) continue
      // Two songs under one id would share a personal version and a cache slot.
      let id = String(item.id != null && item.id !== '' ? item.id : item.title || `s${out.length}`)
      while (used.has(id)) id = `${id}~${out.length}`
      used.add(id)
      out.push({
        id,
        title: String(item.title || item.id || 'Sem título'),
        subtitle: item.subtitle ? String(item.subtitle) : '',
        key: item.key ? String(item.key) : '',
        tempo: item.tempo,
        source: typeof item.source === 'string' && item.source.trim() ? item.source : undefined,
      })
    }
    return out
  })

  const on = computed(() => list.value.length > 1)
  const si = computed(() => Math.max(0, Math.min(list.value.length - 1, index.value)))
  const current = computed<SetlistSong | null>(() => list.value[si.value] ?? null)

  /** The ChordPro for the song on screen, or null while it is still missing. */
  const currentSource = computed<string | null>(() => {
    const s = current.value
    if (!s) return null
    const held = cache.value[s.id]
    if (typeof held === 'string') return held
    return s.source ?? null
  })

  const failing = computed(() => {
    const s = current.value
    return on.value && !!s && !!failed.value[s.id] && currentSource.value === null
  })

  function fail(id: string) {
    inFlight.delete(id)
    const b = { ...busy.value }
    delete b[id]
    busy.value = b
    failed.value = { ...failed.value, [id]: true }
  }

  /** Fetch what is missing. Nothing is re-asked while it is already in flight. */
  function ensure(i: number) {
    const s = list.value[i]
    if (!s) return
    const id = s.id
    if (s.source || typeof cache.value[id] === 'string') return
    if (failed.value[id] || inFlight.has(id)) return
    const fn = opts.loadSong.value
    if (typeof fn !== 'function') {
      fail(id)
      return
    }
    inFlight.add(id)
    busy.value = { ...busy.value, [id]: true }
    Promise.resolve()
      .then(() => fn(id, s))
      .then((text) => {
        if (typeof text !== 'string' || !text.trim()) throw new Error('empty')
        inFlight.delete(id)
        cache.value = { ...cache.value, [id]: text }
        const b = { ...busy.value }
        delete b[id]
        busy.value = b
        const f = { ...failed.value }
        delete f[id]
        failed.value = f
      })
      .catch(() => fail(id))
  }

  /** The one on screen and its neighbours: changing song cannot wait on a network. */
  function prefetch() {
    if (!on.value) return
    ensure(si.value)
    ensure(si.value + 1)
    ensure(si.value - 1)
  }

  function retry() {
    const s = current.value
    if (!s) return
    const f = { ...failed.value }
    delete f[s.id]
    failed.value = f
    prefetch()
  }

  function go(i: number, leaving: SongSpot) {
    const l = list.value
    if (l.length < 2) return
    const next = Math.max(0, Math.min(l.length - 1, i))
    const from = l[si.value]
    if (next === si.value) {
      listOpen.value = false
      query.value = ''
      return
    }
    const to = l[next]
    if (from) spots.value = { ...spots.value, [from.id]: leaving }
    const s = { ...seen.value }
    if (from) s[from.id] = true
    if (to) s[to.id] = true
    seen.value = s
    pendingRestore = (to && spots.value[to.id]) || null
    index.value = next
    listOpen.value = false
    query.value = ''
    endOffer.value = false
    prefetch()
  }

  /** Handed over exactly once, to whoever is reloading the chart right now. */
  function takeRestore(): SongSpot | null {
    const r = pendingRestore
    pendingRestore = null
    return r
  }

  const matches = (s: SetlistSong, q: string) =>
    s.title.toLowerCase().includes(q) || (s.subtitle ?? '').toLowerCase().includes(q)

  /** Search earns its place only once the list is too long to scan. */
  const showSearch = computed(() => list.value.length > 10)
  const items = computed(() => {
    const q = query.value.trim().toLowerCase()
    return list.value
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !q || matches(s, q))
      .map(({ s, i }) => ({
        i,
        id: s.id,
        num: String(i + 1).padStart(2, '0'),
        title: s.title,
        sub: s.subtitle ?? '',
        keyLabel: s.key ?? '',
        hasKey: !!s.key,
        bpmLabel: bpmLabelOf(s, cache.value[s.id]),
        current: i === si.value,
        failed: !!failed.value[s.id] && !s.source && typeof cache.value[s.id] !== 'string',
        busy: !!busy.value[s.id],
        seen: !!seen.value[s.id] && i !== si.value,
      }))
  })
  const noHit = computed(() => {
    const q = query.value.trim().toLowerCase()
    return !!q && !list.value.some((s) => matches(s, q))
  })

  const posLabel = computed(() => `${si.value + 1}/${list.value.length}`)
  const noPrev = computed(() => si.value <= 0)
  const noNext = computed(() => si.value >= list.value.length - 1)
  const nextTitle = computed(() => list.value[si.value + 1]?.title ?? '')
  const nextChip = computed(() => (nextTitle.value ? `Próxima · ${nextTitle.value}` : 'Última da lista'))
  const nextChipShort = computed(() => (nextTitle.value ? `Próx. ${nextTitle.value}` : 'Última'))
  const headLabel = computed(() => `${list.value.length} músicas`)
  const seenLabel = computed(() => {
    const c = list.value.filter((s) => seen.value[s.id]).length
    return c ? `${c} já passamos` : 'nenhuma ainda'
  })

  function open() {
    listOpen.value = true
    query.value = ''
  }
  function close() {
    listOpen.value = false
    query.value = ''
  }
  /** The song ended: offer the next one instead of taking the decision. */
  function offerNext() {
    if (on.value && si.value < list.value.length - 1) endOffer.value = true
  }
  function dismissEnd() {
    endOffer.value = false
  }

  return {
    list, on, si, current, currentSource, failing,
    listOpen, query, endOffer,
    items, noHit, showSearch,
    posLabel, noPrev, noNext, nextTitle, nextChip, nextChipShort, headLabel, seenLabel,
    go, prefetch, retry, takeRestore, open, close, offerNext, dismissEnd,
  }
}
