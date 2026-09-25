import { computed, ref, watch, type Ref } from 'vue'
import {
  absorbInto,
  applyOps,
  checkUpdate,
  diffOps,
  isTuneOp,
  opCtxNote,
  opLabel,
  hasChartEnvelope,
  listCharts,
  overlaid,
  overlayKey,
  songLegacyKey,
  parse,
  replaceChart,
  STORE_KEYS,
  strumReviewFromOp,
  tuneText,
  readStrumPatterns,
  readStoredJson as readStored,
  writeStoredJson as writeStored,
  ChartEnvelopeError,
} from '@henryavila/titan-chordpro-ui'
import type {
  ChartStore,
  Overlay,
  OverlayOp,
  ReadingCtx,
  ResolvedOp,
  StrumReview,
  Suggestion,
  SuggestionStatus,
  TuneOp,
} from '@henryavila/titan-chordpro-ui'
import type { WriteMode } from '../public'

export type { ModesProp, WriteMode } from '../public'

export type OverlayOpts = {
  songId: Ref<string>
  version: Ref<string>
  /** The chart as the host handed it. */
  hostSource: Ref<string>
  /**
   * Chart on screen. Absent: the file's default chart. An id the file does
   * not contain is ignored, so a half-typed marker cannot move the overlay.
   */
  chartId?: Ref<string | undefined>
  title: Ref<string>
  /** Sending suggestions is a host capability, not a reader preference. */
  suggestions: Ref<boolean>
  actorKey?: Ref<string | undefined>
  /** Optional host-prefilled display name for suggestions. */
  actorName?: Ref<string | undefined>
  /** Full queue mirror from the host; when set, wins over ChartStore for reads. */
  suggestionQueue?: Ref<Suggestion[] | undefined>
  toast: (msg: string) => void
  /** Where the overlay and the queue are kept — the host's call, not ours. */
  store: ChartStore
  /** The base text changed under the reader: the editor has to re-baseline. */
  onBaseChange: () => void
  onSaveContent?: (text: string) => void
  onSuggestionCreated?: (s: Suggestion) => void
  /**
   * Host persist, read at send time. Must return the POST Promise:
   * resolve → enqueue + toast enviada + emit;
   * reject or a void return → keep the overlay, toast retry, nothing queued.
   */
  persistSuggestion?: Ref<((s: Suggestion) => Promise<void>) | undefined>
  onSuggestionAccepted?: (p: {
    id: string
    songId: string
    opIds: string[]
    status: SuggestionStatus
    officialText: string
  }) => void
  onSuggestionRefused?: (p: {
    id: string
    songId: string
    opIds: string[]
    status: SuggestionStatus
  }) => void
  onSuggestionQueue?: (q: Suggestion[]) => void
}

export type OpCard = {
  id: string
  label: string
  note: string
  from: string
  to: string
}

export type UpdCard = {
  id: string
  label: string
  on: boolean
  conflict: boolean
  why: string
  mine: string
  theirs: string
}

export type QueueRow = { key: string; label: string; hint: string; actor?: string }
export type QueueOpCard = OpCard & { fits: boolean; warn: string; strum: StrumReview | null }

type UpdatePlan = NonNullable<ReturnType<typeof checkUpdate>>

const SUG_KEY = STORE_KEYS.suggestions

/**
 * The reader's own version of a chart, and the queue of adjustments they can
 * send to whoever owns it. Storage is the phone: an overlay never travels
 * unless the musician asks for it.
 */
export function useOverlay(opts: OverlayOpts) {
  /** Every read in here goes through the host's store, never the browser's. */
  const readJson = <T,>(key: string, fallback: T): T => readStored(opts.store, key, fallback)

  const overlay = ref<Overlay | null>(null)
  const showOriginal = ref(false)
  const myPanel = ref(false)
  const updDlg = ref<UpdatePlan | null>(null)
  /** Bumped on every write to the suggestion store, so the lists recompute. */
  const sugTick = ref(0)
  const officialSrc = ref<string | null>(null)
  const officialV = ref<string | null>(null)
  const exportOrig = ref(false)
  const confirmRevert = ref(false)
  const confirmSuggest = ref(false)
  const sending = ref(false)
  const nameNeeded = ref(false)
  const actorName = ref(
    String(opts.actorName?.value ?? '').trim() ||
      String(readJson<string>(STORE_KEYS.actorName, '') || '').trim(),
  )
  watch(actorName, (v) => {
    if (String(v).trim()) nameNeeded.value = false
  })
  const route = ref<'song' | 'queue'>('song')
  const qSong = ref<string | null>(null)
  const qSug = ref<string | null>(null)
  let revertT = 0
  let suggestT = 0

  // Official = what the consumer's database holds: the host source until a
  // "for everyone" save takes over from here on.
  const official = computed(() => officialSrc.value ?? opts.hostSource.value ?? '')
  const officialVersion = computed(() => officialV.value || opts.version.value || 'v1')
  /** The chart whose overlay this screen reads. Implicit files use `default`. */
  const chartSlot = computed(() => activeChartId(official.value))
  const ovKey = computed(() => overlayKey(opts.songId.value, chartSlot.value))

  function activeChartId(file: string): string {
    const requested = String(opts.chartId?.value ?? '').trim()
    try {
      const charts = listCharts(file)
      if (requested && charts.some((c) => c.id === requested)) return requested
      return charts.find((c) => c.isDefault)?.id || 'default'
    } catch (err) {
      if (err instanceof ChartEnvelopeError) return requested || 'default'
      throw err
    }
  }

  /**
   * `cpv:my:{songId}` — the pre-chart key. It is the whole file, and only a
   * file with no chart envelope. A block whose id is `default` is not this key.
   * Colon and percent use the same encoding as `overlayKey`; anything else stays literal.
   */
  function legacyKey(): string {
    return songLegacyKey(opts.songId.value)
  }

  /** No chart blocks. A thrown envelope is not this case. */
  function plainFile(file: string): boolean {
    try {
      return !hasChartEnvelope(file)
    } catch (err) {
      if (err instanceof ChartEnvelopeError) return false
      throw err
    }
  }

  /** The id is a chart of this file. No envelope: only `default`. */
  function chartInFile(file: string, chartId: string): boolean {
    try {
      return listCharts(file).some((c) => c.id === chartId)
    } catch (err) {
      if (err instanceof ChartEnvelopeError) return false
      throw err
    }
  }

  /** The chart document `parse` numbers. Ops never anchor on a sibling. */
  function chartText(file: string, chartId: string): string {
    try {
      return parse(file, { chartId }).source
    } catch (err) {
      if (err instanceof ChartEnvelopeError) return file
      throw err
    }
  }

  /**
   * Splice one chart back. An unchanged document does not rewrite the file.
   * A broken envelope cannot be spliced: the original file stays, so the
   * viewer can show its own message instead of throwing out of the source watch.
   */
  function fileWithChart(file: string, chartId: string, doc: string): string {
    if (doc === chartText(file, chartId)) return file
    try {
      return replaceChart(file, chartId, doc)
    } catch (err) {
      if (err instanceof ChartEnvelopeError) return file
      throw err
    }
  }

  function sugChartId(s: Suggestion): string {
    const id = String(s.chartId ?? '').trim()
    return id || 'default'
  }

  /**
   * No chartId is a pre-envelope whole-file suggestion. It applies only when
   * this file has no envelope — not when a block happens to be named `default`.
   * Another song's ops never apply to the chart on screen.
   */
  function sugApplies(file: string, s: Suggestion): boolean {
    if (s.songId !== opts.songId.value) return false
    const id = String(s.chartId ?? '').trim()
    if (!id) return plainFile(file)
    return chartInFile(file, id)
  }

  /** One queue row per chart, not per song. The separator cannot appear in a chart id. */
  function queueGroupKey(s: Suggestion): string {
    return `${s.songId}\u001f${sugChartId(s)}`
  }

  function chartLabelOf(chartId: string): string {
    try {
      const hit = listCharts(official.value).find((c) => c.id === chartId)
      if (hit?.label) return hit.label
    } catch (err) {
      if (!(err instanceof ChartEnvelopeError)) throw err
    }
    return chartId
  }

  const applied = computed(() => overlaid(chartText(official.value, chartSlot.value), overlay.value))
  /** Line index → id of the op that put it there, in the text being read. */
  const mineLines = computed(() => (showOriginal.value ? null : applied.value.mine))
  const ovFailedCount = computed(() => (showOriginal.value ? 0 : applied.value.failed.length))
  const hasOverlay = computed(() => !!overlay.value?.ops.length)
  const mineCount = computed(() => overlay.value?.ops.length ?? 0)
  const mineLabel = computed(
    () => `Minha versão · ${mineCount.value} ${mineCount.value === 1 ? 'ajuste' : 'ajustes'}`,
  )

  /**
   * The screen's base: "for everyone" and reading the original see the raw
   * official text; reading and local editing see it with the overlay applied.
   */
  function baseFor(wMode: WriteMode | null): string {
    if (wMode === 'persisted' || showOriginal.value) return official.value
    return fileWithChart(official.value, chartSlot.value, applied.value.text)
  }

  function putOverlay(next: Overlay | null): Overlay | null {
    // Denied or failing storage is not the reader's problem: the overlay stays
    // live for this session either way. The unsuffixed key is removed only
    // after the new key reads back the JSON just written.
    let retireLegacy = next == null
    if (next) {
      try {
        const payload = JSON.stringify(next)
        opts.store.set(ovKey.value, payload)
        retireLegacy = opts.store.get(ovKey.value) === payload
      } catch {
        retireLegacy = false
      }
    } else {
      try {
        opts.store.remove(ovKey.value)
      } catch {
        /* the host's own failure stays with the host */
      }
    }
    if (retireLegacy && plainFile(official.value)) {
      const legacy = legacyKey()
      if (legacy !== ovKey.value) {
        try {
          opts.store.remove(legacy)
        } catch {
          /* the host's own failure stays with the host */
        }
      }
    }
    return next
  }

  function saveOverlay(next: Overlay | null) {
    const keep = next && next.ops.length ? next : null
    putOverlay(keep)
    overlay.value = keep
    opts.onBaseChange()
  }

  /**
   * Reading a chart: adopt what was stored, drop what the official text has
   * since absorbed, and ask before reapplying anything onto a new version.
   */
  function storedOverlay(key: string): Overlay | null {
    const ov = readJson<Overlay | null>(key, null)
    if (!ov || !Array.isArray(ov.ops) || !ov.ops.length) return null
    return ov
  }

  function load(): TuneOp | null {
    let ov = storedOverlay(ovKey.value)
    // `cpv:my:{songId}` is the old whole-file key. Adopt it only when this
    // file has no chart envelope — never onto a block named `default`.
    if (!ov && plainFile(official.value)) {
      const legacy = legacyKey()
      if (legacy !== ovKey.value) ov = storedOverlay(legacy)
    }
    const base = chartText(official.value, chartSlot.value)

    const abs = absorbInto(ov, base, officialVersion.value)
    if (abs.absorbed) ov = putOverlay(abs.overlay)

    const upd = checkUpdate(ov, base, officialVersion.value)
    // Nothing of ours moved: silently follow the new version.
    if (!upd && ov && ov.baseVersion !== officialVersion.value) {
      ov = putOverlay({ ...ov, baseVersion: officialVersion.value })
    }
    overlay.value = ov
    updDlg.value = upd
    showOriginal.value = false

    if (abs.absorbed && !upd) {
      const n = abs.absorbed
      window.setTimeout(
        () =>
          opts.toast(
            n === 1 ? 'Um dos seus ajustes virou oficial' : `${n} dos seus ajustes viraram oficiais`,
          ),
        30,
      )
    }
    if (upd) return null
    return (ov?.ops.find(isTuneOp) as TuneOp | undefined) ?? null
  }

  // Reloads a chart slot of the same song, before that switch re-baselines.
  // A song change is loaded by the viewer once it releases the hold — loading
  // here would reconcile the next key against the file just saved. The initial
  // run would load twice. reset()'s flag ends before touch(), so the hold has
  // to cover the whole transition.
  let resetting = false
  let chartLoadHold = 0
  function holdChartLoad() {
    chartLoadHold += 1
  }
  function releaseChartLoad() {
    if (chartLoadHold > 0) chartLoadHold -= 1
  }
  watch(
    [() => opts.songId.value, chartSlot],
    ([song, slot], prev) => {
      if (!prev || resetting || chartLoadHold > 0) return
      const [prevSong, prevSlot] = prev
      if (song !== prevSong || slot === prevSlot) return
      load()
    },
    { immediate: true, flush: 'sync' },
  )

  /** A local edit saves itself: it is the musician's phone, there is no "save". */
  function commitLocalFrom(text: string, ctx: ReadingCtx) {
    const tune = (overlay.value?.ops ?? []).filter(isTuneOp)
    const id = chartSlot.value
    const ops: OverlayOp[] = [
      ...tune,
      ...diffOps(chartText(official.value, id), chartText(text, id), ctx),
    ]
    saveOverlay({ baseVersion: officialVersion.value, ops, at: Date.now() })
  }

  const opList = computed<OpCard[]>(() =>
    (overlay.value?.ops ?? []).map((op) => ({
      id: op.id,
      label: opLabel(op),
      note: opCtxNote(op),
      from: isTuneOp(op) || op.type === 'insert' ? '' : op.before.join(' / ').slice(0, 70),
      to: isTuneOp(op) ? tuneText(op) : op.type === 'delete' ? '' : op.after.join(' / ').slice(0, 70),
    })),
  )

  function revertOp(id: string) {
    if (sending.value) return
    if (!overlay.value) return
    const ops = overlay.value.ops.filter((o) => o.id !== id)
    saveOverlay({ baseVersion: officialVersion.value, ops, at: Date.now() })
    opts.toast('Ajuste revertido ao original')
  }

  /** The dot on a personalised line: straight to reverting that stretch. */
  function revertLine(li: number) {
    const id = mineLines.value?.get(li)
    if (id) revertOp(id)
  }

  const revertAllLabel = computed(() =>
    confirmRevert.value ? 'Confirmar — descartar tudo' : 'Voltar ao original',
  )

  function revertAll() {
    if (sending.value) return
    if (!confirmRevert.value) {
      confirmRevert.value = true
      window.clearTimeout(revertT)
      revertT = window.setTimeout(() => (confirmRevert.value = false), 4000)
      return
    }
    window.clearTimeout(revertT)
    confirmRevert.value = false
    saveOverlay(null)
    myPanel.value = false
    showOriginal.value = false
    opts.toast('Sua versão foi descartada — de volta ao original')
  }

  function closeMy() {
    confirmRevert.value = false
    confirmSuggest.value = false
    nameNeeded.value = false
    myPanel.value = false
  }

  /** Pin the key and capo the reader arrived at, so the chart opens there. */
  function fixTune(transpose: number, capo: number, dual: boolean) {
    const rest = (overlay.value?.ops ?? []).filter((o) => !isTuneOp(o))
    if (!transpose && !capo) {
      saveOverlay(
        rest.length ? { baseVersion: officialVersion.value, ops: rest, at: Date.now() } : null,
      )
      opts.toast('Tom fixo removido')
      return
    }
    const op: TuneOp = {
      id: 'tune',
      type: 'tune',
      transpose,
      capo,
      dual: !!(capo && dual),
      ctx: { transpose, capo },
    }
    saveOverlay({ baseVersion: officialVersion.value, ops: [...rest, op], at: Date.now() })
    opts.toast('Tom e capo fixados nesta cifra')
  }

  // ------------------------------------------------- the official text moved

  const updItems = computed<UpdCard[]>(() => {
    const d = updDlg.value
    if (!d) return []
    return d.items.map((it) => ({
      id: it.id,
      label: it.label,
      on: !!d.pick[it.id],
      conflict: it.conflict,
      why: it.ok ? it.note : 'A linha oficial mudou aqui — escolha qual fica',
      mine: it.mine,
      theirs: it.theirs,
    }))
  })

  function togglePick(id: string) {
    const d = updDlg.value
    if (!d) return
    updDlg.value = { items: d.items, pick: { ...d.pick, [id]: !d.pick[id] } }
  }

  function updKeep() {
    const d = updDlg.value
    if (!d) return
    const ops = d.items.filter((it) => d.pick[it.id]).map((it) => it.op)
    saveOverlay(ops.length ? { baseVersion: officialVersion.value, ops, at: Date.now() } : null)
    updDlg.value = null
    opts.toast(ops.length ? 'Ajustes reaplicados na versão nova' : 'Você está na versão nova')
  }

  function updAdopt() {
    saveOverlay(null)
    updDlg.value = null
    showOriginal.value = false
    opts.toast('Versão nova adotada')
  }

  // ------------------------------------------------------------ suggestions

  /** Optimistic in-memory mirror when the host injects `suggestionQueue`. */
  const injectedMirror = ref<Suggestion[] | null>(null)

  function normalizeSug(s: Suggestion): Suggestion {
    return {
      ...s,
      status: s.status ?? 'pending',
      resolvedOps: s.resolvedOps ?? [],
      ops: s.ops ?? [],
    }
  }

  function allSug(): Suggestion[] {
    sugTick.value
    const injected = opts.suggestionQueue?.value
    if (injected !== undefined) {
      return (injectedMirror.value ?? injected).map(normalizeSug)
    }
    return readJson<Suggestion[]>(SUG_KEY, []).map(normalizeSug)
  }

  function writeSug(list: Suggestion[]) {
    const normalized = list.map(normalizeSug)
    if (opts.suggestionQueue?.value !== undefined) {
      injectedMirror.value = normalized
      try {
        opts.onSuggestionQueue?.(normalized)
      } catch {
        /* host failure stays with the host */
      }
    } else {
      writeStored(opts.store, SUG_KEY, normalized)
    }
    sugTick.value += 1
  }

  function sugStatus(s: Suggestion): SuggestionStatus {
    const open = s.ops.length
    const accepted = (s.resolvedOps ?? []).filter((o) => o.disposition === 'accepted').length
    const refused = (s.resolvedOps ?? []).filter((o) => o.disposition === 'refused').length
    if (open > 0) return accepted > 0 || refused > 0 ? 'partial' : 'pending'
    if (accepted > 0 && refused > 0) return 'partial'
    if (accepted > 0) return 'accepted'
    if (refused > 0) return 'refused'
    return 'pending'
  }

  function isOpenForAdmin(s: Suggestion): boolean {
    const st = sugStatus(s)
    return st === 'pending' || (st === 'partial' && s.ops.length > 0)
  }

  const canSuggest = computed(() => hasOverlay.value && opts.suggestions.value)

  const mySuggestions = computed(() => {
    const sid = opts.songId.value
    const key = opts.actorKey?.value
    return allSug().filter((s) => {
      if (s.songId !== sid) return false
      if (key) return s.actorKey === key
      return true
    })
  })

  const suggestLabel = computed(() =>
    sending.value
      ? 'Enviando…'
      : confirmSuggest.value
        ? 'Confirmar — enviar'
        : 'Sugerir alteração ao responsável',
  )

  async function suggest() {
    if (sending.value) return
    const ov = overlay.value
    if (!ov?.ops.length) return
    const name = actorName.value.trim()
    if (!name) {
      nameNeeded.value = true
      confirmSuggest.value = false
      opts.toast('O nome é obrigatório para enviar')
      return
    }
    nameNeeded.value = false
    if (!confirmSuggest.value) {
      confirmSuggest.value = true
      window.clearTimeout(suggestT)
      suggestT = window.setTimeout(() => (confirmSuggest.value = false), 4000)
      return
    }
    window.clearTimeout(suggestT)
    confirmSuggest.value = false
    writeStored(opts.store, STORE_KEYS.actorName, name)
    const created: Suggestion = {
      id: `s${Date.now()}`,
      songId: opts.songId.value,
      ...(plainFile(official.value) ? {} : { chartId: chartSlot.value }),
      title: opts.title.value || opts.songId.value,
      at: Date.now(),
      baseVersion: officialVersion.value,
      ops: ov.ops,
      resolvedOps: [],
      status: 'pending',
      actorKey: opts.actorKey?.value,
      actorName: name,
    }
    const persist = opts.persistSuggestion?.value
    if (!persist) {
      writeSug([...allSug(), created])
      try {
        opts.onSuggestionCreated?.(created)
      } catch {
        /* host notify */
      }
      myPanel.value = false
      opts.toast('Sugestão enviada')
      return
    }
    sending.value = true
    try {
      const result: unknown = persist(created)
      if (
        result == null ||
        typeof result !== 'object' ||
        typeof (result as { then?: unknown }).then !== 'function'
      ) {
        console.error(
          '[titan-chordpro-ui] persistSuggestion must return a Promise (return the POST). A void return is not an ack.',
        )
        throw new Error('persistSuggestion must return a Promise')
      }
      await result
      writeSug([...allSug(), created])
      try {
        opts.onSuggestionCreated?.(created)
      } catch {
        /* host notify */
      }
      myPanel.value = false
      opts.toast('Sugestão enviada')
    } catch {
      opts.toast('Não foi possível enviar. Tente de novo.')
    } finally {
      sending.value = false
    }
  }

  // ----------------------------- the owner's queue: songs → requests → ops

  const openSugs = computed(() => allSug().filter(isOpenForAdmin))
  const pendingCount = computed(() => openSugs.value.length)
  const queueOpen = computed(() => route.value === 'queue')

  function openQueue() {
    route.value = 'queue'
    qSong.value = null
    qSug.value = null
    myPanel.value = false
  }
  function closeQueue() {
    route.value = 'song'
    qSong.value = null
    qSug.value = null
  }
  function qBack() {
    if (qSug.value) qSug.value = null
    else qSong.value = null
  }

  /** Missing chart id is the whole file: no ` · default`. Another song is not labeled from the file on screen. */
  function queueChartLabel(s: Suggestion): string | null {
    const id = String(s.chartId ?? '').trim()
    if (!id) return null
    if (s.songId !== opts.songId.value) return id
    return chartLabelOf(id)
  }

  const qSongs = computed<QueueRow[]>(() => {
    const by = new Map<string, { title: string; chart: string | null; pedidos: number; ajustes: number }>()
    for (const s of openSugs.value) {
      const key = queueGroupKey(s)
      const e = by.get(key) ?? { title: s.title, chart: queueChartLabel(s), pedidos: 0, ajustes: 0 }
      e.pedidos += 1
      e.ajustes += s.ops.length
      by.set(key, e)
    }
    return [...by.entries()].map(([key, e]) => ({
      key,
      label: e.chart ? `${e.title} · ${e.chart}` : e.title,
      hint: `${e.pedidos} ${e.pedidos === 1 ? 'pedido' : 'pedidos'} · ${e.ajustes} ${e.ajustes === 1 ? 'ajuste' : 'ajustes'}`,
    }))
  })

  const qSugs = computed<QueueRow[]>(() => {
    const id = qSong.value
    if (!id) return []
    return openSugs.value
      .filter((s) => queueGroupKey(s) === id)
      .map((s) => {
        const when = new Date(s.at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
        const who = String(s.actorName ?? '').trim()
        return {
          key: s.id,
          label: who || when,
          hint: who
            ? `${when} · ${s.ops.length} ${s.ops.length === 1 ? 'ajuste' : 'ajustes'}`
            : `${s.ops.length} ${s.ops.length === 1 ? 'ajuste' : 'ajustes'} · base ${s.baseVersion}`,
          actor: who || undefined,
        }
      })
  })

  const qOps = computed<QueueOpCard[]>(() => {
    const s = allSug().find((x) => x.id === qSug.value)
    if (!s) return []
    const id = sugChartId(s)
    const present = sugApplies(official.value, s)
    const off = chartText(official.value, id)
    return s.ops.map((op) => {
      const fits = present && !applyOps(off, [op]).failed.length
      return {
        id: op.id,
        label: opLabel(op),
        note: opCtxNote(op),
        from: isTuneOp(op) || op.type === 'insert' ? '—' : op.before.join(' / ').slice(0, 90),
        to: isTuneOp(op)
          ? tuneText(op)
          : op.type === 'delete'
            ? '—'
            : op.after.join(' / ').slice(0, 90),
        fits,
        warn: fits ? '' : 'Não encaixa mais na cifra atual',
        strum: strumReviewFromOp(op),
      }
    })
  })

  const qActorName = computed(() => {
    const s = allSug().find((x) => x.id === qSug.value)
    return String(s?.actorName ?? '').trim()
  })

  const qPreviewStrum = computed(() => {
    const text = qBatchPreview.value?.text
    if (!text) return null
    const set = readStrumPatterns(text)
    return set.patterns.length ? set.patterns : null
  })

  const qOfficialStrum = computed(() => {
    const s = allSug().find((x) => x.id === qSug.value)
    const text = s ? chartText(official.value, sugChartId(s)) : chartText(official.value, chartSlot.value)
    const set = readStrumPatterns(text)
    return set.patterns
  })

  const qBatchPreview = computed(() => {
    const s = allSug().find((x) => x.id === qSug.value)
    if (!s?.ops.length) return null
    const id = sugChartId(s)
    const doc = chartText(official.value, id)
    if (!sugApplies(official.value, s)) return { text: doc, count: 0, conflicts: s.ops.length }
    const applies = s.ops.filter((op) => !applyOps(doc, [op]).failed.length)
    if (!applies.length) return { text: doc, count: 0, conflicts: s.ops.length }
    const r = applyOps(doc, applies)
    return {
      text: r.text,
      count: applies.length - r.failed.length,
      conflicts: s.ops.length - (applies.length - r.failed.length),
    }
  })

  const qTitle = computed(() => {
    if (qSug.value) {
      return qActorName.value ? `Pedido de ${qActorName.value}` : 'Ajustes do pedido'
    }
    return qSong.value ? 'Pedidos desta cifra' : 'Cifras com pedidos'
  })

  function patchSug(sugId: string, next: Suggestion) {
    const status = sugStatus(next)
    const patched = { ...next, status }
    writeSug(allSug().map((x) => (x.id === sugId ? patched : x)))
    if (!patched.ops.length) qSug.value = null
    return patched
  }

  function archiveOp(
    s: Suggestion,
    opId: string,
    disposition: 'accepted' | 'refused',
  ): Suggestion {
    const op = s.ops.find((o) => o.id === opId)
    if (!op) return s
    const resolved: ResolvedOp = { ...op, disposition }
    return {
      ...s,
      ops: s.ops.filter((o) => o.id !== opId),
      resolvedOps: [...(s.resolvedOps ?? []), resolved],
    }
  }

  /**
   * Accepting writes the official text and bumps the version: anyone holding an
   * overlay meets the update dialog on their next read. Ops are archived, not deleted.
   */
  function acceptOp(opId: string) {
    const sugId = qSug.value
    if (!sugId) return
    const s = allSug().find((x) => x.id === sugId)
    if (!s) return
    if (s.songId !== opts.songId.value) {
      opts.toast('Abra essa música para aceitar o pedido')
      return
    }
    const op = s.ops.find((o) => o.id === opId)
    if (!op) return
    const id = sugChartId(s)
    const doc = chartText(official.value, id)
    const r = sugApplies(official.value, s) ? applyOps(doc, [op]) : null
    if (!r || r.failed.length) {
      opts.toast('Este ajuste não encaixa mais na cifra atual')
      return
    }
    const full = fileWithChart(official.value, id, r.text)
    const next = archiveOp(s, opId, 'accepted')
    const patched = patchSug(sugId, next)
    opts.toast('Aceito — já vale para todos')
    if (!isTuneOp(op)) setOfficial(full, true)
    try {
      opts.onSuggestionAccepted?.({
        id: sugId,
        songId: s.songId,
        opIds: [opId],
        status: patched.status ?? 'accepted',
        officialText: isTuneOp(op) ? official.value : full,
      })
    } catch {
      /* host failure */
    }
  }

  function refuseOp(opId: string) {
    const sugId = qSug.value
    if (!sugId) return
    const s = allSug().find((x) => x.id === sugId)
    if (!s?.ops.some((o) => o.id === opId)) return
    const patched = patchSug(sugId, archiveOp(s, opId, 'refused'))
    opts.toast('Recusado')
    try {
      opts.onSuggestionRefused?.({
        id: sugId,
        songId: s.songId,
        opIds: [opId],
        status: patched.status ?? 'refused',
      })
    } catch {
      /* host failure */
    }
  }

  /** Accept every op that still fits — one apply + one save-content bump. */
  function acceptBatch() {
    const sugId = qSug.value
    if (!sugId) return
    const s = allSug().find((x) => x.id === sugId)
    if (!s?.ops.length) return
    if (s.songId !== opts.songId.value) {
      opts.toast('Abra essa música para aceitar o pedido')
      return
    }
    const id = sugChartId(s)
    const doc = chartText(official.value, id)
    const applies = sugApplies(official.value, s)
      ? s.ops.filter((op) => !applyOps(doc, [op]).failed.length)
      : []
    if (!applies.length) {
      opts.toast('Nenhum ajuste encaixa na cifra atual')
      return
    }
    const r = applyOps(doc, applies)
    const full = fileWithChart(official.value, id, r.text)
    const okIds = new Set(applies.filter((op) => !r.failed.some((f) => f.id === op.id)).map((o) => o.id))
    let next = s
    for (const op of s.ops) {
      if (okIds.has(op.id)) next = archiveOp(next, op.id, 'accepted')
    }
    const patched = patchSug(sugId, next)
    setOfficial(full, true)
    opts.toast(`Aceitos ${okIds.size} ajuste${okIds.size === 1 ? '' : 's'}`)
    try {
      opts.onSuggestionAccepted?.({
        id: sugId,
        songId: s.songId,
        opIds: [...okIds],
        status: patched.status ?? 'accepted',
        officialText: full,
      })
    } catch {
      /* host failure */
    }
  }

  function refuseBatch() {
    const sugId = qSug.value
    if (!sugId) return
    const s = allSug().find((x) => x.id === sugId)
    if (!s?.ops.length) return
    const ids = s.ops.map((o) => o.id)
    let next = s
    for (const id of ids) next = archiveOp(next, id, 'refused')
    const patched = patchSug(sugId, next)
    opts.toast('Pedido recusado')
    try {
      opts.onSuggestionRefused?.({
        id: sugId,
        songId: s.songId,
        opIds: ids,
        status: patched.status ?? 'refused',
      })
    } catch {
      /* host failure */
    }
  }

  function setOfficial(text: string, reconcile = false) {
    officialSrc.value = text
    officialV.value = `v${Date.now().toString(36)}`
    if (opts.onSaveContent) {
      try {
        opts.onSaveContent(text)
      } catch {
        /* the host's own failure is not the reader's problem */
      }
    }
    // A save from inside the editor keeps the draft: only a change that came
    // from elsewhere re-reads what the reader still holds over it.
    if (reconcile) load()
    opts.onBaseChange()
  }

  /** A new chart arrived: everything held about the previous one goes. */
  function reset() {
    resetting = true
    try {
      officialSrc.value = null
      officialV.value = null
      overlay.value = null
      updDlg.value = null
      showOriginal.value = false
      myPanel.value = false
      exportOrig.value = false
      confirmRevert.value = false
      confirmSuggest.value = false
      closeQueue()
    } finally {
      resetting = false
    }
  }

  function dispose() {
    window.clearTimeout(revertT)
    window.clearTimeout(suggestT)
  }

  return {
    overlay,
    official,
    officialVersion,
    officialSrc,
    baseFor,
    applied,
    mineLines,
    ovFailedCount,
    hasOverlay,
    mineCount,
    mineLabel,
    showOriginal,
    myPanel,
    closeMy,
    opList,
    revertOp,
    revertLine,
    revertAll,
    revertAllLabel,
    fixTune,
    load,
    saveOverlay,
    commitLocalFrom,
    updDlg,
    updItems,
    togglePick,
    updKeep,
    updAdopt,
    canSuggest,
    suggest,
    suggestLabel,
    sending,
    actorName,
    nameNeeded,
    qActorName,
    qPreviewStrum,
    qOfficialStrum,
    mySuggestions,
    pendingCount,
    queueOpen,
    openQueue,
    closeQueue,
    qBack,
    qSong,
    qSug,
    qSongs,
    qSugs,
    qOps,
    qBatchPreview,
    qTitle,
    acceptOp,
    refuseOp,
    acceptBatch,
    refuseBatch,
    setOfficial,
    exportOrig,
    reset,
    holdChartLoad,
    releaseChartLoad,
    dispose,
  }
}
