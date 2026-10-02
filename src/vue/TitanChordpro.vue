<script setup lang="ts">
import { provide } from 'vue'
import { createTabRhythmPreference, tabRhythmKey } from './use/useTabRhythm'
import { createNoteNamesPreference, noteNamesKey } from './use/useNoteNames'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  blockSpan,
  isScoreReference,
  isInlineScore,
  editTypeScale,
  hasSongDuration,
  isParseFatal,
  layoutChartFull,
  maxPlainChars,
  missingOf,
  MISSING_LABEL,
  normalizeSource,
  beatsPerBar,
  emptyPattern,
  gridFromDensity,
  parse,
  transpose,
  isCompleteStrumPattern,
  repairStrumPattern,
  readStrumPatterns,
  sheetBpm,
  transposeToken,
  typeScale,
  usesFlats,
  adjustScrollMultiplier,
  writeMeta,
  writeStrumPatterns,
  AUDIO_ART_DEFAULT_PX,
  AUDIO_KIND_LABEL,
  audioArtOf,
  audioArtistOf,
  resolveRehearsalArt,
  audioKindsOf,
  audioTracksOf,
  rehearsalAudioUrls,
  defaultAudioKind,
  displaySongTitle,
  type AudioKind,
  STORE_KEYS,
  browserStore,
  readUserPreferences,
  updateUserPreferences,
  notationBlockIds,
  type StrumPattern,
  type StrumPatternSet,
} from '@henryavila/titan-chordpro-ui'
import type {
  ChartBlock,
  ChartStore,
  Lens,
  SaveStrumPresetPayload,
  StrumPreset,
  ThemeId,
} from '@henryavila/titan-chordpro-ui'
import ChartBody from './chart/ChartBody.vue'
import DiagramModal from './overlay/DiagramModal.vue'
import type { DiagramInstrumentChoice } from './overlay/DiagramModal.vue'
import ExportSheet from './sheets/ExportSheet.vue'
import SetlistSheet from './sheets/SetlistSheet.vue'
import MetronomeSheet from './sheets/MetronomeSheet.vue'
import BatidaSheet from './sheets/BatidaSheet.vue'
import ToneSheet from './sheets/ToneSheet.vue'
import StrumStrip from './StrumStrip.vue'
import SourcePane from './edit/SourcePane.vue'
import ChordDialog from './edit/ChordDialog.vue'
import ImagePicker from './edit/ImagePicker.vue'
import ScoreEditor from './edit/ScoreEditor.vue'
import ImportScoreDialog from './edit/ImportScoreDialog.vue'
import NewChartDialog from './edit/NewChartDialog.vue'
import MetaDialog from './edit/MetaDialog.vue'
import MyVersionPanel from './overlay/MyVersionPanel.vue'
import SuggestionQueue from './overlay/SuggestionQueue.vue'
import UpdateDialog from './overlay/UpdateDialog.vue'
import TitanChordproViewHead from './chrome/TitanChordproViewHead.vue'
import type { ViewHeadModel } from './chrome/view-head'
import type {
  EditDockModel,
  EditHeadModel,
  MoreSheetModel,
  PhoneDockModel,
  WideDockModel,
} from './chrome/dock-model'
import TitanChordproCapoLegend from './chrome/TitanChordproCapoLegend.vue'
import TitanChordproStates from './chrome/TitanChordproStates.vue'
import TitanChordproEditHead from './chrome/TitanChordproEditHead.vue'
import TitanChordproWideDock from './chrome/TitanChordproWideDock.vue'
import TitanChordproPhoneDock from './chrome/TitanChordproPhoneDock.vue'
import TitanChordproAudioRef from './chrome/TitanChordproAudioRef.vue'
import TitanChordproMoreSheet from './chrome/TitanChordproMoreSheet.vue'
import TitanChordproEditDock from './chrome/TitanChordproEditDock.vue'
import TitanChordproEndOffer from './chrome/TitanChordproEndOffer.vue'
import TitanChordproSwipeVeil from './chrome/TitanChordproSwipeVeil.vue'
import { useBlockEdit } from './use/useBlockEdit'
import { useFullscreen, warnIfHostBlocksFullscreen } from './use/useFullscreen'
import { pinWouldFillViewport } from './use/viewportPin'
import { useMetronome, metronomePulseHit } from './use/useMetronome'
import { useStrumSound } from './use/useStrumSound'
import {
  effectiveChannels,
  prefsFromSource,
  shouldRollSilent,
  strumAudibleDuringRun,
  type SoundSource,
} from './use/rehearsal-audio'
import { useOverlay } from './use/useOverlay'
import { useSetlist } from './use/useSetlist'
import { useSongSwipe } from './use/useSongSwipe'
import { SWIPE_EDGE_PX, SWIPE_FADE_MS, swipeRailPx } from './use/song-swipe'
import { useSurfaceGuard } from './use/useSurfaceGuard'
import { useWakeLock } from './use/useWakeLock'
import { useAudioRef } from './use/useAudioRef'
import { fillAudioCache } from './use/audio-cache'
import { useOnline } from './use/useOnline'
import { useAutoScroll } from './use/useAutoScroll'
import { useChromeLayout } from './use/useChromeLayout'
import { useEditSession } from './use/useEditSession'
import { useExport } from './use/useExport'
import { useNotationPrefs } from './use/useNotationPrefs'
import { mediaSessionArtwork, useMediaSession } from './use/useMediaSession'
import defaultArt from './assets/audio-ref-default.jpg'
import type { TitanChordproProps, EditMode, RehearsalFocus, WriteMode } from './public'
import { resolveEditMode } from './public'
import { applyThemeVars, cycleTheme, themeIcon, themeLabel } from './use/useTheme'
import TitanChordproIcon from './icon/TitanChordproIcon.vue'
import TitanChordproIconButton from './ui/TitanChordproIconButton.vue'
import type { TitanChordproIconName } from './icon/paths'
import './titan-chordpro.css'

const props = withDefaults(
  defineProps<
    TitanChordproProps & {
      /** Host batida presets (declared locally so the SFC macro always emits a runtime prop). */
      strumPresets?: StrumPreset[]
      persistSuggestion?: (
        suggestion: import('@henryavila/titan-chordpro-ui').Suggestion,
      ) => Promise<void>
      forceParseError?: boolean
      pdfShouldFail?: boolean
      slidesShouldFail?: boolean
      ppsxShouldFail?: boolean
      /** Test harness: start with this live capo. File `{capo:}` does not. */
      initialCapo?: number
      /** Test harness: start with dual on/off. Default on when there is a capo. */
      initialDual?: boolean
    }
  >(),
  {
    source: '',
    mode: 'view',
    theme: 'auto',
    themeControl: 'preference',
    hideComments: false,
    rehearsalFocus: 'off',
    loading: false,
    autoHide: true,
    fitDefault: true,
    canEdit: true,
    autoInvertScores: true,
    noteNameFormat: 'letter',
    resolveImage: (src: string) => src,
    accent: 'verde',
    accentStrength: 1,
    surfaceGuard: true,
    editMode: undefined,
    modes: undefined,
    suggestions: true,
    actorKey: undefined,
    actorName: undefined,
    suggestionQueue: undefined,
    persistSuggestion: undefined,
    songId: '',
    songs: undefined,
    loadSong: undefined,
    prefetchAll: false,
    online: undefined,
    fetchChart: undefined,
    fetchYoutubeDuration: undefined,
    readPdf: undefined,
    version: 'v1',
    images: () => [],
    uploadImage: undefined,
    forceParseError: false,
    pdfShouldFail: false,
    slidesShouldFail: false,
    ppsxShouldFail: false,
    capabilities: () => ({ sourcePane: true }),
    strumPresets: () => [],
    defaultAudioArt: undefined,
  },
)

// Inline emit map so the SFC compiler emits a runtime declaration (imported
// `TitanChordproEmits` alone can omit new keys from the runtime emits list).
const emit = defineEmits<{
  'update:source': [value: string]
  'update:theme': [value: ThemeId]
  'update:mode': [value: 'view' | 'edit']
  'update:lens': [value: Lens]
  'update:hideComments': [value: boolean]
  'update:rehearsalFocus': [value: RehearsalFocus]
  dirty: [value: boolean]
  save: [value: string]
  'save-content': [value: string]
  'suggestion-created': [import('@henryavila/titan-chordpro-ui').Suggestion]
  'suggestion-accepted': [
    {
      id: string
      songId: string
      opIds: string[]
      status: import('@henryavila/titan-chordpro-ui').SuggestionStatus
      officialText: string
    },
  ]
  'suggestion-refused': [
    {
      id: string
      songId: string
      opIds: string[]
      status: import('@henryavila/titan-chordpro-ui').SuggestionStatus
    },
  ]
  'update:suggestionQueue': [import('@henryavila/titan-chordpro-ui').Suggestion[]]
  'save-strum-preset': [value: SaveStrumPresetPayload]
  state: [value: Record<string, unknown>]
}>()

/** Host catalog — explicit computed so the template always binds a real ref. */
const strumPresetCatalog = computed<StrumPreset[]>(() => props.strumPresets ?? [])

function onSaveStrumPreset(payload: SaveStrumPresetPayload) {
  emit('save-strum-preset', payload)
}

/**
 * One object with a stable identity, so the composables can hold it, while a
 * `storage` prop that arrives (or changes) later is still honoured.
 */
const deviceStore = browserStore()
const store: ChartStore = {
  get: (k) => (props.storage ?? deviceStore).get(k),
  set: (k, v) => (props.storage ?? deviceStore).set(k, v),
  remove: (k) => (props.storage ?? deviceStore).remove(k),
}

const tabRhythmPreference = createTabRhythmPreference(store)
provide(tabRhythmKey, tabRhythmPreference)
provide(noteNamesKey, createNoteNamesPreference(store))

const root = ref<HTMLElement | null>(null)
const scroller = ref<HTMLElement | null>(null)
const page = ref<HTMLElement | null>(null)
const head = ref<HTMLElement | null>(null)
const capoBox = ref<HTMLElement | null>(null)
const width = ref(900)
const swipeRailBottom = ref(0)
const visibleDockBottom = ref(0)
const headH = ref(72)
const offset = ref(0)
const capo = ref(0)
const capoOpen = ref(false)
const theme = ref<ThemeId | null>(null)
const sysDark = ref(
  typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true,
)
const bias = ref(0)
const fit = ref<boolean | null>(null)
/**
 * Clock and edit-session inputs that do not exist yet. Assigned before mount,
 * read only when a gesture or the host actually runs. One binding each —
 * `lastSrc` lives in the session, `raf` and `swipePeekHold` in the clock.
 */
let parsedNow: (() => ReturnType<typeof parse>) | null = null
let blocksNow: (() => ChartBlock[]) | null = null
let barPxNow: (() => number) | null = null
let followNow = () => false
let metRunningNow = () => false
let stopMetNow = () => {}
let dismissEndNow = () => {}
let offerNextNow = () => {}
let canScrollNow = () => false
let startLinkedNow = () => {}
let notationReflow = false
let ovBind: ReturnType<typeof useOverlay> | null = null
let metBind: ReturnType<typeof useMetronome> | null = null
let setlistBind: ReturnType<typeof useSetlist> | null = null
let sheetBind: { value: boolean } | null = null
let pdfBind: { value: 'idle' | 'busy' | 'error' } | null = null
let slidesBind: { value: 'idle' | 'busy' | 'error' } | null = null
let resetBlocks = () => {}
let clearScoreEditors = () => {}
let canEditNowOf = () => false
let editModeOf: () => EditMode = () => 'none'
let hostSourceOf: () => string = () => props.source ?? ''

const {
  scrolling,
  scrollRoom,
  mul,
  progress,
  etaLabel,
  idle,
  setSubPixel,
  stopScroll,
  startScroll,
  toggleScroll,
  reseatScroll,
  reflowPage,
  pageSpot,
  syncScrollRoom,
  rebuildTimeline,
  clearTimeline,
  stampWritten,
  readPlayhead,
  parkPlayhead,
  zeroPlayhead,
  setSwipePeekHold,
  wake,
  snapIdle,
  clearIdleTimer,
} = useAutoScroll({
  scroller,
  page,
  parsed: () => {
    if (!parsedNow) throw new Error('auto-scroll: chart not ready')
    return parsedNow()
  },
  blocks: () => {
    if (!blocksNow) throw new Error('auto-scroll: blocks not ready')
    return blocksNow()
  },
  barPx: () => {
    if (!barPxNow) throw new Error('auto-scroll: scale not ready')
    return barPxNow()
  },
  notationReflow: () => notationReflow,
  autoHide: () => props.autoHide,
  follow: () => followNow(),
  metRunning: () => metRunningNow(),
  stopMet: () => stopMetNow(),
  dismissEnd: () => dismissEndNow(),
  offerNext: () => offerNextNow(),
  canScroll: () => canScrollNow(),
  startLinked: () => startLinkedNow(),
})

const toast = ref<string | null>(null)
const toastOut = ref(false)
const fs = ref(false)
const zen = ref(false)
const hintOff = ref(false)
const fitSeen = ref(false)
const editSeen = ref(false)
const editHintOff = ref(false)
const toneOpen = ref(false)
const moreOpen = ref(false)

const metOpen = ref(false)
const lens = ref<Lens>(props.lens ?? 'none')
/** Dual chart: show the capo shape above the real chord, song-wide. */
const capoMap = ref(true)
const hideComments = ref(props.hideComments)
const srcOpen = ref(false)
const metaOpen = ref(false)

const {
  session,
  working,
  mode,
  isEdit,
  wMode,
  confirmDiscard,
  dirty,
  lint,
  canUndo,
  canRedo,
  discardLabel,
  touch,
  forceBase,
  publishBatidaSource,
  acceptHostEcho,
  save,
  discard,
  undo,
  redo,
  onDraft,
  applyMeta,
  beginEdit,
  enterEdit,
  exitEdit,
  syncHostSource,
  clearDiscardTimer,
} = useEditSession({
  initialSource: props.source ?? '',
  propMode: () => props.mode,
  editSeen: () => editSeen.value,
  markEditSeen: () => markEditSeen(),
  emitDirty: (value) => emit('dirty', value),
  emitSource: (value) => emit('update:source', value),
  emitSave: (value) => emit('save', value),
  emitMode: (value) => emit('update:mode', value),
  toast: (msg) => toastMsg(msg),
  ov: () => {
    if (!ovBind) throw new Error('edit session: overlay not ready')
    return ovBind
  },
  stopScroll,
  met: () => {
    if (!metBind) throw new Error('edit session: metronome not ready')
    return metBind
  },
  offset,
  capo,
  capoMap,
  zen,
  lens,
  hideComments,
  metOpen,
  capoOpen,
  toneOpen,
  moreOpen,
  metaOpen,
  srcOpen,
  sheet: () => {
    if (!sheetBind) throw new Error('edit session: export sheet not ready')
    return sheetBind
  },
  pdf: () => {
    if (!pdfBind) throw new Error('edit session: pdf job not ready')
    return pdfBind
  },
  slides: () => {
    if (!slidesBind) throw new Error('edit session: slides job not ready')
    return slidesBind
  },
  closeBatida: () => closeBatida(),
  exitEnsaioBatida: () => exitEnsaioBatida(),
  beditReset: () => resetBlocks(),
  clearScoreEditors: () => clearScoreEditors(),
  hostSource: () => hostSourceOf(),
  setlist: () => {
    if (!setlistBind) throw new Error('edit session: setlist not ready')
    return setlistBind
  },
  initialCapo: () => props.initialCapo,
  initialDual: () => props.initialDual,
  scroller,
  mul,
  parkPlayhead,
  canEditNow: () => canEditNowOf(),
  editModeResolved: () => editModeOf(),
})

let toastT = 0
let hintT = 0
let lastFocus: HTMLElement | null = null
let mq: MediaQueryList | null = null
let ro: ResizeObserver | null = null
let headRo: ResizeObserver | null = null
let pageRo: ResizeObserver | null = null
let dockRo: ResizeObserver | null = null
let zenSeen = false
let idleSeen = false

const themeMode = computed(() =>
  props.themeControl === 'host' ? props.theme : theme.value ?? props.theme,
)
function requestTheme() {
  const next = cycleTheme(themeMode.value)
  if (props.themeControl === 'host') emit('update:theme', next)
  else theme.value = next
}
const themeTitle = computed(() => props.themeControl === 'host'
  ? 'Tema controlado pelo site — solicitar alteração'
  : 'Tema claro / escuro / automático')
const effTheme = computed<'light' | 'dark'>(() =>
  themeMode.value === 'auto'
    ? sysDark.value
      ? 'dark'
      : 'light'
    : themeMode.value === 'dark' || themeMode.value === 'stage'
      ? 'dark'
      : 'light',
)
const liveSource = computed(() => working.value)
const audioTracks = computed(() =>
  isEdit.value
    ? { sung: null, playback: null }
    : audioTracksOf(liveSource.value),
)
const audioKinds = computed(() => audioKindsOf(audioTracks.value))
const audioKind = ref<AudioKind>('sung')
watch(
  audioTracks,
  (t) => {
    const fallback = defaultAudioKind(t)
    if (!fallback) return
    if (!t[audioKind.value]) audioKind.value = fallback
  },
  { immediate: true },
)
const audioUrl = computed(() => audioTracks.value[audioKind.value])
const parsed = computed(() => parse(liveSource.value))
parsedNow = () => parsed.value
const audioArt = computed(() => {
  if (isEdit.value) return null
  return resolveRehearsalArt(audioArtOf(liveSource.value), props.defaultAudioArt)
})
const audioTitle = computed(() => displaySongTitle(parsed.value.meta.title))
const audioArtist = computed(() => audioArtistOf(parsed.value.meta))
const audioAlbum = computed(() => AUDIO_KIND_LABEL[audioKind.value])
const audioArtwork = computed(() => {
  const resolved = resolveRehearsalArt(audioArtOf(liveSource.value), props.defaultAudioArt)
  if (resolved?.url) {
    return mediaSessionArtwork({ url: resolved.url, width: resolved.width, height: resolved.height })
  }
  return mediaSessionArtwork({
    url: defaultArt,
    width: AUDIO_ART_DEFAULT_PX,
    height: AUDIO_ART_DEFAULT_PX,
  })
})
const fatal = computed(() => {
  if (props.forceParseError) return 'Erro de leitura simulado, para revisar este estado.'
  return isParseFatal(liveSource.value, parsed.value)
})
const isLoading = computed(() => props.loading)
const isEmpty = computed(() => !isLoading.value && !liveSource.value.trim())
const isPopulated = computed(() => !isLoading.value && !isEmpty.value && !fatal.value)
/**
 * Zen only fades the chrome. The page pad stays put — reclaiming the band
 * used to shove the line under the eye. Idle auto-hide follows the same rule.
 */
const {
  phone,
  compact,
  bp,
  pageMax,
  padX,
  chromePad,
  chromeTop,
  padBottom,
  countLeft,
  countTop,
  dockCtrlH,
  dockTypeW,
  dockPlayLabeled,
} = useChromeLayout({ width, fs, scrolling, visibleDockBottom, headH })
/**
 * Hard gate: no `{duration:}`, no auto-scroll. A BPM and unmarked chords are
 * not a duration. A chart that fits the frame also has nowhere to go. The
 * button stays live while the scroll runs — that is the only way to stop it.
 */
const hasDuration = computed(() => hasSongDuration(parsed.value.meta.duration))
const canScroll = computed(() => hasDuration.value && scrollRoom.value > 1)
canScrollNow = () => canScroll.value
const scrollOff = computed(() => !canScroll.value && !scrolling.value)
const meta = computed(() => parsed.value.meta)

/** Batida from `{x_titan_strum:}` / `{x_titan_strum_set:}` — toggle is the reader's choice. */
const strumSet = computed(() => readStrumPatterns(liveSource.value))
const strumPattern = computed(() => {
  const set = strumSet.value
  return set.patterns[set.activeIndex] ?? set.patterns[0] ?? null
})
const canPickStrum = computed(() => strumSet.value.patterns.length > 1)
const strumOn = ref(false)
/** Ensaio Batida chrome profile — not a reading lens. */
const rehearsalFocus = ref<RehearsalFocus>(props.rehearsalFocus ?? 'off')
/** Snapshot of sound prefs before entering Ensaio Batida (restore on exit). */
let focusSoundSnap: { sound: boolean; strum: boolean; strumOn: boolean } | null = null
const batidaOpen = ref(false)
const batidaDraft = ref<StrumPattern | null>(null)
const batidaDraftSet = ref<StrumPatternSet | null>(null)
const strumDock = ref<HTMLElement | null>(null)
const strumH = ref(0)
let strumRo: ResizeObserver | null = null
const hasStrum = computed(() => !!strumPattern.value?.slots.length)
const strumVisible = computed(() => strumOn.value && !!strumPattern.value && !isEdit.value)
watch(hasStrum, (ok) => {
  if (!ok) {
    strumOn.value = false
    exitEnsaioBatida()
  }
})
watch(
  () => props.rehearsalFocus,
  (next) => {
    const v = next ?? 'off'
    if (v === rehearsalFocus.value) return
    setRehearsalFocus(v)
  },
)
function toggleStrum() {
  if (!hasStrum.value) return
  strumOn.value = !strumOn.value
}

function normalizeBatidaPattern(p: StrumPattern): StrumPattern {
  return repairStrumPattern({
    ...p,
    slots: p.slots.map((s) => ({ ...s })),
  })
}

function openBatidaCreate() {
  if (!canEditBatida.value) return
  const tempo = sheetBpm(meta.value.tempo)
  const meter = String(meta.value.time ?? '').trim() || '4/4'
  const p = emptyPattern({
    bpm: tempo,
    meter,
    grid: gridFromDensity(meter, 4),
    label: 'Padrão',
  })
  batidaDraft.value = p
  batidaDraftSet.value = { activeIndex: 0, patterns: [p] }
  batidaOpen.value = true
}

function openBatidaEdit() {
  if (!canEditBatida.value) return
  const set = strumSet.value
  if (!set.patterns.length) {
    openBatidaCreate()
    return
  }
  const patterns = set.patterns.map(normalizeBatidaPattern)
  const activeIndex = Math.max(0, Math.min(set.activeIndex, patterns.length - 1))
  batidaDraftSet.value = { activeIndex, patterns }
  batidaDraft.value = patterns[activeIndex]!
  batidaOpen.value = true
}

function closeBatida() {
  strumSound.stopPreview()
  batidaOpen.value = false
  batidaDraft.value = null
  batidaDraftSet.value = null
}

function onBatidaTogglePreview(payload: { pattern: StrumPattern; barBeats: number }) {
  const pattern = payload.pattern
  const bpm = pattern.bpm || sheetBpm(meta.value.tempo) || met.bpm.value
  // barBeats must be the sheet's grid math (meter × pulse), not a parallel guess.
  strumSound.togglePreview(pattern, bpm, payload.barBeats)
}

function cycleStrumPattern() {
  const set = strumSet.value
  if (set.patterns.length < 2) return
  const next: StrumPatternSet = {
    activeIndex: (set.activeIndex + 1) % set.patterns.length,
    patterns: set.patterns,
  }
  publishBatidaSource(writeStrumPatterns(liveSource.value, next))
}

function saveBatidaSet(set: StrumPatternSet) {
  if (!set.patterns.every(isCompleteStrumPattern)) return
  const patterns = set.patterns.map(normalizeBatidaPattern)
  const activeIndex = Math.max(0, Math.min(set.activeIndex, Math.max(0, patterns.length - 1)))
  publishBatidaSource(writeStrumPatterns(liveSource.value, { activeIndex, patterns }))
  closeBatida()
  strumOn.value = patterns.length > 0
  toastMsg(patterns.length ? 'Batida salva' : 'Batida apagada')
}

function deleteBatida() {
  publishBatidaSource(writeStrumPatterns(liveSource.value, { activeIndex: 0, patterns: [] }))
  closeBatida()
  strumOn.value = false
  toastMsg('Batida apagada')
}
function bindStrumDock(el: unknown) {
  const node = (el as HTMLElement | null) ?? null
  strumDock.value = node
  strumRo?.disconnect()
  strumRo = null
  if (!node || typeof ResizeObserver === 'undefined') {
    strumH.value = 0
    return
  }
  strumRo = new ResizeObserver(() => syncStrumH())
  strumRo.observe(node)
  syncStrumH()
}
function syncStrumH() {
  const el = strumDock.value
  if (!el) {
    strumH.value = 0
    return
  }
  const h = Math.round(el.getBoundingClientRect().height)
  if (Math.abs(h - strumH.value) > 1) strumH.value = h
}
watch(strumVisible, async (on) => {
  if (!on) {
    strumH.value = 0
    return
  }
  await nextTick()
  syncStrumH()
})

/** Gap between the identity bar and the first lyric. */
const pageGap = computed(() => (fs.value ? 6 : compact.value ? 10 : 14))
const strumSpacer = computed(() => (strumVisible.value ? Math.max(72, strumH.value + 10) : 0))
const notationOutset = computed(() => {
  const pageWidth = pageMax.value === '100%' ? width.value : Math.min(width.value, parseFloat(pageMax.value))
  const contentWidth = pageWidth - 2 * parseFloat(padX.value)
  return `${Math.max(0, (Math.min(width.value, 1280) - 32 - contentWidth) / 2)}px`
})
const pagePad = computed(() => {
  // Head is overlay-only. Top pad keeps the lyric under the card (and under
  // the batida dock when it is open). Zen drops a plain name into that band —
  // never a second card in the page, or overscroll shows two bars.
  const belowChrome =
    Math.max(40, headH.value || 56) + pageGap.value + (isEdit.value ? 0 : strumSpacer.value)
  const top = Math.round(chromeTop.value + belowChrome)
  return `${top}px ${padX.value} ${padBottom.value}`
})
const pageBodyPad = computed(() => '0')
/** Batida dock: pinned under the title; scrolling the chart must not take it. */
const strumDockStyle = computed(() => {
  const col =
    pageMax.value === '100%'
      ? `left:${padX.value};right:${padX.value};`
      : `left:max(${padX.value}, calc((100% - ${pageMax.value}) / 2));right:max(${padX.value}, calc((100% - ${pageMax.value}) / 2));`
  return `position:absolute;top:${countTop.value};${col}z-index:13;pointer-events:auto;`
})

/**
 * Single write role for this mount. Host picks via `editMode` (or deprecated
 * `modes`). No ModePick — one role per instance.
 */
const editModeResolved = computed<EditMode>(() =>
  resolveEditMode({ editMode: props.editMode, modes: props.modes }),
)
editModeOf = () => editModeResolved.value
/** @deprecated internal alias — prefer editModeResolved */
const modes = computed<WriteMode[]>(() => {
  const m = editModeResolved.value
  if (m === 'none') return []
  return [m]
})
const guard = useSurfaceGuard({
  root,
  immersive: fs,
  enabled: computed(() => props.surfaceGuard !== false),
})

const setlist = useSetlist({
  songs: computed(() => props.songs),
  loadSong: computed(() => props.loadSong),
  prefetchAll: computed(() => props.prefetchAll === true),
})
setlistBind = setlist
dismissEndNow = () => setlist.dismissEnd()
offerNextNow = () => setlist.offerNext()
const audioIdentity = computed(
  () => (setlist.on.value ? (setlist.current.value?.id ?? '') : props.songId || ''),
)
const audioKey = computed(
  () => `${audioTracks.value.sung ?? ''}|${audioTracks.value.playback ?? ''}`,
)
const audio = useAudioRef(audioUrl, { identity: audioIdentity })

/**
 * What TitanChordpro is reading. In a rehearsal the list decides; otherwise the
 * host's `source` is the chart, exactly as before. A song still on its way
 * reads as empty — `songFail` and the busy marks say why.
 */
const hostSource = computed(() =>
  setlist.on.value ? (setlist.currentSource.value ?? '') : (props.source ?? ''),
)
hostSourceOf = () => hostSource.value

watch(
  () => (setlist.on.value ? setlist.cacheSources.value : [hostSource.value]),
  (sources) => {
    for (const src of sources) {
      if (!src) continue
      for (const url of rehearsalAudioUrls(src)) void fillAudioCache(url)
    }
  },
  { immediate: true },
)

/** A song of the list still on its way: empty, but not "no chart loaded". */
const songLoading = computed(
  () => setlist.on.value && setlist.currentSource.value === null && !setlist.failing.value,
)
/**
 * The host is driving content through `songs` and handed over none — still
 * fetching the rehearsal, or a rehearsal with no repertoire yet. Either way
 * nothing is selected, which is not the same as a song that lacks a chart.
 */
const listEmpty = computed(() => Array.isArray(props.songs) && props.songs.length === 0)
const isOnline = useOnline(computed(() => props.online))
const suggestNeedsNet = computed(() => !!props.persistSuggestion && !isOnline.value)

/** The offer sits above the dock, and the dock grows while the chart scrolls. */
const offerBottom = computed(() =>
  compact.value
    ? `calc(env(safe-area-inset-bottom) + ${scrolling.value ? 186 : 130}px)`
    : `${scrolling.value ? 148 : 90}px`,
)

const ov = useOverlay({
  // In a rehearsal the identity is the song's, so a personal version follows
  // the right one through the list. Outside a list, the host id / official
  // title is the key — never the draft title, or a local meta edit would move
  // the overlay and orphan the reader's version.
  songId: computed(() => {
    if (setlist.on.value) return setlist.current.value?.id ?? 'song'
    if (props.songId) return props.songId
    return parse(normalizeSource(hostSource.value)).meta.title || 'song'
  }),
  version: computed(() => props.version || 'v1'),
  // Line indices are what an adjustment anchors on: the overlay lives in the
  // same normalised text the parser numbers.
  hostSource: computed(() => normalizeSource(hostSource.value)),
  title: computed(() => meta.value.title ?? ''),
  suggestions: computed(() => props.suggestions !== false),
  actorKey: computed(() => props.actorKey),
  actorName: computed(() => props.actorName),
  suggestionQueue: computed(() => props.suggestionQueue),
  store,
  toast: (m) => toastMsg(m),
  // While an edit is in flight the draft is the truth; anything else that
  // moves the base has to reach the screen at once.
  onBaseChange: () => {
    if (!isEdit.value) forceBase()
  },
  onSaveContent: (text) => {
    // The host persists this by writing it back into `source` (the demo does).
    // That echo is the chart just saved, not a different song: without this
    // the source watcher resets the screen and closes the suggestion review
    // while other requests are still open.
    acceptHostEcho(text)
    emit('save-content', text)
  },
  persistSuggestion: computed(() => props.persistSuggestion),
  online: isOnline,
  loadScoreAsset: async (src) => {
    if (props.loadBundleAsset) return props.loadBundleAsset(src, 'score')
    const url = new URL(props.resolveScore?.(src) ?? src, document.baseURI)
    if (!['http:', 'https:', 'blob:'].includes(url.protocol)) throw new Error('Referência do solo inválida')
    const response = await fetch(url.href)
    if (!response.ok) throw new Error('Não foi possível abrir o arquivo do solo')
    return { bytes: new Uint8Array(await response.arrayBuffer()), contentType: response.headers.get('content-type') ?? undefined }
  },
  uploadScore: computed(() => props.uploadScore),
  onSuggestionCreated: (s) => emit('suggestion-created', s),
  onSuggestionAccepted: (p) => emit('suggestion-accepted', p),
  onSuggestionRefused: (p) => emit('suggestion-refused', p),
  onSuggestionQueue: (q) => emit('update:suggestionQueue', q),
})
ovBind = ov

const phoneSub = computed(
  () =>
    meta.value.subtitle ||
    [meta.value.tempo ? `${meta.value.tempo} BPM` : '', meta.value.time || '', meta.value.duration || '']
      .filter(Boolean)
      .join(' · '),
)
/** Compact chip on the edit bar: what the dedicated meta dialog owns. */
const metaSummary = computed(() => {
  const bits = [
    meta.value.key || '',
    meta.value.tempo ? `${meta.value.tempo} BPM` : '',
    meta.value.time || '',
    meta.value.duration || '',
  ].filter(Boolean)
  return bits.join(' · ') || 'preencher'
})
const metaGaps = computed(() => missingOf({
  title: meta.value.title,
  subtitle: meta.value.subtitle,
  key: meta.value.key,
  tempo: meta.value.tempo != null ? String(meta.value.tempo) : '',
  time: meta.value.time,
  duration: meta.value.duration,
}))
const metaGapLabel = computed(() => {
  const gaps = metaGaps.value
  if (!gaps.length) return ''
  const w = gaps.map((k) => MISSING_LABEL[k] ?? k)
  return w.length > 1 ? `Falta ${w.slice(0, -1).join(', ')} e ${w[w.length - 1]}` : `Falta ${w[0]}`
})
const hasKey = computed(() => !!meta.value.key)
const flats = computed(() => usesFlats(meta.value.key))
const viewSemis = computed(() => (isEdit.value ? 0 : offset.value))
const originalKey = computed(() => meta.value.key || '')
const shownKey = computed(() =>
  originalKey.value ? transposeToken(originalKey.value, offset.value, flats.value) : '',
)
const {
  sheet,
  pdf,
  slides,
  ppsx,
  bundleBusy,
  bundleError,
  pdfExportError,
  exportHasNotation,
  exportAlerts,
  doExportCho,
  doExportBundle,
  doExportPdf,
  doExportSlides,
  doExportPpsx,
} = useExport({
  source: () => (ov.exportOrig.value ? ov.official.value : liveSource.value),
  semitones: () => offset.value,
  capo: () => capo.value,
  title: () => meta.value.title,
  key: () => shownKey.value || null,
  personal: () => !ov.exportOrig.value && ov.hasOverlay.value,
  accent: () => props.accent,
  pdfShouldFail: () => props.pdfShouldFail,
  slidesShouldFail: () => props.slidesShouldFail,
  ppsxShouldFail: () => props.ppsxShouldFail,
  resolveScore: () => props.resolveScore,
  resolveImage: () => props.resolveImage,
  loadBundleAsset: () => props.loadBundleAsset,
  defaultAudioArt: () => props.defaultAudioArt,
  coverImage: () => props.coverImage,
  slidesImage: () => props.slidesImage,
  tabRhythm: () => tabRhythmPreference.value.value,
  toast: (msg) => toastMsg(msg),
})
sheetBind = sheet
pdfBind = pdf
slidesBind = slides
const playingKey = computed(() =>
  originalKey.value ? transposeToken(originalKey.value, viewSemis.value, flats.value) : '',
)
const toneLabel = computed(() => {
  if (!originalKey.value) return ''
  const bits = [originalKey.value]
  if (offset.value && playingKey.value && playingKey.value !== originalKey.value) {
    bits.push(`tocando em ${playingKey.value}`)
  }
  if (hasCapo.value) bits.push(`capo ${capo.value}`)
  return bits.join(' · ')
})
const songKeyCaption = computed(() => {
  if (!originalKey.value || !offset.value || !playingKey.value) return ''
  if (playingKey.value === originalKey.value) return ''
  return `tocando em ${playingKey.value}`
})
/** The shapes a capo player frets: `capo` frets below what sounds. */
const shapeKey = computed(() => transposeToken(meta.value.key || '', viewSemis.value - capo.value, flats.value))
const fitOn = computed(() => (isEdit.value ? false : (fit.value ?? props.fitDefault)))
const activeLens = computed<Lens>(() => (isEdit.value ? 'none' : lens.value))
const layout = computed(() =>
  layoutChartFull(parsed.value, {
    semitones: viewSemis.value,
    capo: capo.value,
    dual: capoMap.value,
    lens: activeLens.value,
    editing: isEdit.value,
  }),
)
const blocks = computed(() => {
  const all = layout.value.blocks
  // Hiding rehearsal comments is a reading lens, not an edit: the text stays
  // in the file, and the editor always sees it.
  if (isEdit.value || !hideComments.value) return all
  return all.filter((b) => b.kind !== 'comment' && b.kind !== 'note')
})
blocksNow = () => blocks.value
const twin = computed(() => layout.value.twin)
const legend = computed(() => layout.value.legend)
const capoPairs = computed(() => layout.value.capoPairs)

/**
 * Writing the chart by its blocks (E1/E2). Every action rewrites the source —
 * a block that was moved, hidden, transposed or capoed says so in the file,
 * so it survives a reload, an undo and a re-parse.
 */
const bedit = useBlockEdit({
  source: liveSource,
  blocks,
  editing: isEdit,
  wMode,
  songCapo: capo,
  flats,
  root,
  scroller,
  write: (next, message) => {
    session.replace(next)
    touch()
    if (message) toastMsg(message)
  },
  toast: (m) => toastMsg(m),
})
resetBlocks = () => bedit.reset()
const editScale = computed(() => editTypeScale(bias.value, compact.value))
/** The chart's own chord names, so a new one is a tap and not a spelling test. */
const chordVocab = computed(() =>
  Array.from(
    new Set(
      (liveSource.value.match(/\[([^\]]+)\]/g) ?? [])
        .map((t) => t.slice(1, -1))
        .filter((t) => /^[A-G]/.test(t)),
    ),
  ).slice(0, 12),
)
const insertItems = computed(() => {
  const out: Array<{ icon: TitanChordproIconName; label: string; go: () => void }> = [
    { icon: 'music2', label: 'Partitura ou solo', go: () => newScore() },
  ]
  if (props.uploadScore)
    out.push({ icon: 'music2', label: 'Guitar Pro / MusicXML', go: () => { externalEd.value = { text: '' }; bedit.insertMenu.value = false } })
  // An upload goes to the host. A catalogue is the scores it already has.
  // Neither means the entry would open an empty dialog.
  if (props.uploadImage || props.images.length)
    out.push({ icon: 'image', label: 'Imagem de partitura', go: () => bedit.openPicker('insert') })
  out.push(
    { icon: 'msgQuote', label: 'Coment\u00e1rio de ensaio', go: () => bedit.insertBlock('comment') },
    { icon: 'alignLeft', label: 'Nova estrofe', go: () => bedit.insertBlock('lyrics') },
    { icon: 'repeatBar', label: 'Refr\u00e3o', go: () => bedit.insertBlock('chorus') },
  )
  return out
})
const scale = computed(() => {
  const s = typeScale(
    bias.value,
    fitOn.value,
    width.value,
    maxPlainChars(blocks.value),
    twin.value,
    activeLens.value,
  )
  if (activeLens.value !== 'letra') return s
  // No chord lane: the lyric sits where the chord used to, and wrap is tighter.
  return { ...s, chordBox: '0px', chordBoxPlain: '0px' }
})
barPxNow = () => scale.value.barPx
const chartScale = computed(() => {
  const { barPx: _barPx, ...rest } = scale.value
  return rest
})
const hintFit = computed(
  () => isPopulated.value && !isEdit.value && !fitSeen.value && !hintOff.value,
)
const hasOffset = computed(() => offset.value !== 0)
const hasCapo = computed(() => capo.value > 0)
const hasReset = computed(() => hasOffset.value)
const fileCapo = computed(() => Math.max(0, Number(meta.value.capo) || 0))
const canEditNow = computed(
  () => !isEdit.value && isPopulated.value && props.canEdit && modes.value.length > 0,
)
canEditNowOf = () => canEditNow.value
/** The owner's entry into the queue: only where a chart can be changed at all. */
const queueEntry = computed(
  () =>
    !isEdit.value &&
    isPopulated.value &&
    modes.value.includes('persisted') &&
    ov.pendingCount.value > 0,
)
const queueCount = computed(() =>
  modes.value.includes('persisted') ? ov.pendingCount.value : 0,
)
const showMine = computed(() => !isEdit.value && isPopulated.value && ov.hasOverlay.value)
const fixTuneLabel = computed(() =>
  offset.value || capo.value
    ? 'Fixar o tom atual nesta cifra'
    : 'Tom fixo: nenhum (ajuste o tom para fixar)',
)
const editBadge = computed(() => (wMode.value === 'persisted' ? 'Para todos' : 'Só para mim'))
const capoLabel = computed(() => (capo.value === 0 ? 'Sem capo' : `${capo.value}ª casa`))
/** Fallback copy when there are no chord tokens to chip. */
const capoHint = computed(() => {
  if (capo.value === 0) {
    return fileCapo.value ? `Cifra sugere capo ${fileCapo.value}` : 'A cifra fica no tom real.'
  }
  if (!capoPairs.value.length) return `Formas de ${shapeKey.value}`
  return ''
})
/** Distinct new shapes for the capo hint chips (one row, scroll sideways). */
const capoShapes = computed(() => capoPairs.value.map((p) => p.shape))
/** The capo button says whether both chords are on screen. */
const capoBtnLabel = computed(() =>
  capo.value === 0 ? 'Capo' : twin.value ? `Dual · capo ${capo.value}` : `Capo ${capo.value}`,
)
/**
 * Nothing else teaches the three touch rules: tapping a line edits the lyric,
 * holding a chord drags it to a syllable, the grip selects and reorders. Shown
 * once, and never again after the first edit lands.
 */
/** Which lines the selected block owns, so the source pane can reach them. */
const srcSel = computed(() => {
  const bi = bedit.sel.value
  if (bi === null) return null
  const sp = blockSpan(blocks.value, bi)
  return sp ? { label: bedit.selLabel.value, li0: sp.li0, li1: sp.li1 } : null
})

const editHint = computed(
  () => isEdit.value && !editSeen.value && !editHintOff.value && !srcOpen.value && !toast.value,
)

const mapOn = computed(() => capoMap.value && capo.value > 0)
const chordLens = ref<Exclude<Lens, 'letra'>>(props.lens === 'nashville' ? 'nashville' : 'none')
const nashvilleOn = computed(() => activeLens.value === 'nashville')
const nashvilleHint = computed(() => {
  if (!hasKey.value) return 'Precisa de {key:} na cifra'
  if (twin.value) return 'Graus nos dois grupos'
  return nashvilleOn.value ? 'graus' : '1 4 5 6m'
})
/**
 * Source pane / structural deletes stay "for everyone". Meta is editable in
 * both edits: content writes the official header; local keeps it on the
 * personal overlay (suggestion submit comes later). songId is pinned to the
 * host identity so a local title change cannot orphan the overlay key.
 */
const isContentEdit = computed(() => isEdit.value && wMode.value === 'persisted')
/** Batida create/edit follows the write role: local (overlay + suggest) or persisted. */
const canEditBatida = computed(
  () => isEdit.value && (wMode.value === 'local' || wMode.value === 'persisted'),
)

const exportKeyNote = computed(() =>
  meta.value.key ? `em ${playingKey.value}${capo.value ? ` · capo ${capo.value}` : ''}` : '',
)

/** Identity of the song for the per-song tempo memory. */
const songKey = computed(() =>
  [meta.value.title || '', meta.value.artist || ''].join('|').trim() || 'sem-titulo',
)
const diagramOpen = ref(false)
const diagramInstrument = ref<DiagramInstrumentChoice>('guitar')
const diagramTarget = ref<{ shapeName: string; concert: string; capoFret: number } | null>(null)
let resumeScroll = false
let resumeMet = false

function openDiagram(payload: { shapeName: string; concert: string; capoFret: number }) {
  if (activeLens.value === 'letra') return
  if (props.capabilities?.diagrams === false) return
  if (isEdit.value) return
  resumeScroll = scrolling.value
  resumeMet = met.running.value
  if (resumeScroll) stopScroll()
  if (met.running.value) met.stop()
  diagramTarget.value = payload
  diagramOpen.value = true
}

function closeDiagram() {
  if (!diagramOpen.value) return
  diagramOpen.value = false
  const scroll = resumeScroll
  const metOn = resumeMet
  resumeScroll = false
  resumeMet = false
  if (scroll) startScroll()
  if (metOn && !met.running.value) met.start({ silent: true })
}

function setDiagramInstrument(next: DiagramInstrumentChoice) {
  if (diagramInstrument.value === next) return
  diagramInstrument.value = next
  persistPrefs()
}

const met = useMetronome({
  songKey,
  tempo: computed(() => meta.value.tempo),
  time: computed(() => meta.value.time),
  store,
  scrolling,
  scrollable: canScroll,
  onFollowStart: () => startScroll(),
  onFollowStop: () => stopScroll(),
  onPanelClose: () => (metOpen.value = false),
})
metBind = met
followNow = () => met.follow.value
metRunningNow = () => met.running.value
stopMetNow = () => met.stop()
const strumSound = useStrumSound()
startLinkedNow = () => {
  const silent = shouldRollSilent(rehearsalFocus.value)
  if (!silent) {
    applySoundSource('batida', false)
    strumOn.value = true
    if (strumSound.enabled.value) void strumSound.arm()
  }
  met.start({ silent })
}
const scrollTitle = computed(() => {
  if (scrollOff.value) {
    if (!hasDuration.value) return 'Sem duração na cifra — a rolagem precisa de {duration:}'
    return 'A cifra inteira cabe na tela — não há o que rolar'
  }
  if (
    met.follow.value &&
    rehearsalFocus.value !== 'batida' &&
    (met.sound.value || strumSound.enabled.value)
  ) {
    return 'Rolar · sem som (espaço) — use o metrônomo ou Ensaio batida para ouvir'
  }
  if (rehearsalFocus.value === 'batida') return 'Rolar com batida (espaço)'
  return 'Auto-rolagem (espaço)'
})
/** Decode the kit as soon as a chart has batida, or the editor opens to create one. */
watch(
  [hasStrum, batidaOpen],
  ([has, open]) => {
    if (has || open) void strumSound.preload()
  },
  { immediate: true },
)
watch(
  () => met.running.value,
  (on) => {
    // Starting the metronome is a user gesture — unlock AudioContext here so
    // the first strum is not stuck behind a pending resume(). Silent Rolar
    // must not arm the kit.
    if (on && !met.runSilent.value && strumSound.enabled.value) void strumSound.arm()
  },
)
watch(
  [
    () => met.beatClock.value,
    () => met.running.value,
    () => met.bpm.value,
    () => met.runSilent.value,
    () => met.countIn.value,
    strumPattern,
    () => strumSound.enabled.value,
    () => met.sound.value,
  ],
  () => {
    if (!met.running.value) {
      if (!strumSound.previewRunning.value) strumSound.reset()
      return
    }
    const ch = effectiveChannels({
      sound: met.sound.value,
      strumSound: strumSound.enabled.value,
      rollSilent: met.runSilent.value,
    })
    // Count-in bar is click/visual only — batida stays mute until the chart joins.
    if (
      !strumAudibleDuringRun({
        strumSound: ch.strum,
        rollSilent: false,
        countIn: met.countIn.value,
      })
    ) {
      if (met.countIn.value > 0) strumSound.reset()
      return
    }
    // View playback follows the saved chart pattern (not the draft).
    // BPM feeds attack lookahead so the strum peak lands on the highlight.
    strumSound.sync(met.beatClock.value, strumPattern.value, met.bar.value, met.bpm.value)
  },
)


/**
 * Count-in is already a start: the chart has not moved yet, but Rolar has
 * been asked and has to read as Parar — a second tap cancels, it does not
 * skip the bar.
 */
const rollLive = computed(
  () => scrolling.value || (met.follow.value && met.running.value && canScroll.value),
)
const chromeHidden = computed(
  () => (zen.value || (rollLive.value && idle.value)) && !sheet.value && !isEdit.value,
)
watch(chromeHidden, (gone) => {
  if (gone && !zen.value && !idleSeen) {
    idleSeen = true
    toastMsg('Mova para mostrar')
  }
})
watch(rollLive, (on) => {
  if (on && props.autoHide) snapIdle()
})
const toastBottom = computed(() => {
  if (chromeHidden.value) {
    return compact.value ? 'calc(16px + env(safe-area-inset-bottom))' : '22px'
  }
  const base = compact.value ? 124 : 78
  return `${base + (isEdit.value && bedit.sel.value !== null ? 56 : 0)}px`
})
/** The title strip is the beat when the panel asked for it — it cannot go away. */
const headHidden = computed(
  () => chromeHidden.value && !(met.pulseHead.value && met.running.value),
)
const metHit = computed(() =>
  metronomePulseHit(met.running.value, met.beat.value, met.beatClock.value),
)
const metHitMs = computed(() => `${Math.round(30000 / Math.max(30, met.bpm.value))}ms`)
const headHitClass = computed(() => {
  if (!met.pulseHead.value || !metHit.value) return ''
  return metHit.value === '1' ? 'titan-chordpro-head-hit-1' : 'titan-chordpro-head-hit-n'
})
const rootHitClass = computed(() => {
  if (!metHit.value) return ''
  return metHit.value === '1' ? 'titan-chordpro-met-hit-1' : 'titan-chordpro-met-hit-n'
})
const dockPlayLabel = computed(() => (dockPlayLabeled.value ? (rollLive.value ? 'Parar' : 'Rolar') : ''))
const dockPlayName = computed(() => (rollLive.value ? 'Parar' : 'Rolar'))
const metPulseTitle = computed(() =>
  met.follow.value && rollLive.value ? 'Parar o metrônomo e a rolagem (M)' : 'Parar o metrônomo (M)',
)

function toggleMetPanel() {
  metOpen.value = !metOpen.value
  capoOpen.value = false
}

function persistPrefs() {
  updateUserPreferences(store, {
    ...(props.themeControl === 'host' ? {} : { theme: theme.value ?? undefined }),
    bias: bias.value || undefined,
    fit: fit.value ?? undefined,
    metSound: met.sound.value || undefined,
    metStrumSound: strumSound.enabled.value || undefined,
    metPulseHead: met.pulseHead.value || undefined,
    metFollow: met.follow.value === false ? false : undefined,
    metCountIn: met.countInOn.value === false ? false : undefined,
    lens: lens.value === 'none' ? undefined : lens.value,
    hideComments: hideComments.value || undefined,
    diagramInstrument: diagramInstrument.value === 'guitar' ? undefined : diagramInstrument.value,
  })
}

function markEditSeen() {
  editSeen.value = true
  editHintOff.value = true
  try {
    store.set(STORE_KEYS.editSeen, '1')
  } catch {
    /* storage denied — the hint comes back next time, which is harmless */
  }
}

const TOAST_HOLD_MS = 2400
const TOAST_FADE_MS = 420

function toastMsg(msg: string) {
  toast.value = msg
  toastOut.value = false
  window.clearTimeout(toastT)
  toastT = window.setTimeout(() => {
    toastOut.value = true
    toastT = window.setTimeout(() => {
      toast.value = null
      toastOut.value = false
    }, TOAST_FADE_MS)
  }, TOAST_HOLD_MS)
}

// ---------------------------------------------------------------- notation
// Collapse of tab and score blocks. The scroll clock lives in useAutoScroll.

// Display choices belong to this reader, keyed by song and notation identity.
const notationSongId = computed(() => setlist.on.value
  ? (setlist.current.value?.id ?? '')
  : (props.songId || parse(normalizeSource(hostSource.value)).meta.title || 'song'))
const notationIds = computed(() => notationBlockIds(blocks.value))
const { choices: notationChoices, save: saveNotationChoice } = useNotationPrefs(store, notationSongId)
const collapsedNotation = computed(() => new Set(
  notationIds.value.filter((id): id is string => !!id && notationChoices.value[id]?.collapsed === true),
))
let notationReflowId = 0

async function toggleNotation(bi: number) {
  const el = scroller.value
  const block = blocks.value[bi]
  const id = notationIds.value[bi]
  if (!el || !block || !id || notationReflow) return
  const viewport = el.getBoundingClientRect()
  const readingY = viewport.top + viewport.height * 0.35
  const targetNode = el.querySelector<HTMLElement>(`[data-block="${bi}"]`)
  const candidates = [...el.querySelectorAll<HTMLElement>('.titan-chordpro-reading-row, [data-block]')]
  const anchor = candidates.find(node => {
    if (node.closest(`[data-block="${bi}"]`)) return false
    const r = node.getBoundingClientRect()
    return r.bottom > readingY && r.top < viewport.bottom
  }) ?? targetNode
  const anchorTop = anchor?.getBoundingClientRect().top ?? 0
  const atStart = el.scrollTop <= 1
  const savedAnchor = el.style.overflowAnchor
  notationReflow = true
  const ticket = ++notationReflowId
  el.style.overflowAnchor = 'none'
  // Disable fractional translation before taking fresh DOM measurements.
  setSubPixel(0)
  const willCollapse = !collapsedNotation.value.has(id)
  saveNotationChoice(id, { collapsed: willCollapse })
  await nextTick()
  clearTimeline()
  syncScrollRoom()
  if (scrolling.value) {
    // Keep the existing playhead. Do not infer time from the browser's clamp
    // or anchor adjustment when hundreds of pixels disappear above the reader.
    reseatScroll()
  } else {
    if (atStart) el.scrollTop = 0
    else if (anchor?.isConnected) {
      // If the reference itself filled the screen, its old top may be several
      // screens above. Bring its compact handle to the reading line instead
      // of leaving the reader stranded much later in the lyrics.
      const keepAt = anchor === targetNode && willCollapse ? readingY : anchorTop
      el.scrollTop += anchor.getBoundingClientRect().top - keepAt
    }
    stampWritten(el.scrollTop)
    rebuildTimeline()
  }
  requestAnimationFrame(() => {
    if (ticket !== notationReflowId) return
    el.style.overflowAnchor = savedAnchor
    notationReflow = false
  })
}

function applySoundSource(source: SoundSource, softClick: boolean) {
  const next = prefsFromSource(source, softClick)
  met.setSound(next.sound)
  strumSound.setEnabled(next.strumSound)
}

function setRehearsalFocus(next: RehearsalFocus) {
  if (next === rehearsalFocus.value) return
  if (next === 'batida') {
    if (!hasStrum.value) return
    focusSoundSnap = {
      sound: met.sound.value,
      strum: strumSound.enabled.value,
      strumOn: strumOn.value,
    }
    rehearsalFocus.value = 'batida'
    applySoundSource('batida', false)
    strumOn.value = true
  } else {
    rehearsalFocus.value = 'off'
    if (focusSoundSnap) {
      met.setSound(focusSoundSnap.sound)
      strumSound.setEnabled(focusSoundSnap.strum)
      strumOn.value = focusSoundSnap.strumOn
      focusSoundSnap = null
    }
  }
  emit('update:rehearsalFocus', rehearsalFocus.value)
}

function toggleEnsaioBatida() {
  setRehearsalFocus(rehearsalFocus.value === 'batida' ? 'off' : 'batida')
}

function exitEnsaioBatida() {
  if (rehearsalFocus.value === 'batida') setRehearsalFocus('off')
}

// -------------------------------------------------------------------- controls

function shift(n: number) {
  if (!hasKey.value) return
  stopScroll()
  offset.value = Math.max(-11, Math.min(11, offset.value + n))
  zeroPlayhead()
  if (scroller.value) scroller.value.scrollTop = 0
}

function resetTone() {
  stopScroll()
  offset.value = 0
}

function setCapo(n: number) {
  capo.value = Math.max(0, Math.min(9, n))
}

function toggleMap() {
  capoMap.value = !capoMap.value
}

function setLens(value: Lens) {
  if (lens.value === value) return
  if (value !== 'letra') chordLens.value = value
  lens.value = value
  emit('update:lens', value)
}

function showCifra() {
  setLens(chordLens.value)
}

function showLetra() {
  setLens('letra')
}

function toggleReading() {
  if (lens.value === 'letra') showCifra()
  else showLetra()
}

function toggleNashville() {
  if (!hasKey.value) return
  setLens(lens.value === 'nashville' ? 'none' : 'nashville')
}

function setHideComments(on: boolean) {
  hideComments.value = on
  emit('update:hideComments', on)
}

function toggleFit() {
  dismissHint(true)
  fit.value = !fitOn.value
}

function dismissHint(explicit = false) {
  window.clearTimeout(hintT)
  hintT = 0
  // Never burn the flag without the person having seen the hint.
  if (explicit || hintFit.value) {
    fitSeen.value = true
    try {
      store.set(STORE_KEYS.fitSeen, '1')
    } catch {
      /* storage denied */
    }
  }
  hintOff.value = true
}

/**
 * Zen: the chrome gets out of the way because the musician asked, not only
 * when auto-scroll decides they stopped moving.
 *
 * A tap never pins or unpins. On a ficha, pinning covers the host; undoing
 * that mid-chorus dumps the musician onto a scrolled page with the dock under
 * the fold. The Tela cheia button is the only way in or out of that screen.
 * Native fullscreen is not asked for from here either: a tap taking over the
 * browser would be a surprise.
 */
function toggleZen() {
  const on = !zen.value
  setChromeGone(on)
  // The gesture is invisible: the first time has to say how to come back.
  // One toast, then gone — a standing band under the chart is the same
  // sentence twice, on a phone and on a desktop.
  if (on && !zenSeen) {
    zenSeen = true
    toastMsg('Toque na tela para mostrar os controles')
  }
}

/** Fade the chrome in or out. Padding does not move — the chart stays put. */
function setChromeGone(on: boolean) {
  zen.value = on
  capoOpen.value = false
  toneOpen.value = false
}

/**
 * A tap on empty chart is the gesture of someone holding an instrument: it
 * does not ask them to hit a 44px button in the middle of a chorus.
 */
function onSurfaceTap(e: MouseEvent) {
  if (songSwipe.eatClick()) return
  if (isEdit.value) return
  const t = e.target as HTMLElement | null
  // The solo owns touches on its header and notation; only the chart around
  // it uses the one-tap chrome gesture.
  if (t?.closest?.("button,input,textarea,select,a,[role='button'],figure,.titan-chordpro-notation-card")) return
  try {
    if (String(window.getSelection() ?? '').length) return
  } catch {
    /* selection unavailable */
  }
  // A tap while the chrome is away is a request to see it — whatever put it
  // away, the reader's own gesture or auto-scroll deciding they had gone
  // still. Only a tap while it is up can mean "put it away".
  if (chromeHiddenAtTouch) {
    showChrome()
    return
  }
  toggleZen()
}

/**
 * Bring the chrome back, whichever thing hid it. The idle auto-hide is already
 * undone by `wake` on the same gesture; what is left is the deliberate kind.
 */
function showChrome() {
  if (zen.value) setChromeGone(false)
  idle.value = false
}

/**
 * Immersive wins the *host* or *browser* chrome — never the Titan controls.
 * A musician in tela cheia still needs Rolar, tom, metrônomo. Hiding those
 * used to give the chart a band they cannot play from.
 *
 * Pinning covers the host page (nav, tabs) when the chart is a box in a ficha;
 * on a standalone 100dvh route it is a no-op. Native fullscreen is asked for
 * in parallel, and refused in silence on iPhone Safari. The tap-on-chart
 * gesture (zen) still puts our chrome away on demand, and that tap must not
 * unpin.
 */
function setImmersive(on: boolean, opts: { native?: boolean } = {}): Promise<boolean> {
  if (fs.value === on) return Promise.resolve(nativeFs.active.value)
  const before = pageSpot()
  fs.value = on
  pinToViewport(on)
  if (on) {
    capoOpen.value = false
    toneOpen.value = false
  }
  reflowPage(before)
  // Leaving always releases the screen, however immersive was entered.
  if (!on) {
    void nativeFs.exit()
    measurePinGain()
    return Promise.resolve(false)
  }
  if (opts.native === false) return Promise.resolve(false)
  return nativeFs.request(root.value)
}

async function toggleFs() {
  const want = !fs.value
  // The word for what happened, never the word for what was asked: the request
  // is async, and on most phones it comes back refused.
  const native = await setImmersive(want)
  // The standing hint is only for zen. Tela cheia keeps the controls, so a
  // toast on the phone would be the only word for what changed.
  if (phone.value) return
  if (!want) toastMsg('Modo imersivo desligado')
  else if (native) toastMsg('Tela cheia · Esc ou F para sair')
  else toastMsg('Moldura reduzida · o navegador não dá tela cheia aqui · F para sair')
}

/**
 * `position:fixed` covers the host page in the same document — nav, tabs, the
 * rest of a ficha. It is what the granted fullscreen element then fills. It is
 * a no-op on a standalone route that already is the viewport.
 */
function pinToViewport(on: boolean) {
  const el = root.value
  if (!el) return
  Object.assign(
    el.style,
    on
      ? { position: 'fixed', inset: '0', height: '100%', zIndex: '2147483000' }
      : { position: 'relative', inset: 'auto', height: '100%', zIndex: 'auto' },
  )
}

/**
 * Native fullscreen with both spellings, and an honest answer about whether it
 * exists here at all — the button's own label depends on it.
 */
const nativeFs = useFullscreen({
  // Leaving through the browser's own Esc, or the Android system gesture, has
  // to turn immersive mode off too.
  onChange: (active) => {
    if (!active && fs.value) setImmersive(false)
  },
})
const wakeLock = useWakeLock()
/**
 * Fixed once the root exists: whether this document may go fullscreen is a
 * property of the page it was loaded in, not of the moment.
 */
const canNativeFs = ref(false)
/**
 * True when pinning the root would cover host chrome (ficha / in-page). False
 * on a standalone page that already fills the visual viewport. Frozen while
 * immersive, or the pinned box would report no gain and hide the exit control.
 */
const canPinFill = ref(false)
function measurePinGain() {
  if (fs.value) return
  canPinFill.value = pinWouldFillViewport(root.value)
}
/**
 * Whether the button wins something the gesture cannot. That is the only thing
 * that ever decides whether it is drawn — never "is this a phone". A tap on the
 * chart puts TitanChordpro's own chrome away everywhere; the button exists where
 * there is also a browser chrome or a host page to cover.
 */
const canWinScreen = computed(() => canNativeFs.value || canPinFill.value)
/**
 * A control may not name something it cannot do. Where fullscreen is off the
 * table — iPhone Safari on a page that already fills the screen — the button
 * says what it will actually do, which is put the frame away.
 */
const fsTitle = computed(() => {
  if (canWinScreen.value) return fs.value ? 'Sair da tela cheia' : 'Tela cheia'
  // What is left is the wide bar with nothing to take: there the chrome stays
  // and only the reading column tightens, so that is what it says.
  return fs.value ? 'Sair do modo imersivo' : 'Modo imersivo'
})

const audioRefBind = computed(() => ({
  playing: audio.playing.value,
  current: audio.current.value,
  duration: audio.duration.value,
  error: audio.error.value,
  title: audioTitle.value,
  artist: audioArtist.value,
  art: audioArt.value?.url,
  artWidth: audioArt.value?.width,
  artHeight: audioArt.value?.height,
  kind: audioKind.value,
  kinds: audioKinds.value,
}))

const viewHeadBind = computed((): ViewHeadModel => ({
  variant: (phone.value ? 'phone' : 'wide') as 'phone' | 'wide',
  pageMax: pageMax.value,
  hitClass: headHitClass.value,
  setlistOn: setlist.on.value,
  posLabel: setlist.posLabel.value,
  nextChip: setlist.nextChip.value,
  title: meta.value.title || 'Sem título',
  subtitle: meta.value.subtitle || '',
  phoneSub: phoneSub.value,
  hasKey: hasKey.value,
  hasReset: hasReset.value,
  toneLabel: toneLabel.value,
  playingKey: originalKey.value,
  songKeyCaption: songKeyCaption.value,
  hasCapo: hasCapo.value,
  capoBtnLabel: capoBtnLabel.value,
  capoLabel: capoLabel.value,
  capoHint: capoHint.value,
  capoShapes: capoShapes.value,
  mapOn: mapOn.value,
  metaTempo: meta.value.tempo,
  metaTime: meta.value.time,
  metaDuration: meta.value.duration,
  canWinScreen: canWinScreen.value,
  fs: fs.value,
  fsTitle: fsTitle.value,
}))

const wideDockBind = computed((): WideDockModel => ({
  hidden: chromeHidden.value,
  showMine: showMine.value,
  mineLabel: ov.mineLabel.value,
  showOriginal: ov.showOriginal.value,
  hintFit: hintFit.value,
  scrolling: scrolling.value,
  mul: mul.value,
  etaLabel: etaLabel.value,
  progress: progress.value,
  setlistOn: setlist.on.value,
  noPrev: setlist.noPrev.value,
  noNext: setlist.noNext.value,
  posLabel: setlist.posLabel.value,
  scrollTitle: scrollTitle.value,
  scrollOff: scrollOff.value,
  rollLive: rollLive.value,
  fitOn: fitOn.value,
  letra: activeLens.value === 'letra',
  hasKey: hasKey.value,
  nashvilleOn: nashvilleOn.value,
  hideComments: hideComments.value,
  metRunning: met.running.value,
  metBpm: met.bpm.value,
  hasStrum: hasStrum.value,
  strumOn: strumOn.value,
  ensaioBatida: rehearsalFocus.value === 'batida',
  themeTitle: themeTitle.value,
  themeIcon: themeIcon(themeMode.value),
  themeLabel: themeLabel(themeMode.value),
  canEdit: canEditNow.value,
  dirty: dirty.value,
}))

const phoneDockBind = computed((): PhoneDockModel => ({
  hidden: chromeHidden.value || moreOpen.value,
  hintFit: hintFit.value,
  letra: activeLens.value === 'letra',
  dockCtrlH: dockCtrlH.value,
  setlistOn: setlist.on.value,
  noPrev: setlist.noPrev.value,
  noNext: setlist.noNext.value,
  posLabel: setlist.posLabel.value,
  nextChipShort: setlist.nextChipShort.value,
  scrolling: scrolling.value,
  mul: mul.value,
  etaLabel: etaLabel.value,
  progress: progress.value,
  width: width.value,
  dockPlayName: dockPlayName.value,
  scrollTitle: scrollTitle.value,
  scrollOff: scrollOff.value,
  rollLive: rollLive.value,
  dockPlayLabeled: dockPlayLabeled.value,
  dockPlayLabel: dockPlayLabel.value,
  dockTypeW: dockTypeW.value,
  bp: bp.value,
  canEdit: canEditNow.value,
  dirty: dirty.value,
  fitOn: fitOn.value,
  queueCount: queueCount.value,
}))

const editHeadBind = computed((): EditHeadModel => ({
  phone: phone.value,
  compact: compact.value,
  contentEdit: isContentEdit.value,
  pageMax: pageMax.value,
  chromePad: chromePad.value,
  editBadge: editBadge.value,
  wMode: wMode.value,
  title: meta.value.title || 'Sem título',
  subtitle: meta.value.subtitle || '',
  metaGapLabel: metaGapLabel.value,
  metaSummary: metaSummary.value,
  metaGaps: metaGaps.value.length,
  dirty: dirty.value,
  canUndo: canUndo.value,
  canRedo: canRedo.value,
  confirmDiscard: confirmDiscard.value,
  discardLabel: discardLabel.value,
}))

const editDockBind = computed((): EditDockModel => ({
  compact: compact.value,
  editHint: editHint.value,
  clipLabel: bedit.clip.value?.label ?? null,
  edit: bedit,
  wMode: wMode.value,
  showSource: isContentEdit.value && props.capabilities?.sourcePane !== false,
  lintOk: lint.value.ok,
  themeTitle: themeTitle.value,
  themeIcon: themeIcon(themeMode.value),
  hasStrum: hasStrum.value,
}))

const moreSheetBind = computed((): MoreSheetModel => ({
  themeTitle: themeTitle.value,
  themeIcon: themeIcon(themeMode.value),
  themeLabel: themeLabel(themeMode.value),
  hasKey: hasKey.value,
  nashvilleOn: nashvilleOn.value,
  nashvilleHint: nashvilleHint.value,
  hideComments: hideComments.value,
  metBpm: met.bpm.value,
  metRunning: met.running.value,
  hasStrum: hasStrum.value,
  strumOn: strumOn.value,
  ensaioBatida: rehearsalFocus.value === 'batida',
  showMine: showMine.value,
  showOriginal: ov.showOriginal.value,
  mineCount: ov.mineCount.value,
  showQueue: modes.value.includes('persisted') && ov.pendingCount.value > 0,
  pendingCount: ov.pendingCount.value,
}))

// ------------------------------------------------------------------ edit (E0)

/**
 * Two saves that look alike and are not: one lands on this phone, the other on
 * the chart every musician reads. With both allowed, the choice is asked for
 * before anything is typed — never after.
 */
/**
 * A song with no chart, for whoever may write for everyone: importing is the
 * normal way in, blank is for whoever already has it in their head. What comes
 * out of the dialog becomes the chart of the system, and the editor opens on it.
 */
const novaOpen = ref(false)
const novaStart = ref<'import' | 'blank'>('import')
function startNew(kind: 'import' | 'blank') {
  novaStart.value = kind
  novaOpen.value = true
}
const canStartNew = computed(
  () =>
    isEmpty.value &&
    // A chart on its way, or one that failed, is not a chart that needs writing
    // — and an empty list means nothing is selected at all.
    !songLoading.value &&
    !setlist.failing.value &&
    !listEmpty.value &&
    (props.canEdit ?? true) &&
    modes.value.includes('persisted'),
)
function commitNewChart(src: string) {
  novaOpen.value = false
  // A host that persists `save-content` into `source` must not look like a
  // different song: that watcher would drop the editor we are about to open.
  acceptHostEcho(src)
  ov.setOfficial(src)
  forceBase()
  beginEdit('persisted')
}

/**
 * Explicit confirm in MetaDialog: close meta and open Nova cifra (import + blank)
 * without clearing the current body yet — cancel Nova keeps the chart.
 * Only from “Para todos” (content) edit — local overlays must not replace the chart.
 */
function restartFromMeta() {
  if (!isContentEdit.value) return
  metaOpen.value = false
  startNew('import')
}

/** Reading the original is a lens on the same chart, not a second document. */
function toggleOriginal(orig: boolean) {
  stopScroll()
  ov.showOriginal.value = orig
  forceBase()
}

watch(
  () => [props.editMode, props.modes] as const,
  () => {
    if (wMode.value && !modes.value.includes(wMode.value)) exitEdit()
  },
)

function onFixTune() {
  ov.fixTune(offset.value, capo.value, capoMap.value)
}

// -------------------------------------------------- score editor (E: VexFlow)

/**
 * One path for a score and for a legacy text tab: the tab opens imported and
 * is written back as `{x_titan_start_of_score}`, so a chart has a single way to hold music.
 */
type ScoreEdit = { li0: number; li1: number; kind: 'score' | 'tab'; text: string; fresh: boolean }
const scoreEd = ref<ScoreEdit | null>(null)
const externalEd = ref<{ text: string; li0?: number; li1?: number } | null>(null)
clearScoreEditors = () => {
  scoreEd.value = null
  externalEd.value = null
}
watch(() => props.source, () => { externalEd.value = null })
function saveExternalScore(text: string) {
  const edit = externalEd.value
  if (!edit) return
  if (edit.li0 === undefined) bedit.insertScore(text)
  else bedit.replaceSpan(edit.li0, edit.li1!, text, 'Solo atualizado')
  externalEd.value = null
}

const scoreLabel = computed(() =>
  scoreEd.value?.kind === 'tab' ? 'TAB importada do texto' : 'Partitura do bloco',
)

function openScore(bi: number) {
  const b = blocks.value[bi]
  if (!b || (b.kind !== 'tab' && b.kind !== 'score')) return
  if (b.kind === 'score' && isScoreReference(b.text)) {
    externalEd.value = { text: b.text, li0: b.li0, li1: b.li1 }
    return
  }
  if (b.kind === 'score' && !isInlineScore(b.text)) return
  scoreEd.value = {
    li0: b.li0,
    li1: b.li1,
    kind: b.kind === 'score' ? 'score' : 'tab',
    text: b.text.replace(/^\n+|\n+$/g, ''),
    fresh: false,
  }
}

function newScore() {
  const span = bedit.insertScore()
  // A non-empty source: the editor opens blank instead of loading the demo.
  scoreEd.value = {
    ...span,
    kind: 'score',
    text: '{x_titan_start_of_score: time=4/4 key=D tempo=92 tuning=EADGBE}\n{x_titan_end_of_score}',
    fresh: true,
  }
}

function saveScore(text: string) {
  const d = scoreEd.value
  if (!d) return
  bedit.replaceSpan(
    d.li0,
    d.li1,
    text,
    d.kind === 'tab' ? 'TAB convertida em partitura' : d.fresh ? 'Partitura inserida' : 'Partitura atualizada',
  )
  scoreEd.value = null
  externalEd.value = null
  bedit.focusLine(d.li0)
}

function cancelScore() {
  const d = scoreEd.value
  // A block that only exists because the editor was opened goes away with it.
  if (d?.fresh) undo()
  scoreEd.value = null
  externalEd.value = null
}

function openMeta() {
  if (!isEdit.value) return
  metaOpen.value = true
}

// ------------------------------------------------------------------ listeners

function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  const typing = /^(input|textarea)$/i.test(target?.tagName ?? '')
  // Saving has to work with the cursor inside the source pane too.
  if (isEdit.value && (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
    e.preventDefault()
    save()
    return
  }
  // Nova focuses its address field on open. Escape still cancels that dialog
  // before the "don't steal keys from a field" guard, and before every other panel.
  if (e.key === 'Escape' && novaOpen.value) {
    e.preventDefault()
    novaOpen.value = false
    return
  }
  if (typing) return
  // The score editor owns the keyboard while it is open: Esc, the arrows and
  // undo all mean something in there, and the chart behind it must not act on
  // the same keystroke.
  if (scoreEd.value || externalEd.value) return
  const k = e.key
  if (diagramOpen.value) {
    if (k === 'Escape') {
      e.preventDefault()
      closeDiagram()
    }
    return
  }
  if (isEdit.value) {
    const cmd = e.ctrlKey || e.metaKey
    if (cmd && (k === 'z' || k === 'Z')) {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
      return
    }
    if (cmd && (k === 'y' || k === 'Y')) {
      e.preventDefault()
      redo()
      return
    }
    // Reordering without a drag: the keyboard has to reach it too.
    if (e.altKey && (k === 'ArrowUp' || k === 'ArrowDown')) {
      e.preventDefault()
      bedit.nudgeBlock(k === 'ArrowUp' ? -1 : 1)
      return
    }
    // Escape closes what is open on top; it never drops the reader out of the
    // editor, which would put an unsaved draft one keystroke from being missed.
    if (k === 'Escape') {
      if (novaOpen.value) novaOpen.value = false
      else if (bedit.picker.value) bedit.picker.value = null
      else if (bedit.chordEdit.value) bedit.chordEdit.value = null
      else if (bedit.insertMenu.value) bedit.insertMenu.value = false
      else if (bedit.placing.value) bedit.placing.value = false
      else if (bedit.clip.value) bedit.clip.value = null
      else if (bedit.sel.value !== null) bedit.clearSel()
      else if (metaOpen.value) metaOpen.value = false
      else if (srcOpen.value) srcOpen.value = false
    }
    return
  }
  if (k === 'Tab' && sheet.value) {
    const scope = root.value?.querySelector('[role="dialog"]')
    const f = scope?.querySelectorAll('button') ?? []
    if (f.length) {
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    return
  }
  if (k === ' ') {
    e.preventDefault()
    toggleScroll()
  } else if (k === '+' || k === '=') shift(1)
  else if (k === '-' || k === '_') shift(-1)
  else if (k === '0') resetTone()
  else if (k === 'ArrowRight' && scrolling.value) mul.value = adjustScrollMultiplier(mul.value, 'up')
  else if (k === 'ArrowLeft' && scrolling.value) mul.value = adjustScrollMultiplier(mul.value, 'down')
  else if ((k === 'l' || k === 'L') && !isEdit.value) toggleReading()
  else if (k === 'm' || k === 'M') met.toggle()
  else if (k === 'f' || k === 'F') toggleFs()
  else if (k === 't' || k === 'T') requestTheme()
  else if (k === 'a' || k === 'A') toggleFit()
  else if (k === 'c' || k === 'C') capoOpen.value = !capoOpen.value
  else if (k === 'Escape') {
    if (novaOpen.value) novaOpen.value = false
    else if (ov.myPanel.value) ov.closeMy()
    else if (ov.queueOpen.value) ov.closeQueue()
    else if (capoOpen.value) capoOpen.value = false
    else if (setlist.listOpen.value) setlist.close()
    else if (batidaOpen.value) closeBatida()
    else if (metOpen.value) metOpen.value = false
    else if (toneOpen.value) toneOpen.value = false
    else if (moreOpen.value) moreOpen.value = false
    else if (sheet.value) sheet.value = false
    else if (zen.value) setChromeGone(false)
    else if (fs.value) void setImmersive(false)
  }
}

/**
 * What the chrome was doing at the instant the finger landed.
 *
 * A tap arrives as `pointerdown` and then `click`, and `wake` answers the
 * `pointerdown` by clearing the idle auto-hide. So by the time the click ran,
 * the chrome was already on its way back and the tap read "the controls are up,
 * put them away" — hiding the very controls the reader was reaching for, and
 * doing it during auto-scroll, when the auto-hide would take them again 2.6s
 * later whatever happened. That is why they never came back.
 *
 * This listener is on the capture phase, so it reads the state before `wake`
 * gets to change it.
 */
let chromeHiddenAtTouch = false

function onDocDown(e: PointerEvent) {
  chromeHiddenAtTouch = chromeHidden.value
  if (!capoOpen.value) return
  const box = capoBox.value
  if (box && !box.contains(e.target as Node)) capoOpen.value = false
}

/** A wheel over the chrome still belongs to the chart underneath. */
function onWheel(e: WheelEvent) {
  const el = scroller.value
  const r = root.value
  if (!el || !r || !r.contains(e.target as Node)) return
  // A horizontal gesture belongs to whatever is under it (tab, wide toolbar).
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  const hit = e.target as Element | null
  // Open sheets own the wheel — the setlist list scrolls itself; do not drag
  // the chart under the dialog. The scrim blocks the page without moving it.
  if (hit?.closest?.('[role="dialog"]')) return
  if (hit?.closest?.('.titan-chordpro-scrim')) {
    e.preventDefault()
    return
  }
  if (!el.contains(e.target as Node)) {
    el.scrollTop += e.deltaY
    e.preventDefault()
    return
  }
  const max = el.scrollHeight - el.clientHeight
  const stuck = (e.deltaY < 0 && el.scrollTop <= 0) || (e.deltaY > 0 && el.scrollTop >= max - 1)
  if (stuck) e.preventDefault()
}

function onMq() {
  sysDark.value = mq?.matches ?? false
}

/**
 * Change song, putting down where this one was left. The chart itself swaps
 * through the same path a host `source` change takes, so the personal version,
 * the metronome and the timeline all reload exactly as they always did.
 */
function goSong(i: number) {
  exitEnsaioBatida()
  setlist.go(i, {
    offset: offset.value,
    capo: capo.value,
    mul: mul.value,
    top: scroller.value?.scrollTop ?? 0,
    u: readPlayhead(),
  })
}
const goPrev = () => goSong(setlist.si.value - 1)
const goNext = () => goSong(setlist.si.value + 1)
useMediaSession({
  enabled: computed(() => !!audioUrl.value),
  playing: audio.playing,
  current: audio.current,
  duration: audio.duration,
  title: audioTitle,
  artist: audioArtist,
  album: audioAlbum,
  artwork: audioArtwork,
  play: () => {
    void audio.play()
  },
  pause: () => audio.pause(),
  skip: (dir) => audio.skip(dir),
  seek: (t) => audio.seek(t),
  playlist: computed(() => setlist.on.value),
  prevTrack: goPrev,
  nextTrack: goNext,
})
const endNext = () => {
  setlist.dismissEnd()
  goNext()
}

const swipeBusy = ref(false)
let swipeGen = 0

const swipeBlocked = computed(
  () =>
    isEdit.value ||
    sheet.value ||
    moreOpen.value ||
    setlist.listOpen.value ||
    !!scoreEd.value ||
    !!externalEd.value ||
    metaOpen.value ||
    toneOpen.value ||
    metOpen.value ||
    batidaOpen.value ||
    capoOpen.value ||
    ov.myPanel.value ||
    ov.queueOpen.value ||
    srcOpen.value ||
    confirmDiscard.value ||
    swipeBusy.value,
)

function waitMs(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function playSwipeCommit(intent: 'next' | 'prev') {
  const gen = ++swipeGen
  swipeBusy.value = true
  if (intent === 'next') goNext()
  else goPrev()
  await waitMs(SWIPE_FADE_MS)
  if (gen !== swipeGen) return
  songSwipe.clear()
  swipeBusy.value = false
}

const songSwipe = useSongSwipe({
  enabled: () => setlist.on.value,
  blocked: () => swipeBlocked.value,
  canPrev: () => !setlist.noPrev.value,
  canNext: () => !setlist.noNext.value,
  width: () => width.value || root.value?.getBoundingClientRect().width || 390,
  height: () => root.value?.getBoundingClientRect().height || 844,
  onCommit: (intent) => {
    void playSwipeCommit(intent)
  },
  onPeek: (peeking) => {
    setSwipePeekHold(peeking)
  },
})
const swipeView = songSwipe.view
const swipeDebug = computed(
  () => setlist.on.value && props.capabilities?.debugSwipe === true,
)

function dockLiftEl(): HTMLElement | null {
  const rootEl = root.value
  if (!rootEl) return null
  return (
    (rootEl.querySelector('.titan-chordpro-phone-stack') as HTMLElement | null) ??
    (rootEl.querySelector('[data-scroll]')?.closest('.titan-chordpro-chrome') as HTMLElement | null)
  )
}

function measureSwipeRailBottom() {
  const rootEl = root.value
  const dock = dockLiftEl()
  if (!rootEl || !dock) {
    swipeRailBottom.value = 0
    return
  }
  const a = rootEl.getBoundingClientRect()
  const b = dock.getBoundingClientRect()
  swipeRailBottom.value = Math.max(0, Math.round(a.bottom - b.top))
  // Zen hides the controls but keeps the reading line in place. Remember the
  // visible dock's height for the page padding while its content is hidden.
  if (!chromeHidden.value) visibleDockBottom.value = swipeRailBottom.value
}

function bindDockLift() {
  dockRo?.disconnect()
  dockRo = null
  const dock = dockLiftEl()
  if (!dock) {
    swipeRailBottom.value = 0
    return
  }
  measureSwipeRailBottom()
  dockRo = new ResizeObserver(() => measureSwipeRailBottom())
  dockRo.observe(dock)
}

watch(
  [() => setlist.on.value, phone, chromeHidden, isPopulated, isEdit],
  () => {
    void nextTick(bindDockLift)
  },
)

function bindPage(el: unknown) {
  const node = el as HTMLElement | null
  pageRo?.disconnect()
  pageRo = null
  page.value = node
  if (!node) return
  pageRo = new ResizeObserver(() => syncScrollRoom())
  pageRo.observe(node)
  syncScrollRoom()
}

function bindCapoBox(el: unknown) {
  capoBox.value = (el as HTMLElement | null) ?? null
}

function bindHead(el: unknown) {
  const raw = el as { $el?: HTMLElement } | HTMLElement | null
  const node =
    raw && typeof raw === 'object' && '$el' in raw ? (raw.$el ?? null) : ((raw as HTMLElement | null) ?? null)
  head.value = node
  headRo?.disconnect()
  headRo = null
  if (!node || typeof ResizeObserver === 'undefined') return
  headRo = new ResizeObserver(() => syncHeadH())
  headRo.observe(node)
  syncHeadH()
}

function syncHeadH() {
  const el = head.value
  if (!el) return
  const h = Math.round(el.getBoundingClientRect().height)
  if (h && Math.abs(h - headH.value) > 1) headH.value = h
}

watch(hostSource, syncHostSource)
watch([theme, bias, fit, lens, hideComments, met.sound, strumSound.enabled, met.pulseHead, met.follow, met.countInOn], persistPrefs)
watch(lens, (v) => {
  if (v !== 'letra') chordLens.value = v
})
watch(
  () => props.lens,
  (next) => {
    if (next === undefined) return
    if (next === lens.value) return
    lens.value = next
  },
)
watch(
  () => props.hideComments,
  (next) => {
    if (next === hideComments.value) return
    hideComments.value = next
  },
)
watch([effTheme, () => props.accent, () => props.accentStrength], () => {
  if (root.value) applyThemeVars(root.value, effTheme.value, props.accent, props.accentStrength)
})
watch(hintFit, (v) => {
  // The hint's clock only starts once it is actually on screen.
  if (v && !hintT) hintT = window.setTimeout(() => dismissHint(), 9000)
})
watch(sheet, async (open) => {
  if (open) {
    lastFocus = document.activeElement as HTMLElement
    await nextTick()
    const scope = root.value?.querySelector('[role="dialog"]')
    const f = [...(scope?.querySelectorAll('button') ?? [])].find(
      (b) => b.getAttribute('aria-label') !== 'Fechar',
    )
    f?.focus()
  } else lastFocus?.focus()
})
watch([blocks, fitOn, bias, width], () => {
  // Reflow changes scrollHeight: what is preserved is the musical instant,
  // not the pixel — the clock line stays at the same point of the song.
  clearTimeline()
})
watch([offset, capo, themeMode, fitOn, bias, mode, dirty, activeLens, hideComments], () => {
  emit('state', {
    transposeSemitones: offset.value,
    capo: capo.value,
    theme: themeMode.value,
    displayKey: playingKey.value || shownKey.value || null,
    lens: activeLens.value,
    hideComments: hideComments.value,
    dual: mapOn.value,
    fit: fitOn.value,
    bias: bias.value,
    mode: mode.value,
    dirty: dirty.value,
    writeMode: wMode.value,
    personalized: ov.hasOverlay.value,
    readingOriginal: ov.showOriginal.value,
  })
})

onMounted(() => {
  try {
    const p = readUserPreferences(store)
    if (p.theme) theme.value = p.theme
    if (typeof p.bias === 'number') bias.value = p.bias
    if (typeof p.fit === 'boolean') fit.value = p.fit
    if (typeof p.metSound === 'boolean') met.sound.value = p.metSound
    if (typeof p.metStrumSound === 'boolean') strumSound.setEnabled(p.metStrumSound)
    if (typeof p.metPulseHead === 'boolean') met.pulseHead.value = p.metPulseHead
    if (typeof p.metFollow === 'boolean') met.follow.value = p.metFollow
    if (typeof p.metCountIn === 'boolean') met.countInOn.value = p.metCountIn
    // Host prop (including `none` = Cifra) wins on this mount. Omit the prop
    // to restore the last Cifra | Letra choice on this device.
    if (props.lens !== undefined) lens.value = props.lens
    else if (p.lens === 'nashville' || p.lens === 'letra') lens.value = p.lens
    if (props.hideComments) hideComments.value = true
    else if (p.hideComments === true) hideComments.value = true
    if (p.diagramInstrument === 'ukulele' || p.diagramInstrument === 'piano' || p.diagramInstrument === 'guitar') {
      diagramInstrument.value = p.diagramInstrument
    }
    fitSeen.value = store.get(STORE_KEYS.fitSeen) === '1'
    editSeen.value = store.get(STORE_KEYS.editSeen) === '1'
  } catch {
    fitSeen.value = true
    editSeen.value = true
  }
  mq = window.matchMedia('(prefers-color-scheme: dark)')
  sysDark.value = mq.matches
  mq.addEventListener('change', onMq)
  ro = new ResizeObserver((entries) => {
    // Before the width bail-out: a host that flattens the frame changes our
    // height, not our width, and that is exactly what the guard looks for —
    // and the same height change is what leaves the chart with no room.
    guard.check()
    measurePinGain()
    syncScrollRoom()
    measureSwipeRailBottom()
    const w = entries[0]?.contentRect.width ?? 900
    if (Math.abs(w - width.value) <= 4) return
    width.value = w
    void nextTick(() => {
      clearTimeline()
      if (!scroller.value || !scrolling.value) return
      reseatScroll()
    })
  })
  if (root.value) {
    ro.observe(root.value)
    width.value = root.value.getBoundingClientRect().width || width.value
    applyThemeVars(root.value, effTheme.value, props.accent, props.accentStrength)
  }
  nativeFs.start()
  canNativeFs.value = nativeFs.available(root.value)
  warnIfHostBlocksFullscreen(root.value)
  measurePinGain()
  window.visualViewport?.addEventListener('resize', measurePinGain)
  document.addEventListener('scroll', measurePinGain, true)
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onDocDown, true)
  window.addEventListener('wheel', onWheel, { passive: false })
  ;(['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown'] as const).forEach((ev) =>
    window.addEventListener(ev, wake, { passive: true }),
  )
  setlist.prefetch()
  syncHostSource()
  guard.start()
  songSwipe.attach()
  wakeLock.start()
  void nextTick(bindDockLift)
})

onUnmounted(() => {
  swipeGen += 1
  swipeBusy.value = false
  setSwipePeekHold(false)
  wakeLock.stop()
  songSwipe.detach()
  stopScroll()
  met.dispose()
  strumSound.dispose()
  ov.dispose()
  guard.dispose()
  clearIdleTimer()
  window.clearTimeout(toastT)
  window.clearTimeout(hintT)
  clearDiscardTimer()
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('pointerdown', onDocDown, true)
  window.removeEventListener('wheel', onWheel)
  ;(['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown'] as const).forEach((ev) =>
    window.removeEventListener(ev, wake),
  )
  nativeFs.dispose()
  window.visualViewport?.removeEventListener('resize', measurePinGain)
  document.removeEventListener('scroll', measurePinGain, true)
  mq?.removeEventListener('change', onMq)
  ro?.disconnect()
  headRo?.disconnect()
  strumRo?.disconnect()
  pageRo?.disconnect()
  dockRo?.disconnect()
})

defineExpose({
  enterEdit,
  exitEdit,
  shift,
  toggleScroll,
  toggleZen,
  openQueue: ov.openQueue,
  getSource: () => session.getSource(),
})
</script>

<template>
  <div
    ref="root"
    class="titan-chordpro-root"
    data-titan-chordpro-root
    :data-theme="effTheme"
    :data-titan-chordpro-lens="activeLens"
    :class="[rootHitClass, { 'is-setlist': setlist.on.value, 'is-swipe-debug': swipeDebug }]"
    :style="{
      '--titan-chordpro-met-hit': metHitMs,
      '--titan-chordpro-swipe-edge': `${SWIPE_EDGE_PX}px`,
      '--titan-chordpro-swipe-rail': `${swipeRailPx(width)}px`,
      '--titan-chordpro-swipe-rail-bottom': `${swipeRailBottom}px`,
    }"
    @pointerdown="songSwipe.onDown"
  >
    <div class="titan-chordpro-glow" />

    <div class="titan-chordpro-stage">
    <div v-if="isPopulated" ref="scroller" class="titan-chordpro-scroll" data-titan-chordpro-scroll @click="onSurfaceTap">
      <div :ref="bindPage" class="titan-chordpro-page" :style="{ maxWidth: pageMax, padding: pagePad, '--titan-chordpro-notation-outset': notationOutset }">
        <div :style="{ padding: pageBodyPad }">
        <TitanChordproCapoLegend v-if="legend" :shape="legend.shape" :real="legend.real" :capo="capo" @close="toggleMap" />
        <ChartBody
          v-bind="chartScale"
          :blocks="blocks"
          :collapsed-notation="collapsedNotation"
          :notation-ids="notationIds"
          :notation-choices="notationChoices"
          @toggle-notation="toggleNotation"
          @score-view-change="(bi, view) => { const id = notationIds[bi]; if (id) saveNotationChoice(id, { view }) }"
          :resolve-image="resolveImage"
          :resolve-score="resolveScore"
          :note-name-format="noteNameFormat"
          :auto-invert-scores="autoInvertScores"
          :theme="effTheme"
          :mine-lines="ov.mineLines.value"
          :edit="isEdit ? bedit : null"
          :pill-lane="editScale.pillLane"
          :pill-h="editScale.pillH"
          :chord-edit-px="editScale.chordEditPx"
          :insert-items="isEdit ? insertItems : []"
          @revert-line="ov.revertLine"
          @edit-score="openScore"
          :diagrams="props.capabilities?.diagrams !== false && activeLens !== 'letra' && !isEdit"
          @diagram="openDiagram"
        />
        </div>
      </div>
    </div>

    <TitanChordproStates
      v-else
      :failing="setlist.failing.value"
      :song-loading="songLoading"
      :list-empty="listEmpty"
      :is-empty="isEmpty"
      :can-start-new="canStartNew"
      :fatal="fatal || ''"
      :is-loading="isLoading"
      :fail-title="setlist.current.value?.title || ''"
      :load-title="setlist.current.value?.title || ''"
      :pos-label="setlist.posLabel.value"
      :no-prev="setlist.noPrev.value"
      :no-next="setlist.noNext.value"
      :empty-title="setlist.current.value?.title || meta.title || 'Cifra nova'"
      @retry="setlist.retry()"
      @open-list="setlist.open()"
      @prev="goPrev"
      @next="goNext"
      @start="startNew"
    />
    <div
      v-if="swipeDebug"
      class="titan-chordpro-swipe-debug"
      aria-hidden="true"
    >
      <div class="titan-chordpro-swipe-debug-dead">Safari</div>
      <div class="titan-chordpro-swipe-debug-center">rolar</div>
      <div class="titan-chordpro-swipe-debug-legend">
        cinza = Safari · verde = rolar · azul = anterior · laranja = próxima
      </div>
    </div>
    <div
      v-if="setlist.on.value"
      class="titan-chordpro-swipe-rail"
      data-swipe-rail="prev"
      aria-hidden="true"
    />
    <div
      v-if="setlist.on.value"
      class="titan-chordpro-swipe-rail"
      data-swipe-rail="next"
      aria-hidden="true"
    />
    <DiagramModal
      v-if="diagramOpen && diagramTarget"
      :shape-name="diagramTarget.shapeName"
      :concert="diagramTarget.concert"
      :capo-fret="diagramTarget.capoFret"
      :instrument="diagramInstrument"
      :defines="parsed.defines"
      @close="closeDiagram"
      @instrument="setDiagramInstrument"
    />
    <TitanChordproSwipeVeil
      :view="swipeView"
      :next-title="setlist.nextTitle.value"
      :prev-title="setlist.prevTitle.value"
    />
    </div>
    <div class="titan-chordpro-progress" :class="{ 'is-live': scrolling }"><span :style="{ width: `${(progress * 100).toFixed(1)}%` }" /></div>

    <!-- Identity card — fades with zen. A plain name takes the same band while chrome is gone. -->
    <div
      v-if="!isEdit && isPopulated"
      class="titan-chordpro-chrome"
      :class="{ 'is-hidden': headHidden, 'is-wide-wrap': !phone }"
      style="position:absolute;top:0;left:0;right:0;z-index:12;"
      :style="{ padding: chromePad }"
    >
      <TitanChordproViewHead
        v-bind="viewHeadBind"
        v-model:capo-open="capoOpen"
        :ref="bindHead"
        @open-setlist="setlist.open()"
        @open-tone="toneOpen = true; zen = false; moreOpen = false"
        @toggle-fs="toggleFs"
        @shift="shift"
        @reset-tone="resetTone"
        @capo-nudge="(n) => setCapo(capo + n)"
        @toggle-map="toggleMap"
        @capo-zero="setCapo(0)"
        @bind-capo="bindCapoBox"
      />
    </div>
    <div
      v-if="!isEdit && isPopulated && headHidden"
      class="titan-chordpro-zen-title"
      :class="{ 'is-wide-wrap': !phone }"
      data-titan-chordpro-zen-title
      aria-hidden="true"
      :style="{ padding: chromePad }"
    >
      <span class="titan-chordpro-zen-title-text" :style="!phone ? { maxWidth: pageMax } : undefined">{{
        meta.title || 'Sem título'
      }}</span>
    </div>
    <TitanChordproEditHead
      v-if="isEdit"
      v-bind="editHeadBind"
      @bind-head="bindHead"
      @open-meta="openMeta"
      @undo="undo"
      @redo="redo"
      @discard="discard"
      @save="save"
      @read="exitEdit"
    />

    <TitanChordproWideDock
      v-if="!isEdit && !phone && isPopulated"
      v-bind="wideDockBind"
      @original="toggleOriginal"
      @open-my="ov.myPanel.value = true"
      @dismiss-hint="dismissHint(true)"
      @slower="mul = adjustScrollMultiplier(mul, 'down')"
      @faster="mul = adjustScrollMultiplier(mul, 'up')"
      @prev="goPrev"
      @open-list="setlist.open()"
      @next="goNext"
      @toggle-scroll="toggleScroll"
      @smaller-type="bias = Math.max(-3, bias - 1)"
      @bigger-type="bias = Math.min(5, bias + 1)"
      @toggle-fit="toggleFit"
      @cifra="showCifra"
      @letra="showLetra"
      @toggle-nashville="toggleNashville"
      @toggle-comments="setHideComments(!hideComments)"
      @toggle-met="toggleMetPanel"
      @toggle-strum="toggleStrum"
      @toggle-ensaio-batida="toggleEnsaioBatida"
      @theme="requestTheme"
      @edit="enterEdit"
      @export="sheet = true"
    >
      <TitanChordproAudioRef
        v-if="audioUrl"
        :key="audioKey"
        v-bind="audioRefBind"
        @toggle="audio.toggle"
        @skip="audio.skip"
        @seek="audio.seek"
        @kind="audioKind = $event"
      />
    </TitanChordproWideDock>

    <TitanChordproPhoneDock
      v-if="!isEdit && phone && isPopulated"
      v-bind="phoneDockBind"
      @dismiss-hint="dismissHint(true)"
      @cifra="showCifra"
      @letra="showLetra"
      @prev="goPrev"
      @open-list="setlist.open()"
      @next="goNext"
      @slower="mul = adjustScrollMultiplier(mul, 'down')"
      @faster="mul = adjustScrollMultiplier(mul, 'up')"
      @toggle-scroll="toggleScroll"
      @smaller-type="bias = Math.max(-3, bias - 1)"
      @bigger-type="bias = Math.min(5, bias + 1)"
      @edit="enterEdit"
      @toggle-fit="toggleFit"
      @more="moreOpen = true"
    >
      <TitanChordproAudioRef
        v-if="audioUrl"
        :key="audioKey"
        v-bind="audioRefBind"
        inline
        :chrome-gone="chromeHidden"
        @toggle="audio.toggle"
        @skip="audio.skip"
        @seek="audio.seek"
        @kind="audioKind = $event"
        @reveal="showChrome"
      />
    </TitanChordproPhoneDock>

    <button
      v-if="queueEntry && !phone"
      class="titan-chordpro-queue-chip"
      :class="{ 'is-compact': compact, 'is-alone': chromeHidden }"
      data-queue-chip
      :aria-label="`Sugestões dos músicos, ${ov.pendingCount.value} ${ov.pendingCount.value === 1 ? 'pendente' : 'pendentes'}`"
      title="Sugestões dos músicos"
      @click="ov.openQueue"
    >
      <span class="titan-chordpro-queue-chip-dot" aria-hidden="true" />
      <span class="titan-chordpro-queue-chip-copy">Sugestões</span>
      <span class="titan-chordpro-queue-chip-count" data-queue-count>{{ ov.pendingCount.value }}</span>
    </button>

    <TitanChordproEditDock
      v-if="isEdit && !srcOpen"
      v-bind="editDockBind"
      @seen-hint="markEditSeen()"
      @drop-clip="bedit.clip.value = null"
      @edit-score="bedit.sel.value !== null && openScore(bedit.sel.value)"
      @source="srcOpen = true"
      @smaller-type="bias = Math.max(-3, bias - 1)"
      @bigger-type="bias = Math.min(5, bias + 1)"
      @theme="requestTheme"
      @create-batida="openBatidaCreate"
      @edit-batida="openBatidaEdit"
    />

    <div v-if="isEdit && bedit.placing.value" class="titan-chordpro-placing-bar titan-chordpro-veil-2" data-placing>
      <span style="font-size:11.5px;color:var(--text);">Toque na sílaba onde o acorde entra.</span>
      <button
        style="height:28px;padding:0 10px;border:0;border-radius:9px;background:var(--surface);color:var(--muted);font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;"
        @click="bedit.placing.value = false"
      >Cancelar</button>
    </div>

    <ChordDialog
      v-if="isEdit && bedit.chordEdit.value"
      v-model="bedit.chordText.value"
      :vocab="chordVocab"
      :compact="compact"
      :autofocus="bedit.wantChordFocus.value"
      @apply="bedit.applyChord()"
      @remove="bedit.dropChord()"
      @close="bedit.chordEdit.value = null"
    />

    <ImagePicker
      v-if="isEdit && bedit.picker.value"
      :items="images"
      :resolve-image="resolveImage"
      :upload-image="uploadImage"
      :replacing="bedit.picker.value === 'replace'"
      @pick="bedit.pickImage"
      @close="bedit.picker.value = null"
    />

    <ImportScoreDialog v-if="isEdit && externalEd" :text="externalEd.text" :theme="effTheme"
      :resolve-score="resolveScore" :upload-score="uploadScore"
      @save="saveExternalScore" @close="externalEd = null" />
    <div v-if="isEdit && scoreEd" class="titan-chordpro-score-modal" role="dialog" aria-modal="true" aria-label="Editor de partitura">
      <ScoreEditor
        :title="meta.title || 'Partitura'"
        :subtitle="scoreLabel"
        :source="scoreEd.text"
        @save="saveScore"
        @cancel="cancelScore"
      />
    </div>

    <div
      v-for="alert in exportAlerts"
      :key="alert.id"
      class="titan-chordpro-error-banner"
    >
      <TitanChordproIcon name="alertTri" :size="18" style="color:var(--danger)" />
      <span style="flex:1;font-size:13px;line-height:1.4;">{{ alert.text }}</span>
      <button style="flex:none;height:30px;padding:0 11px;border-radius:9px;border:1px solid var(--danger);background:transparent;color:var(--danger);font-size:12px;font-weight:600;cursor:pointer;" @click="alert.retry()">Tentar de novo</button>
      <TitanChordproIconButton icon="x" density="bar" muted aria-label="Fechar" @click="alert.dismiss()" />
    </div>

    <div
      v-if="toast"
      class="titan-chordpro-toast titan-chordpro-veil-2"
      :class="{ 'is-out': toastOut }"
      :style="{ bottom: toastBottom }"
    >{{ toast }}</div>

    <TitanChordproEndOffer
      v-if="setlist.endOffer.value && !isEdit"
      :next-title="setlist.nextTitle.value"
      :bottom="offerBottom"
      @next="endNext"
      @dismiss="setlist.dismissEnd()"
    />

    <div v-if="guard.bad.value" class="titan-chordpro-surface-warn" role="alert">
      <TitanChordproIcon name="alertTri" :size="16" style="color:var(--danger)" />
      <span style="flex:1;min-width:0;">
        <span class="titan-chordpro-surface-warn-title">Cifra sem altura resolvível</span>
        <span class="titan-chordpro-surface-warn-body">O ancestral imediato precisa de uma altura definida. Sem ela a cifra usa o piso de 460px e a barra de controle fica fora da tela. Ver <code>docs/CONSUMER.md</code> — detalhes no console.</span>
      </span>
      <button
        class="titan-chordpro-ghost"
        aria-label="Ocultar aviso"
        title="Ocultar aviso"
        style="flex:none;width:26px;height:26px;color:var(--muted);font-size:15px;"
        @click="guard.dismiss()"
      ><TitanChordproIcon name="x" :size="14" /></button>
    </div>

    <ExportSheet
      v-if="sheet"
      :export-key-note="exportKeyNote"
      :pdf-busy="pdf === 'busy'"
      :has-notation="exportHasNotation"
      :pdf-error="pdfExportError"
      :slides-busy="slides === 'busy'"
      :ppsx-busy="ppsx === 'busy'"
      :bundle-busy="bundleBusy"
      :bundle-error="bundleError"
      :compact="compact"
      :has-overlay="ov.hasOverlay.value"
      :export-orig="ov.exportOrig.value"
      @close="sheet = false"
      @cho="doExportCho"
      @pdf="doExportPdf"
      @slides="doExportSlides"
      @ppsx="doExportPpsx"
      @bundle="doExportBundle"
      @pick="(orig) => { ov.exportOrig.value = orig; toggleOriginal(orig) }"
    />

    <!-- Batida: fixed under the head — scrolling the chart must not take it away. -->
    <div
      v-if="strumVisible && strumPattern"
      :ref="bindStrumDock"
      class="titan-chordpro-strum-dock"
      data-strum-dock
      :style="strumDockStyle"
    >
      <StrumStrip
        :pattern="strumPattern"
        :beat-clock="met.running.value && met.countIn.value <= 0 ? met.beatClock.value : -1"
        :bar-beats="met.bar.value"
        :can-edit="false"
        :can-pick="canPickStrum"
        @pick="cycleStrumPattern"
      />
    </div>

    <!-- Beat count: left of the column, sticky, outside chrome so zen cannot take it. -->
    <button
      v-if="met.running.value && !isEdit"
      data-met-count
      type="button"
      class="titan-chordpro-met-count"
      :title="metPulseTitle"
      :style="{ top: countTop, left: countLeft }"
      @click="met.toggle()"
    >
      <span v-if="met.countIn.value" data-met-countin class="titan-chordpro-met-entrada">entrada</span>
      <span data-met-bpm class="titan-chordpro-met-bpm">{{ met.bpm.value }}</span>
      <span
        v-for="n in met.bar.value"
        :key="n"
        class="titan-chordpro-met-beat"
        :class="{ 'is-now': met.beat.value === n - 1, 'is-one': n === 1 }"
      >{{ n }}</span>
    </button>

    <MetronomeSheet
      v-if="metOpen && !isEdit"
      :compact="compact"
      :running="met.running.value"
      :beat="met.beat.value"
      :bpm="met.bpm.value"
      :bar="met.bar.value"
      :chart-bpm="met.chartBpm.value"
      :overridden="met.userBpm.value !== null"
      :sound="met.sound.value"
      :has-strum="hasStrum"
      :strum-sound="strumSound.enabled.value"
      :pulse-head="met.pulseHead.value"
      :follow="met.follow.value"
      :count-in-on="met.countInOn.value"
      :scrolling="scrolling"
      :scrollable="canScroll"
      :tap-count="met.tapCount.value"
      :time="meta.time"
      @close="metOpen = false"
      @toggle="met.toggle()"
      @bpm="met.nudgeBpm($event)"
      @reset-bpm="met.resetBpm()"
      @tap="met.tap()"
      @set-source="applySoundSource"
      @toggle-pulse-head="met.togglePulseHead()"
      @toggle-follow="met.follow.value = !met.follow.value"
      @toggle-count-in="met.toggleCountIn()"
    />

    <BatidaSheet
      v-if="batidaOpen && batidaDraft && canEditBatida"
      :compact="compact"
      :pattern="batidaDraft"
      :patterns="batidaDraftSet?.patterns"
      :active-index="batidaDraftSet?.activeIndex ?? 0"
      :bar-beats="beatsPerBar(meta.time)"
      :can-delete="hasStrum"
      :presets-enabled="capabilities.batidaPresets === true"
      :presets="strumPresetCatalog"
      :sound-enabled="strumSound.enabled.value"
      :preview-running="strumSound.previewRunning.value"
      :preview-clock="strumSound.previewClock.value"
      @close="closeBatida"
      @save-set="saveBatidaSet"
      @delete="deleteBatida"
      @save-preset="onSaveStrumPreset"
      @toggle-sound="strumSound.toggle()"
      @toggle-preview="onBatidaTogglePreview"
      @update-preview="strumSound.updatePreviewPattern($event)"
      @audition="strumSound.audition($event)"
    />

    <NewChartDialog
      v-if="novaOpen"
      :compact="compact"
      :start="novaStart"
      :fetch-chart="props.fetchChart"
      :fetch-youtube-duration="props.fetchYoutubeDuration"
      :read-pdf="props.readPdf"
      :online="isOnline"
      @close="novaOpen = false"
      @commit="commitNewChart"
    />

    <MetaDialog
      v-if="metaOpen && isEdit"
      :compact="compact"
      :source="working"
      :allow-restart="isContentEdit"
      :fetch-chart="props.fetchChart"
      :fetch-youtube-duration="props.fetchYoutubeDuration"
      :online="isOnline"
      @close="metaOpen = false"
      @apply="applyMeta"
      @restart="restartFromMeta"
    />

    <SetlistSheet
      v-if="setlist.on.value && setlist.listOpen.value"
      :compact="compact"
      :head-label="setlist.headLabel.value"
      :seen-label="setlist.seenLabel.value"
      :show-search="setlist.showSearch.value"
      :query="setlist.query.value"
      :items="setlist.items.value"
      :no-hit="setlist.noHit.value"
      @close="setlist.close()"
      @pick="goSong"
      @update:query="setlist.query.value = $event"
    />

    <ToneSheet
      v-if="toneOpen && phone && !isEdit"
      :shown-key="playingKey"
      :has-offset="hasOffset"
      :offset-label="`${offset > 0 ? '+' : ''}${offset}`"
      :song-caption="songKeyCaption"
      :capo-label="capoLabel"
      :capo-hint="capoHint"
      :capo-shapes="capoShapes"
      :has-capo="hasCapo"
      :has-reset="hasReset"
      :dual="mapOn"
      @dual="toggleMap"
      @close="toneOpen = false"
      @down="shift(-1)"
      @up="shift(1)"
      @capo-down="setCapo(capo - 1)"
      @capo-up="setCapo(capo + 1)"
      @reset="resetTone"
    />

    <TitanChordproMoreSheet
      v-if="moreOpen && compact"
      v-bind="moreSheetBind"
      @close="moreOpen = false"
      @theme="requestTheme"
      @toggle-nashville="toggleNashville"
      @toggle-comments="setHideComments(!hideComments)"
      @metronome="moreOpen = false; toggleMetPanel()"
      @strum="moreOpen = false; toggleStrum()"
      @toggle-ensaio-batida="moreOpen = false; toggleEnsaioBatida()"
      @export="moreOpen = false; sheet = true"
      @toggle-original="moreOpen = false; toggleOriginal(!ov.showOriginal.value)"
      @open-my="moreOpen = false; ov.myPanel.value = true"
      @open-queue="moreOpen = false; ov.openQueue()"
    />

    <MyVersionPanel
      v-if="ov.myPanel.value"
      :compact="compact"
      :mine-label="ov.mineLabel.value"
      :ops="ov.opList.value"
      :fix-tune-label="fixTuneLabel"
      :can-suggest="ov.canSuggest.value"
      :suggest-label="ov.suggestLabel.value"
      :offline="suggestNeedsNet"
      :suggesting="ov.sending.value"
      :actor-name="ov.actorName.value"
      :name-error="ov.nameNeeded.value"
      :sent-suggestions="ov.mySuggestions.value"
      :revert-all-label="ov.revertAllLabel.value"
      :revert-all-danger="ov.revertAllLabel.value !== 'Voltar ao original'"
      @close="ov.closeMy"
      @revert="ov.revertOp"
      @fix-tune="onFixTune"
      @suggest="ov.suggest"
      @update:actor-name="ov.actorName.value = $event"
      @revert-all="ov.revertAll"
    />

    <UpdateDialog
      v-if="ov.updDlg.value"
      :compact="compact"
      :items="ov.updItems.value"
      @toggle="ov.togglePick"
      @keep="ov.updKeep"
      @adopt="ov.updAdopt"
    />

    <SuggestionQueue
      v-if="ov.queueOpen.value"
      :title="ov.qTitle.value"
      :show-back="!!ov.qSong.value"
      :empty="ov.pendingCount.value === 0"
      :level="ov.qSug.value ? 3 : ov.qSong.value ? 2 : 1"
      :songs="ov.qSongs.value"
      :sugs="ov.qSugs.value"
      :ops="ov.qOps.value"
      :actor-name="ov.qActorName.value"
      :preview-strum="ov.qPreviewStrum.value"
      :official-strum="ov.qOfficialStrum.value"
      :batch-applies="ov.qBatchPreview.value?.count ?? 0"
      :batch-conflicts="ov.qBatchPreview.value?.conflicts ?? 0"
      :busy="ov.reviewBusy.value"
      :resolve-score="resolveScore"
      @back="ov.qBack"
      @close="ov.closeQueue"
      @pick-song="(k) => (ov.qSong.value = k)"
      @pick-sug="(k) => (ov.qSug.value = k)"
      @accept="ov.acceptOp"
      @refuse="ov.refuseOp"
      @accept-batch="ov.acceptBatch"
      @refuse-batch="ov.refuseBatch"
    />

    <SourcePane
      v-if="isContentEdit && srcOpen && capabilities.sourcePane !== false"
      :source="liveSource"
      :lint="lint"
      :sel="srcSel"
      @input="onDraft"
      @checkpoint="session.checkpoint"
      @close="srcOpen = false"
    />

    <div class="titan-chordpro-live" role="status" aria-live="polite">{{ toast }}</div>
    <div class="titan-chordpro-live" role="alert" aria-live="assertive">{{ fatal || (pdf === 'error' ? 'A exportação em PDF falhou.' : slides === 'error' ? 'A exportação em slides falhou.' : ppsx === 'error' ? 'A exportação em PowerPoint falhou.' : '') }}</div>
  </div>
</template>
