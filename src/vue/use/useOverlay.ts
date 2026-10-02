import { computed, ref, watch, type Ref } from 'vue'
import { overlayKey, overlaid } from '@henryavila/titan-chordpro-ui'
import type { ChartStore, Overlay, ReadingCtx, Suggestion, SuggestionStatus, TuneOp } from '@henryavila/titan-chordpro-ui'
import type { WriteMode } from '../public'
import {
  commitLocalOverlay,
  fixTuneOp,
  mineVersionLabel,
  opCards,
  readingBase,
  revertAllButtonLabel,
  revertEveryOp,
  revertOverlayOp,
} from './overlay/mine'
import {
  applyOfficial,
  loadChartOverlay,
  normalizeSuggestionList,
  notifySuggestionQueue,
  readActorName,
  readSuggestionList,
  saveOverlayValue,
  writeStoredSuggestions,
  type UpdatePlan,
} from './overlay/persist'
import {
  acceptQueuedBatch,
  acceptQueuedOp,
  backQueue,
  batchPreviewOf,
  enterQueue,
  leaveQueue,
  officialStrumPatterns,
  openSuggestions,
  opQueueCards,
  previewStrumChange,
  queueActorName,
  queueHeading,
  refuseQueuedBatch,
  refuseQueuedOp,
  requestQueueRows,
  sendSuggestion,
  songQueueRows,
  suggestButtonLabel,
  suggestionsForReader,
  type ReviewHost,
  type SuggestHost,
} from './overlay/queue'
import { adoptUpdateChoice, keepUpdateChoice, toggledUpdate, updateCards } from './overlay/update'

export type { WriteMode } from '../public'
export type { OpCard } from './overlay/mine'
export type { UpdCard } from './overlay/update'
export type { QueueRow, QueueOpCard } from './overlay/queue'

export type OverlayOpts = {
  songId: Ref<string>
  version: Ref<string>
  /** The chart as the host handed it. */
  hostSource: Ref<string>
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
  online?: Ref<boolean>
  loadScoreAsset?: (src: string) => Promise<{ bytes: Uint8Array; contentType?: string; filename?: string }>
  uploadScore?: Ref<((file: File) => Promise<{ ref: string }>) | undefined>
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

/**
 * The reader's own version of a chart, and the queue of adjustments they can
 * send to whoever owns it. Storage is the phone: an overlay never travels
 * unless the musician asks for it.
 */
export function useOverlay(opts: OverlayOpts) {
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
  const reviewBusy = ref(false)
  const nameNeeded = ref(false)
  const actorName = ref(String(opts.actorName?.value ?? '').trim() || readActorName(opts.store))
  watch(actorName, (v) => {
    if (String(v).trim()) nameNeeded.value = false
  })
  const route = ref<'song' | 'queue'>('song')
  const qSong = ref<string | null>(null)
  const qSug = ref<string | null>(null)
  /** Optimistic in-memory mirror when the host injects `suggestionQueue`. */
  const injectedMirror = ref<Suggestion[] | null>(null)
  let revertT = 0
  let suggestT = 0

  watch(
    () => opts.suggestionQueue?.value,
    (queue) => {
      if (queue === undefined) return
      injectedMirror.value = null
      sugTick.value += 1
    },
  )

  // Official = what the consumer's database holds: the host source until a
  // "for everyone" save takes over from here on.
  const official = computed(() => officialSrc.value ?? opts.hostSource.value ?? '')
  const officialVersion = computed(() => officialV.value || opts.version.value || 'v1')
  const ovKey = computed(() => overlayKey(opts.songId.value))

  const applied = computed(() => overlaid(official.value, overlay.value))
  /** Line index → id of the op that put it there, in the text being read. */
  const mineLines = computed(() => (showOriginal.value ? null : applied.value.mine))
  const ovFailedCount = computed(() => (showOriginal.value ? 0 : applied.value.failed.length))
  const hasOverlay = computed(() => !!overlay.value?.ops.length)
  const mineCount = computed(() => overlay.value?.ops.length ?? 0)
  const mineLabel = computed(() => mineVersionLabel(mineCount.value))

  function allSug(): Suggestion[] {
    sugTick.value
    return readSuggestionList(opts.store, opts.suggestionQueue?.value, injectedMirror.value)
  }

  function writeSug(list: Suggestion[]) {
    if (opts.suggestionQueue?.value !== undefined) {
      const normalized = normalizeSuggestionList(list)
      injectedMirror.value = normalized
      notifySuggestionQueue(opts.onSuggestionQueue, normalized)
    } else {
      writeStoredSuggestions(opts.store, list)
    }
    sugTick.value += 1
  }

  function saveOverlay(next: Overlay | null) {
    overlay.value = saveOverlayValue(opts.store, ovKey.value, next)
    opts.onBaseChange()
  }

  /**
   * The screen's base: "for everyone" and reading the original see the raw
   * official text; reading and local editing see it with the overlay applied.
   */
  function baseFor(wMode: WriteMode | null): string {
    return readingBase(wMode, showOriginal.value, official.value, applied.value.text)
  }

  function load(): TuneOp | null {
    return loadChartOverlay({
      store: opts.store,
      key: ovKey.value,
      keyNow: () => ovKey.value,
      base: official.value,
      version: officialVersion.value,
      setOverlay: (next) => {
        overlay.value = next
      },
      setUpdate: (next) => {
        updDlg.value = next
      },
      setShowOriginal: (next) => {
        showOriginal.value = next
      },
      toast: opts.toast,
    })
  }

  function commitLocalFrom(text: string, ctx: ReadingCtx) {
    commitLocalOverlay({
      existing: overlay.value,
      official: official.value,
      text,
      ctx,
      version: officialVersion.value,
      save: saveOverlay,
    })
  }

  const opList = computed(() => opCards(overlay.value?.ops ?? []))

  function revertOp(id: string) {
    revertOverlayOp({
      sending: sending.value,
      existing: overlay.value,
      id,
      version: officialVersion.value,
      save: saveOverlay,
      toast: opts.toast,
    })
  }

  /** The dot on a personalised line: straight to reverting that stretch. */
  function revertLine(li: number) {
    const id = mineLines.value?.get(li)
    if (id) revertOp(id)
  }

  function armRevertConfirm() {
    confirmRevert.value = true
    window.clearTimeout(revertT)
    revertT = window.setTimeout(() => (confirmRevert.value = false), 4000)
  }

  function disarmRevertConfirm() {
    window.clearTimeout(revertT)
    confirmRevert.value = false
  }

  const revertAllLabel = computed(() => revertAllButtonLabel(confirmRevert.value))

  function revertAll() {
    revertEveryOp({
      sending: sending.value,
      confirming: confirmRevert.value,
      arm: armRevertConfirm,
      disarm: disarmRevertConfirm,
      save: saveOverlay,
      closePanel: () => {
        myPanel.value = false
      },
      showOriginal: (next) => {
        showOriginal.value = next
      },
      toast: opts.toast,
    })
  }

  function closeMy() {
    confirmRevert.value = false
    confirmSuggest.value = false
    nameNeeded.value = false
    myPanel.value = false
  }

  function fixTune(transpose: number, capo: number, dual: boolean) {
    fixTuneOp({
      existing: overlay.value,
      version: officialVersion.value,
      transpose,
      capo,
      dual,
      save: saveOverlay,
      toast: opts.toast,
    })
  }

  const updItems = computed(() => updateCards(updDlg.value))

  function togglePick(id: string) {
    const next = toggledUpdate(updDlg.value, id)
    if (!next) return
    updDlg.value = next
  }

  function updKeep() {
    keepUpdateChoice({
      plan: updDlg.value,
      version: officialVersion.value,
      save: saveOverlay,
      clear: () => {
        updDlg.value = null
      },
      toast: opts.toast,
    })
  }

  function updAdopt() {
    adoptUpdateChoice({
      save: saveOverlay,
      clear: () => {
        updDlg.value = null
      },
      showOriginal: (next) => {
        showOriginal.value = next
      },
      toast: opts.toast,
    })
  }

  const canSuggest = computed(() => hasOverlay.value && opts.suggestions.value)
  const mySuggestions = computed(() =>
    suggestionsForReader(allSug(), opts.songId.value, opts.actorKey?.value),
  )
  const suggestLabel = computed(() => suggestButtonLabel(sending.value, confirmSuggest.value))

  function armSuggestConfirm() {
    confirmSuggest.value = true
    window.clearTimeout(suggestT)
    suggestT = window.setTimeout(() => (confirmSuggest.value = false), 4000)
  }

  function disarmSuggestConfirm() {
    window.clearTimeout(suggestT)
    confirmSuggest.value = false
  }

  function suggestHost(): SuggestHost {
    return {
      sending: () => sending.value,
      setSending: (v) => {
        sending.value = v
      },
      overlay: () => overlay.value,
      actorName: () => actorName.value,
      setNameNeeded: (v) => {
        nameNeeded.value = v
      },
      confirming: () => confirmSuggest.value,
      setConfirming: (v) => {
        confirmSuggest.value = v
      },
      armConfirm: armSuggestConfirm,
      disarmConfirm: disarmSuggestConfirm,
      songId: () => opts.songId.value,
      title: () => opts.title.value,
      version: () => officialVersion.value,
      actorKey: () => opts.actorKey?.value,
      store: opts.store,
      loadScoreAsset: () => opts.loadScoreAsset,
      persist: () => opts.persistSuggestion?.value,
      online: () => opts.online?.value !== false,
      all: allSug,
      write: writeSug,
      closePanel: () => {
        myPanel.value = false
      },
      toast: opts.toast,
      onCreated: opts.onSuggestionCreated,
    }
  }

  function suggest() {
    return sendSuggestion(suggestHost())
  }

  const openSugs = computed(() => openSuggestions(allSug()))
  const pendingCount = computed(() => openSugs.value.length)
  const queueOpen = computed(() => route.value === 'queue')

  function openQueue() {
    enterQueue({
      setRoute: (next) => {
        route.value = next
      },
      setSong: (id) => {
        qSong.value = id
      },
      setSug: (id) => {
        qSug.value = id
      },
      setMyPanel: (open) => {
        myPanel.value = open
      },
    })
  }

  function closeQueue() {
    leaveQueue({
      setRoute: (next) => {
        route.value = next
      },
      setSong: (id) => {
        qSong.value = id
      },
      setSug: (id) => {
        qSug.value = id
      },
    })
  }

  function qBack() {
    backQueue({
      sug: qSug.value,
      setSug: (id) => {
        qSug.value = id
      },
      setSong: (id) => {
        qSong.value = id
      },
    })
  }

  const qSongs = computed(() => songQueueRows(openSugs.value))
  const qSugs = computed(() => requestQueueRows(openSugs.value, qSong.value))
  const qOps = computed(() => opQueueCards(allSug().find((x) => x.id === qSug.value), official.value))
  const qActorName = computed(() => queueActorName(allSug().find((x) => x.id === qSug.value)))
  const qBatchPreview = computed(() => batchPreviewOf(allSug().find((x) => x.id === qSug.value), official.value))
  const qPreviewStrum = computed(() => previewStrumChange(qBatchPreview.value?.text, official.value))
  const qOfficialStrum = computed(() => officialStrumPatterns(official.value))
  const qTitle = computed(() => queueHeading(qSug.value, qActorName.value, qSong.value))

  function reviewHost(): ReviewHost {
    return {
      busy: () => reviewBusy.value,
      setBusy: (v) => {
        reviewBusy.value = v
      },
      sugId: () => qSug.value,
      setSugId: (id) => {
        qSug.value = id
      },
      all: allSug,
      write: writeSug,
      official: () => official.value,
      toast: opts.toast,
      upload: () => opts.uploadScore?.value,
      setOfficial,
      onAccepted: opts.onSuggestionAccepted,
      onRefused: opts.onSuggestionRefused,
    }
  }

  function acceptOp(opId: string) {
    return acceptQueuedOp(reviewHost(), opId)
  }

  function refuseOp(opId: string) {
    refuseQueuedOp(reviewHost(), opId)
  }

  function acceptBatch() {
    return acceptQueuedBatch(reviewHost())
  }

  function refuseBatch() {
    refuseQueuedBatch(reviewHost())
  }

  function setOfficial(text: string, reconcile = false) {
    applyOfficial({
      text,
      reconcile,
      setSrc: (next) => {
        officialSrc.value = next
      },
      setVersion: (next) => {
        officialV.value = next
      },
      onSaveContent: opts.onSaveContent,
      reload: load,
      onBaseChange: opts.onBaseChange,
    })
  }

  /** A new chart arrived: everything held about the previous one goes. */
  function reset() {
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
    reviewBusy,
    acceptOp,
    refuseOp,
    acceptBatch,
    refuseBatch,
    setOfficial,
    exportOrig,
    reset,
    dispose,
  }
}
