import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { scoreBeatsPerBar as beatsPerBar, serializeScore as serialize, tabOf, toTab } from '@henryavila/titan-chordpro-ui'
import type { Dur, ScoreNote } from '@henryavila/titan-chordpro-ui'
import { loadVex } from '../score-draw'
import {
  clampIndex,
  deleteAt,
  durAt,
  fretPatch,
  indexAtBar,
  insertAfter,
  nextFret,
  nudgeAt,
  patchAt,
  placeFret,
  remember,
  slideAt,
  undoNotes,
  type DigitMemory,
} from './edit'
import { applyScoreKey } from './keyboard'
import { barStrip, emptyHint, filledBeats, keyHint, metaLine, openScore, pianoKeys, stringRows, tabHint } from './model'
import { paintScore } from './paint'
import { beepNote, noteSeconds } from './playback'

export function useScoreEditor(
  props: { source: string; entry: 'guitar' | 'piano'; view: 'score' | 'tab' | 'both'; grand: boolean },
  emit: { save: (source: string) => void; cancel: () => void },
) {
  const opened = openScore(props.source)
  const notes = ref<ScoreNote[]>(opened.notes)
  const meta = ref(opened.meta)
  const imported = ref<number | null>(opened.imported)
  const inst = ref<'guitar' | 'piano'>(props.entry)
  const view = ref<'score' | 'tab' | 'both'>(props.view)
  const grand = ref(props.grand)
  const showSrc = ref(false)
  const narrow = ref(false)
  const dur = ref<Dur>('q')
  const slide = ref(false)
  const oct = ref(4)
  const sel = ref(Math.max(0, notes.value.length - 1))
  const playing = ref(false)
  const playIdx = ref(-1)
  const confirmDiscard = ref(false)
  const vexReady = ref(false)
  const hist = ref<ScoreNote[][]>([])
  const rootEl = ref<HTMLElement | null>(null)
  const hostEl = ref<HTMLElement | null>(null)

  // baseline is intentionally not a ref: saving does not clear "alterado"
  // until the next edit rebuilds the source comparison.
  let baseline = serialize(notes.value, meta.value)
  let playT = 0
  let discardT = 0
  let ac: AudioContext | null = null
  let ro: ResizeObserver | null = null
  let digitMem: DigitMemory = { at: 0, sel: -1 }
  let sig = ''

  const guitar = computed(() => inst.value === 'guitar')
  const perBar = computed(() => beatsPerBar(meta.value.time))
  const cur = computed(() => notes.value[sel.value])
  const filled = computed(() => filledBeats(notes.value))
  const source = computed(() => serialize(notes.value, meta.value))
  const dirty = computed(() => source.value !== baseline)
  const line = computed(() => metaLine(meta.value, guitar.value))
  const rows = computed(() => stringRows(notes.value, perBar.value, sel.value, playIdx.value))
  const keys = computed(() => pianoKeys(oct.value, cur.value?.midi))
  const strip = computed(() => barStrip(notes.value, sel.value, perBar.value, filled.value))
  const curFret = computed(() => (cur.value ? tabOf(cur.value)?.fret : undefined))
  const hint = computed(() => tabHint(cur.value))
  const keysHint = computed(() => keyHint(guitar.value))
  const blankHint = computed(() => emptyHint(guitar.value))
  const canUndo = computed(() => hist.value.length > 0)
  const canRemove = computed(() => !!cur.value)

  function bindHost(el: Element | null) {
    hostEl.value = el instanceof HTMLElement ? el : null
  }
  function beep(midi: number, sec: number) {
    ac = beepNote(ac, inst.value, midi, sec)
  }
  function undo() {
    const next = undoNotes(hist.value, sel.value)
    if (!next) return
    hist.value = next.hist
    notes.value = next.notes
    sel.value = next.sel
  }
  function move(delta: number) {
    sel.value = clampIndex(sel.value, delta, notes.value.length)
  }
  function pick(i: number) {
    sel.value = i
  }
  function nudge(delta: number) {
    hist.value = remember(hist.value, notes.value)
    notes.value = nudgeAt(notes.value, sel.value, delta)
  }
  function del() {
    if (!notes.value.length) return
    const next = deleteAt(notes.value, sel.value)
    if (!next) return
    hist.value = remember(hist.value, notes.value)
    notes.value = next.notes
    sel.value = next.sel
  }
  function setDur(d: Dur) {
    hist.value = remember(hist.value, notes.value)
    dur.value = d
    notes.value = durAt(notes.value, sel.value, d)
  }
  function toggleSlide() {
    hist.value = remember(hist.value, notes.value)
    const on = !slide.value
    slide.value = on
    notes.value = slideAt(notes.value, sel.value, on)
  }
  function addRest() {
    hist.value = remember(hist.value, notes.value)
    const placed = insertAfter(notes.value, sel.value, { rest: true, dur: dur.value })
    notes.value = placed.notes
    sel.value = placed.sel
  }
  function addPitch(midi: number) {
    const t = toTab(midi)
    hist.value = remember(hist.value, notes.value)
    const placed = insertAfter(notes.value, sel.value, {
      midi,
      dur: dur.value,
      slide: slide.value,
      str: t?.str,
      fret: t?.fret,
    })
    notes.value = placed.notes
    sel.value = placed.sel
    beep(midi, 0.3)
  }
  function goBar(bi: number) {
    sel.value = indexAtBar(notes.value, bi, perBar.value)
  }
  function addFret(str: number, at: number | null) {
    hist.value = remember(hist.value, notes.value)
    const placed = placeFret(notes.value, sel.value, str, at, dur.value, slide.value)
    if (placed.changed) {
      notes.value = placed.notes
      sel.value = placed.sel
    }
    if (placed.changed && placed.beep != null) beep(placed.beep, 0.26)
  }
  function setFret(f: number) {
    const patch = fretPatch(cur.value, f)
    if (!patch) return
    hist.value = remember(hist.value, notes.value)
    notes.value = patchAt(notes.value, sel.value, patch)
    beep(patch.midi, 0.28)
  }
  function digit(k: string) {
    const n = cur.value
    if (!n) return
    const now = Date.now()
    const curFretNow = typeof n.fret === 'number' ? n.fret : 0
    const next = nextFret(digitMem, sel.value, curFretNow, k, now)
    digitMem = next.memory
    setFret(next.fret)
  }
  function save() {
    const src = source.value
    baseline = src
    emit.save(src)
  }
  /** Leaving without saving asks twice when there is new work — like Discard. */
  function discard() {
    if (dirty.value && !confirmDiscard.value) {
      confirmDiscard.value = true
      window.clearTimeout(discardT)
      discardT = window.setTimeout(() => (confirmDiscard.value = false), 4000)
      return
    }
    confirmDiscard.value = false
    emit.cancel()
  }
  function togglePlay() {
    if (playing.value) {
      window.clearTimeout(playT)
      playing.value = false
      playIdx.value = -1
      return
    }
    if (!notes.value.length) return
    playing.value = true
    step(0)
  }
  function step(i: number) {
    const n = notes.value[i]
    if (!n) {
      playing.value = false
      playIdx.value = -1
      return
    }
    const sec = noteSeconds(n.dur, meta.value.tempo)
    if (!n.rest && n.midi != null) beep(n.midi, sec)
    playIdx.value = i
    playT = window.setTimeout(() => {
      if (playing.value) step(i + 1)
    }, sec * 1000)
  }
  function draw() {
    if (!hostEl.value || !vexReady.value) return
    sig = paintScore(
      hostEl.value,
      {
        view: view.value,
        grand: grand.value,
        sel: sel.value,
        playIdx: playIdx.value,
        narrow: narrow.value,
        notes: notes.value,
        time: meta.value.time,
      },
      sig,
      pick,
    )
  }
  function onKey(e: KeyboardEvent) {
    applyScoreKey(e, guitar.value, { undo, discard, digit, move, nudge, del, togglePlay })
  }
  function swapInst() {
    inst.value = guitar.value ? 'piano' : 'guitar'
  }
  function pickView(next: string) {
    view.value = next as 'score' | 'tab' | 'both'
    grand.value = false
  }
  function toggleGrand() {
    grand.value = !grand.value
  }
  function lowerOct() {
    oct.value = Math.max(2, oct.value - 1)
  }
  function raiseOct() {
    oct.value = Math.min(6, oct.value + 1)
  }
  function toggleSrc() {
    showSrc.value = !showSrc.value
  }

  watch(
    () => [view.value, grand.value, sel.value, playIdx.value, narrow.value, notes.value, vexReady.value],
    () => draw(),
    { deep: true },
  )

  onMounted(() => {
    loadVex().then((v) => {
      vexReady.value = !!v
      draw()
    })
    const el = rootEl.value
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => (narrow.value = el.clientWidth < 860))
      ro.observe(el)
      narrow.value = el.clientWidth < 860
    }
    window.addEventListener('keydown', onKey, true)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKey, true)
    window.clearTimeout(playT)
    window.clearTimeout(discardT)
    ro?.disconnect()
    ac?.close()
  })

  return {
    rootEl,
    bindHost,
    guitar,
    view,
    grand,
    narrow,
    line,
    dirty,
    playing,
    confirmDiscard,
    showSrc,
    source,
    imported,
    vexReady,
    blankHint,
    strip,
    keysHint,
    canUndo,
    canRemove,
    dur,
    slide,
    rows,
    curFret,
    oct,
    keys,
    hint,
    notes,
    swapInst,
    pickView,
    toggleGrand,
    togglePlay,
    discard,
    save,
    goBar,
    undo,
    toggleSrc,
    setDur,
    toggleSlide,
    addRest,
    del,
    addFret,
    setFret,
    lowerOct,
    raiseOct,
    addPitch,
  }
}
