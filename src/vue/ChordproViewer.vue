<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  anchorPx,
  barsAtPx,
  blockSpan,
  buildTimeline,
  buildChoFilename,
  buildPdfFilename,
  clockOf,
  createSourceSession,
  editTypeScale,
  etaSec,
  exportCho,
  formatEta,
  isParseFatal,
  layoutChartFull,
  maxPlainChars,
  normalizeSource,
  parse,
  pxAtBars,
  runSec,
  transposeToken,
  typeScale,
  usesFlats,
  viewerMulStep,
  STORE_KEYS,
  browserStore,
} from 'titan-chordpro-ui'
import type { ChartStore, Lens, ReadingCtx, ThemeId, Timeline, TimelineBlock } from 'titan-chordpro-ui'
import ChartBody from './chart/ChartBody.vue'
import ExportSheet from './sheets/ExportSheet.vue'
import LensSheet from './sheets/LensSheet.vue'
import SetlistSheet from './sheets/SetlistSheet.vue'
import MetronomeSheet from './sheets/MetronomeSheet.vue'
import ToneSheet from './sheets/ToneSheet.vue'
import SourcePane from './edit/SourcePane.vue'
import ChordDialog from './edit/ChordDialog.vue'
import ImagePicker from './edit/ImagePicker.vue'
import ScoreEditor from './edit/ScoreEditor.vue'
import NewChartDialog from './edit/NewChartDialog.vue'
import SelectionBar from './edit/SelectionBar.vue'
import ModePickDialog from './overlay/ModePickDialog.vue'
import MyVersionPanel from './overlay/MyVersionPanel.vue'
import SuggestionQueue from './overlay/SuggestionQueue.vue'
import UpdateDialog from './overlay/UpdateDialog.vue'
import { useBlockEdit } from './use/useBlockEdit'
import { useMetronome } from './use/useMetronome'
import { useOverlay } from './use/useOverlay'
import { useSetlist, type SongSpot } from './use/useSetlist'
import { useSurfaceGuard } from './use/useSurfaceGuard'
import type { ChordproViewerEmits, ChordproViewerProps, WriteMode } from './public'
import { applyThemeVars, cycleTheme, themeGlyph, themeLabel } from './use/useTheme'
import './cpv.css'

const props = withDefaults(
  defineProps<
    ChordproViewerProps & {
      forceParseError?: boolean
      pdfShouldFail?: boolean
    }
  >(),
  {
    source: '',
    mode: 'view',
    theme: 'auto',
    themeControl: 'preference',
    loading: false,
    autoHide: true,
    fitDefault: true,
    canEdit: true,
    autoInvertScores: true,
    resolveImage: (src: string) => src,
    accent: 'verde',
    accentStrength: 1,
    surfaceGuard: true,
    modes: 'local',
    suggestions: true,
    songId: '',
    songs: undefined,
    loadSong: undefined,
    fetchChart: undefined,
    readPdf: undefined,
    version: 'v1',
    images: () => [],
    forceParseError: false,
    pdfShouldFail: false,
    capabilities: () => ({ sourcePane: true }),
  },
)

const emit = defineEmits<ChordproViewerEmits>()

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
const holding = ref(false)
/**
 * The reading line is an answer, not chrome. It is the visible form of the
 * scroll's anchor, and drawn all the way through it competes with the chart
 * and claims a precision the estimate does not have — a musician reads ahead
 * of where they play, so a rule saying "the music is here" points at a place
 * the eye has already left. It shows while the chart waits at the top, where
 * it explains why nothing is moving, and for a moment after a drag, which is
 * the one time "where is it?" is a question just asked.
 */
const guideShown = ref(false)
const mul = ref(1)
const progress = ref(0)
const etaLabel = ref('—')
const anchorTop = ref(0)
const sheet = ref(false)
const pdf = ref<'idle' | 'busy' | 'error'>('idle')
const toast = ref<string | null>(null)
const fs = ref(false)
const idle = ref(false)
const zen = ref(false)
const hintOff = ref(false)
const fitSeen = ref(false)
const editSeen = ref(false)
const editHintOff = ref(false)
const toneOpen = ref(false)
const moreOpen = ref(false)
const lensOpen = ref(false)
const metOpen = ref(false)
const lens = ref<Lens>('none')
/** Dual chart: show the capo shape above the real chord, song-wide. */
const capoMap = ref(true)
const hideComments = ref(false)
const srcOpen = ref(false)
const localMode = ref<'view' | 'edit' | null>(null)
/** Where the current edit lands: this phone, or everyone's chart. */
const wMode = ref<WriteMode | null>(null)
const modePick = ref(false)
const confirmDiscard = ref(false)
const metaDraft = ref<Record<string, string>>({})

const session = createSourceSession({ source: props.source ?? '' })
/** Working source: the draft while editing, the host source otherwise. */
const working = ref(props.source ?? '')
const rev = ref(0)
let lastSrc: string | null = null
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
  if (!isEdit.value || wMode.value !== 'content') return
  const cur = session.getSource()
  lastSrc = cur
  emit('update:source', cur)
}

/**
 * Re-baseline the editor on the current base text. Every overlay change makes
 * the reader's version a different text — the draft cannot survive it, which
 * is why reverting an adjustment drops what was typed on top of it.
 */
function forceBase() {
  const b = ov.baseFor(wMode.value)
  // Also when the text already matches: `reset` is what moves the saved
  // baseline, and a local edit that ends level with its base is not a draft.
  if (session.getSource() === b && !session.dirty()) return
  session.reset(b)
  touch()
}

let raf = 0
let written = 0
/** Fraction of the song already played by the reading playhead. */
let playhead = 0
let timeline: Timeline | null = null
let etaTick = -1
let idleT = 0
let guideT = 0
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
let zenSeen = false

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
const parsed = computed(() => parse(liveSource.value))
const fatal = computed(() => {
  if (props.forceParseError) return 'Erro de leitura simulado, para revisar este estado.'
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
const chromePad = computed(() =>
  fs.value
    ? ({ xs: '4px 6px 0', sm: '5px 8px 0', md: '6px 12px 0', lg: '7px 14px 0', xl: '8px 18px 0' } as const)[bp.value]
    : ({ xs: '10px 10px 0', sm: '12px 12px 0', md: '14px 16px 0', lg: '18px 20px 0', xl: '20px 26px 0' } as const)[
        bp.value
      ],
)
const chromeTop = computed(
  () =>
    (fs.value
      ? ({ xs: 4, sm: 5, md: 6, lg: 7, xl: 8 } as const)
      : ({ xs: 10, sm: 12, md: 14, lg: 18, xl: 20 } as const))[bp.value],
)
const padBottom = computed(() => {
  const base = fs.value
    ? ({ xs: 104, sm: 106, md: 104, lg: 106, xl: 110 } as const)[bp.value]
    : ({ xs: 124, sm: 128, md: 128, lg: 132, xl: 140 } as const)[bp.value]
  // The dock grows when auto-scroll starts: the last line must not hide under it.
  return `${base + (phone.value ? (scrolling.value ? 54 : 10) : 0)}px`
})
const pagePad = computed(() => {
  // The header changes height (subtitle, key on its own row): measure, do not guess.
  const extra = fs.value ? 8 : compact.value ? 16 : 22
  const top = Math.round(chromeTop.value + Math.max(56, headH.value || 72) + extra)
  return `${top}px ${padX.value} ${padBottom.value}`
})
/**
 * Right edge of the reading column. Chrome that belongs to the chart hangs
 * here rather than off the window: on a phone the two are the same place, but
 * at 1600px the column is centred and the corner of the glass is 300px of
 * empty background away from anything the musician is looking at.
 */
const colEdge = computed(() =>
  pageMax.value === '100%' ? '16px' : `max(16px, calc((100% - ${pageMax.value}) / 2))`,
)
const dockCtrlH = computed(() => (bp.value === 'xs' ? '44px' : '48px'))
const dockIconSize = computed(() => (bp.value === 'xs' ? '44px' : '48px'))
const dockPlayLabel = computed(() => (width.value < 380 ? '' : scrolling.value ? 'Parar' : 'Rolar'))
const toastBottom = computed(() => {
  const base = compact.value ? 124 : 78
  // Almost every block action raises a toast, and the selection bar sits right
  // where the toast lands: the message would cover the controls that caused it.
  return `${base + (isEdit.value && bedit.sel.value !== null ? 56 : 0)}px`
})
const meta = computed(() => parsed.value.meta)

/**
 * Which saves this host allows. Default is local-only: "Para todos" is a
 * host capability (`content` / `both`), not something a public embed gets
 * unless the consumer turns it on.
 */
const modes = computed<WriteMode[]>(() => {
  const m = props.modes ?? 'local'
  if (m === 'none') return []
  if (m === 'local' || m === 'content') return [m]
  return ['local', 'content']
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

const ov = useOverlay({
  // In a rehearsal the identity is the song's, so a personal version follows
  // the right one through the list.
  songId: computed(() =>
    setlist.on.value
      ? (setlist.current.value?.id ?? 'song')
      : props.songId || meta.value.title || 'song',
  ),
  version: computed(() => props.version || 'v1'),
  // Line indices are what an adjustment anchors on: the overlay lives in the
  // same normalised text the parser numbers.
  hostSource: computed(() => normalizeSource(hostSource.value)),
  title: computed(() => meta.value.title ?? ''),
  suggestions: computed(() => props.suggestions !== false),
  store,
  toast: (m) => toastMsg(m),
  // While an edit is in flight the draft is the truth; anything else that
  // moves the base has to reach the screen at once.
  onBaseChange: () => {
    if (!isEdit.value) forceBase()
  },
  onSaveContent: (text) => emit('save-content', text),
})

const phoneSub = computed(
  () =>
    meta.value.subtitle ||
    [meta.value.tempo ? `${meta.value.tempo} BPM` : '', meta.value.time || '', meta.value.duration || '']
      .filter(Boolean)
      .join(' · '),
)
const hasKey = computed(() => !!meta.value.key)
const flats = computed(() => usesFlats(meta.value.key))
const shownKey = computed(() => (meta.value.key ? transposeToken(meta.value.key, offset.value, flats.value) : ''))
/** The shapes a capo player frets: `capo` frets below what sounds. */
const shapeKey = computed(() => transposeToken(meta.value.key || '', offset.value - capo.value, flats.value))
const fitOn = computed(() => (isEdit.value ? false : (fit.value ?? props.fitDefault)))
const activeLens = computed<Lens>(() => (isEdit.value ? 'none' : lens.value))
const layout = computed(() =>
  layoutChartFull(parsed.value, {
    semitones: offset.value,
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
  const out: Array<{ icon: string; label: string; go: () => void }> = [
    { icon: '\u266A', label: 'Partitura ou solo', go: () => newScore() },
  ]
  // Without a catalogue from the host there is nothing to pick from, and an
  // entry that opens an empty dialog is worse than no entry.
  if (props.images.length)
    out.push({ icon: '\u25A4', label: 'Imagem de partitura', go: () => bedit.openPicker('insert') })
  out.push(
    { icon: '\u275D', label: 'Coment\u00e1rio de ensaio', go: () => bedit.insertBlock('comment') },
    { icon: '\u00B6', label: 'Nova estrofe', go: () => bedit.insertBlock('lyrics') },
    { icon: '\u276F', label: 'Refr\u00e3o', go: () => bedit.insertBlock('chorus') },
  )
  return out
})
const scale = computed(() =>
  typeScale(bias.value, fitOn.value, width.value, maxPlainChars(blocks.value), twin.value),
)
const chartScale = computed(() => {
  const { barPx: _barPx, ...rest } = scale.value
  return rest
})
const chromeHidden = computed(
  () => (zen.value || (scrolling.value && idle.value)) && !sheet.value && !isEdit.value,
)
const chromeHiddenHint = computed(() =>
  zen.value ? 'Toque na cifra para mostrar os controles' : 'Mova para mostrar os controles',
)
const hintFit = computed(
  () => isPopulated.value && !isEdit.value && !fitSeen.value && !hintOff.value,
)
const hasOffset = computed(() => offset.value !== 0)
const hasCapo = computed(() => capo.value > 0)
const hasReset = computed(() => hasOffset.value || hasCapo.value)
const canEditNow = computed(
  () => !isEdit.value && isPopulated.value && props.canEdit && modes.value.length > 0,
)
/** The owner's entry into the queue: only where a chart can be changed at all. */
const queueEntry = computed(
  () =>
    !isEdit.value &&
    isPopulated.value &&
    modes.value.includes('content') &&
    ov.pendingCount.value > 0 &&
    !phone.value,
)
const showMine = computed(() => !isEdit.value && isPopulated.value && ov.hasOverlay.value)
const fixTuneLabel = computed(() =>
  offset.value || capo.value
    ? 'Fixar o tom atual nesta cifra'
    : 'Tom fixo: nenhum (ajuste o tom para fixar)',
)
const editBadge = computed(() => (wMode.value === 'content' ? 'Para todos' : 'Só para mim'))
const capoLabel = computed(() => (capo.value === 0 ? 'Sem capo' : `${capo.value}ª casa`))
const capoHint = computed(() =>
  capo.value === 0
    ? 'A cifra fica no tom real. Com o capo, um mapa mostra a forma de cada acorde.'
    : `A cifra segue em ${shownKey.value} — no capo ${capo.value} você faz as formas de ${shapeKey.value}.`,
)
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
const lensChipLabel = computed(() => (activeLens.value === 'nashville' ? 'Graus' : 'Lentes'))
/**
 * Only the "for everyone" edit owns the chart's identity. Meta, the source
 * pane and deleting a block write things an anchored overlay cannot carry —
 * and a title change would move `songId` out from under the reader's own
 * version, which is stored against it.
 */
const isContentEdit = computed(() => isEdit.value && wMode.value === 'content')

const dirty = computed(() => {
  rev.value
  // The phone version has no save: each keystroke is already stored.
  if (wMode.value === 'local') return false
  return session.dirty()
})
const lint = computed(() => {
  rev.value
  return session.lint()
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
  meta.value.key ? `em ${shownKey.value}${capo.value ? ` · capo ${capo.value}` : ''}` : '',
)

/** Identity of the song for the per-song tempo memory. */
const songKey = computed(() =>
  [meta.value.title || '', meta.value.artist || ''].join('|').trim() || 'sem-titulo',
)
const met = useMetronome({
  songKey,
  tempo: computed(() => meta.value.tempo),
  time: computed(() => meta.value.time),
  store,
  scrolling,
  onFollowStart: () => startScroll(),
  onFollowStop: () => stopScroll(),
  onPanelClose: () => (metOpen.value = false),
})

const metPulseTitle = computed(() =>
  met.follow.value && scrolling.value ? 'Parar o metrônomo e a rolagem (M)' : 'Parar o metrônomo (M)',
)

function toggleMetPanel() {
  metOpen.value = !metOpen.value
  lensOpen.value = false
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
    for (const key of ['bias', 'fit', 'metSound', 'metFollow', 'metCountIn']) delete p[key]
    if (props.themeControl !== 'host' && theme.value) p.theme = theme.value
    if (bias.value) p.bias = bias.value
    if (fit.value !== null && fit.value !== undefined) p.fit = fit.value
    if (met.sound.value === false) p.metSound = false
    if (met.follow.value === false) p.metFollow = false
    if (met.countInOn.value === false) p.metCountIn = false
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

function toastMsg(msg: string) {
  toast.value = msg
  window.clearTimeout(toastT)
  toastT = window.setTimeout(() => {
    toast.value = null
  }, 2200)
}

// ---------------------------------------------------------------- auto-scroll
// The playhead walks the chart in musical time (see core/timeline.ts); the page
// only moves once it passes the reading line.

function measureBlocks(): TimelineBlock[] {
  const el = scroller.value
  if (!el) return []
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

function anchor(): number {
  const el = scroller.value
  return anchorPx(el ? el.clientHeight : 0)
}

function totalBars(): number {
  const t = timelineFor()
  return t ? t.bars : 0
}

/** Answers the drag that just happened, then gets out of the way again. */
function showGuide() {
  guideShown.value = true
  window.clearTimeout(guideT)
  guideT = window.setTimeout(() => (guideShown.value = false), 1500)
}

function stopScroll() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  window.clearTimeout(idleT)
  window.clearTimeout(guideT)
  if (scroller.value && userScroll) scroller.value.removeEventListener('scroll', userScroll)
  userScroll = null
  scrolling.value = false
  idle.value = false
  holding.value = false
  guideShown.value = false
  // Every way out of the scroll passes through here — the end of the song, a
  // transpose, a song change — and with the two linked, none of them may leave
  // a click ticking over a chart that has stopped. `met.stop()` is a no-op when
  // the click is already down, which is what ends the call back into here.
  if (met.follow.value) met.stop()
}

function startScroll() {
  const el = scroller.value
  if (!el) return
  scrolling.value = true
  window.clearTimeout(idleT)
  if (props.autoHide) idleT = window.setTimeout(() => (idle.value = true), 2600)
  rebuildTimeline()
  anchorTop.value = anchor()
  // From the top the playhead starts at 0 and the page stays put until it
  // reaches the reading line — the whole intro stays on screen. Resuming
  // mid-song, the playhead adopts the current reading line.
  const total = totalBars() || 1
  playhead = el.scrollTop <= 1 ? 0 : Math.min(1, barsAtPx(timelineFor(), el.scrollTop + anchor()) / total)
  written = el.scrollTop
  etaTick = -1
  let prev = performance.now()

  // The musician may drag the chart while it rolls (back a bit, skip ahead).
  // The playhead adopts that position and carries on from there.
  userScroll = () => {
    if (!scrolling.value) return
    if (Math.abs(el.scrollTop - written) > 1.5) {
      const t = totalBars() || 1
      playhead = Math.min(1, Math.max(0, barsAtPx(timelineFor(), el.scrollTop + anchor()) / t))
      showGuide()
    }
  }
  el.addEventListener('scroll', userScroll, { passive: true })

  const dur = clockOf(parsed.value).durationSec
  const step = (now: number) => {
    if (!scrolling.value) return
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
    const target = Math.max(0, Math.min(max, pxAtBars(t, playhead * (t ? t.bars : 0)) - anchor()))
    el.scrollTop = target
    written = el.scrollTop
    const held = target <= 0.5
    // One update per clock second, not per frame: re-rendering the whole sheet
    // 60 times a second ate the frames of the scroll itself.
    const sec = Math.round(etaSec(t, dur, playhead, mul.value))
    if (sec !== etaTick || holding.value !== held) {
      etaTick = sec
      progress.value = playhead
      holding.value = held
      etaLabel.value = formatEta(sec)
    }
    if (playhead >= 1) {
      progress.value = 1
      stopScroll()
      // End of the song in a rehearsal: stop and offer the next, rather than
      // pushing the musician into a chart they did not choose.
      setlist.offerNext()
      return
    }
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

/**
 * The scroll is used on its own most of the time, so starting it does not
 * start the click. Stopping does — `stopScroll` carries that for every exit.
 */
function toggleScroll() {
  if (scrolling.value) stopScroll()
  else startScroll()
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

function setCapo(n: number) {
  capo.value = Math.max(0, Math.min(9, n))
}

function toggleMap() {
  capoMap.value = !capoMap.value
}

function toggleLens() {
  lensOpen.value = !lensOpen.value
  capoOpen.value = false
}

function pickLens(next: Lens) {
  lens.value = lens.value === next ? 'none' : next
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
 */
function toggleZen() {
  const on = !zen.value
  zen.value = on
  capoOpen.value = false
  toneOpen.value = false
  // The gesture is invisible: the first time has to say how to come back.
  if (on && !zenSeen) {
    zenSeen = true
    toastMsg('Moldura escondida · toque na cifra para trazer de volta')
  }
}

/**
 * A tap on empty chart is the gesture of someone holding an instrument: it
 * does not ask them to hit a 44px button in the middle of a chorus.
 */
function onSurfaceTap(e: MouseEvent) {
  if (isEdit.value) return
  const t = e.target as HTMLElement | null
  if (t?.closest?.("button,input,textarea,select,a,[role='button'],figure")) return
  try {
    if (String(window.getSelection() ?? '').length) return
  } catch {
    /* selection unavailable */
  }
  toggleZen()
}

/**
 * The fullscreen API fails silently inside a webview/iframe without
 * permission, so immersive mode is app state — it turns on right away — and
 * native fullscreen is only asked for in parallel when the browser allows it.
 */
function toggleFs() {
  const el = root.value
  const want = !fs.value
  try {
    if (want) el?.requestFullscreen?.().catch(() => {})
    else if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  } catch {
    /* fullscreen denied — immersive mode still applies */
  }
  fakeFs(want)
  toastMsg(want ? 'Modo imersivo · F ou Esc para sair' : 'Modo imersivo desligado')
}

function fakeFs(on: boolean) {
  const el = root.value
  if (!el) return
  if (on) {
    Object.assign(el.style, { position: 'fixed', inset: '0', height: '100%', zIndex: '2147483000' })
    fs.value = true
  } else {
    Object.assign(el.style, { position: 'relative', inset: 'auto', height: '100%', zIndex: 'auto' })
    fs.value = false
  }
}

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
    modes.value.includes('content'),
)
function commitNewChart(src: string) {
  novaOpen.value = false
  ov.setOfficial(src)
  forceBase()
  beginEdit('content')
}

function enterEdit() {
  if (!canEditNow.value) return
  const ms = modes.value
  if (ms.length > 1) {
    modePick.value = true
    sheet.value = false
    capoOpen.value = false
    ov.myPanel.value = false
    return
  }
  beginEdit(ms[0] as WriteMode)
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
  lensOpen.value = false
  metOpen.value = false
  met.stop()
  sheet.value = false
  capoOpen.value = false
  toneOpen.value = false
  moreOpen.value = false
  modePick.value = false
  ov.myPanel.value = false
  ov.showOriginal.value = false
  bedit.reset()
  scoreEd.value = null
  wMode.value = kind
  localMode.value = 'edit'
  if (!session.dirty()) forceBase()
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
  metaDraft.value = {}
  bedit.reset()
  scoreEd.value = null
  wMode.value = null
  localMode.value = 'view'
  // The local draft has already become the overlay; a "for everyone" draft
  // that was never saved stays on screen, so it cannot be lost by leaving.
  if (local || !session.dirty()) forceBase()
  emit('update:mode', 'view')
}

/** "For everyone" has no server draft: saving IS publishing. */
function save() {
  if (wMode.value === 'local') return
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
  forceBase()
}

function pickMode(kind: WriteMode) {
  if (!modes.value.includes(kind)) return
  beginEdit(kind)
}

watch(
  () => props.modes,
  () => {
    if (modePick.value && modes.value.length <= 1) modePick.value = false
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
  metaDraft.value = {}
  touch()
}

function onDraft(next: string) {
  // The step was already opened by the pane: keystrokes coalesce into it.
  session.edit(next)
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

function metaValue(k: 'title' | 'subtitle' | 'key' | 'tempo'): string {
  const v = metaDraft.value[k]
  if (v !== undefined) return v
  const raw = meta.value[k]
  return raw === undefined || raw === null ? '' : String(raw)
}
function onMetaInput(e: Event) {
  const el = e.target as HTMLInputElement
  metaDraft.value = { ...metaDraft.value, [el.dataset.meta ?? '']: el.value }
}
function commitMeta(e: Event) {
  const el = e.target as HTMLInputElement
  const k = (el.dataset.meta ?? '') as 'title' | 'subtitle' | 'key' | 'tempo'
  if (!k) return
  let v = el.value
  if (k === 'tempo') v = v.replace(/[^\d]/g, '')
  const clean = v.trim()
  if (k === 'key' && clean && !/^[A-G](#|b)?/.test(clean)) {
    toastMsg('Tom não reconhecido — use C, F#, Bb…')
  }
  session.setMeta({ [k]: v })
  const next = { ...metaDraft.value }
  delete next[k]
  metaDraft.value = next
  touch()
}
function onMetaKey(e: KeyboardEvent) {
  const el = e.target as HTMLInputElement
  if (e.key === 'Enter') el.blur()
  else if (e.key === 'Escape') {
    // Without this the blur fired by Escape would write the cancelled text.
    const k = el.dataset.meta ?? ''
    const next = { ...metaDraft.value }
    delete next[k]
    metaDraft.value = next
    el.value = metaValue(k as 'title')
    el.blur()
  }
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
    const { renderPdf } = await import('titan-chordpro-ui/pdf')
    // The PDF always uses the default scale: fit mode serves the screen, not paper.
    const view = parse(exportCho(exportSource(), { semitones: offset.value, capo: capo.value }))
    // A personal version leaves marked on paper too: it must not circulate as
    // the team's chart.
    const bytes = await renderPdf(view, {
      personal: !ov.exportOrig.value && ov.hasOverlay.value,
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
  else if (k === 'l' || k === 'L') toggleLens()
  else if (k === 'm' || k === 'M') met.toggle()
  else if (k === 'f' || k === 'F') toggleFs()
  else if (k === 't' || k === 'T') requestTheme()
  else if (k === 'a' || k === 'A') toggleFit()
  else if (k === 'c' || k === 'C') capoOpen.value = !capoOpen.value
  else if (k === 'Escape') {
    if (modePick.value) modePick.value = false
    else if (ov.myPanel.value) ov.closeMy()
    else if (ov.queueOpen.value) ov.closeQueue()
    else if (capoOpen.value) capoOpen.value = false
    else if (setlist.listOpen.value) setlist.close()
    else if (lensOpen.value) lensOpen.value = false
    else if (metOpen.value) metOpen.value = false
    else if (toneOpen.value) toneOpen.value = false
    else if (moreOpen.value) moreOpen.value = false
    else if (sheet.value) sheet.value = false
    else if (zen.value) zen.value = false
    else if (fs.value && !document.fullscreenElement) toggleFs()
  }
}

function onDocDown(e: PointerEvent) {
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
  if (!el.contains(e.target as Node)) {
    el.scrollTop += e.deltaY
    e.preventDefault()
    return
  }
  const max = el.scrollHeight - el.clientHeight
  const stuck = (e.deltaY < 0 && el.scrollTop <= 0) || (e.deltaY > 0 && el.scrollTop >= max - 1)
  if (stuck) e.preventDefault()
}

function onFsChange() {
  // Leaving through the browser's own Esc has to turn immersive mode off too.
  if (!document.fullscreenElement && fs.value) fakeFs(false)
}

function onMq() {
  sysDark.value = mq?.matches ?? false
}

/**
 * A new source (host or fixture) stops the scroll, resets tone and position and
 * adopts the `{capo:}` declared in the file, when there is one.
 */
function syncHostSource() {
  const raw = hostSource.value
  if (raw === lastSrc) return
  // Where the song being opened was left, when it has been read before.
  const spot: SongSpot | null = setlist.takeRestore()
  const first = lastSrc === null
  const lost = !first && session.dirty()
  lastSrc = raw
  const src = normalizeSource(raw)
  session.reset(src)
  metaDraft.value = {}
  confirmDiscard.value = false
  wMode.value = null
  modePick.value = false
  const m = src.match(/\{\s*capo\s*:\s*(\d+)\s*\}/i)
  capo.value = m ? Math.max(0, Math.min(9, Number(m[1]))) : 0
  stopScroll()
  offset.value = 0
  mul.value = 1
  // Coming back to a song already rehearsed: tone, capo and speed are picked
  // back up. A tone the reader pinned still wins, just below.
  if (spot) {
    offset.value = spot.offset
    capo.value = spot.capo
    mul.value = spot.mul
  }
  lens.value = 'none'
  capoMap.value = true
  hideComments.value = false
  metOpen.value = false
  met.stop()
  playhead = spot ? spot.u || 0 : 0
  timeline = null
  progress.value = spot ? spot.u || 0 : 0
  etaLabel.value = '—'
  pdf.value = 'idle'
  sheet.value = false
  touch()
  // The reader's own version of THIS chart, and the key they pinned to it.
  ov.reset()
  const tune = ov.load()
  if (tune) {
    offset.value = tune.transpose || 0
    capo.value = tune.capo || 0
    capoMap.value = !!tune.dual
  }
  forceBase()
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
}

/**
 * Change song, putting down where this one was left. The chart itself swaps
 * through the same path a host `source` change takes, so the personal version,
 * the metronome and the timeline all reload exactly as they always did.
 */
function goSong(i: number) {
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

function bindHead(el: unknown) {
  const node = (el as HTMLElement | null) ?? null
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
watch([theme, bias, fit, met.sound, met.follow, met.countInOn], persistPrefs)
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
watch([offset, capo, themeMode, fitOn, bias, mode, dirty], () => {
  emit('state', {
    transposeSemitones: offset.value,
    capo: capo.value,
    theme: themeMode.value,
    displayKey: shownKey.value || null,
    lens: activeLens.value,
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
      metFollow?: boolean
      metCountIn?: boolean
    }
    if (p.theme) theme.value = p.theme
    if (typeof p.bias === 'number') bias.value = p.bias
    if (typeof p.fit === 'boolean') fit.value = p.fit
    if (typeof p.metSound === 'boolean') met.sound.value = p.metSound
    if (typeof p.metFollow === 'boolean') met.follow.value = p.metFollow
    if (typeof p.metCountIn === 'boolean') met.countInOn.value = p.metCountIn
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
    // height, not our width, and that is exactly what the guard looks for.
    guard.check()
    const w = entries[0]?.contentRect.width ?? 900
    if (Math.abs(w - width.value) <= 4) return
    width.value = w
    void nextTick(() => {
      const el = scroller.value
      timeline = null
      anchorTop.value = anchor()
      if (!el || !scrolling.value) return
      rebuildTimeline()
      const max = el.scrollHeight - el.clientHeight
      const px = pxAtBars(timelineFor(), playhead * totalBars()) - anchor()
      el.scrollTop = Math.max(0, Math.min(max, px))
      written = el.scrollTop
    })
  })
  if (root.value) {
    ro.observe(root.value)
    width.value = root.value.getBoundingClientRect().width || width.value
    applyThemeVars(root.value, effTheme.value, props.accent, props.accentStrength)
  }
  document.addEventListener('fullscreenchange', onFsChange)
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onDocDown, true)
  window.addEventListener('wheel', onWheel, { passive: false })
  ;(['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown'] as const).forEach((ev) =>
    window.addEventListener(ev, wake, { passive: true }),
  )
  setlist.prefetch()
  syncHostSource()
  anchorTop.value = anchor()
  guard.start()
})

onUnmounted(() => {
  stopScroll()
  met.dispose()
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
  document.removeEventListener('fullscreenchange', onFsChange)
  mq?.removeEventListener('change', onMq)
  ro?.disconnect()
  headRo?.disconnect()
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
  <div ref="root" class="cpv-root" data-cpv-root :data-theme="effTheme">
    <div class="cpv-glow" />

    <div v-if="isPopulated" ref="scroller" class="cpv-scroll" data-cpv-scroll @click="onSurfaceTap">
      <div class="cpv-page" :style="{ maxWidth: pageMax, padding: pagePad }">
        <!-- The capo map, said once: "see G, play E". -->
        <div v-if="legend" class="cpv-legend" data-legend>
          <span class="cpv-legend-half">
            <span class="cpv-legend-dot" style="background:var(--capo);" />
            <span class="cpv-legend-name" style="color:var(--capo);">{{ legend.shape }}</span>
            <span class="cpv-legend-note">com capo {{ capo }}</span>
          </span>
          <span class="cpv-legend-sep" />
          <span class="cpv-legend-half">
            <span class="cpv-legend-dot" style="background:var(--chord);" />
            <span class="cpv-legend-name" style="color:var(--chord);">{{ legend.real }}</span>
            <span class="cpv-legend-note">sem capo</span>
          </span>
          <button
            class="cpv-ghost"
            aria-label="Sair do modo dual"
            title="Sair do modo dual"
            style="flex:none;width:24px;height:24px;border-radius:8px;color:var(--muted);font-size:14px;line-height:1;"
            @click="toggleMap"
          >×</button>
        </div>
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

    <!-- A song of the list that never arrived. The rehearsal is not over: the
         others are still there, and this one can be asked for again. -->
    <div
      v-else-if="setlist.failing.value"
      class="cpv-center"
      role="alert"
      data-song-fail
    >
      <div class="cpv-veil-2" style="width:100%;max-width:340px;display:flex;flex-direction:column;gap:14px;padding:20px;border-radius:18px;border:1px solid var(--line);box-shadow:var(--shadow);">
        <div style="display:flex;flex-direction:column;gap:6px;text-align:left;">
          <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--danger);font-weight:700;">Não carregou</span>
          <span style="font-size:15px;font-weight:600;letter-spacing:-0.015em;line-height:1.3;text-wrap:pretty;">{{ setlist.current.value?.title }}</span>
          <span style="font-size:12.5px;line-height:1.55;color:var(--muted);text-wrap:pretty;">Esta cifra não chegou. As outras da lista continuam disponíveis.</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">
          <button
            data-song-retry
            style="height:44px;padding:0 16px;border:0;border-radius:13px;background:var(--chord);color:var(--chord-ink);font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;"
            @click="setlist.retry()"
          >Tentar de novo</button>
          <button
            style="height:44px;padding:0 16px;border:1px solid var(--line);border-radius:13px;background:transparent;color:var(--text);font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;"
            @click="setlist.open()"
          >Abrir a lista</button>
          <span style="flex:1;" />
          <button
            aria-label="Música anterior"
            :disabled="setlist.noPrev.value"
            :style="{ opacity: setlist.noPrev.value ? '0.32' : '1' }"
            style="width:44px;height:44px;border:1px solid var(--line);border-radius:13px;background:transparent;color:var(--text);font-size:13px;cursor:pointer;"
            @click="goPrev"
          >◀</button>
          <button
            aria-label="Próxima música"
            :disabled="setlist.noNext.value"
            :style="{ opacity: setlist.noNext.value ? '0.32' : '1' }"
            style="width:44px;height:44px;border:1px solid var(--line);border-radius:13px;background:transparent;color:var(--text);font-size:13px;cursor:pointer;"
            @click="goNext"
          >▶</button>
        </div>
      </div>
    </div>

    <!-- Waiting on a chart is exactly when a musician wants to skip ahead, so
         the rehearsal stays navigable. The chart's own controls do not appear:
         there is nothing yet for them to act on. -->
    <div v-else-if="songLoading" class="cpv-center" data-song-loading>
      <div class="cpv-spin" />
      <div style="font-size:13px;color:var(--muted);">Buscando {{ setlist.current.value?.title }}…</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
        <button
          data-song-prev
          aria-label="Música anterior"
          :disabled="setlist.noPrev.value"
          :style="{ opacity: setlist.noPrev.value ? '0.32' : '1' }"
          style="width:44px;height:44px;border:1px solid var(--line);border-radius:13px;background:transparent;color:var(--text);font-size:13px;cursor:pointer;"
          @click="goPrev"
        >◀</button>
        <button
          data-setlist-open
          style="height:44px;padding:0 16px;border:1px solid var(--line);border-radius:13px;background:transparent;color:var(--text);font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:9px;"
          @click="setlist.open()"
        >
          <span style="font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:12.5px;font-weight:700;color:var(--chord);">{{ setlist.posLabel.value }}</span>
          <span style="font-size:12.5px;font-weight:600;color:var(--muted);">Lista</span>
        </button>
        <button
          data-song-next
          aria-label="Próxima música"
          :disabled="setlist.noNext.value"
          :style="{ opacity: setlist.noNext.value ? '0.32' : '1' }"
          style="width:44px;height:44px;border:1px solid var(--line);border-radius:13px;background:transparent;color:var(--text);font-size:13px;cursor:pointer;"
          @click="goNext"
        >▶</button>
      </div>
    </div>

    <!-- The host handed over a list and it is empty: nothing is selected, so
         this is not an invitation to author a chart that may already exist. -->
    <div v-else-if="listEmpty" class="cpv-center" data-empty-setlist>
      <div class="cpv-ph" />
      <div style="font-size:15px;font-weight:600;">Nenhuma música na lista</div>
      <div style="font-size:13px;color:var(--muted);max-width:300px;line-height:1.55;">O ensaio ainda não tem repertório.</div>
    </div>

    <div v-else-if="isEmpty" class="cpv-center">
      <!-- Whoever may write for everyone starts the chart from here. -->
      <div v-if="canStartNew" style="width:100%;max-width:420px;display:flex;flex-direction:column;gap:16px;text-align:left;">
        <div style="display:flex;flex-direction:column;gap:7px;">
          <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--danger);font-weight:700;">Para todos</span>
          <span style="font-size:19px;font-weight:700;letter-spacing:-0.02em;line-height:1.25;">{{ setlist.current.value?.title || meta.title || 'Cifra nova' }}</span>
          <span style="font-size:12.5px;line-height:1.55;color:var(--muted);text-wrap:pretty;">Ainda não existe cifra aqui. O que você criar vira a cifra do sistema — todos os músicos passam a ler assim.</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:9px;">
          <button
            data-start-import
            style="display:flex;align-items:center;gap:12px;width:100%;padding:14px;border:1px solid var(--chord-edge);border-radius:15px;background:var(--chord-soft);color:var(--text);font-family:inherit;text-align:left;cursor:pointer;"
            @click="startNew('import')"
          >
            <span style="flex:none;width:34px;height:34px;border-radius:11px;background:var(--chord);color:var(--chord-ink);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;line-height:1;">↓</span>
            <span style="display:flex;flex-direction:column;gap:3px;min-width:0;">
              <span style="font-size:14.5px;font-weight:700;">Importar</span>
              <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Link do CifraClub, arquivo .cho ou PDF, ou texto colado — inclusive OnSong.</span>
            </span>
          </button>
          <button
            data-start-blank
            style="display:flex;align-items:center;gap:12px;width:100%;padding:14px;border:1px solid var(--line);border-radius:15px;background:transparent;color:var(--text);font-family:inherit;text-align:left;cursor:pointer;"
            @click="startNew('blank')"
          >
            <span style="flex:none;width:34px;height:34px;border-radius:11px;border:1px dashed var(--line);display:flex;align-items:center;justify-content:center;font-size:17px;color:var(--muted);line-height:1;">+</span>
            <span style="display:flex;flex-direction:column;gap:3px;min-width:0;">
              <span style="font-size:14.5px;font-weight:700;">Começar em branco</span>
              <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Digitar letra e acordes no editor, do zero.</span>
            </span>
          </button>
        </div>
      </div>
      <template v-else>
        <div class="cpv-ph" />
        <div style="font-size:15px;font-weight:600;">Nenhuma cifra carregada</div>
        <div style="font-size:13px;color:var(--muted);max-width:300px;line-height:1.55;">O host ainda não entregou uma fonte ChordPro para este viewer.</div>
      </template>
    </div>

    <div v-else-if="fatal" class="cpv-center" role="alert">
      <div class="cpv-fatal-mark">!</div>
      <div style="font-size:15px;font-weight:600;">Não foi possível ler esta cifra</div>
      <div style="font-size:13px;color:var(--muted);max-width:340px;line-height:1.55;text-wrap:pretty;">{{ fatal }}</div>
    </div>

    <div v-else-if="isLoading" class="cpv-center">
      <div class="cpv-spin" />
      <div style="font-size:13px;color:var(--muted);">Preparando a cifra…</div>
    </div>

    <div class="cpv-progress"><span :style="{ width: `${(progress * 100).toFixed(1)}%` }" /></div>

    <!-- Reading line: shown while the chart waits at the top, and for a moment
         after a drag. The rest of the time the chart is left to be read. -->
    <template v-if="scrolling && !isEdit && (holding || guideShown)">
      <div
        aria-hidden="true"
        class="cpv-guide"
        :style="{ top: `${anchorTop}px`, opacity: holding ? '0.85' : '0.4' }"
      />
      <div v-if="holding" class="cpv-guide-label" :style="{ top: `${anchorTop}px` }">
        Linha de leitura · a cifra espera até aqui
      </div>
    </template>

    <!-- Phone identity bar -->
    <div
      v-if="!isEdit && phone && isPopulated"
      class="cpv-chrome"
      :class="{ 'is-hidden': chromeHidden }"
      style="position:absolute;top:0;left:0;right:0;z-index:12;"
      :style="{ padding: chromePad }"
    >
      <div :ref="bindHead" class="cpv-hit cpv-veil" style="display:flex;align-items:center;gap:10px;height:56px;padding:0 6px 0 14px;border-radius:18px;">
        <!-- In a rehearsal the title is the way into the list. -->
        <button
          v-if="setlist.on.value"
          data-setlist-open
          title="Abrir a lista do ensaio"
          style="flex:1;min-width:0;display:flex;align-items:center;gap:9px;height:48px;padding:0;border:0;background:transparent;color:inherit;font-family:inherit;text-align:left;cursor:pointer;"
          @click="setlist.open()"
        >
          <span style="flex:none;display:flex;align-items:center;height:22px;padding:0 7px;border-radius:7px;background:var(--chord-soft);border:1px solid var(--chord-edge);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:11px;font-weight:700;color:var(--chord);">{{ setlist.posLabel.value }}</span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
            <span style="font-size:15px;font-weight:600;letter-spacing:-0.015em;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ meta.title || 'Sem título' }}</span>
            <span style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ phoneSub }}</span>
          </span>
          <span aria-hidden="true" style="flex:none;font-size:9px;color:var(--muted);padding-right:2px;">▾</span>
        </button>
        <span v-else style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
          <span style="font-size:15px;font-weight:600;letter-spacing:-0.015em;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ meta.title || 'Sem título' }}</span>
          <span style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ phoneSub }}</span>
        </span>
        <button
          v-if="hasKey"
          data-tone
          aria-label="Tom e capotraste"
          title="Tom e capotraste"
          :style="{ background: hasReset ? 'var(--chord-fill)' : 'var(--chord-soft)' }"
          style="flex:none;display:flex;align-items:center;gap:7px;height:44px;padding:0 12px;border:1px solid var(--chord-edge);border-radius:14px;color:var(--chord);cursor:pointer;font-family:inherit;"
          @click="toneOpen = true; zen = false; moreOpen = false"
        >
          <span style="font-size:8.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Tom</span>
          <span style="font-family:'Space Mono',monospace;font-size:16px;font-weight:700;line-height:1;">{{ shownKey }}{{ hasCapo ? ` · capo ${capo}` : '' }}</span>
          <span style="font-size:9px;opacity:0.7;">▾</span>
        </button>
      </div>
    </div>

    <!-- Wide top bar -->
    <div
      v-if="!isEdit && !phone && isPopulated"
      class="cpv-chrome"
      :class="{ 'is-hidden': chromeHidden }"
      style="position:absolute;top:0;left:0;right:0;z-index:12;display:flex;justify-content:center;"
      :style="{ padding: chromePad }"
    >
      <div :ref="bindHead" class="cpv-hit cpv-veil" style="width:100%;display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:9px 10px 9px 16px;border-radius:15px;" :style="{ maxWidth: pageMax }">
        <button
          v-if="setlist.on.value"
          data-setlist-open
          title="Abrir a lista do ensaio"
          style="flex:1 1 170px;min-width:150px;display:flex;align-items:center;gap:10px;padding:2px 6px 2px 0;border:0;border-radius:10px;background:transparent;color:inherit;font-family:inherit;text-align:left;cursor:pointer;"
          @click="setlist.open()"
        >
          <span style="flex:none;display:flex;align-items:center;height:24px;padding:0 8px;border-radius:8px;background:var(--chord-soft);border:1px solid var(--chord-edge);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:11.5px;font-weight:700;color:var(--chord);">{{ setlist.posLabel.value }}</span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
            <span style="font-size:15.5px;font-weight:600;letter-spacing:-0.015em;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ meta.title || 'Sem título' }}</span>
            <span style="font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ setlist.nextChip.value }}</span>
          </span>
          <span aria-hidden="true" style="flex:none;font-size:9px;color:var(--muted);">▾</span>
        </button>
        <div v-else style="flex:1 1 170px;min-width:150px;display:flex;flex-direction:column;gap:2px;">
          <div style="font-size:15.5px;font-weight:600;letter-spacing:-0.015em;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ meta.title || 'Sem título' }}</div>
          <div v-if="meta.subtitle" style="font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ meta.subtitle }}</div>
        </div>
        <div style="flex:none;display:flex;align-items:center;gap:8px;font-family:'Space Mono',monospace;font-size:11px;color:var(--muted);">
          <span v-if="meta.tempo">{{ meta.tempo }} BPM</span>
          <span v-if="meta.time">{{ meta.time }}</span>
          <span v-if="meta.duration">{{ meta.duration }}</span>
        </div>
        <div v-if="hasKey" ref="capoBox" style="position:relative;flex:none;">
          <div class="cpv-keypill">
            <button data-transpose-down aria-label="Baixar meio tom" title="Baixar meio tom (−)" style="width:40px;height:34px;border:0;border-radius:9px;background:transparent;color:var(--chord);font-size:17px;line-height:1;cursor:pointer;" @click="shift(-1)">−</button>
            <div style="display:flex;align-items:baseline;gap:6px;padding:0 7px;">
              <span style="font-size:8.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Tom</span>
              <span data-display-key style="font-family:'Space Mono',monospace;font-size:16px;font-weight:700;color:var(--chord);line-height:1;">{{ shownKey }}</span>
              <span v-if="hasOffset" style="font-family:'Space Mono',monospace;font-size:10px;font-weight:700;color:var(--chord-ink);background:var(--chord);border-radius:4px;padding:2px 4px;line-height:1;">{{ offset > 0 ? '+' : '' }}{{ offset }}</span>
            </div>
            <button data-transpose-up aria-label="Subir meio tom" title="Subir meio tom (+)" style="width:40px;height:34px;border:0;border-radius:9px;background:transparent;color:var(--chord);font-size:17px;line-height:1;cursor:pointer;" @click="shift(1)">+</button>
            <span style="width:1px;height:24px;background:var(--chord-edge);margin:0 3px;" />
            <button data-capo title="Capotraste (C)" :style="{ background: hasCapo ? 'var(--chord-fill)' : 'transparent' }" style="display:flex;align-items:center;gap:5px;height:32px;padding:0 9px;border:0;border-radius:9px;cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:600;color:var(--chord);line-height:1;" @click="capoOpen = !capoOpen">
              {{ capoBtnLabel }}<span :style="{ transform: capoOpen ? 'rotate(180deg)' : 'rotate(0deg)' }" style="font-size:9px;opacity:0.75;transition:transform .18s ease;">▾</span>
            </button>
            <button v-if="hasReset" title="Voltar ao tom original, sem capo" style="height:32px;padding:0 9px;margin-left:2px;border:0;border-radius:9px;background:var(--chord-fill);color:var(--chord);font-size:11.5px;font-weight:600;cursor:pointer;" @click="resetTone">Original</button>
          </div>
          <div v-if="capoOpen" class="cpv-veil-2" style="position:absolute;top:calc(100% + 8px);right:0;z-index:22;width:250px;padding:13px;border-radius:15px;display:flex;flex-direction:column;gap:11px;animation:cpv-rise .18s ease-out;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Capotraste</span>
              <button class="cpv-ghost" aria-label="Fechar" style="width:24px;height:24px;color:var(--muted);font-size:14px;" @click="capoOpen = false">×</button>
            </div>
            <div style="display:flex;align-items:center;gap:7px;">
              <button aria-label="Capo abaixo" style="width:34px;height:32px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--text);font-size:16px;line-height:1;cursor:pointer;" @click="setCapo(capo - 1)">−</button>
              <div style="flex:1;text-align:center;font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:var(--chord);">{{ capoLabel }}</div>
              <button aria-label="Capo acima" style="width:34px;height:32px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--text);font-size:16px;line-height:1;cursor:pointer;" @click="setCapo(capo + 1)">+</button>
            </div>
            <div style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">{{ capoHint }}</div>
            <template v-if="hasCapo">
              <button
                data-dual
                role="switch"
                :aria-checked="mapOn"
                :style="{ border: `1px solid ${twin ? 'var(--chord-edge)' : 'var(--line)'}`, background: twin ? 'var(--chord-soft)' : 'transparent' }"
                style="display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border-radius:12px;color:var(--text);font-family:inherit;text-align:left;cursor:pointer;"
                @click="toggleMap"
              >
                <span :style="{ background: twin ? 'var(--chord)' : 'var(--line)' }" style="flex:none;width:30px;height:18px;border-radius:9px;position:relative;">
                  <span :style="{ left: twin ? '14px' : '2px', background: twin ? 'var(--chord-ink)' : 'var(--muted)' }" style="position:absolute;top:2px;width:14px;height:14px;border-radius:50%;transition:left .16s ease;" />
                </span>
                <span style="display:flex;flex-direction:column;gap:2px;min-width:0;">
                  <span style="font-size:12.5px;font-weight:600;">Modo dual</span>
                  <span style="font-size:11px;line-height:1.4;color:var(--muted);text-wrap:pretty;">Duas cifras na mesma linha: quem está com capo e quem não está.</span>
                </span>
              </button>
              <button style="height:30px;border:0;border-radius:9px;background:var(--chord-fill);color:var(--chord);font-size:12px;font-weight:600;cursor:pointer;" @click="setCapo(0)">Tirar o capo</button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit top bar (E0: meta, dirty, save, back to reading) -->
    <div v-if="isEdit" style="position:absolute;top:0;left:0;right:0;z-index:12;display:flex;justify-content:center;" :style="{ padding: chromePad }">
      <div
        :ref="bindHead"
        class="cpv-veil"
        style="width:100%;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:9px 10px 9px 14px;border-radius:15px;"
        :style="{ maxWidth: pageMax, borderColor: wMode === 'content' ? 'var(--danger)' : 'var(--line)' }"
      >
        <!-- The badge is the whole difference between the two edits: it says
             where this is landing, in the colour of the risk it carries. -->
        <span
          data-edit-badge
          :style="{
            background: wMode === 'content' ? 'var(--danger-soft)' : 'var(--chord-fill)',
            color: wMode === 'content' ? 'var(--danger)' : 'var(--chord)',
          }"
          style="flex:none;display:flex;align-items:center;gap:7px;height:26px;padding:0 9px;border-radius:8px;font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;"
        >{{ editBadge }}</span>

        <!-- Meta belongs to the chart everyone reads, so only the "for
             everyone" edit may touch it. On the phone the reader sees whose
             title it is instead of a field that would fork the song. -->
        <div v-if="isContentEdit" style="flex:1 1 180px;min-width:118px;display:flex;flex-direction:column;gap:1px;">
          <input
            data-meta="title"
            :value="metaValue('title')"
            aria-label="Título"
            placeholder="Título da música"
            style="width:100%;border:0;border-bottom:1px dashed var(--line);background:transparent;color:var(--text);font-family:inherit;font-size:15.5px;font-weight:600;letter-spacing:-0.015em;padding:2px 0;"
            @input="onMetaInput"
            @blur="commitMeta"
            @keydown="onMetaKey"
          >
          <input
            data-meta="subtitle"
            :value="metaValue('subtitle')"
            aria-label="Subtítulo"
            placeholder="subtítulo"
            style="width:100%;border:0;background:transparent;color:var(--muted);font-family:inherit;font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;padding:2px 0;"
            @input="onMetaInput"
            @blur="commitMeta"
            @keydown="onMetaKey"
          >
        </div>

        <span
          v-else
          data-meta-locked
          style="flex:1 1 180px;min-width:118px;display:flex;flex-direction:column;gap:1px;"
        >
          <span style="font-size:15.5px;font-weight:600;letter-spacing:-0.015em;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ meta.title || '' }}</span>
          <span :style="{ display: compact ? 'none' : 'block' }" style="font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;color:var(--muted);">título e tom oficiais · só o responsável muda</span>
        </span>

        <div v-if="isContentEdit" style="flex:none;display:flex;align-items:center;gap:6px;">
          <label style="display:flex;align-items:center;gap:5px;height:34px;padding:0 9px;border-radius:10px;border:1px solid var(--chord-edge);background:var(--chord-soft);">
            <span style="font-size:8.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Tom</span>
            <input
              data-meta="key"
              :value="metaValue('key')"
              aria-label="Tom"
              placeholder="—"
              style="width:38px;border:0;background:transparent;color:var(--chord);font-family:'Space Mono',monospace;font-size:15px;font-weight:700;padding:0;"
              @input="onMetaInput"
              @blur="commitMeta"
              @keydown="onMetaKey"
            >
          </label>
          <label style="display:flex;align-items:center;gap:5px;height:34px;padding:0 9px;border-radius:10px;border:1px solid var(--line);">
            <input
              data-meta="tempo"
              :value="metaValue('tempo')"
              aria-label="Andamento"
              placeholder="—"
              style="width:34px;border:0;background:transparent;color:var(--text);font-family:'Space Mono',monospace;font-size:13px;font-weight:700;padding:0;"
              @input="onMetaInput"
              @blur="commitMeta"
              @keydown="onMetaKey"
            >
            <span style="font-size:9px;letter-spacing:0.12em;color:var(--muted);font-weight:700;">BPM</span>
          </label>
        </div>

        <div
          style="display:flex;justify-content:flex-end;align-items:center;gap:6px;min-width:0;"
          :style="{ flex: compact ? '1 1 100%' : 'none', flexWrap: compact ? 'wrap' : 'nowrap' }"
        >
          <span
            v-if="dirty"
            title="Alterações não salvas"
            :style="{ display: compact ? 'none' : 'flex' }"
            style="align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:9px;background:var(--surface);font-size:11px;font-weight:600;color:var(--text);"
          ><span style="width:7px;height:7px;border-radius:50%;background:var(--chord);" />não salvo</span>
          <button
            data-undo
            class="cpv-glyph"
            title="Desfazer (Ctrl+Z)"
            aria-label="Desfazer"
            :disabled="!canUndo"
            :style="{ opacity: canUndo ? '1' : '0.4' }"
            style="width:34px;height:34px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--text);font-size:14px;cursor:pointer;"
            @click="undo"
          >↺</button>
          <button
            v-if="canRedo"
            data-redo
            class="cpv-glyph"
            title="Refazer (Ctrl+Shift+Z)"
            aria-label="Refazer"
            style="width:34px;height:34px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--text);font-size:14px;cursor:pointer;"
            @click="redo"
          >↻</button>
          <span
            v-if="wMode === 'local'"
            style="display:flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:9px;background:var(--chord-soft);border:1px solid var(--chord-edge);font-size:11px;font-weight:600;color:var(--chord);"
          ><span style="width:7px;height:7px;border-radius:50%;background:var(--chord);" />salvo neste celular</span>
          <template v-if="dirty">
            <button
              data-discard
              title="Voltar ao último salvo"
              :style="{ color: confirmDiscard ? 'var(--danger)' : 'var(--muted)' }"
              style="height:34px;padding:0 11px;border:1px solid var(--line);border-radius:10px;background:transparent;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;"
              @click="discard"
            >{{ discardLabel }}</button>
            <button
              data-save
              title="Salvar — passa a valer para todos (Ctrl+S)"
              style="height:34px;padding:0 13px;border:0;border-radius:10px;background:var(--danger);color:var(--chord-ink);font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;"
              @click="save"
            >Salvar para todos</button>
          </template>
          <button
            data-read
            title="Voltar para leitura"
            style="height:34px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--text);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;"
            @click="exitEdit"
          >Ler</button>
        </div>
      </div>
    </div>

    <!-- Wide bottom bar -->
    <div
      v-if="!isEdit && !phone && isPopulated"
      class="cpv-chrome"
      :class="{ 'is-hidden': chromeHidden }"
      style="position:absolute;bottom:0;left:0;right:0;z-index:13;display:flex;flex-direction:column;align-items:center;gap:10px;padding:0 16px 18px;"
    >
      <!-- The reader's own version is never a hidden state: it says so, and
           the original is one tap away. -->
      <div v-if="showMine" class="cpv-hit cpv-veil-2 cpv-mine-switch" data-mine-switch>
        <button
          data-read-mine
          :style="{
            border: `1px solid ${ov.showOriginal.value ? 'var(--line)' : 'var(--chord-edge)'}`,
            background: ov.showOriginal.value ? 'transparent' : 'var(--chord-fill)',
            color: ov.showOriginal.value ? 'var(--muted)' : 'var(--chord)',
          }"
          @click="toggleOriginal(false)"
        >{{ ov.mineLabel.value }}</button>
        <button
          data-read-orig
          :style="{
            border: `1px solid ${ov.showOriginal.value ? 'var(--sel-line)' : 'var(--line)'}`,
            background: ov.showOriginal.value ? 'var(--sel)' : 'transparent',
            color: ov.showOriginal.value ? 'var(--text)' : 'var(--muted)',
          }"
          @click="toggleOriginal(true)"
        >Original</button>
        <button
          class="cpv-ghost"
          data-open-my
          aria-label="Ver e reverter meus ajustes"
          title="Ver e reverter meus ajustes"
          style="width:30px;height:30px;border-radius:10px;color:var(--muted);font-size:15px;line-height:1;"
          @click="ov.myPanel.value = true"
        >⋯</button>
      </div>

      <div v-if="hintFit" class="cpv-hit cpv-veil-2" style="display:flex;align-items:center;gap:8px;max-width:360px;padding:7px 8px 7px 13px;border-radius:13px;animation:cpv-rise .25s ease-out;">
        <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Ajuste encaixa a cifra no espaço da tela — e dá para voltar ao padrão quando quiser.</span>
        <button class="cpv-ghost" aria-label="Entendi" style="flex:none;width:26px;height:26px;color:var(--muted);font-size:14px;" @click="dismissHint(true)">×</button>
      </div>

      <div v-if="scrolling" class="cpv-hit cpv-veil-2" style="display:flex;align-items:center;gap:10px;padding:7px 8px 7px 14px;border-radius:14px;animation:cpv-rise .2s ease-out;">
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Velocidade</span>
        <button aria-label="Mais devagar" title="Mais devagar (←)" style="width:32px;height:30px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--text);font-size:15px;line-height:1;cursor:pointer;" @click="mul = viewerMulStep(mul, 'down')">−</button>
        <span style="min-width:56px;text-align:center;font-family:'Space Mono',monospace;font-size:13px;font-weight:700;color:var(--text);">{{ mul.toFixed(2) }}×</span>
        <button aria-label="Mais rápido" title="Mais rápido (→)" style="width:32px;height:30px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--text);font-size:15px;line-height:1;cursor:pointer;" @click="mul = viewerMulStep(mul, 'up')">+</button>
        <span style="width:1px;height:22px;background:var(--line);" />
        <span style="display:flex;flex-direction:column;align-items:flex-end;gap:1px;min-width:52px;padding-right:6px;">
          <span data-eta style="font-family:'Space Mono',monospace;font-size:11px;color:var(--text);">−{{ etaLabel }}</span>
          <span style="font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);font-weight:700;">{{ Math.round(progress * 100) }}%</span>
        </span>
      </div>

      <div class="cpv-hit cpv-veil" style="display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px;padding:6px;border-radius:17px;">
        <template v-if="setlist.on.value">
          <button
            data-song-prev
            aria-label="Música anterior"
            title="Música anterior"
            :disabled="setlist.noPrev.value"
            :style="{ opacity: setlist.noPrev.value ? '0.32' : '1' }"
            style="width:38px;height:38px;border:0;border-radius:12px;background:transparent;color:var(--text);font-size:13px;cursor:pointer;"
            @click="goPrev"
          >◀</button>
          <button
            data-setlist-open
            title="Abrir a lista do ensaio"
            style="height:38px;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:transparent;color:var(--text);font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:8px;"
            @click="setlist.open()"
          >
            <span style="flex:none;font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:12px;font-weight:700;color:var(--chord);">{{ setlist.posLabel.value }}</span>
            <span style="flex:none;font-size:12px;font-weight:600;color:var(--muted);">Lista</span>
          </button>
          <button
            data-song-next
            aria-label="Próxima música"
            title="Próxima música"
            :disabled="setlist.noNext.value"
            :style="{ opacity: setlist.noNext.value ? '0.32' : '1' }"
            style="width:38px;height:38px;border:0;border-radius:12px;background:transparent;color:var(--text);font-size:13px;cursor:pointer;"
            @click="goNext"
          >▶</button>
          <span style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />
        </template>
        <button
          data-scroll
          title="Auto-rolagem (espaço)"
          :style="{ background: scrolling ? 'var(--pill)' : 'transparent', color: scrolling ? 'var(--pill-ink)' : 'var(--text)', border: `1px solid ${scrolling ? 'var(--pill)' : 'var(--line)'}` }"
          class="cpv-bar-btn"
          style="height:36px;padding:0 14px 0 12px;border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:9px;"
          @click="toggleScroll"
        >
          <span :class="scrolling ? 'cpv-icon-stop' : 'cpv-icon-play'" aria-hidden="true" />{{ scrolling ? 'Parar' : 'Rolar' }}
        </button>
        <span style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />
        <button class="cpv-ghost" aria-label="Diminuir tipografia" title="Diminuir tipografia" style="width:36px;height:36px;font-size:12px;font-weight:600;" @click="bias = Math.max(-3, bias - 1)">A−</button>
        <button class="cpv-ghost" aria-label="Aumentar tipografia" title="Aumentar tipografia" style="width:36px;height:36px;font-size:16px;font-weight:600;" @click="bias = Math.min(5, bias + 1)">A+</button>
        <button
          data-fit
          title="Modo ajuste ao espaço"
          :style="{ background: fitOn ? 'var(--sel)' : 'transparent', border: `1px solid ${fitOn ? 'var(--sel-line)' : 'transparent'}`, color: 'var(--text)' }"
          class="cpv-bar-btn"
          style="height:36px;padding:0 12px;border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;"
          @click="toggleFit"
        >
          <span style="width:14px;height:14px;border-radius:4px;border:1.5px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:9px;line-height:1;">{{ fitOn ? '✓' : '' }}</span>Ajuste
        </button>
        <span style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />
        <button
          data-lens-btn
          title="Lentes de leitura (L)"
          class="cpv-bar-btn"
          :style="{ background: activeLens === 'none' ? 'transparent' : 'var(--chord-fill)', color: activeLens === 'none' ? 'var(--text)' : 'var(--chord)', border: `1px solid ${activeLens === 'none' ? 'var(--line)' : 'var(--chord-edge)'}` }"
          style="height:36px;padding:0 12px;border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;"
          @click="toggleLens"
        >
          <span style="width:12px;height:12px;border-radius:50%;border:1.5px solid currentColor;background:linear-gradient(90deg,currentColor 50%,transparent 50%);" />{{ lensChipLabel }}
        </button>
        <button
          data-met-btn
          title="Metrônomo (M)"
          class="cpv-bar-btn"
          :style="{ background: met.running.value ? 'var(--chord-fill)' : 'transparent', color: met.running.value ? 'var(--chord)' : 'var(--text)', border: `1px solid ${met.running.value ? 'var(--chord-edge)' : 'var(--line)'}` }"
          style="height:36px;padding:0 12px;border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;font-variant-numeric:tabular-nums;"
          @click="toggleMetPanel"
        >
          <span
            :style="{ background: met.running.value && met.beat.value === 0 ? 'var(--chord)' : 'transparent', transform: met.running.value && met.beat.value === 0 ? 'scale(1.35)' : 'scale(1)' }"
            style="width:11px;height:11px;border-radius:50%;border:1.5px solid currentColor;transition:transform .07s ease-out,background .07s linear;"
          />{{ met.running.value ? `${met.bpm.value} BPM` : 'Metrônomo' }}
        </button>
        <span style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />
        <button data-theme-btn class="cpv-ghost" :title="themeTitle" style="height:36px;padding:0 12px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:8px;" @click="requestTheme">
          <span class="cpv-glyph" style="font-size:13px;line-height:1;">{{ themeGlyph(themeMode) }}</span>{{ themeLabel(themeMode) }}
        </button>
        <button class="cpv-ghost cpv-glyph" aria-label="Exportar" title="Exportar CHO ou PDF" style="width:36px;height:36px;font-size:15px;" @click="sheet = true">↓</button>
        <button class="cpv-glyph cpv-bar-btn" :style="{ background: fs ? 'var(--sel)' : 'transparent', border: `1px solid ${fs ? 'var(--sel-line)' : 'transparent'}`, color: 'var(--text)' }" aria-label="Tela cheia" title="Tela cheia (F)" style="width:36px;height:36px;border-radius:12px;font-size:14px;cursor:pointer;" @click="toggleFs">{{ fs ? '⤡' : '⤢' }}</button>
      </div>
    </div>

    <!-- Phone dock -->
    <div
      v-if="!isEdit && phone && isPopulated"
      class="cpv-chrome"
      :class="{ 'is-hidden': chromeHidden }"
      style="position:absolute;bottom:0;left:0;right:0;z-index:13;padding:0 10px calc(12px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:stretch;gap:8px;"
    >
      <!-- No switch here: on a phone the dock is already full, so the personal
           version lives in "Mais" — one row to read the original, one to
           revert. -->
      <div v-if="hintFit" class="cpv-hit cpv-veil-2" style="display:flex;align-items:center;gap:8px;padding:9px 8px 9px 13px;border-radius:14px;animation:cpv-rise .25s ease-out;">
        <span style="flex:1;font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Ajuste encaixa a cifra no espaço da tela — desligue em “Mais”.</span>
        <button class="cpv-ghost" aria-label="Entendi" style="flex:none;width:32px;height:32px;color:var(--muted);font-size:15px;" @click="dismissHint(true)">×</button>
      </div>

      <div class="cpv-hit cpv-veil" style="display:flex;flex-direction:column;border-radius:20px;overflow:hidden;">
        <!-- The list gets its own row: the dock below is already full. -->
        <div v-if="setlist.on.value" style="display:flex;align-items:center;gap:6px;padding:6px;border-bottom:1px solid var(--line-soft);">
          <button
            data-song-prev
            aria-label="Música anterior"
            :disabled="setlist.noPrev.value"
            :style="{ opacity: setlist.noPrev.value ? '0.32' : '1' }"
            style="flex:none;width:44px;height:44px;border:1px solid var(--line);border-radius:13px;background:transparent;color:var(--text);font-size:13px;cursor:pointer;"
            @click="goPrev"
          >◀</button>
          <button
            data-setlist-open
            title="Abrir a lista do ensaio"
            style="flex:1;min-width:0;height:44px;padding:0 12px;border:0;border-radius:13px;background:var(--surface);color:var(--text);font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:9px;"
            @click="setlist.open()"
          >
            <span style="flex:none;font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:12.5px;font-weight:700;color:var(--chord);">{{ setlist.posLabel.value }}</span>
            <span style="flex:1;min-width:0;font-size:11.5px;font-weight:500;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;">{{ setlist.nextChipShort.value }}</span>
            <span aria-hidden="true" style="flex:none;font-size:9px;color:var(--muted);">▴</span>
          </button>
          <button
            data-song-next
            aria-label="Próxima música"
            :disabled="setlist.noNext.value"
            :style="{ opacity: setlist.noNext.value ? '0.32' : '1' }"
            style="flex:none;width:44px;height:44px;border:1px solid var(--line);border-radius:13px;background:transparent;color:var(--text);font-size:13px;cursor:pointer;"
            @click="goNext"
          >▶</button>
        </div>
        <div v-if="scrolling" style="display:flex;align-items:center;gap:6px;padding:7px 8px;border-bottom:1px solid var(--line-soft);">
          <button aria-label="Mais devagar" style="flex:none;width:40px;height:36px;border:1px solid var(--line);border-radius:11px;background:transparent;color:var(--text);font-size:16px;line-height:1;cursor:pointer;" @click="mul = viewerMulStep(mul, 'down')">−</button>
          <span style="flex:none;min-width:58px;text-align:center;font-family:'Space Mono',monospace;font-size:13.5px;font-weight:700;color:var(--text);">{{ mul.toFixed(2) }}×</span>
          <button aria-label="Mais rápido" style="flex:none;width:40px;height:36px;border:1px solid var(--line);border-radius:11px;background:transparent;color:var(--text);font-size:16px;line-height:1;cursor:pointer;" @click="mul = viewerMulStep(mul, 'up')">+</button>
          <span style="flex:1;" />
          <span style="flex:none;display:flex;align-items:baseline;gap:8px;padding-right:6px;font-family:'Space Mono',monospace;">
            <span data-eta style="font-size:12px;color:var(--text);">−{{ etaLabel }}</span>
            <span style="font-size:10px;letter-spacing:0.08em;color:var(--muted);font-weight:700;">{{ Math.round(progress * 100) }}%</span>
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:4px;padding:6px;">
          <button
            data-scroll
            title="Auto-rolagem"
            :style="{ background: scrolling ? 'var(--pill)' : 'var(--chord)', color: 'var(--chord-ink)', minWidth: dockCtrlH, height: dockCtrlH, padding: width < 380 ? '0' : '0 20px', gap: width < 380 ? '0' : '9px' }"
            style="flex:none;overflow:hidden;border-radius:14px;border:0;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;white-space:nowrap;"
            @click="toggleScroll"
          >
            <span :class="scrolling ? 'cpv-icon-stop' : 'cpv-icon-play'" style="flex:none;width:11px;height:11px;" aria-hidden="true" />{{ dockPlayLabel }}
          </button>
          <span style="flex:1;min-width:2px;" />
          <span :style="{ height: dockCtrlH }" style="flex:none;display:flex;align-items:center;gap:2px;padding:0 2px;border-radius:14px;background:var(--surface);">
            <button class="cpv-ghost" aria-label="Diminuir tipografia" :style="{ width: bp === 'xs' ? '38px' : '42px', height: bp === 'xs' ? '40px' : '44px' }" style="font-size:13px;font-weight:600;" @click="bias = Math.max(-3, bias - 1)">A−</button>
            <button class="cpv-ghost" aria-label="Aumentar tipografia" :style="{ width: bp === 'xs' ? '38px' : '42px', height: bp === 'xs' ? '40px' : '44px' }" style="font-size:17px;font-weight:600;" @click="bias = Math.min(5, bias + 1)">A+</button>
          </span>
          <button data-theme-btn class="cpv-ghost cpv-glyph" aria-label="Tema" :title="themeTitle" :style="{ width: dockIconSize, height: dockCtrlH }" style="border-radius:14px;font-size:16px;line-height:1;" @click="requestTheme">{{ themeGlyph(themeMode) }}</button>
          <button v-if="canEditNow" data-edit aria-label="Editar esta cifra" title="Editar esta cifra" :style="{ width: dockIconSize, height: dockCtrlH }" style="flex:none;border:1px solid var(--chord-edge);border-radius:14px;background:var(--chord-soft);color:var(--chord);font-size:15px;line-height:1;cursor:pointer;" @click="enterEdit">✎</button>
          <button class="cpv-ghost" aria-label="Mais controles" title="Mais controles" :style="{ width: dockIconSize, height: dockCtrlH }" style="border-radius:14px;font-size:17px;line-height:1;" @click="moreOpen = true">⋯</button>
        </div>
      </div>
    </div>

    <button
      v-if="queueEntry"
      class="cpv-queue-chip cpv-veil"
      :class="{ 'is-hidden': chromeHidden }"
      data-queue-chip
      title="Sugestões dos músicos"
      :style="{ bottom: '128px', opacity: chromeHidden ? '0' : '1', transition: 'opacity .35s ease' }"
      @click="ov.openQueue"
    >
      <span style="width:7px;height:7px;border-radius:50%;background:var(--chord);" />Sugestões · {{ ov.pendingCount.value }}
    </button>

    <button
      v-if="canEditNow && !phone"
      data-edit
      title="Editar esta cifra"
      class="cpv-edit-chip"
      :class="{ 'is-hidden': chromeHidden }"
      @click="enterEdit"
    >
      <span class="cpv-edit-diamond" />{{ dirty ? 'Editar · rascunho' : 'Editar' }}
    </button>

    <!-- Edit bottom bar: what is selected, what is on the clipboard, the dock -->
    <div
      v-if="isEdit && !srcOpen"
      style="position:absolute;bottom:0;left:0;right:0;z-index:13;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 16px 18px;pointer-events:none;"
    >
      <div v-if="editHint" class="cpv-clip-bar cpv-veil-2" data-edit-hint style="border-style:solid;">
        <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">
          Toque na linha para editar a letra · segure o acorde e arraste até a sílaba ·
          <span style="font-family:'Space Mono',monospace;color:var(--text);">⋮⋮</span> seleciona e reordena o bloco.
        </span>
        <button
          class="cpv-ghost"
          aria-label="Entendi"
          style="flex:none;width:26px;height:26px;color:var(--muted);font-size:14px;line-height:1;"
          @click="markEditSeen()"
        >×</button>
      </div>

      <div v-if="bedit.clip.value" class="cpv-clip-bar cpv-veil-2">
        <span style="font-size:11.5px;line-height:1.4;color:var(--text);text-wrap:pretty;">
          Harmonia de <strong style="color:var(--chord);">{{ bedit.clip.value.label }}</strong> na mão — toque em “Colar harmonia aqui” nos blocos destino.
        </span>
        <button
          style="flex:none;height:28px;padding:0 10px;border:0;border-radius:9px;background:var(--surface);color:var(--muted);font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;"
          @click="bedit.clip.value = null"
        >Dispensar</button>
      </div>

      <SelectionBar
        v-if="bedit.sel.value !== null"
        :edit="bedit"
        :compact="compact"
        :w-mode="wMode"
        @edit-score="bedit.sel.value !== null && openScore(bedit.sel.value)"
      />

      <div class="cpv-veil" style="pointer-events:auto;position:relative;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px;padding:6px;border-radius:17px;">
        <div v-if="bedit.insertMenu.value" class="cpv-insert-menu cpv-veil-2">
          <div class="cpv-insert-where">{{ bedit.insertWhere.value }}</div>
          <button
            v-for="it in insertItems"
            :key="it.label"
            class="cpv-insert-item"
            type="button"
            @click="it.go()"
          ><span>{{ it.icon }}</span>{{ it.label }}</button>
        </div>

        <button
          data-insert
          title="Inserir bloco"
          :style="{
            border: `1px solid ${bedit.insertMenu.value ? 'var(--sel-line)' : 'var(--line)'}`,
            background: bedit.insertMenu.value ? 'var(--sel)' : 'transparent',
          }"
          style="height:36px;padding:0 13px;border-radius:12px;color:var(--text);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;"
          @click="bedit.toggleInsertMenu()"
        ><span style="font-size:15px;line-height:1;color:var(--chord);">+</span>Inserir</button>

        <span style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />

        <button
          v-if="isContentEdit && capabilities.sourcePane !== false"
          data-source
          title="Fonte ChordPro assistida"
          style="height:36px;padding:0 12px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--text);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;"
          @click="srcOpen = true"
        >
          <span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--chord);">{ }</span>Fonte
          <span v-if="!lint.ok" title="Diretiva sem par nesta cifra" style="width:6px;height:6px;border-radius:50%;background:var(--danger);" />
        </button>
        <button class="cpv-ghost" aria-label="Diminuir tipografia" style="width:36px;height:36px;font-size:12px;font-weight:600;" @click="bias = Math.max(-3, bias - 1)">A−</button>
        <button class="cpv-ghost" aria-label="Aumentar tipografia" style="width:36px;height:36px;font-size:16px;font-weight:600;" @click="bias = Math.min(5, bias + 1)">A+</button>
        <button data-theme-btn class="cpv-ghost cpv-glyph" :title="themeTitle" style="width:36px;height:36px;font-size:13px;" @click="requestTheme">{{ themeGlyph(themeMode) }}</button>
      </div>
    </div>

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

    <div v-if="chromeHidden" class="cpv-chrome-hint cpv-veil">{{ chromeHiddenHint }}</div>

    <div v-if="pdf === 'error'" class="cpv-error-banner">
      <span style="flex:none;width:20px;height:20px;border-radius:50%;border:1.5px solid var(--danger);color:var(--danger);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;line-height:1;">!</span>
      <span style="flex:1;font-size:13px;line-height:1.4;">A exportação em PDF falhou.</span>
      <button style="flex:none;height:30px;padding:0 11px;border-radius:9px;border:1px solid var(--danger);background:transparent;color:var(--danger);font-size:12px;font-weight:600;cursor:pointer;" @click="pdf = 'idle'; doExportPdf()">Tentar de novo</button>
      <button class="cpv-ghost" aria-label="Fechar" style="flex:none;width:30px;height:30px;color:var(--muted);font-size:15px;" @click="pdf = 'idle'">×</button>
    </div>

    <div v-if="toast" class="cpv-toast cpv-veil-2" :style="{ bottom: toastBottom }">{{ toast }}</div>

    <!-- The song ended. Offer the next one; never take the decision. -->
    <div
      v-if="setlist.endOffer.value && !isEdit"
      :style="{ bottom: offerBottom }"
      style="position:absolute;left:0;right:0;z-index:15;display:flex;justify-content:center;padding:0 12px;pointer-events:none;"
    >
      <div
        class="cpv-veil-2"
        data-end-offer
        style="pointer-events:auto;display:flex;align-items:center;gap:12px;max-width:420px;padding:9px 10px 9px 15px;border-radius:16px;border:1px solid var(--chord-edge);box-shadow:var(--shadow);animation:cpv-rise .2s ease-out;"
      >
        <span style="min-width:0;display:flex;flex-direction:column;gap:2px;">
          <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Fim da música</span>
          <span style="font-size:13px;font-weight:600;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ setlist.nextTitle.value }}</span>
        </span>
        <button
          data-end-next
          style="flex:none;height:40px;padding:0 15px;border:0;border-radius:12px;background:var(--chord);color:var(--chord-ink);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;"
          @click="endNext"
        >Próxima</button>
        <button
          class="cpv-ghost"
          aria-label="Ficar nesta música"
          title="Ficar nesta música"
          style="flex:none;width:34px;height:34px;color:var(--muted);font-size:16px;"
          @click="setlist.dismissEnd()"
        >×</button>
      </div>
    </div>

    <div v-if="guard.bad.value" class="cpv-surface-warn" role="alert">
      <span aria-hidden="true" style="flex:none;color:var(--danger);font-size:15px;line-height:1.35;">⚠</span>
      <span style="flex:1;min-width:0;">
        <span class="cpv-surface-warn-title">Viewer sem altura resolvível</span>
        <span class="cpv-surface-warn-body">O ancestral imediato precisa de uma altura definida. Sem ela o viewer usa o piso de 460px e a barra de controle fica fora da tela. Ver <code>docs/EMBED-SDA.md</code> — detalhes no console.</span>
      </span>
      <button
        class="cpv-ghost"
        aria-label="Ocultar aviso"
        title="Ocultar aviso"
        style="flex:none;width:26px;height:26px;color:var(--muted);font-size:15px;"
        @click="guard.dismiss()"
      >×</button>
    </div>

    <ExportSheet
      v-if="sheet"
      :export-key-note="exportKeyNote"
      :pdf-busy="pdf === 'busy'"
      :compact="compact"
      :has-overlay="ov.hasOverlay.value"
      :export-orig="ov.exportOrig.value"
      @close="sheet = false"
      @cho="doExportCho"
      @pdf="doExportPdf"
      @pick="(orig) => { ov.exportOrig.value = orig; toggleOriginal(orig) }"
    />

    <!-- The panel steps aside on start, so this is the whole readout while the
         click runs. It hangs off the reading column, not the window: on a wide
         screen the corner of the glass is nowhere near the chart being read. -->
    <button
      v-if="met.running.value && !isEdit"
      data-met-pulse
      class="cpv-met-pulse"
      :title="metPulseTitle"
      :style="{ top: `${headH + 22}px`, right: colEdge, transform: met.beat.value === 0 ? 'scale(1.12)' : 'scale(1)' }"
      @click="met.toggle()"
    >
      <span>{{ met.bpm.value }}</span>
      <span v-if="met.countIn.value" data-met-countin style="font-size:8.5px;letter-spacing:0.12em;text-transform:uppercase;">entrada</span>
      <span
        class="cpv-met-pulse-box"
        :style="{ background: met.countIn.value || met.beat.value === 0 ? 'var(--chord)' : 'transparent', color: met.countIn.value || met.beat.value === 0 ? 'var(--chord-ink)' : 'var(--chord)' }"
      >{{ met.countIn.value || met.beat.value + 1 }}</span>
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
      :follow="met.follow.value"
      :count-in-on="met.countInOn.value"
      :scrolling="scrolling"
      :tap-count="met.tapCount.value"
      :time="meta.time"
      @close="metOpen = false"
      @toggle="met.toggle()"
      @bpm="met.nudgeBpm($event)"
      @reset-bpm="met.resetBpm()"
      @tap="met.tap()"
      @toggle-sound="met.toggleSound()"
      @toggle-follow="met.follow.value = !met.follow.value"
      @toggle-count-in="met.toggleCountIn()"
    />

    <LensSheet
      v-if="lensOpen && !isEdit"
      :compact="compact"
      :lens="activeLens"
      :has-key="hasKey"
      :twin="twin"
      :capo="capo"
      :hide-comments="hideComments"
      @close="lensOpen = false"
      @pick="pickLens"
      @toggle-comments="hideComments = !hideComments"
    />

    <NewChartDialog
      v-if="novaOpen"
      :compact="compact"
      :start="novaStart"
      :fetch-chart="fetchChart"
      :read-pdf="readPdf"
      @close="novaOpen = false"
      @commit="commitNewChart"
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
      :shown-key="shownKey"
      :has-offset="hasOffset"
      :offset-label="`${offset > 0 ? '+' : ''}${offset}`"
      :capo-label="capoLabel"
      :capo-hint="capoHint"
      :has-capo="hasCapo"
      :has-reset="hasReset"
      :dual="twin"
      @dual="toggleMap"
      @close="toneOpen = false"
      @down="shift(-1)"
      @up="shift(1)"
      @capo-down="setCapo(capo - 1)"
      @capo-up="setCapo(capo + 1)"
      @reset="resetTone"
    />

    <div v-if="moreOpen && compact" style="position:absolute;inset:0;z-index:27;">
      <div class="cpv-scrim" @click="moreOpen = false" />
      <div class="cpv-bottom-sheet cpv-veil-2" role="dialog" aria-label="Mais controles" style="gap:6px;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0 2px 6px;">
          <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Mais controles</span>
          <button class="cpv-ghost" aria-label="Fechar" style="width:34px;height:34px;color:var(--muted);font-size:16px;" @click="moreOpen = false">×</button>
        </div>
        <button class="cpv-surface-btn cpv-more-item" @click="moreOpen = false; toggleFit()">Ajuste ao espaço<span>{{ fitOn ? 'Ligado' : 'Desligado' }}</span></button>
        <button class="cpv-surface-btn cpv-more-item" @click="moreOpen = false; toggleLens()">Lentes de leitura<span>Nomes ou graus</span></button>
        <button class="cpv-surface-btn cpv-more-item" @click="moreOpen = false; toggleMetPanel()">Metrônomo<span>{{ met.running.value ? 'Tocando' : 'Parado' }}</span></button>
        <button class="cpv-surface-btn cpv-more-item" @click="moreOpen = false; toggleFs()">Tela cheia<span>{{ fs ? 'Sair' : 'Entrar' }}</span></button>
        <button class="cpv-surface-btn cpv-more-item" @click="moreOpen = false; sheet = true">Exportar<span>ChordPro ou PDF</span></button>
        <template v-if="showMine">
          <button class="cpv-surface-btn cpv-more-item" data-more-original @click="moreOpen = false; toggleOriginal(!ov.showOriginal.value)">
            {{ ov.showOriginal.value ? 'Ler minha versão' : 'Ler o original' }}<span>{{ ov.mineCount.value }} {{ ov.mineCount.value === 1 ? 'ajuste seu' : 'ajustes seus' }}</span>
          </button>
          <button class="cpv-surface-btn cpv-more-item" data-more-my @click="moreOpen = false; ov.myPanel.value = true">Meus ajustes<span>Ver e reverter</span></button>
        </template>
        <button
          v-if="modes.includes('content') && ov.pendingCount.value > 0"
          class="cpv-surface-btn cpv-more-item"
          data-more-queue
          @click="moreOpen = false; ov.openQueue()"
        >Sugestões dos músicos<span>{{ ov.pendingCount.value }} {{ ov.pendingCount.value === 1 ? 'pendente' : 'pendentes' }}</span></button>
      </div>
    </div>

    <ModePickDialog
      v-if="modePick"
      :allow-local="modes.includes('local')"
      :allow-content="modes.includes('content')"
      @close="modePick = false"
      @local="pickMode('local')"
      @content="pickMode('content')"
    />

    <MyVersionPanel
      v-if="ov.myPanel.value"
      :compact="compact"
      :mine-label="ov.mineLabel.value"
      :ops="ov.opList.value"
      :fix-tune-label="fixTuneLabel"
      :can-suggest="ov.canSuggest.value"
      :revert-all-label="ov.revertAllLabel.value"
      :revert-all-danger="ov.revertAllLabel.value !== 'Voltar ao original'"
      @close="ov.closeMy"
      @revert="ov.revertOp"
      @fix-tune="onFixTune"
      @suggest="ov.suggest"
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
      @back="ov.qBack"
      @close="ov.closeQueue"
      @pick-song="(k) => (ov.qSong.value = k)"
      @pick-sug="(k) => (ov.qSug.value = k)"
      @accept="ov.acceptOp"
      @refuse="ov.refuseOp"
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

    <div class="cpv-live" role="status" aria-live="polite">{{ toast }}</div>
    <div class="cpv-live" role="alert" aria-live="assertive">{{ fatal || (pdf === 'error' ? 'A exportação em PDF falhou.' : '') }}</div>
  </div>
</template>
