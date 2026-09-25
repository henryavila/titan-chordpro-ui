<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  blockSpan,
  buildTimeline,
  buildChoFilename,
  buildPdfFilename,
  buildSljaFilename,
  clockOf,
  createSourceSession,
  editTypeScale,
  etaSec,
  exportCho,
  formatEta,
  hasSongDuration,
  inferWrittenKey,
  ChartEnvelopeError,
  commitChartDocument,
  listCharts,
  lintSource,
  storedTransposeSemis,
  isParseFatal,
  keyIndex,
  keyRootOf,
  layoutChartFull,
  maxPlainChars,
  missingOf,
  MISSING_LABEL,
  normalizeSource,
  beatsPerBar,
  emptyPattern,
  gridFromDensity,
  parse,
  isCompleteStrumPattern,
  repairStrumPattern,
  playheadAtScroll,
  readMeta,
  readStrumPatterns,
  rewriteToKey,
  runSec,
  scrollAtPlayhead,
  sheetBpm,
  transposeToken,
  formatToneShift,
  typeScale,
  usesFlats,
  viewerMulStep,
  writeMeta,
  writeStrumPatterns,
  audioArtOf,
  audioArtistOf,
  audioKindsOf,
  audioTracksOf,
  defaultAudioKind,
  displaySongTitle,
  type AudioKind,
  STORE_KEYS,
  browserStore,
  type StrumPattern,
  type StrumPatternSet,
} from '@henryavila/titan-chordpro-ui'
import type {
  ChartStore,
  Lens,
  ReadingCtx,
  SaveStrumPresetPayload,
  StrumPreset,
  ThemeId,
  Timeline,
  TimelineBlock,
  TuneOp,
} from '@henryavila/titan-chordpro-ui'
import ChartBody from './chart/ChartBody.vue'
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
import NewChartDialog from './edit/NewChartDialog.vue'
import MetaDialog from './edit/MetaDialog.vue'
import MyVersionPanel from './overlay/MyVersionPanel.vue'
import SuggestionQueue from './overlay/SuggestionQueue.vue'
import UpdateDialog from './overlay/UpdateDialog.vue'
import CpvViewHead from './chrome/CpvViewHead.vue'
import type { ViewHeadModel } from './chrome/view-head'
import CpvCapoLegend from './chrome/CpvCapoLegend.vue'
import CpvViewerStates from './chrome/CpvViewerStates.vue'
import CpvEditHead from './chrome/CpvEditHead.vue'
import CpvWideDock from './chrome/CpvWideDock.vue'
import CpvPhoneDock from './chrome/CpvPhoneDock.vue'
import CpvAudioRef from './chrome/CpvAudioRef.vue'
import CpvMoreSheet from './chrome/CpvMoreSheet.vue'
import CpvEditDock from './chrome/CpvEditDock.vue'
import CpvEndOffer from './chrome/CpvEndOffer.vue'
import CpvSwipeVeil from './chrome/CpvSwipeVeil.vue'
import { useBlockEdit } from './use/useBlockEdit'
import { useFullscreen, warnIfHostBlocksFullscreen } from './use/useFullscreen'
import { pinWouldFillViewport } from './use/viewportPin'
import { useMetronome } from './use/useMetronome'
import { useStrumSound } from './use/useStrumSound'
import {
  effectiveChannels,
  prefsFromSource,
  shouldRollSilent,
  strumAudibleDuringRun,
  type SoundSource,
} from './use/rehearsal-audio'
import { useOverlay } from './use/useOverlay'
import { useSetlist, type SongSpot } from './use/useSetlist'
import { useSongSwipe } from './use/useSongSwipe'
import { SWIPE_EDGE_PX, SWIPE_FADE_MS, swipeRailPx } from './use/song-swipe'
import { useSurfaceGuard } from './use/useSurfaceGuard'
import { useWakeLock } from './use/useWakeLock'
import { useAudioRef } from './use/useAudioRef'
import type { ChordproViewerProps, EditMode, RehearsalFocus, WriteMode } from './public'
import { resolveEditMode } from './public'
import { applyThemeVars, cycleTheme, themeIcon, themeLabel } from './use/useTheme'
import CpvIcon from './icon/CpvIcon.vue'
import type { CpvIconName } from './icon/paths'
import './cpv.css'

const props = withDefaults(
  defineProps<
    ChordproViewerProps & {
      /** Host batida presets (declared locally so the SFC macro always emits a runtime prop). */
      strumPresets?: StrumPreset[]
      persistSuggestion?: (
        suggestion: import('@henryavila/titan-chordpro-ui').Suggestion,
      ) => Promise<void>
      forceParseError?: boolean
      pdfShouldFail?: boolean
      slidesShouldFail?: boolean
      /** Test harness: start with this capo instead of the file's `{capo:}`. */
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
    lens: 'none',
    hideComments: false,
    rehearsalFocus: 'off',
    loading: false,
    autoHide: true,
    fitDefault: true,
    canEdit: true,
    autoInvertScores: true,
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
    fetchChart: undefined,
    fetchYoutubeDuration: undefined,
    readPdf: undefined,
    version: 'v1',
    images: () => [],
    forceParseError: false,
    pdfShouldFail: false,
    slidesShouldFail: false,
    capabilities: () => ({ sourcePane: true }),
    strumPresets: () => [],
  },
)

// Inline emit map so the SFC compiler emits a runtime declaration (imported
// `ChordproViewerEmits` alone can omit new keys from the runtime emits list).
const emit = defineEmits<{
  'update:source': [value: string]
  'update:chartId': [value: string]
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

const root = ref<HTMLElement | null>(null)
const scroller = ref<HTMLElement | null>(null)
const page = ref<HTMLElement | null>(null)
const head = ref<HTMLElement | null>(null)
const capoBox = ref<HTMLElement | null>(null)
const width = ref(900)
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
const scrolling = ref(false)
/** Paper the chart has left to give, in px. Zero when it fits the frame. */
const scrollRoom = ref(0)
const mul = ref(1)
const progress = ref(0)
const etaLabel = ref('—')
const sheet = ref(false)
const pdf = ref<'idle' | 'busy' | 'error'>('idle')
const slides = ref<'idle' | 'busy' | 'error'>('idle')
const toast = ref<string | null>(null)
const toastOut = ref(false)
const fs = ref(false)
const idle = ref(false)
const zen = ref(false)
const hintOff = ref(false)
const fitSeen = ref(false)
const editSeen = ref(false)
const editHintOff = ref(false)
const toneOpen = ref(false)
const moreOpen = ref(false)

const metOpen = ref(false)
const lens = ref<Lens>(props.lens)
/** Dual chart: show the capo shape above the real chord, song-wide. */
const capoMap = ref(true)
const hideComments = ref(props.hideComments)
const srcOpen = ref(false)
/**
 * Chart the edit session opened on. A half-typed `{x_chart_default}` must not
 * move the source pane onto the sibling.
 */
const pinnedChartId = ref<string | null>(null)
/** Musician/host pick. Null follows the file default until someone chooses. */
const musicianChartId = ref<string | null>(String(props.chartId ?? '').trim() || null)
type LiveChartSpot = {
  offset: number
  capo: number
  dual: boolean
  mul: number
  top: number
  u: number
}
const chartSpots: Record<string, LiveChartSpot> = {}
function liveChartKey(song: string, chart: string) {
  return `${song}\t${chart}`
}
watch(
  () => props.chartId,
  (id) => {
    const next = String(id ?? '').trim() || null
    if (next === musicianChartId.value) return
    rememberOpenChart()
    stopScroll()
    met.stop()
    musicianChartId.value = next
    applyChartSpot()
  },
)
const localMode = ref<'view' | 'edit' | null>(null)
/** Where the current edit lands: this phone, or everyone's chart. */
const wMode = ref<WriteMode | null>(null)
const confirmDiscard = ref(false)
const metaOpen = ref(false)
const identityLost = ref(false)

const session = createSourceSession({ source: props.source ?? '' })
/** Working source: the draft while editing, the host source otherwise. */
const working = ref(props.source ?? '')
const rev = ref(0)
let lastSrc: string | null = null
let lastSongId: string | null = null
let lastExplicit = false
function touch() {
  working.value = session.getSource()
  rev.value += 1
  // Editing something IS the lesson: the hint has nothing left to teach.
  if (isEdit.value && !editSeen.value) markEditSeen()
  // A local edit saves itself: there is no button, so every keystroke becomes
  // an anchored adjustment on top of the official text.
  if (isEdit.value && wMode.value === 'local') ov.commitLocalFrom(working.value, enterCtx)
  // Content mode is the official chart: the host must see the draft so a
  // form submit (Nova, etc.) can persist it even before "Salvar para todos".
  publishContentSource()
  emit('dirty', dirty.value)
}

/**
 * Echo the working source to the host without the watcher treating it as a
 * new chart. `lastSrc` is the same guard `save()` uses.
 */
function publishContentSource() {
  if (!isEdit.value || wMode.value !== 'persisted') return
  const cur = session.getSource()
  lastSrc = cur
  emit('update:source', cur)
}

/**
 * Re-baseline the editor on the current base text. Every overlay change makes
 * the reader's version a different text — the draft cannot survive it, which
 * is why reverting an adjustment drops what was typed on top of it.
 */
function forceBase(file?: string) {
  const b = ov.baseFor(wMode.value, file)
  // Also when the text already matches: `reset` is what moves the saved
  // baseline, and a local edit that ends level with its base is not a draft.
  if (session.getSource() === b && !session.dirty()) return
  session.reset(b)
  touch()
}

function fileCapo(src: string): number {
  const m = src.match(/\{\s*capo\s*:\s*(\d+)\s*\}/i)
  return m ? Math.max(0, Math.min(9, Number(m[1]))) : 0
}

function preloadTune() {
  offset.value = 0
  const file = normalizeSource(hostSource.value)
  const id = String(musicianChartId.value ?? '').trim()
  const doc = readChartFile(() => parse(file, id ? { chartId: id } : undefined).source, file)
  capo.value = fileCapo(doc)
  if (typeof props.initialCapo === 'number') capo.value = Math.max(0, Math.min(9, props.initialCapo))
  capoMap.value = typeof props.initialDual === 'boolean' ? props.initialDual : true
}

function applyChartTune(tune: TuneOp | null) {
  if (!tune) {
    preloadTune()
    return
  }
  offset.value = tune.transpose || 0
  capo.value = tune.capo || 0
  capoMap.value = !!tune.dual
}

let raf = 0
let written = 0
/** Fraction of the song already played by the reading playhead. */
let playhead = 0
let timeline: Timeline | null = null
let etaTick = -1
let idleT = 0
let toastT = 0
let hintT = 0
let discardT = 0
/** Reading context at the moment the edit started — it travels with the ops. */
let enterCtx: ReadingCtx = { transpose: 0, capo: 0 }
let lastFocus: HTMLElement | null = null
let userScroll: (() => void) | null = null
let mq: MediaQueryList | null = null
let ro: ResizeObserver | null = null
let headRo: ResizeObserver | null = null
let pageRo: ResizeObserver | null = null
let zenSeen = false
let idleSeen = false

const mode = computed(() => localMode.value ?? props.mode)
const isEdit = computed(() => mode.value === 'edit')
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
/** A broken envelope must not throw out of a computed. The file still does not open as charts. */
function readChartFile<T>(read: () => T, fallback: T): T {
  try {
    return read()
  } catch (err) {
    if (err instanceof ChartEnvelopeError) return fallback
    throw err
  }
}

const CHART_ENVELOPE_PT: Readonly<Record<string, string>> = {
  'chart file has text outside chart blocks': 'Há texto fora dos blocos de cifra.',
  'x_chart_default names a different chart': 'A cifra padrão aponta para outra cifra.',
  'more than one chart marks itself default': 'Mais de uma cifra está marcada como padrão.',
}

function chartEnvelopePt(err: ChartEnvelopeError): string {
  return CHART_ENVELOPE_PT[err.message] ?? 'Este arquivo de cifras não pode ser aberto.'
}

const EMPTY_CHART: ReturnType<typeof parse> = {
  meta: {},
  displayKey: null,
  transposeSemitones: 0,
  source: '',
  sections: [],
  eocOf: {},
}

const audioTracks = computed(() =>
  isEdit.value
    ? { sung: null, playback: null }
    : readChartFile(() => audioTracksOf(liveSource.value), { sung: null, playback: null }),
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
const audioKey = computed(() => `${audioTracks.value.sung ?? ''}|${audioTracks.value.playback ?? ''}`)
const audio = useAudioRef(audioUrl)
function pinEditedChart() {
  const charts = readChartFile(() => listCharts(session.getSource()), [])
  pinnedChartId.value = charts.find((c) => c.isDefault)?.id ?? charts[0]?.id ?? null
}

function commitOpenChart(next: string): string {
  if (pinnedChartId.value == null) pinEditedChart()
  return commitChartDocument(session.getSource(), next, pinnedChartId.value ?? undefined)
}

const fileCharts = computed(() => readChartFile(() => listCharts(liveSource.value), []))

/**
 * Chart on screen. The edit pin wins while that id is still in this text;
 * else the musician/host pick; else the file default. An id the source does
 * not contain is not passed.
 */
const screenChartId = computed((): string | undefined => {
  const charts = fileCharts.value
  if (!charts.length) return undefined
  const pinned = String(pinnedChartId.value ?? '').trim()
  if (pinned && charts.some((c) => c.id === pinned)) return pinned
  const chosen = String(musicianChartId.value ?? '').trim()
  if (chosen && charts.some((c) => c.id === chosen)) return chosen
  return charts.find((c) => c.isDefault)?.id ?? charts[0]?.id
})

function rememberOpenChart() {
  const chart = screenChartId.value
  if (!chart) return
  chartSpots[liveChartKey(songId.value, chart)] = {
    offset: offset.value,
    capo: capo.value,
    dual: capoMap.value,
    mul: mul.value,
    top: scroller.value?.scrollTop ?? 0,
    u: playhead,
  }
}

function applyChartSpot() {
  const chart = screenChartId.value
  const spot = chart ? chartSpots[liveChartKey(songId.value, chart)] : undefined
  if (spot) {
    offset.value = spot.offset
    capo.value = spot.capo
    capoMap.value = spot.dual
    mul.value = spot.mul
    playhead = spot.u
    progress.value = spot.u
    timeline = null
    const top = spot.top
    requestAnimationFrame(() => {
      if (scroller.value) scroller.value.scrollTop = top
    })
  } else {
    mul.value = 1
    playhead = 0
    progress.value = 0
    timeline = null
    etaLabel.value = '—'
    if (scroller.value) scroller.value.scrollTop = 0
  }
  met.loadBpm()
}

function selectChart(id: string) {
  const next = String(id ?? '').trim()
  if (!next || !fileCharts.value.some((c) => c.id === next)) return
  if (musicianChartId.value === next) return
  rememberOpenChart()
  stopScroll()
  met.stop()
  musicianChartId.value = next
  emit('update:chartId', next)
  applyChartSpot()
}

const parsedState = computed(() => {
  try {
    return {
      view: parse(liveSource.value, screenChartId.value ? { chartId: screenChartId.value } : undefined),
      envelopeError: '',
    }
  } catch (err) {
    if (err instanceof ChartEnvelopeError) return { view: EMPTY_CHART, envelopeError: chartEnvelopePt(err) }
    throw err
  }
})
const parsed = computed(() => parsedState.value.view)
const audioArt = computed(() => (isEdit.value ? null : readChartFile(() => audioArtOf(liveSource.value), null)))
const audioTitle = computed(() => displaySongTitle(parsed.value.meta.title))
const audioArtist = computed(() => audioArtistOf(parsed.value.meta))
const fatal = computed(() => {
  if (identityLost.value) return 'A identidade da música mudou.'
  if (props.forceParseError) return 'Erro de leitura simulado, para revisar este estado.'
  if (parsedState.value.envelopeError) return parsedState.value.envelopeError
  return isParseFatal(liveSource.value, parsed.value)
})
const isLoading = computed(() => props.loading)
const isEmpty = computed(() => !isLoading.value && !liveSource.value.trim())
const isPopulated = computed(() => !isLoading.value && !isEmpty.value && !fatal.value)
const phone = computed(() => width.value < 640)
const compact = computed(() => phone.value)
const bp = computed(() => {
  const W = width.value
  return W < 400 ? 'xs' : W < 640 ? 'sm' : W < 900 ? 'md' : W < 1280 ? 'lg' : 'xl'
})
const pageMax = computed(() =>
  fs.value
    ? ({ xs: '100%', sm: '100%', md: '100%', lg: '1040px', xl: '1180px' } as const)[bp.value]
    : ({ xs: '100%', sm: '100%', md: '760px', lg: '880px', xl: '980px' } as const)[bp.value],
)
const padX = computed(() =>
  fs.value
    ? ({ xs: '8px', sm: '10px', md: '14px', lg: '18px', xl: '24px' } as const)[bp.value]
    : ({ xs: '14px', sm: '16px', md: '22px', lg: '28px', xl: '40px' } as const)[bp.value],
)
/** Floating chrome inset above the chart (head + edit). Slightly tighter than
 * the old band so a compact head still reads as a card, not a strip. */
const chromePad = computed(() =>
  fs.value
    ? ({ xs: '4px 6px 0', sm: '5px 8px 0', md: '6px 12px 0', lg: '7px 14px 0', xl: '8px 18px 0' } as const)[bp.value]
    : ({ xs: '8px 10px 0', sm: '10px 12px 0', md: '12px 16px 0', lg: '14px 20px 0', xl: '16px 26px 0' } as const)[
        bp.value
      ],
)
const chromeTop = computed(
  () =>
    (fs.value
      ? ({ xs: 4, sm: 5, md: 6, lg: 7, xl: 8 } as const)
      : ({ xs: 8, sm: 10, md: 12, lg: 14, xl: 16 } as const))[bp.value],
)
const padBottom = computed(() => {
  const base = fs.value
    ? ({ xs: 104, sm: 106, md: 104, lg: 106, xl: 110 } as const)[bp.value]
    : ({ xs: 124, sm: 128, md: 128, lg: 132, xl: 140 } as const)[bp.value]
  // The dock grows when auto-scroll starts: the last line must not hide under it.
  return `${base + (phone.value ? (scrolling.value ? 54 : 10) : 0)}px`
})
/**
 * Zen only fades the chrome. The page pad stays put on phone and desktop —
 * reclaiming the band used to shove the line under the eye, which a chart
 * may never do. Idle auto-hide follows the same rule (opacity only).
 */
/**
 * Right edge of the reading column. Chrome that belongs to the chart hangs
 * here rather than off the window: on a phone the two are the same place, but
 * at 1600px the column is centred and the corner of the glass is 300px of
 * empty background away from anything the musician is looking at.
 */
/** Flush-left overlay on a full-width frame (2px, not 12 — 20px cells at 12px sat on the lyric). */
const countLeft = computed(() =>
  pageMax.value === '100%' ? '2px' : `max(12px, calc((100% - ${pageMax.value}) / 2 - 28px))`,
)
/**
 * Below the padded title strip (chromeTop + head), not `headH` alone — that
 * ignored the chrome pad and parked "entrada" against the title.
 */
const countTop = computed(
  () => `${chromeTop.value + Math.max(40, headH.value || 56) + 8}px`,
)
/**
 * Hard gate: no `{duration:}`, no auto-scroll. A BPM and unmarked chords are
 * not a duration. A chart that fits the frame also has nowhere to go. The
 * button stays live while the scroll runs — that is the only way to stop it.
 */
const hasDuration = computed(() => hasSongDuration(parsed.value.meta.duration))
const canScroll = computed(() => hasDuration.value && scrollRoom.value > 1)
const scrollOff = computed(() => !canScroll.value && !scrolling.value)
/**
 * Three tiers, not two. At 320px — the narrowest phone still in use — six
 * controls at 44px plus the type pair overflow the frame by 34px, and what
 * falls off the end is the button furthest right, unreachable rather than
 * merely tight. 40px is under the 44px a thumb wants, and it is the smaller
 * concession.
 */
const dockCtrlH = computed(() => (width.value < 360 ? '40px' : bp.value === 'xs' ? '44px' : '48px'))
const dockIconSize = computed(() => dockCtrlH.value)
const dockTypeW = computed(() => (width.value < 360 ? '34px' : bp.value === 'xs' ? '38px' : '42px'))
/**
 * The word stays on from 360px up — Tela cheia left the dock, so 390px has
 * room again. Below that the row cannot hold it; leftover is shared across
 * the fileira (`space-between`), not parked in a flex hole after a play
 * triangle that then reads as "tocar a música".
 */
const dockPlayLabeled = computed(() => width.value >= 360)
const meta = computed(() => parsed.value.meta)

/** Batida from `{x_strum:}` / `{x_strum_set:}` — toggle is the reader's choice. */
const strumSet = computed(() =>
  readChartFile(() => readStrumPatterns(liveSource.value), { activeIndex: 0, patterns: [] }),
)
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

function publishBatidaSource(next: string) {
  session.replace(next)
  // Local edit is overlay-only — the official chart changes when the musician
  // suggests and the owner accepts. Persisted (and view cycle) write through.
  if (wMode.value !== 'local') {
    lastSrc = next
    emit('update:source', next)
  }
  touch()
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
})

/**
 * What the viewer is reading. In a rehearsal the list decides; otherwise the
 * host's `source` is the chart, exactly as before. A song still on its way
 * reads as empty — `songFail` and the busy marks say why.
 */
const hostSource = computed(() =>
  setlist.on.value ? (setlist.currentSource.value ?? '') : (props.source ?? ''),
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

/** The offer sits above the dock, and the dock grows while the chart scrolls. */
const offerBottom = computed(() =>
  compact.value
    ? `calc(env(safe-area-inset-bottom) + ${scrolling.value ? 186 : 130}px)`
    : `${scrolling.value ? 148 : 90}px`,
)

// In a rehearsal the identity is the song's, so a personal version follows
// the right one through the list. Outside a list, the host id / official
// title is the key — never the draft title, or a local meta edit would move
// the overlay and orphan the reader's version.
const songId = computed(() => {
  if (setlist.on.value) return setlist.current.value?.id ?? 'song'
  if (props.songId) return props.songId
  return readChartFile(() => parse(normalizeSource(hostSource.value)).meta.title || 'song', 'song')
})

const ov = useOverlay({
  songId,
  version: computed(() => props.version || 'v1'),
  // Line indices are what an adjustment anchors on: the overlay lives in the
  // same normalised text the parser numbers.
  hostSource: computed(() => normalizeSource(hostSource.value)),
  chartId: screenChartId,
  title: computed(() => meta.value.title ?? ''),
  suggestions: computed(() => props.suggestions !== false),
  actorKey: computed(() => props.actorKey),
  actorName: computed(() => props.actorName),
  suggestionQueue: computed(() => props.suggestionQueue),
  store,
  toast: (m) => toastMsg(m),
  // While an edit is in flight the draft is the truth; anything else that
  // moves the base has to reach the screen at once.
  onBaseChange: (origin) => {
    if (!isEdit.value) forceBase(origin === 'official' ? undefined : session.getSource())
  },
  onChartLoad: (tune) => {
    applyChartTune(tune)
    if (!session.dirty()) forceBase(session.getSource())
  },
  onSaveContent: (text) => emit('save-content', text),
  persistSuggestion: computed(() => props.persistSuggestion),
  onSuggestionCreated: (s) => emit('suggestion-created', s),
  onSuggestionAccepted: (p) => emit('suggestion-accepted', p),
  onSuggestionRefused: (p) => emit('suggestion-refused', p),
  onSuggestionQueue: (q) => emit('update:suggestionQueue', q),
})

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
const fileTranspose = computed(() => {
  const n = Number(meta.value.transpose)
  return Number.isFinite(n) ? n : 0
})
/** Line indexes from `parse` refer to this chart document, not the envelope. */
const chartSource = computed(() => parsed.value.source)
const writtenKey = computed(() => inferWrittenKey(chartSource.value))
const keyMismatch = computed(() => {
  const a = keyIndex(keyRootOf(writtenKey.value || ''))
  const b = keyIndex(keyRootOf(meta.value.key || ''))
  return a != null && b != null && a !== b
})
const viewSemis = computed(() =>
  isEdit.value ? 0 : offset.value + storedTransposeSemis(chartSource.value),
)
const shownKey = computed(() => (meta.value.key ? transposeToken(meta.value.key, offset.value, flats.value) : ''))
const playingKey = computed(() =>
  meta.value.key ? transposeToken(meta.value.key, viewSemis.value, flats.value) : '',
)
const toneLabel = computed(() => {
  if (!meta.value.key) return ''
  const id = fileTranspose.value ? meta.value.key : shownKey.value
  const bits = [id]
  if (fileTranspose.value && playingKey.value && playingKey.value !== id) bits.push(`tocando em ${playingKey.value}`)
  if (hasCapo.value) bits.push(`capo ${capo.value}`)
  return bits.join(' · ')
})
const songKeyCaption = computed(() => {
  const written = meta.value.key
  const shift = formatToneShift(viewSemis.value)
  if (!written || !shift) return ''
  return `${written} · ${shift}`
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
const twin = computed(() => layout.value.twin)
const legend = computed(() => layout.value.legend)
const capoPairs = computed(() => layout.value.capoPairs)

/**
 * Writing the chart by its blocks (E1/E2). Every action rewrites the source —
 * a block that was moved, hidden, transposed or capoed says so in the file,
 * so it survives a reload, an undo and a re-parse.
 */
const bedit = useBlockEdit({
  source: chartSource,
  blocks,
  editing: isEdit,
  wMode,
  songCapo: capo,
  flats,
  root,
  scroller,
  write: (next, message) => {
    session.replace(commitOpenChart(next))
    touch()
    if (message) toastMsg(message)
  },
  toast: (m) => toastMsg(m),
})
const editScale = computed(() => editTypeScale(bias.value, compact.value))
/** The chart's own chord names, so a new one is a tap and not a spelling test. */
const chordVocab = computed(() =>
  Array.from(
    new Set(
      (chartSource.value.match(/\[([^\]]+)\]/g) ?? [])
        .map((t) => t.slice(1, -1))
        .filter((t) => /^[A-G]/.test(t)),
    ),
  ).slice(0, 12),
)
const insertItems = computed(() => {
  const out: Array<{ icon: CpvIconName; label: string; go: () => void }> = [
    { icon: 'music2', label: 'Partitura ou solo', go: () => newScore() },
  ]
  // Without a catalogue from the host there is nothing to pick from, and an
  // entry that opens an empty dialog is worse than no entry.
  if (props.images.length)
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
const chartScale = computed(() => {
  const { barPx: _barPx, ...rest } = scale.value
  return rest
})
const hintFit = computed(
  () => isPopulated.value && !isEdit.value && !fitSeen.value && !hintOff.value,
)
const hasOffset = computed(() => offset.value !== 0)
const hasCapo = computed(() => capo.value > 0)
const hasReset = computed(() => hasOffset.value || hasCapo.value)
const canEditNow = computed(
  () => !isEdit.value && isPopulated.value && props.canEdit && modes.value.length > 0,
)
const canRewrite = computed(() => !!props.canEdit && keyMismatch.value && !!meta.value.key && !!writtenKey.value)
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
  if (capo.value === 0) return 'A cifra fica no tom real.'
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

const dirty = computed(() => {
  rev.value
  // The phone version has no save: each keystroke is already stored.
  if (wMode.value === 'local') return false
  return session.dirty()
})
const lint = computed(() => {
  rev.value
  // Pane and edit dock follow the chart document, not a sibling block.
  return lintSource(parsed.value.source)
})
const canUndo = computed(() => {
  rev.value
  return session.canUndo()
})
const canRedo = computed(() => {
  rev.value
  return session.canRedo()
})
const discardLabel = computed(() => (confirmDiscard.value ? 'Confirmar descarte' : 'Descartar'))
const exportKeyNote = computed(() =>
  meta.value.key ? `em ${playingKey.value}${capo.value ? ` · capo ${capo.value}` : ''}` : '',
)

/** Identity of the song for the per-song tempo memory. N>1 keys the chart too. */
const songKey = computed(() => {
  const base = [meta.value.title || '', meta.value.artist || ''].join('|').trim() || 'sem-titulo'
  const chart = screenChartId.value
  if (fileCharts.value.length > 1 && chart) return `${base}|${chart}`
  return base
})
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
const strumSound = useStrumSound()
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
  () =>
    (zen.value || (rollLive.value && idle.value)) &&
    !sheet.value &&
    !isEdit.value &&
    !audio.playing.value,
)
watch(chromeHidden, (gone) => {
  if (gone && !zen.value && !idleSeen) {
    idleSeen = true
    toastMsg('Mova para mostrar')
  }
})
watch(rollLive, (on) => {
  if (on && props.autoHide) {
    window.clearTimeout(idleT)
    idle.value = true
  }
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
/** Retriggered every beat so 2→3 still plays the hit, not only 1→n. */
const metHit = ref<'' | '1' | 'n'>('')
watch(
  () => (met.running.value ? met.beat.value : -1),
  async (b) => {
    metHit.value = ''
    if (b < 0) return
    await nextTick()
    metHit.value = b === 0 ? '1' : 'n'
  },
)
const metHitMs = computed(() => `${Math.round(30000 / Math.max(30, met.bpm.value))}ms`)
const headHitClass = computed(() => {
  if (!met.pulseHead.value || !metHit.value) return ''
  return metHit.value === '1' ? 'cpv-head-hit-1' : 'cpv-head-hit-n'
})
const rootHitClass = computed(() => {
  if (!metHit.value) return ''
  return metHit.value === '1' ? 'cpv-met-hit-1' : 'cpv-met-hit-n'
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
  // Only what diverges from the default is stored: touching a control must not
  // become a permanent preference by accident.
  try {
    let saved: unknown = null
    try { saved = JSON.parse(store.get(STORE_KEYS.prefs) ?? '{}') } catch { /* repair malformed prefs on the next choice */ }
    const p: Record<string, unknown> = saved && typeof saved === 'object' && !Array.isArray(saved) ? { ...saved } : {}
    // Preserve the free theme preference (including older values) while the
    // host controls appearance; other controls must not rewrite that policy.
    for (const key of ['bias', 'fit', 'metSound', 'metStrumSound', 'metFollow', 'metCountIn', 'metPulseHead', 'lens', 'hideComments']) delete p[key]
    if (props.themeControl !== 'host' && theme.value) p.theme = theme.value
    if (bias.value) p.bias = bias.value
    if (fit.value !== null && fit.value !== undefined) p.fit = fit.value
    if (met.sound.value) p.metSound = true
    if (strumSound.enabled.value) p.metStrumSound = true
    if (met.pulseHead.value) p.metPulseHead = true
    if (met.follow.value === false) p.metFollow = false
    if (met.countInOn.value === false) p.metCountIn = false
    // Reading lens survives song changes and remounts — singer / Nashville
    // choice is a session preference, not per-chart state.
    if (lens.value !== 'none') p.lens = lens.value
    if (hideComments.value) p.hideComments = true
    if (Object.keys(p).length) store.set(STORE_KEYS.prefs, JSON.stringify(p))
    else store.remove(STORE_KEYS.prefs)
  } catch {
    /* storage denied — preferences are a convenience, never a requirement */
  }
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

// ---------------------------------------------------------------- auto-scroll
// The playhead walks the chart in musical time (see core/timeline.ts); the page
// only moves once it passes the reading line.

function measureBlocks(): TimelineBlock[] {
  const el = scroller.value
  if (!el) return []
  // The sub-pixel carrier is a transform on the column, and every rect below
  // would come back shifted by it. Measure the paper, not where it is riding.
  const carrier = page.value?.style.transform ?? ''
  if (carrier && page.value) page.value.style.transform = ''
  const base = el.getBoundingClientRect().top - el.scrollTop
  const nodes = el.querySelectorAll('[data-block]')
  const list = blocks.value
  const out: TimelineBlock[] = []
  for (let i = 0; i < nodes.length; i++) {
    const b = list[i]
    if (!b) continue
    const r = (nodes[i] as HTMLElement).getBoundingClientRect()
    out.push({ top: r.top - base, h: Math.max(1, r.height), music: b.music, kind: b.kind })
  }
  if (carrier && page.value) page.value.style.transform = carrier
  return out
}

function rebuildTimeline(): Timeline | null {
  const el = scroller.value
  if (!el) {
    timeline = null
    return null
  }
  const clock = clockOf(parsed.value)
  timeline = buildTimeline(measureBlocks(), {
    bpm: clock.bpm,
    beatsPerBar: clock.beatsPerBar,
    marksPerBeat: clock.marksPerBeat,
    durationSec: clock.durationSec,
    barPx: scale.value.barPx,
    doc: el.scrollHeight,
    viewport: el.clientHeight,
  })
  return timeline
}

function timelineFor(): Timeline | null {
  const el = scroller.value
  if (!el) return null
  if (
    !timeline ||
    Math.abs(timeline.doc - el.scrollHeight) > 2 ||
    Math.abs(timeline.viewport - el.clientHeight) > 2
  ) {
    return rebuildTimeline()
  }
  return timeline
}

/**
  * The anchor is read from the live frame, not cached: the reader changes type
  * size and turns fit on mid-song, and both move how much paper there is.
  */
/**
 * Measured, never derived: the chart's height moves with type size, fit, the
 * key it was transposed to and the width it wraps at, and only the DOM knows.
 */
function syncScrollRoom() {
  const el = scroller.value
  scrollRoom.value = el ? Math.max(0, el.scrollHeight - el.clientHeight) : 0
}

/** Put a running scroll back on its musical position after a relayout. */
function reseatScroll() {
  const el = scroller.value
  if (!el) return
  rebuildTimeline()
  const max = el.scrollHeight - el.clientHeight
  el.scrollTop = Math.max(0, Math.min(max, scrollAtPlayhead(timelineFor(), playhead, el.clientHeight)))
  written = el.scrollTop
}

/** Where the reader was, taken before anything is allowed to move. */
type PageSpot = { padTop: number; scroll: number; max: number }

function pageSpot(): PageSpot {
  const el = scroller.value
  return {
    padTop: pageTopPad(),
    scroll: el?.scrollTop ?? 0,
    max: el ? Math.max(0, el.scrollHeight - el.clientHeight) : 0,
  }
}

/**
 * The reserved chrome band changes height without the frame changing size, so
 * no ResizeObserver fires and nothing puts the chart back under the reader's
 * eye. Mid-song the musical position is the truth — the playhead survives any
 * relayout; standing still, the pixel they were reading is.
 */
function reflowPage(before: PageSpot) {
  void nextTick(() => {
    const el = scroller.value
    timeline = null
    if (!el) return
    syncScrollRoom()
    if (scrolling.value) {
      reseatScroll()
      return
    }
    const max = Math.max(0, el.scrollHeight - el.clientHeight)
    // The two ends are places, not offsets. Somebody parked at the top is at
    // the *start of the song*, and giving the reserve back must not shove them
    // into the first verse; the same holds for the last line.
    if (before.scroll <= 1) el.scrollTop = 0
    else if (before.scroll >= before.max - 1) el.scrollTop = max
    else {
      const shift = (pageTopPad() || before.padTop) - before.padTop
      el.scrollTop = Math.max(0, Math.min(max, before.scroll + shift))
    }
    written = el.scrollTop
  })
}

/**
 * The fraction of a pixel `scrollTop` will not carry.
 *
 * A scroll offset is snapped to whole pixels — measured, `scrollTop` reads back
 * as an integer on every frame, whatever we write. At the speeds a chart really
 * moves (5 px/s and under), that means eleven frames dead still and then a 1px
 * teleport, six times a second. A discrete jump is what a vestibular system
 * reads as motion, so the page looked calm and felt awful.
 *
 * So the whole pixels go to `scrollTop`, which keeps the scrollbar, the drag
 * and every measurement honest, and the remainder rides on a composited
 * transform, which is not snapped. Together they move continuously.
 */
function setSubPixel(dy: number) {
  const el = page.value
  if (!el) return
  el.style.transform = dy > 0.001 ? `translate3d(0,${-dy}px,0)` : ''
}

function stopScroll() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  window.clearTimeout(idleT)
  if (scroller.value && userScroll) scroller.value.removeEventListener('scroll', userScroll)
  userScroll = null
  scrolling.value = false
  idle.value = false
  setSubPixel(0)
  // Every way out of the scroll passes through here — the end of the song, a
  // transpose, a song change — and with the two linked, none of them may leave
  // a click ticking over a chart that has stopped. `met.stop()` is a no-op when
  // the click is already down, which is what ends the call back into here.
  if (met.follow.value) met.stop()
}

function startScroll() {
  const el = scroller.value
  if (!el) return
  if (!hasSongDuration(parsed.value.meta.duration)) return
  // Hitting Rolar again is continuing the song, not confirming the end.
  setlist.dismissEnd()
  scrolling.value = true
  window.clearTimeout(idleT)
  if (props.autoHide) idle.value = true
  rebuildTimeline()
  // From the top the playhead starts at 0 and the page stays put until it
  // reaches the reading line — the whole intro stays on screen. Resuming
  // mid-song, the playhead adopts the current reading line.
  const max0 = Math.max(0, el.scrollHeight - el.clientHeight)
  const mapped = playheadAtScroll(timelineFor(), el.scrollTop, el.clientHeight)
  const atPaperEnd = max0 <= 1 || el.scrollTop >= max0 - 2
  playhead = el.scrollTop <= 1 ? 0 : Math.min(atPaperEnd ? 1 : 0.999, Math.max(0, mapped))
  written = el.scrollTop
  etaTick = -1
  let prev = performance.now()

  // The musician may drag the chart while it rolls (back a bit, skip ahead).
  // The playhead adopts that position and carries on from there.
  userScroll = () => {
    if (!scrolling.value) return
    if (Math.abs(el.scrollTop - written) > 1.5) {
      const maxS = Math.max(0, el.scrollHeight - el.clientHeight)
      const atEnd = maxS <= 1 || el.scrollTop >= maxS - 2
      const u = playheadAtScroll(timelineFor(), el.scrollTop, el.clientHeight)
      playhead = Math.min(atEnd ? 1 : 0.999, Math.max(0, u))
    }
  }
  el.addEventListener('scroll', userScroll, { passive: true })

  const dur = clockOf(parsed.value).durationSec
  const step = (now: number) => {
    if (!scrolling.value) return
    if (swipePeekHold) {
      prev = now
      raf = requestAnimationFrame(step)
      return
    }
    // One timeline per frame: each call may re-measure every block in the DOM,
    // and asking four times over lands four full layouts in the same frame.
    const t = timelineFor()
    // Coming back from a background tab must not teleport the chart — but a
    // dropped frame is time the music really spent, so the interval is capped
    // rather than thrown away, which used to lose it for good.
    const dt = Math.min(Math.max((now - prev) / 1000, 0), 0.25)
    prev = now
    const run = runSec(t, dur)
    if (run > 0 && dt > 0) playhead = Math.min(1, playhead + (dt / run) * mul.value)
    const max = el.scrollHeight - el.clientHeight
    const target = Math.max(0, Math.min(max, scrollAtPlayhead(t, playhead, el.clientHeight)))
    // Floor, never round: rounding would put the page half a pixel ahead of
    // the transform and hand back the jump this is here to remove.
    const whole = Math.floor(target)
    el.scrollTop = whole
    setSubPixel(target - whole)
    written = el.scrollTop
    // One update per clock second, not per frame: re-rendering the whole sheet
    // 60 times a second ate the frames of the scroll itself.
    const sec = Math.round(etaSec(t, dur, playhead, mul.value))
    if (sec !== etaTick) {
      etaTick = sec
      progress.value = playhead
      etaLabel.value = formatEta(sec)
    }
    if (playhead >= 1) {
      // The clock can claim "done" while the paper still has room — resume
      // after a drag used to fire "Fim da música" in the middle of the chart.
      // The offer is the end of the paper, not the end of the fraction.
      if (max <= 1 || el.scrollTop >= max - 2) {
        progress.value = 1
        stopScroll()
        setlist.offerNext()
        return
      }
      playhead = 0.999
    }
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

/**
 * Linked (the default): Rolar is the same start as the click — count-in, then
 * the chart. Independent: the two stay two controls, and Rolar only rolls.
 * Stopping still goes through `stopScroll`, which silences a linked click.
 *
 * Audio: outside Ensaio Batida, linked Rolar always starts silent so practice
 * Fonte (Batida/Click) does not leak onto the stage. Inside Ensaio Batida,
 * Rolar inherits Batida sound.
 */
function toggleScroll() {
  if (scrolling.value || (met.follow.value && met.running.value)) {
    stopScroll()
    return
  }
  if (!canScroll.value) return
  // Count-in delays startScroll; the leftover "Fim da música" must leave now.
  setlist.dismissEnd()
  if (met.follow.value) {
    const silent = shouldRollSilent(rehearsalFocus.value)
    if (!silent) {
      applySoundSource('batida', false)
      strumOn.value = true
      if (strumSound.enabled.value) void strumSound.arm()
    }
    met.start({ silent })
  } else startScroll()
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
  playhead = 0
  timeline = null
  progress.value = 0
  if (scroller.value) scroller.value.scrollTop = 0
}

function resetTone() {
  stopScroll()
  offset.value = 0
  capo.value = 0
}

function rewriteToDeclared() {
  const target = String(meta.value.key ?? '').trim()
  if (!target) return
  const r = rewriteToKey(liveSource.value, target)
  if (!r?.changed) return
  session.replace(r.source)
  capo.value = Number(readMeta(r.source).capo) || 0
  offset.value = 0
  touch()
  const n = r.transpose
  toastMsg(
    n
      ? `Cifra reescrita em ${r.to} · tocando em ${r.from} (transpose ${n > 0 ? '+' : ''}${n})`
      : `Cifra reescrita em ${r.to}`,
  )
  toneOpen.value = false
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
  if (t?.closest?.("button,input,textarea,select,a,[role='button'],figure")) return
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

/** The reserve the chart is standing on right now, before anything moves it. */
function pageTopPad(): number {
  const pg = page.value
  return pg ? parseFloat(getComputedStyle(pg).paddingTop) || 0 : 0
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
 * chart puts the viewer's own chrome away everywhere; the button exists where
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

const viewHeadBind = computed((): ViewHeadModel => ({
  variant: (phone.value ? 'phone' : 'wide') as 'phone' | 'wide',
  pageMax: pageMax.value,
  hitClass: headHitClass.value,
  setlistOn: setlist.on.value,
  posLabel: setlist.posLabel.value,
  nextChip: setlist.nextChip.value,
  title: meta.value.title || 'Sem título',
  subtitle: meta.value.subtitle || '',
  charts: fileCharts.value.length > 1 ? fileCharts.value.map((c) => ({ id: c.id, label: c.label })) : [],
  chartId: screenChartId.value ?? '',
  chartLabel: fileCharts.value.find((c) => c.id === screenChartId.value)?.label ?? '',
  phoneSub: phoneSub.value,
  hasKey: hasKey.value,
  hasReset: hasReset.value,
  toneLabel: toneLabel.value,
  playingKey: playingKey.value,
  songKeyCaption: songKeyCaption.value,
  hasCapo: hasCapo.value,
  capoBtnLabel: capoBtnLabel.value,
  capoLabel: capoLabel.value,
  capoHint: capoHint.value,
  capoShapes: capoShapes.value,
  mapOn: mapOn.value,
  twin: twin.value,
  canRewrite: canRewrite.value,
  metaKey: meta.value.key || '',
  metaTempo: meta.value.tempo,
  metaTime: meta.value.time,
  metaDuration: meta.value.duration,
  canWinScreen: canWinScreen.value,
  fs: fs.value,
  fsTitle: fsTitle.value,
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
  lastSrc = src
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

function enterEdit() {
  if (!canEditNow.value) return
  const role = editModeResolved.value
  if (role === 'none') return
  beginEdit(role)
}

function beginEdit(kind: WriteMode) {
  stopScroll()
  // The badge and the panel are both hidden in edit: a click left running here
  // would be audible with nothing on screen able to stop it.
  met.stop()
  // The adjustment was made against what was on screen: the reading context
  // travels with it, so it can be read back for what it was.
  enterCtx = { transpose: offset.value, capo: capo.value, dual: !!(capo.value && capoMap.value) }
  // You do not edit a projection: transpose goes back to neutral, and `fitOn`
  // already answers false while editing. Writing `fit` here instead would turn
  // "the reader never chose" into "the reader chose off" — and, once persisted,
  // hold the fit off for good after a single visit to the editor.
  offset.value = 0
  capo.value = 0
  zen.value = false
  lens.value = 'none'
  hideComments.value = false
  metOpen.value = false
  met.stop()
  exitEnsaioBatida()
  sheet.value = false
  capoOpen.value = false
  toneOpen.value = false
  moreOpen.value = false
  metaOpen.value = false
  closeBatida()
  ov.myPanel.value = false
  ov.showOriginal.value = false
  bedit.reset()
  scoreEd.value = null
  wMode.value = kind
  localMode.value = 'edit'
  if (!session.dirty()) forceBase(session.getSource())
  pinEditedChart()
  emit('update:mode', 'edit')
  toastMsg(
    kind === 'local'
      ? 'Só para você — salva neste celular, dá para voltar ao original'
      : 'Para todos — salvar altera a cifra do sistema',
  )
}

function exitEdit() {
  if (!isEdit.value) return
  const local = wMode.value === 'local'
  if (!local && dirty.value) toastMsg('Rascunho não salvo — continua aqui quando você voltar')
  srcOpen.value = false
  metaOpen.value = false
  bedit.reset()
  scoreEd.value = null
  wMode.value = null
  pinnedChartId.value = null
  localMode.value = 'view'
  // The local draft has already become the overlay; a "for everyone" draft
  // that was never saved stays on screen, so it cannot be lost by leaving.
  if (local || !session.dirty()) forceBase(session.getSource())
  emit('update:mode', 'view')
}

/** "For everyone" has no server draft: saving IS publishing. */
function save() {
  if (wMode.value !== 'persisted' || identityLost.value) return
  session.commit()
  touch()
  const cur = session.getSource()
  // The host may echo the saved text straight back as `source`: without this
  // the watcher would read it as a new chart and reset tone, scroll and draft.
  lastSrc = cur
  emit('update:source', cur)
  emit('save', cur)
  ov.setOfficial(cur)
  toastMsg('Salvo — todos os músicos passam a ler assim')
}

/** Reading the original is a lens on the same chart, not a second document. */
function toggleOriginal(orig: boolean) {
  stopScroll()
  ov.showOriginal.value = orig
  forceBase(session.getSource())
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
 * is written back as `{sos}`, so a chart has a single way to hold music.
 */
type ScoreEdit = { li0: number; li1: number; kind: 'score' | 'tab'; text: string; fresh: boolean }
const scoreEd = ref<ScoreEdit | null>(null)
const scoreLabel = computed(() =>
  scoreEd.value?.kind === 'tab' ? 'TAB importada do texto' : 'Partitura do bloco',
)

function openScore(bi: number) {
  const b = blocks.value[bi]
  if (!b || (b.kind !== 'tab' && b.kind !== 'score')) return
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
    text: '{sos: time=4/4 key=D tempo=92 tuning=EADGBE}\n{eos}',
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
  bedit.focusLine(d.li0)
}

function cancelScore() {
  const d = scoreEd.value
  // A block that only exists because the editor was opened goes away with it.
  if (d?.fresh) undo()
  scoreEd.value = null
}

/**
 * Discard goes back to the last SAVED text, not to the host source: what has
 * already been handed to the app cannot be thrown away by one click. And the
 * click is double, because the undo stack cannot bring it back.
 */
function discard() {
  if (!confirmDiscard.value) {
    confirmDiscard.value = true
    window.clearTimeout(discardT)
    discardT = window.setTimeout(() => (confirmDiscard.value = false), 4000)
    return
  }
  window.clearTimeout(discardT)
  confirmDiscard.value = false
  session.discard()
  metaOpen.value = false
  touch()
}

function onDraft(next: string) {
  // The step was already opened by the pane: keystrokes coalesce into it.
  // The pane edits the pinned chart; a half-typed marker is not a switch.
  session.edit(commitOpenChart(next))
  touch()
}

function undo() {
  session.undo()
  touch()
}
function redo() {
  session.redo()
  touch()
}

function openMeta() {
  if (!isEdit.value) return
  metaOpen.value = true
}
function applyMeta(next: string) {
  session.replace(next)
  metaOpen.value = false
  touch()
}

// ------------------------------------------------------------------- exports

function download(name: string, blob: Blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/** What leaves the app: the reader's version, or the official one. */
function exportSource(): string {
  return ov.exportOrig.value ? ov.official.value : liveSource.value
}

function doExportCho() {
  const text = exportCho(exportSource(), { semitones: offset.value, capo: capo.value })
  // A personal version leaves marked: it must not circulate as the team's chart.
  const mark =
    !ov.exportOrig.value && ov.hasOverlay.value
      ? '# versão pessoal — não é a cifra oficial da equipe\n'
      : ''
  const name = buildChoFilename(meta.value.title ?? 'cifra', shownKey.value || null)
  download(name, new Blob([mark + text], { type: 'text/plain;charset=utf-8' }))
  sheet.value = false
  toastMsg('Arquivo .cho baixado')
}

async function doExportPdf() {
  if (pdf.value === 'busy') return
  pdf.value = 'busy'
  try {
    if (props.pdfShouldFail) throw new Error('simulado')
    const { renderPdf } = await import('@henryavila/titan-chordpro-ui/pdf')
    // The PDF always uses the default scale: fit mode serves the screen, not paper.
    const view = parse(exportCho(exportSource(), { semitones: offset.value, capo: capo.value }))
    // A personal version leaves marked on paper too: it must not circulate as
    // the team's chart.
    const bytes = await renderPdf(view, {
      personal: !ov.exportOrig.value && ov.hasOverlay.value,
      accent: props.accent,
    })
    download(
      buildPdfFilename(meta.value.title ?? 'cifra', shownKey.value || null),
      new Blob([bytes as BlobPart], { type: 'application/pdf' }),
    )
    pdf.value = 'idle'
    sheet.value = false
    toastMsg('PDF gerado')
  } catch {
    pdf.value = 'error'
    sheet.value = false
  }
}

async function imageBytes(
  input: Blob | ArrayBuffer | Uint8Array | undefined,
): Promise<Uint8Array | undefined> {
  if (!input) return undefined
  if (input instanceof Uint8Array) return input
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  return new Uint8Array(await input.arrayBuffer())
}

async function doExportSlides() {
  if (slides.value === 'busy') return
  slides.value = 'busy'
  try {
    if (props.slidesShouldFail) throw new Error('simulado')
    const { renderSlja } = await import('@henryavila/titan-chordpro-ui/slides')
    const view = parse(exportCho(exportSource(), { semitones: offset.value, capo: capo.value }))
    const bytes = await renderSlja(view, {
      title: meta.value.title ?? 'cifra',
      coverImage: await imageBytes(props.coverImage),
      slidesImage: await imageBytes(props.slidesImage),
    })
    download(
      buildSljaFilename(meta.value.title ?? 'cifra'),
      new Blob([bytes as BlobPart], { type: 'application/zip' }),
    )
    slides.value = 'idle'
    sheet.value = false
    toastMsg('Slides gerados')
  } catch {
    slides.value = 'error'
    sheet.value = false
  }
}

// ------------------------------------------------------------------ listeners

function wake() {
  if (idle.value) idle.value = false
  window.clearTimeout(idleT)
  if (scrolling.value && props.autoHide) idleT = window.setTimeout(() => (idle.value = true), 2600)
}

function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  const typing = /^(input|textarea)$/i.test(target?.tagName ?? '')
  // Saving has to work with the cursor inside the source pane too.
  if (isEdit.value && (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
    e.preventDefault()
    save()
    return
  }
  if (typing) return
  // The score editor owns the keyboard while it is open: Esc, the arrows and
  // undo all mean something in there, and the chart behind it must not act on
  // the same keystroke.
  if (scoreEd.value) return
  const k = e.key
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
      if (bedit.picker.value) bedit.picker.value = null
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
  else if (k === 'ArrowRight' && scrolling.value) mul.value = viewerMulStep(mul.value, 'up')
  else if (k === 'ArrowLeft' && scrolling.value) mul.value = viewerMulStep(mul.value, 'down')
  else if ((k === 'l' || k === 'L') && !isEdit.value) toggleReading()
  else if (k === 'm' || k === 'M') met.toggle()
  else if (k === 'f' || k === 'F') toggleFs()
  else if (k === 't' || k === 'T') requestTheme()
  else if (k === 'a' || k === 'A') toggleFit()
  else if (k === 'c' || k === 'C') capoOpen.value = !capoOpen.value
  else if (k === 'Escape') {
    if (ov.myPanel.value) ov.closeMy()
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
  if (hit?.closest?.('.cpv-scrim')) {
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
 * A new source (host or fixture) stops the scroll, resets tone and position and
 * adopts the `{capo:}` declared in the file, when there is one.
 */
/** Setlist id or props.songId. A title parsed from the text is not an identity. */
function explicitSongChanged(): boolean {
  if (!setlist.on.value && !props.songId) return false
  return songId.value !== lastSongId
}

function explicitNow(): boolean {
  return setlist.on.value || !!props.songId
}

function syncHostSource() {
  const raw = hostSource.value
  const song = songId.value
  // The explicit id disappeared and the text did not. Forget the in-memory
  // version. Do not write either storage key and do not load the title key.
  if (raw === lastSrc && lastExplicit && !explicitNow() && song !== lastSongId) {
    ov.holdChartLoad()
    try {
      wMode.value = null
      localMode.value = 'view'
      ov.discardMemory()
      lastSongId = song
      lastExplicit = false
      identityLost.value = true
      forceBase()
      emit('update:mode', 'view')
    } finally {
      ov.releaseChartLoad()
    }
    return
  }
  // Same text is not a new chart unless a setlist or props.songId actually
  // changed. A title-only identity moves with the editor's own echo. The other
  // watch in this flush sees both already recorded and stops.
  if (raw === lastSrc && !explicitSongChanged()) return
  identityLost.value = false
  // Until ov.load(), the chart slot can move onto the next song while
  // officialSrc is still the file just saved.
  ov.holdChartLoad()
  try {
    // Where the song being opened was left, when it has been read before.
    const spot: SongSpot | null = setlist.takeRestore()
    const first = lastSrc === null
    const lost = !first && session.dirty()
    lastSrc = raw
    lastSongId = song
    lastExplicit = explicitNow()
    const src = normalizeSource(raw)
    session.reset(src)
    metaOpen.value = false
    confirmDiscard.value = false
    wMode.value = null
    pinnedChartId.value = null
    musicianChartId.value = String(props.chartId ?? '').trim() || null
    preloadTune()
    stopScroll()
    mul.value = 1
    // Coming back to a song already rehearsed: tone, capo and speed are picked
    // back up. A tone the reader pinned still wins, just below.
    if (spot) {
      offset.value = spot.offset
      capo.value = spot.capo
      mul.value = spot.mul
    }
    if (typeof props.initialCapo === 'number') capo.value = Math.max(0, Math.min(9, props.initialCapo))
    // Reading lens and comment filter stay: they are the reader's choice for the
    // rehearsal, not part of the chart. Song switch must not kick a singer out
    // of Só letra (or Nashville) mid-set.
    if (typeof props.initialDual === 'boolean') capoMap.value = props.initialDual
    metOpen.value = false
    met.stop()
    playhead = spot ? spot.u || 0 : 0
    timeline = null
    progress.value = spot ? spot.u || 0 : 0
    etaLabel.value = '—'
    pdf.value = 'idle'
    slides.value = 'idle'
    sheet.value = false
    touch()
    // The reader's own version of THIS chart, and the key they pinned to it.
    ov.reset()
    const tune = ov.load()
    if (tune) applyChartTune(tune)
    // officialSrc is clear. A chart the overlay itself opens must still load.
    ov.releaseChartLoad()
    forceBase()
    // The opened chart's overlay loads during the pass above. Paint its lyric
    // onto that file — the official text still carries the marker just removed.
    forceBase(session.getSource())
    // The stored BPM belongs to the song: it reloads with the chart.
    met.loadBpm()
    if (spot) {
      // The saved place only exists once the new chart has painted.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (scroller.value) scroller.value.scrollTop = spot.top
        }),
      )
    } else if (!first && scroller.value) scroller.value.scrollTop = 0
    // Swapping the chart drops the draft — but the loss has to be said, not silent.
    if (lost) {
      toastMsg(
        setlist.on.value
          ? 'Você trocou de música — o rascunho anterior foi descartado'
          : 'Nova cifra recebida — o rascunho anterior foi descartado',
      )
    }
  } finally {
    ov.releaseChartLoad()
  }
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
    u: playhead,
  })
}
const goPrev = () => goSong(setlist.si.value - 1)
const goNext = () => goSong(setlist.si.value + 1)
const endNext = () => {
  setlist.dismissEnd()
  goNext()
}

const swipeBusy = ref(false)
let swipeGen = 0
let swipePeekHold = false

const swipeBlocked = computed(
  () =>
    isEdit.value ||
    sheet.value ||
    moreOpen.value ||
    setlist.listOpen.value ||
    !!scoreEd.value ||
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
  onCommit: (intent) => {
    void playSwipeCommit(intent)
  },
  onPeek: (peeking) => {
    swipePeekHold = peeking
  },
})
const swipeView = songSwipe.view
const swipeDebug = computed(
  () => setlist.on.value && props.capabilities?.debugSwipe === true,
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
watch(songId, syncHostSource)
watch([theme, bias, fit, lens, hideComments, met.sound, strumSound.enabled, met.pulseHead, met.follow, met.countInOn], persistPrefs)
watch(lens, (v) => {
  if (v !== 'letra') chordLens.value = v
})
watch(
  () => props.lens,
  (next) => {
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
  timeline = null
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
    const p = JSON.parse(store.get(STORE_KEYS.prefs) || '{}') as {
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
    }
    if (p.theme) theme.value = p.theme
    if (typeof p.bias === 'number') bias.value = p.bias
    if (typeof p.fit === 'boolean') fit.value = p.fit
    if (typeof p.metSound === 'boolean') met.sound.value = p.metSound
    if (typeof p.metStrumSound === 'boolean') strumSound.setEnabled(p.metStrumSound)
    if (typeof p.metPulseHead === 'boolean') met.pulseHead.value = p.metPulseHead
    if (typeof p.metFollow === 'boolean') met.follow.value = p.metFollow
    if (typeof p.metCountIn === 'boolean') met.countInOn.value = p.metCountIn
    // Host prop wins when it asks for a lens; otherwise restore the last choice.
    if (props.lens !== 'none') lens.value = props.lens
    else if (p.lens === 'nashville' || p.lens === 'letra') lens.value = p.lens
    if (props.hideComments) hideComments.value = true
    else if (p.hideComments === true) hideComments.value = true
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
    const w = entries[0]?.contentRect.width ?? 900
    if (Math.abs(w - width.value) <= 4) return
    width.value = w
    void nextTick(() => {
      timeline = null
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
})

onUnmounted(() => {
  swipeGen += 1
  swipeBusy.value = false
  swipePeekHold = false
  wakeLock.stop()
  songSwipe.detach()
  stopScroll()
  met.dispose()
  strumSound.dispose()
  ov.dispose()
  guard.dispose()
  window.clearTimeout(idleT)
  window.clearTimeout(toastT)
  window.clearTimeout(hintT)
  window.clearTimeout(discardT)
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
    class="cpv-root"
    data-cpv-root
    :data-theme="effTheme"
    :data-cpv-lens="activeLens"
    :class="[rootHitClass, { 'is-setlist': setlist.on.value, 'is-swipe-debug': swipeDebug }]"
    :style="{
      '--cpv-met-hit': metHitMs,
      '--cpv-swipe-edge': `${SWIPE_EDGE_PX}px`,
      '--cpv-swipe-rail': `${swipeRailPx(width)}px`,
    }"
    @pointerdown="songSwipe.onDown"
  >
    <div class="cpv-glow" />

    <div class="cpv-stage">
    <div v-if="isPopulated" ref="scroller" class="cpv-scroll" data-cpv-scroll @click="onSurfaceTap">
      <div :ref="bindPage" class="cpv-page" :style="{ maxWidth: pageMax, padding: pagePad }">
        <div :style="{ padding: pageBodyPad }">
        <CpvCapoLegend v-if="legend" :shape="legend.shape" :real="legend.real" :capo="capo" @close="toggleMap" />
        <ChartBody
          v-bind="chartScale"
          :blocks="blocks"
          :resolve-image="resolveImage"
          :auto-invert-scores="autoInvertScores"
          :theme="effTheme"
          :mine-lines="ov.mineLines.value"
          :edit="isEdit ? bedit : null"
          :pill-lane="editScale.pillLane"
          :pill-h="editScale.pillH"
          :edit-line-h="editScale.editLineH"
          :chord-edit-px="editScale.chordEditPx"
          @revert-line="ov.revertLine"
          @edit-score="openScore"
        />
        </div>
      </div>
    </div>

    <CpvViewerStates
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
      class="cpv-swipe-debug"
      aria-hidden="true"
    >
      <div class="cpv-swipe-debug-dead">Safari</div>
      <div class="cpv-swipe-debug-center">rolar</div>
      <div class="cpv-swipe-debug-legend">
        cinza = Safari · verde = rolar · azul = anterior · laranja = próxima
      </div>
    </div>
    <div
      v-if="setlist.on.value"
      class="cpv-swipe-rail"
      data-swipe-rail="prev"
      aria-hidden="true"
    />
    <div
      v-if="setlist.on.value"
      class="cpv-swipe-rail"
      data-swipe-rail="next"
      aria-hidden="true"
    />
    <CpvSwipeVeil
      :view="swipeView"
      :next-title="setlist.nextTitle.value"
      :prev-title="setlist.prevTitle.value"
    />
    </div>
    <div class="cpv-progress" :class="{ 'is-live': scrolling }"><span :style="{ width: `${(progress * 100).toFixed(1)}%` }" /></div>

    <!-- Identity card — fades with zen. A plain name takes the same band while chrome is gone. -->
    <div
      v-if="!isEdit && isPopulated"
      class="cpv-chrome"
      :class="{ 'is-hidden': headHidden, 'is-wide-wrap': !phone }"
      style="position:absolute;top:0;left:0;right:0;z-index:12;"
      :style="{ padding: chromePad }"
    >
      <CpvViewHead
        v-bind="viewHeadBind"
        v-model:capo-open="capoOpen"
        :ref="bindHead"
        @open-setlist="setlist.open()"
        @open-tone="toneOpen = true; zen = false; moreOpen = false"
        @toggle-fs="toggleFs"
        @shift="shift"
        @reset-tone="resetTone"
        @rewrite="rewriteToDeclared"
        @capo-nudge="(n) => setCapo(capo + n)"
        @toggle-map="toggleMap"
        @capo-zero="setCapo(0)"
        @bind-capo="bindCapoBox"
        @select-chart="selectChart"
      />
    </div>
    <div
      v-if="!isEdit && isPopulated && headHidden"
      class="cpv-zen-title"
      :class="{ 'is-wide-wrap': !phone }"
      data-cpv-zen-title
      aria-hidden="true"
      :style="{ padding: chromePad }"
    >
      <span class="cpv-zen-title-text" :style="!phone ? { maxWidth: pageMax } : undefined">{{
        meta.title || 'Sem título'
      }}</span>
    </div>
    <CpvEditHead
      v-if="isEdit"
      :phone="phone"
      :compact="compact"
      :content-edit="isContentEdit"
      :page-max="pageMax"
      :chrome-pad="chromePad"
      :edit-badge="editBadge"
      :w-mode="wMode"
      :title="meta.title || 'Sem título'"
      :subtitle="meta.subtitle || ''"
      :meta-gap-label="metaGapLabel"
      :meta-summary="metaSummary"
      :meta-gaps="metaGaps.length"
      :dirty="dirty"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :confirm-discard="confirmDiscard"
      :discard-label="discardLabel"
      @bind-head="bindHead"
      @open-meta="openMeta"
      @undo="undo"
      @redo="redo"
      @discard="discard"
      @save="save"
      @read="exitEdit"
    />

    <CpvWideDock
      v-if="!isEdit && !phone && isPopulated"
      :hidden="chromeHidden"
      :show-mine="showMine"
      :mine-label="ov.mineLabel.value"
      :show-original="ov.showOriginal.value"
      :hint-fit="hintFit"
      :scrolling="scrolling"
      :mul="mul"
      :eta-label="etaLabel"
      :progress="progress"
      :setlist-on="setlist.on.value"
      :no-prev="setlist.noPrev.value"
      :no-next="setlist.noNext.value"
      :pos-label="setlist.posLabel.value"
      :scroll-title="scrollTitle"
      :scroll-off="scrollOff"
      :roll-live="rollLive"
      :fit-on="fitOn"
      :letra="activeLens === 'letra'"
      :has-key="hasKey"
      :nashville-on="nashvilleOn"
      :hide-comments="hideComments"
      :met-running="met.running.value"
      :met-bpm="met.bpm.value"
      :has-strum="hasStrum"
      :strum-on="strumOn"
      :ensaio-batida="rehearsalFocus === 'batida'"
      :theme-title="themeTitle"
      :theme-icon="themeIcon(themeMode)"
      :theme-label="themeLabel(themeMode)"
      :can-edit="canEditNow"
      :dirty="dirty"
      @original="toggleOriginal"
      @open-my="ov.myPanel.value = true"
      @dismiss-hint="dismissHint(true)"
      @slower="mul = viewerMulStep(mul, 'down')"
      @faster="mul = viewerMulStep(mul, 'up')"
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
      <CpvAudioRef
        v-if="audioUrl"
        :key="audioKey"
        :playing="audio.playing.value"
        :current="audio.current.value"
        :duration="audio.duration.value"
        :error="audio.error.value"
        :title="audioTitle"
        :artist="audioArtist"
        :art="audioArt?.url"
        :art-width="audioArt?.width"
        :art-height="audioArt?.height"
        :kind="audioKind"
        :kinds="audioKinds"
        @toggle="audio.toggle"
        @skip="audio.skip"
        @seek="audio.seek"
        @kind="audioKind = $event"
      />
    </CpvWideDock>

    <CpvPhoneDock
      v-if="!isEdit && phone && isPopulated"
      :hidden="chromeHidden || moreOpen"
      :hint-fit="hintFit"
      :letra="activeLens === 'letra'"
      :dock-ctrl-h="dockCtrlH"
      :setlist-on="setlist.on.value"
      :no-prev="setlist.noPrev.value"
      :no-next="setlist.noNext.value"
      :pos-label="setlist.posLabel.value"
      :next-chip-short="setlist.nextChipShort.value"
      :scrolling="scrolling"
      :mul="mul"
      :eta-label="etaLabel"
      :progress="progress"
      :width="width"
      :dock-play-name="dockPlayName"
      :scroll-title="scrollTitle"
      :scroll-off="scrollOff"
      :roll-live="rollLive"
      :dock-play-labeled="dockPlayLabeled"
      :dock-play-label="dockPlayLabel"
      :dock-type-w="dockTypeW"
      :bp="bp"
      :can-edit="canEditNow"
      :dock-icon-size="dockIconSize"
      :fit-on="fitOn"
      :queue-count="queueCount"
      @dismiss-hint="dismissHint(true)"
      @cifra="showCifra"
      @letra="showLetra"
      @prev="goPrev"
      @open-list="setlist.open()"
      @next="goNext"
      @slower="mul = viewerMulStep(mul, 'down')"
      @faster="mul = viewerMulStep(mul, 'up')"
      @toggle-scroll="toggleScroll"
      @smaller-type="bias = Math.max(-3, bias - 1)"
      @bigger-type="bias = Math.min(5, bias + 1)"
      @edit="enterEdit"
      @toggle-fit="toggleFit"
      @more="moreOpen = true"
    >
      <CpvAudioRef
        v-if="audioUrl"
        :key="audioKey"
        :playing="audio.playing.value"
        :current="audio.current.value"
        :duration="audio.duration.value"
        :error="audio.error.value"
        :title="audioTitle"
        :artist="audioArtist"
        :art="audioArt?.url"
        :art-width="audioArt?.width"
        :art-height="audioArt?.height"
        :kind="audioKind"
        :kinds="audioKinds"
        @toggle="audio.toggle"
        @skip="audio.skip"
        @seek="audio.seek"
        @kind="audioKind = $event"
      />
    </CpvPhoneDock>

    <button
      v-if="queueEntry"
      class="cpv-queue-chip"
      :class="{ 'is-compact': compact, 'is-alone': chromeHidden }"
      data-queue-chip
      :aria-label="`Sugestões dos músicos, ${ov.pendingCount.value} ${ov.pendingCount.value === 1 ? 'pendente' : 'pendentes'}`"
      title="Sugestões dos músicos"
      @click="ov.openQueue"
    >
      <span class="cpv-queue-chip-dot" aria-hidden="true" />
      <span class="cpv-queue-chip-copy">Sugestões</span>
      <span class="cpv-queue-chip-count" data-queue-count>{{ ov.pendingCount.value }}</span>
    </button>

    <CpvEditDock
      v-if="isEdit && !srcOpen"
      :compact="compact"
      :edit-hint="editHint"
      :clip-label="bedit.clip.value?.label ?? null"
      :edit="bedit"
      :w-mode="wMode"
      :insert-where="bedit.insertWhere.value"
      :insert-open="bedit.insertMenu.value"
      :insert-items="insertItems"
      :show-source="isContentEdit && capabilities.sourcePane !== false"
      :lint-ok="lint.ok"
      :theme-title="themeTitle"
      :theme-icon="themeIcon(themeMode)"
      :has-strum="hasStrum"
      @seen-hint="markEditSeen()"
      @drop-clip="bedit.clip.value = null"
      @edit-score="bedit.sel.value !== null && openScore(bedit.sel.value)"
      @insert="bedit.toggleInsertMenu()"
      @source="srcOpen = true"
      @smaller-type="bias = Math.max(-3, bias - 1)"
      @bigger-type="bias = Math.min(5, bias + 1)"
      @theme="requestTheme"
      @create-batida="openBatidaCreate"
      @edit-batida="openBatidaEdit"
    />

    <div v-if="isEdit && bedit.placing.value" class="cpv-placing-bar cpv-veil-2" data-placing>
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
      :replacing="bedit.picker.value === 'replace'"
      @pick="bedit.pickImage"
      @close="bedit.picker.value = null"
    />

    <div v-if="isEdit && scoreEd" class="cpv-score-modal" role="dialog" aria-modal="true" aria-label="Editor de partitura">
      <ScoreEditor
        :title="meta.title || 'Partitura'"
        :subtitle="scoreLabel"
        :source="scoreEd.text"
        @save="saveScore"
        @cancel="cancelScore"
      />
    </div>

    <div v-if="slides === 'error'" class="cpv-error-banner">
      <CpvIcon name="alertTri" :size="18" style="color:var(--danger)" />
      <span style="flex:1;font-size:13px;line-height:1.4;">A exportação em slides falhou.</span>
      <button style="flex:none;height:30px;padding:0 11px;border-radius:9px;border:1px solid var(--danger);background:transparent;color:var(--danger);font-size:12px;font-weight:600;cursor:pointer;" @click="slides = 'idle'; doExportSlides()">Tentar de novo</button>
      <button class="cpv-ghost" aria-label="Fechar" style="flex:none;width:30px;height:30px;color:var(--muted);" @click="slides = 'idle'"><CpvIcon name="x" :size="14" /></button>
    </div>

    <div v-if="pdf === 'error'" class="cpv-error-banner">
      <CpvIcon name="alertTri" :size="18" style="color:var(--danger)" />
      <span style="flex:1;font-size:13px;line-height:1.4;">A exportação em PDF falhou.</span>
      <button style="flex:none;height:30px;padding:0 11px;border-radius:9px;border:1px solid var(--danger);background:transparent;color:var(--danger);font-size:12px;font-weight:600;cursor:pointer;" @click="pdf = 'idle'; doExportPdf()">Tentar de novo</button>
      <button class="cpv-ghost" aria-label="Fechar" style="flex:none;width:30px;height:30px;color:var(--muted);" @click="pdf = 'idle'"><CpvIcon name="x" :size="14" /></button>
    </div>

    <div
      v-if="toast"
      class="cpv-toast cpv-veil-2"
      :class="{ 'is-out': toastOut }"
      :style="{ bottom: toastBottom }"
    >{{ toast }}</div>

    <CpvEndOffer
      v-if="setlist.endOffer.value && !isEdit"
      :next-title="setlist.nextTitle.value"
      :bottom="offerBottom"
      @next="endNext"
      @dismiss="setlist.dismissEnd()"
    />

    <div v-if="guard.bad.value" class="cpv-surface-warn" role="alert">
      <CpvIcon name="alertTri" :size="16" style="color:var(--danger)" />
      <span style="flex:1;min-width:0;">
        <span class="cpv-surface-warn-title">Viewer sem altura resolvível</span>
        <span class="cpv-surface-warn-body">O ancestral imediato precisa de uma altura definida. Sem ela o viewer usa o piso de 460px e a barra de controle fica fora da tela. Ver <code>docs/CONSUMER.md</code> — detalhes no console.</span>
      </span>
      <button
        class="cpv-ghost"
        aria-label="Ocultar aviso"
        title="Ocultar aviso"
        style="flex:none;width:26px;height:26px;color:var(--muted);font-size:15px;"
        @click="guard.dismiss()"
      ><CpvIcon name="x" :size="14" /></button>
    </div>

    <ExportSheet
      v-if="sheet"
      :export-key-note="exportKeyNote"
      :pdf-busy="pdf === 'busy'"
      :slides-busy="slides === 'busy'"
      :compact="compact"
      :has-overlay="ov.hasOverlay.value"
      :export-orig="ov.exportOrig.value"
      @close="sheet = false"
      @cho="doExportCho"
      @pdf="doExportPdf"
      @slides="doExportSlides"
      @pick="(orig) => { ov.exportOrig.value = orig; toggleOriginal(orig) }"
    />

    <!-- Batida: fixed under the head — scrolling the chart must not take it away. -->
    <div
      v-if="strumVisible && strumPattern"
      :ref="bindStrumDock"
      class="cpv-strum-dock"
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
      class="cpv-met-count"
      :title="metPulseTitle"
      :style="{ top: countTop, left: countLeft }"
      @click="met.toggle()"
    >
      <span v-if="met.countIn.value" data-met-countin class="cpv-met-entrada">entrada</span>
      <span data-met-bpm class="cpv-met-bpm">{{ met.bpm.value }}</span>
      <span
        v-for="n in met.bar.value"
        :key="n"
        class="cpv-met-beat"
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
      :dual="twin"
      :can-rewrite="canRewrite"
      :written-key="writtenKey || ''"
      :declared-key="meta.key || ''"
      @dual="toggleMap"
      @close="toneOpen = false"
      @down="shift(-1)"
      @up="shift(1)"
      @capo-down="setCapo(capo - 1)"
      @capo-up="setCapo(capo + 1)"
      @reset="resetTone"
      @rewrite="rewriteToDeclared"
    />

    <CpvMoreSheet
      v-if="moreOpen && compact"
      :theme-title="themeTitle"
      :theme-icon="themeIcon(themeMode)"
      :theme-label="themeLabel(themeMode)"
      :has-key="hasKey"
      :nashville-on="nashvilleOn"
      :nashville-hint="nashvilleHint"
      :hide-comments="hideComments"
      :met-bpm="met.bpm.value"
      :met-running="met.running.value"
      :has-strum="hasStrum"
      :strum-on="strumOn"
      :ensaio-batida="rehearsalFocus === 'batida'"
      :show-mine="showMine"
      :show-original="ov.showOriginal.value"
      :mine-count="ov.mineCount.value"
      :show-queue="modes.includes('persisted') && ov.pendingCount.value > 0"
      :pending-count="ov.pendingCount.value"
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
      :source="chartSource"
      :lint="lint"
      :sel="srcSel"
      @input="onDraft"
      @checkpoint="session.checkpoint"
      @close="srcOpen = false"
    />

    <div class="cpv-live" role="status" aria-live="polite">{{ toast }}</div>
    <div class="cpv-live" role="alert" aria-live="assertive">{{ fatal || (pdf === 'error' ? 'A exportação em PDF falhou.' : slides === 'error' ? 'A exportação em slides falhou.' : '') }}</div>
  </div>
</template>
