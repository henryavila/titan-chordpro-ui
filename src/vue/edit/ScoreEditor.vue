<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  BEATS,
  DEMO,
  DURS,
  NAMES,
  PT,
  STR_LBL,
  STR_MIDI,
  parseScore,
  scoreBeatsPerBar as beatsPerBar,
  scoreLayout as layout,
  serializeScore as serialize,
  tabOf,
  toTab,
} from 'titan-chordpro-ui'
import type { Dur, ScoreMeta, ScoreNote } from 'titan-chordpro-ui'
import { drawScore, loadVex } from './score-draw'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    /** The block's source: a `{sos}` score, a legacy text tab, or empty. */
    source?: string
    entry?: 'guitar' | 'piano'
    view?: 'score' | 'tab' | 'both'
    grand?: boolean
  }>(),
  { title: '', subtitle: '', source: '', entry: 'guitar', view: 'both', grand: false },
)

const emit = defineEmits<{ save: [source: string]; cancel: [] }>()

const rootEl = ref<HTMLElement | null>(null)
const hostEl = ref<HTMLElement | null>(null)

const parsed = parseScore(props.source)
const notes = ref<ScoreNote[]>(
  parsed.notes.length ? parsed.notes : props.source ? [] : DEMO.map((n) => ({ ...n })),
)
const meta = ref<ScoreMeta>({ ...parsed.meta })
const imported = ref<number | null>(parsed.from === 'tab-texto' ? parsed.notes.length : null)

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

/** Plain history: every mutation pushes the previous note list. */
const hist = ref<ScoreNote[][]>([])
let baseline = serialize(notes.value, meta.value)
let playT = 0
let discardT = 0
let ac: AudioContext | null = null
let ro: ResizeObserver | null = null
/** Two digits in a row on the SAME note make a two-digit fret: 1 then 2 = 12. */
let lastKeyAt = 0
let lastKeySel = -1

const guitar = computed(() => inst.value === 'guitar')
const perBar = computed(() => beatsPerBar(meta.value.time))
const cols = computed(() => layout(notes.value, perBar.value))
const cur = computed<ScoreNote | undefined>(() => notes.value[sel.value])
const filled = computed(() => notes.value.reduce((a, n) => a + (BEATS[n.dur] ?? 1), 0))
const source = computed(() => serialize(notes.value, meta.value))
const dirty = computed(() => source.value !== baseline)
const metaLine = computed(
  () =>
    `${meta.value.time} · ${meta.value.tempo} BPM · tom de ${meta.value.key}` +
    (guitar.value ? ` · afinação ${meta.value.tuning}` : ''),
)

function push() {
  hist.value = [...hist.value.slice(-59), notes.value.map((n) => ({ ...n }))]
}
function undo() {
  const prev = hist.value[hist.value.length - 1]
  if (!prev) return
  hist.value = hist.value.slice(0, -1)
  notes.value = prev
  sel.value = Math.max(0, Math.min(prev.length - 1, sel.value))
}
function patch(i: number, obj: Partial<ScoreNote>) {
  push()
  notes.value = notes.value.map((n, j) => (j === i ? { ...n, ...obj } : n))
}
function move(d: number) {
  sel.value = Math.max(0, Math.min(notes.value.length - 1, sel.value + d))
}
function pick(i: number) {
  sel.value = i
}
function nudge(d: number) {
  push()
  notes.value = notes.value.map((n, j) => {
    if (j !== sel.value || n.rest) return n
    const midi = Math.max(40, Math.min(88, (n.midi ?? 60) + d))
    const t = toTab(midi)
    return { ...n, midi, str: t?.str, fret: t?.fret }
  })
}
function del() {
  if (!notes.value.length) return
  push()
  const next = notes.value.filter((_, j) => j !== sel.value)
  notes.value = next
  sel.value = Math.max(0, Math.min(next.length - 1, sel.value))
}
function setDur(d: Dur) {
  push()
  dur.value = d
  notes.value = notes.value.map((n, j) => (j === sel.value ? { ...n, dur: d } : n))
}
function toggleSlide() {
  push()
  const on = !slide.value
  slide.value = on
  notes.value = notes.value.map((n, j) => (j === sel.value ? { ...n, slide: on } : n))
}

/**
 * A new note goes in AFTER the selected one, not at the end: you can go back
 * to the first bar and write there without erasing what comes later.
 */
function insertAfter(note: ScoreNote) {
  const at = Math.min(notes.value.length, sel.value + 1)
  const next = [...notes.value]
  next.splice(at, 0, note)
  notes.value = next
  sel.value = at
}
function addRest() {
  push()
  insertAfter({ rest: true, dur: dur.value })
}
function addPitch(midi: number) {
  const t = toTab(midi)
  push()
  insertAfter({ midi, dur: dur.value, slide: slide.value, str: t?.str, fret: t?.fret })
  beep(midi, 0.3)
}
function goBar(bi: number) {
  const per = perBar.value
  let acc = 0
  let at = 0
  for (let i = 0; i < notes.value.length; i++) {
    if (acc >= bi * per) {
      at = i
      break
    }
    acc += BEATS[notes.value[i]?.dur ?? 'q'] ?? 1
    at = i
  }
  sel.value = at
}
/**
 * Guitar entry: string plus fret give the pitch. Changing the string of a note
 * that already exists must not touch its figure or its slide.
 */
function addFret(str: number, at: number | null) {
  push()
  if (at === null) {
    const pos = Math.min(notes.value.length, sel.value + 1)
    const next = [...notes.value]
    next.splice(pos, 0, { midi: STR_MIDI[str] as number, fret: 0, str, dur: dur.value, slide: slide.value })
    notes.value = next
    sel.value = pos
  } else {
    const old = notes.value[at]
    if (!old) return
    const fret = typeof old.fret === 'number' ? old.fret : 0
    const next = [...notes.value]
    next[at] = { ...old, str, fret, midi: (STR_MIDI[str] as number) + fret, rest: false }
    notes.value = next
    sel.value = at
  }
  const n = notes.value[sel.value]
  if (n?.midi != null) beep(n.midi, 0.26)
}
function setFret(f: number) {
  const n = cur.value
  if (!n) return
  const str = typeof n.str === 'number' ? n.str : (toTab(n.midi ?? 60)?.str ?? 0)
  patch(sel.value, { str, fret: f, midi: (STR_MIDI[str] as number) + f, rest: false })
  beep((STR_MIDI[str] as number) + f, 0.28)
}
function digit(k: string) {
  const n = cur.value
  if (!n) return
  const now = Date.now()
  const curFret = typeof n.fret === 'number' ? n.fret : 0
  const two = lastKeyAt && lastKeySel === sel.value && now - lastKeyAt < 700 && curFret < 10
  lastKeyAt = now
  lastKeySel = sel.value
  setFret(two ? Math.min(24, curFret * 10 + Number(k)) : Number(k))
}

function save() {
  const src = source.value
  baseline = src
  emit('save', src)
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
  emit('cancel')
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
  const sec = (BEATS[n.dur] ?? 1) * (60 / (meta.value.tempo || 92))
  if (!n.rest && n.midi != null) beep(n.midi, sec)
  playIdx.value = i
  playT = window.setTimeout(() => {
    if (playing.value) step(i + 1)
  }, sec * 1000)
}
function beep(midi: number, sec: number) {
  try {
    const AC = (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext
    if (!AC || typeof midi !== 'number') return
    ac = ac ?? new AC()
    const t = ac.currentTime
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = inst.value === 'piano' ? 'sine' : 'triangle'
    o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.12, sec * 0.92))
    o.connect(g).connect(ac.destination)
    o.start(t)
    o.stop(t + sec + 0.05)
  } catch {
    /* no audio available */
  }
}

// ------------------------------------------------------------------ drawing

let sig = ''
/** Redraw only when the picture changes: the SVG is rebuilt whole, handlers
 *  for clicking a note going with it. */
function draw() {
  if (!hostEl.value || !vexReady.value) return
  const next = [
    view.value,
    grand.value,
    sel.value,
    playIdx.value,
    narrow.value,
    JSON.stringify(notes.value),
    meta.value.time,
    getComputedStyle(hostEl.value).color,
  ].join('|')
  if (next === sig) return
  sig = next
  // The engraver draws with explicit colours, so they have to come from the
  // theme the host is in: the design's editor is always dark, and a hard dark
  // ink on a light chart was a staff you could barely see.
  const cs = getComputedStyle(hostEl.value)
  const varOf = (name: string, fallback: string) =>
    cs.getPropertyValue(name).trim() || fallback
  try {
    drawScore(hostEl.value, notes.value, {
      view: view.value,
      grand: grand.value,
      sel: sel.value,
      playIdx: playIdx.value,
      time: meta.value.time,
      minWidth: narrow.value ? 560 : 700,
      ink: cs.color || varOf('--text', '#EAECF2'),
      accent: varOf('--chord', '#84DFA6'),
      dim: varOf('--muted', '#888F9E'),
      onPick: pick,
    })
  } catch {
    // Notes still edit through the string grid without the drawing, and the
    // work in progress is not worth losing to a failed render.
    hostEl.value.replaceChildren()
    sig = ''
  }
}
watch(
  () => [view.value, grand.value, sel.value, playIdx.value, narrow.value, notes.value, vexReady.value],
  () => draw(),
  { deep: true },
)

function onKey(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  if (t && (/^(input|textarea)$/i.test(t.tagName) || t.isContentEditable)) return
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
    undo()
    e.preventDefault()
    return
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return
  // The editor owns the keyboard while it is open: the chart behind it must
  // not also act on the same key.
  e.stopPropagation()
  if (e.key === 'Escape') {
    discard()
    e.preventDefault()
    return
  }
  if (guitar.value && /^[0-9]$/.test(e.key)) {
    digit(e.key)
    e.preventDefault()
    return
  }
  if (e.key === 'ArrowLeft') {
    move(-1)
    e.preventDefault()
  } else if (e.key === 'ArrowRight') {
    move(1)
    e.preventDefault()
  } else if (e.key === 'ArrowUp') {
    nudge(1)
    e.preventDefault()
  } else if (e.key === 'ArrowDown') {
    nudge(-1)
    e.preventDefault()
  } else if (e.key === 'Backspace') {
    del()
    e.preventDefault()
  } else if (e.key === ' ') {
    togglePlay()
    e.preventDefault()
  }
}

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

// ------------------------------------------------------------------- panels

/** The tab grid: one row per string, one cell per column of the layout. */
const rows = computed(() =>
  STR_LBL.map((label, s) => ({
    label,
    cells: cols.value
      .map((c, ci) => {
        if (c.kind === 'bar')
          return { bar: true, w: '3px', txt: '', aria: 'Barra de compasso', on: false, at: null as number | null, str: s, ci }
        const pos = tabOf(c.n)
        const on = !!(pos && pos.str === s)
        return {
          bar: false,
          w: '34px',
          txt: on && pos ? String(pos.fret) : '',
          on,
          selected: c.i === sel.value,
          playing: c.i === playIdx.value,
          aria: `Corda ${label}, coluna ${ci + 1}${on && pos ? `, casa ${pos.fret}` : ', vazia'}`,
          at: c.i as number | null,
          str: s,
          ci,
        }
      })
      .concat([
        {
          bar: false,
          w: '34px',
          txt: '+',
          on: false,
          selected: false,
          playing: false,
          aria: `Nova nota na corda ${label}`,
          at: null,
          str: s,
          ci: -1,
        } as never,
      ]),
  })),
)

const keys = computed(() => {
  const base = oct.value * 12 + 12
  const whites: Array<{ label: string; aria: string; midi: number; on: boolean }> = []
  const blacks: Array<{ left: string; aria: string; midi: number; on: boolean }> = []
  const wPat = [0, 2, 4, 5, 7, 9, 11]
  for (let k = 0; k < 15; k++) {
    const oc = Math.floor(k / 7)
    const i = k % 7
    const midi = base + oc * 12 + (wPat[i] as number)
    const nm = NAMES[midi % 12] as string
    whites.push({
      label: PT[nm] ?? nm,
      aria: `${PT[nm] ?? nm} ${Math.floor(midi / 12) - 1}`,
      midi,
      on: cur.value?.midi === midi,
    })
    if (i !== 2 && i !== 6 && k < 14) {
      const bm = midi + 1
      blacks.push({
        left: `${k * 40 + 27}px`,
        aria: `${PT[nm] ?? nm} sustenido`,
        midi: bm,
        on: cur.value?.midi === bm,
      })
    }
  }
  return { whites, blacks }
})

const beforeBeats = computed(() =>
  notes.value.slice(0, sel.value).reduce((a, n) => a + (BEATS[n.dur] ?? 1), 0),
)
const curBar = computed(() => Math.floor(beforeBeats.value / perBar.value))
const bars = computed(() =>
  Array.from({ length: Math.max(1, Math.ceil(filled.value / perBar.value)) }, (_, bi) => ({
    bi,
    label: String(bi + 1),
    on: bi === curBar.value,
    beats: Array.from({ length: perBar.value }, (_, t) => ({
      full: filled.value >= bi * perBar.value + t + 1,
      part: filled.value > bi * perBar.value + t,
    })),
  })),
)
const closed = computed(() => Math.abs(filled.value % perBar.value) < 0.001)
const fillStatus = computed(() =>
  closed.value
    ? 'compasso fechado'
    : `${Math.round((filled.value % perBar.value) * 100) / 100} de ${perBar.value} tempos`,
)
const atLabel = computed(() =>
  cur.value
    ? `compasso ${curBar.value + 1} · tempo ${Math.round((beforeBeats.value % perBar.value) * 4) / 4 + 1}`
    : '',
)
const curTab = computed(() => (cur.value ? tabOf(cur.value) : null))
const tabHint = computed(() =>
  curTab.value ? `no violão: corda ${STR_LBL[curTab.value.str]}, casa ${curTab.value.fret}` : '',
)
const keyHint = computed(() =>
  guitar.value
    ? '0–12 digita a casa · ←/→ anda · Backspace apaga'
    : '←/→ anda · ↑/↓ move a altura · Backspace apaga',
)
const emptyHint = computed(() =>
  guitar.value
    ? 'Toque numa corda abaixo para escrever a primeira nota'
    : 'Escolha a figura e toque uma tecla para começar',
)
</script>

<template>
  <div ref="rootEl" class="edp" data-score-editor>
    <header class="edp-head">
      <div class="edp-title" :style="{ minWidth: narrow ? '150px' : '220px' }">
        <div style="display:flex;flex-direction:column;gap:1px;min-width:0;flex:1;">
          <span class="edp-title-line">{{ title || 'Partitura' }} <span style="color:var(--muted);font-weight:400;">·</span> {{ subtitle }}</span>
          <span class="edp-meta">{{ metaLine }}</span>
        </div>
        <span v-if="dirty" class="edp-dirty">alterado</span>
      </div>

      <div class="edp-ctrls" :style="{ order: narrow ? 1 : 0 }">
        <button
          class="edp-btn edp-btn--soft"
          data-swap-inst
          title="Alterna só a forma de digitar — o que fica salvo é o mesmo"
          @click="inst = guitar ? 'piano' : 'guitar'"
        >
          <span class="edp-kicker">Entrada</span>{{ guitar ? 'Violão' : 'Piano' }}<span style="color:var(--muted);">⇄</span>
        </button>

        <div class="edp-seg">
          <button
            v-for="v in ([['score', 'Partitura'], ['tab', 'TAB'], ['both', 'Ambos']] as const)"
            :key="v[0]"
            :aria-pressed="!grand && view === v[0]"
            :style="{
              background: !grand && view === v[0] ? 'var(--pill)' : 'transparent',
              color: !grand && view === v[0] ? 'var(--pill-ink)' : 'var(--muted)',
              fontWeight: !grand && view === v[0] ? 700 : 500,
            }"
            @click="view = v[0]; grand = false"
          >{{ v[1] }}</button>
        </div>

        <button
          class="edp-btn"
          data-grand
          title="Duas pautas, sol e fá"
          :aria-pressed="grand"
          :style="{
            borderColor: grand ? 'var(--chord-edge)' : 'var(--line)',
            background: grand ? 'var(--chord-soft)' : 'transparent',
            color: grand ? 'var(--chord)' : 'var(--text)',
          }"
          @click="grand = !grand"
        >Pauta dupla</button>

        <button
          class="edp-btn"
          data-play
          :style="{
            borderColor: playing ? 'var(--pill)' : 'var(--line)',
            background: playing ? 'var(--pill)' : 'transparent',
            color: playing ? 'var(--pill-ink)' : 'var(--text)',
          }"
          @click="togglePlay"
        >
          <span :style="{ clipPath: playing ? 'none' : 'polygon(0 0, 100% 50%, 0 100%)' }" style="width:10px;height:10px;background:currentColor;" />
          {{ playing ? 'Parar' : 'Tocar' }}
        </button>
      </div>

      <div style="display:flex;align-items:center;gap:8px;margin-left:auto;" :style="{ order: narrow ? 0 : 1 }">
        <button
          class="edp-btn"
          data-score-cancel
          title="Sai sem gravar no bloco"
          :style="{
            borderColor: confirmDiscard ? 'var(--danger)' : 'var(--line)',
            color: confirmDiscard ? 'var(--danger)' : 'var(--text)',
          }"
          @click="discard"
        >{{ confirmDiscard ? 'Confirmar' : 'Descartar' }}</button>
        <button class="edp-btn edp-btn--primary" data-score-save :style="{ opacity: dirty ? 1 : 0.6 }" @click="save">Salvar no bloco</button>
      </div>
    </header>

    <section class="edp-stage" :style="{ minHeight: narrow ? '210px' : '0' }">
      <div class="edp-paper">
        <div ref="hostEl" style="min-height:140px;" />
        <p v-if="!notes.length" class="edp-empty">{{ emptyHint }}</p>
        <p v-else-if="!vexReady" class="edp-empty">
          O desenho da pauta precisa da biblioteca VexFlow — a partitura continua sendo salva na cifra.
        </p>
      </div>

      <div v-if="imported" class="edp-imported">
        <span>TAB em texto importada: {{ imported }} notas lidas como semínimas. O texto não trazia ritmo — ajuste a figura de cada nota antes de salvar.</span>
      </div>

      <div v-if="showSrc" class="edp-src">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span class="edp-kicker">Como fica salvo na cifra</span>
          <span style="flex:1;height:1px;background:var(--line-soft);" />
          <span class="edp-meta">extensão ChordPro</span>
        </div>
        <pre>{{ source }}</pre>
      </div>
    </section>

    <div class="edp-bars">
      <span class="edp-kicker">Compassos</span>
      <div style="display:flex;gap:7px;overflow-x:auto;max-width:100%;">
        <button
          v-for="b in bars"
          :key="b.bi"
          class="edp-bar"
          title="Ir para este compasso"
          :style="{ borderColor: b.on ? 'var(--chord-edge)' : 'var(--line)' }"
          @click="goBar(b.bi)"
        >
          <span :style="{ color: b.on ? 'var(--chord)' : 'var(--muted)' }" style="font-family:'Space Mono',monospace;font-size:9px;font-weight:700;">{{ b.label }}</span>
          <span style="display:flex;gap:2px;">
            <span
              v-for="(t, ti) in b.beats"
              :key="ti"
              :style="{ background: t.full ? 'var(--chord)' : t.part ? 'var(--chord-fill)' : 'var(--surface)' }"
              style="width:13px;height:9px;border-radius:2px;"
            />
          </span>
        </button>
      </div>
      <span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--chord);font-weight:700;">{{ atLabel }}</span>
      <span :style="{ color: closed ? 'var(--muted)' : 'var(--danger)' }" style="font-family:'Space Mono',monospace;font-size:11px;">{{ fillStatus }}</span>
      <div style="flex:1;" />
      <span v-if="!narrow" style="font-size:11px;color:var(--muted);">a nota nova entra depois da selecionada · {{ keyHint }}</span>
      <button class="edp-mini" :disabled="!hist.length" title="Desfazer (Ctrl+Z)" @click="undo">Desfazer</button>
      <button class="edp-mini" data-score-src @click="showSrc = !showSrc">{{ showSrc ? 'Ocultar fonte' : 'Ver fonte' }}</button>
    </div>

    <footer class="edp-foot">
      <div style="flex:none;display:flex;flex-direction:column;gap:7px;">
        <span class="edp-kicker">Figura</span>
        <div style="display:flex;gap:5px;">
          <button
            v-for="d in DURS"
            :key="d.d"
            class="edp-dur"
            :title="d.name"
            :aria-pressed="dur === d.d"
            :style="{
              borderColor: dur === d.d ? 'var(--chord-edge)' : 'var(--line)',
              background: dur === d.d ? 'var(--chord-soft)' : 'transparent',
              color: dur === d.d ? 'var(--chord)' : 'var(--text)',
            }"
            @click="setDur(d.d)"
          >
            <span style="position:relative;display:block;width:21px;height:24px;">
              <span :style="{ background: d.hollow ? 'transparent' : 'currentColor' }" style="position:absolute;left:1px;bottom:1px;width:12px;height:9px;border:1.6px solid currentColor;border-radius:50%;transform:rotate(-20deg);" />
              <span v-if="d.stem" style="position:absolute;left:12px;bottom:5px;width:1.8px;height:18px;background:currentColor;" />
              <span v-if="d.flags >= 1" style="position:absolute;left:13px;top:1px;width:8px;height:2px;background:currentColor;transform:rotate(30deg);transform-origin:left center;" />
              <span v-if="d.flags >= 2" style="position:absolute;left:13px;top:7px;width:8px;height:2px;background:currentColor;transform:rotate(30deg);transform-origin:left center;" />
            </span>
            <span style="font-family:'Space Mono',monospace;font-size:8.5px;color:var(--muted);">{{ d.b }} {{ d.b === 1 ? 'tempo' : 'tempos' }}</span>
          </button>
        </div>
        <div style="display:flex;gap:5px;">
          <button
            class="edp-flat"
            :aria-pressed="slide"
            :style="{
              borderColor: slide ? 'var(--chord-edge)' : 'var(--line)',
              background: slide ? 'var(--chord-soft)' : 'transparent',
              color: slide ? 'var(--chord)' : 'var(--text)',
            }"
            @click="toggleSlide"
          >Slide</button>
          <button class="edp-flat" data-add-rest @click="addRest">Pausa</button>
          <button
            class="edp-flat"
            data-del-note
            :disabled="!cur"
            title="Remove a nota selecionada (Backspace)"
            :style="{ color: cur ? 'var(--danger)' : 'var(--muted)', opacity: cur ? 1 : 0.45 }"
            @click="del"
          >Remover</button>
        </div>
      </div>

      <div v-if="guitar" style="flex:1;min-width:260px;display:flex;flex-wrap:wrap;gap:14px;">
        <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:7px;">
          <span class="edp-kicker">Cordas · toque para escrever</span>
          <div style="flex:1;overflow-x:auto;padding-bottom:4px;">
            <div style="display:flex;flex-direction:column;gap:2px;width:max-content;min-width:100%;">
              <div v-for="r in rows" :key="r.label" style="display:flex;align-items:stretch;height:26px;">
                <span style="flex:none;width:20px;display:flex;align-items:center;font-family:'Space Mono',monospace;font-size:11px;font-weight:700;color:var(--muted);">{{ r.label }}</span>
                <button
                  v-for="(c, ci) in r.cells"
                  :key="ci"
                  class="edp-cell"
                  :aria-label="c.aria"
                  :aria-pressed="c.on"
                  :disabled="c.bar"
                  :style="{
                    width: c.w,
                    borderColor: c.bar ? 'transparent' : c.selected ? 'var(--sel-line)' : c.on ? 'var(--chord-edge)' : 'transparent',
                    background: c.bar ? 'var(--line)' : c.playing ? 'var(--chord-fill)' : c.on ? 'var(--chord-soft)' : c.selected ? 'var(--surface)' : 'transparent',
                    color: c.bar ? 'transparent' : c.on ? 'var(--chord)' : 'var(--muted)',
                  }"
                  @click="!c.bar && addFret(c.str, c.at)"
                >{{ c.txt }}<span :style="{ background: c.bar || c.on ? 'transparent' : 'var(--line-soft)' }" style="position:absolute;left:0;right:0;top:50%;height:1px;" /></button>
              </div>
            </div>
          </div>
        </div>
        <div style="flex:none;display:flex;flex-direction:column;gap:7px;">
          <span class="edp-kicker">Casa</span>
          <div style="display:grid;grid-template-columns:repeat(7,34px);gap:4px;">
            <button
              v-for="f in 14"
              :key="f"
              class="edp-fret"
              :aria-pressed="curTab?.fret === f - 1"
              :style="{
                borderColor: curTab?.fret === f - 1 ? 'var(--chord-edge)' : 'var(--line)',
                background: curTab?.fret === f - 1 ? 'var(--chord-soft)' : 'transparent',
                color: curTab?.fret === f - 1 ? 'var(--chord)' : 'var(--text)',
              }"
              @click="setFret(f - 1)"
            >{{ f - 1 }}</button>
          </div>
        </div>
      </div>

      <div v-else style="flex:1;min-width:260px;display:flex;flex-direction:column;gap:7px;">
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">
          <span class="edp-kicker">Teclas · toque para escrever</span>
          <span class="edp-meta">oitavas {{ oct }}–{{ oct + 2 }}</span>
          <button class="edp-oct" aria-label="Uma oitava abaixo" @click="oct = Math.max(2, oct - 1)">−</button>
          <button class="edp-oct" aria-label="Uma oitava acima" @click="oct = Math.min(6, oct + 1)">+</button>
          <span style="flex:1;" />
          <span style="font-family:'Space Mono',monospace;font-size:10.5px;color:var(--chord);">{{ tabHint }}</span>
        </div>
        <div style="height:88px;overflow-x:auto;">
          <div style="position:relative;height:84px;width:max-content;">
            <div style="display:flex;gap:2px;">
              <button
                v-for="w in keys.whites"
                :key="w.midi"
                class="edp-white"
                :aria-label="w.aria"
                :style="{
                  borderColor: w.on ? 'var(--chord-edge)' : 'var(--line)',
                  background: w.on ? 'var(--chord-soft)' : 'rgba(255,255,255,0.06)',
                  color: w.on ? 'var(--chord)' : 'var(--muted)',
                }"
                @click="addPitch(w.midi)"
              >{{ w.label }}</button>
            </div>
            <button
              v-for="b in keys.blacks"
              :key="b.midi"
              class="edp-black"
              :aria-label="b.aria"
              :style="{
                left: b.left,
                borderColor: b.on ? 'var(--chord-edge)' : 'rgba(255,255,255,0.14)',
                background: b.on ? 'var(--chord-fill)' : '#171A21',
              }"
              @click="addPitch(b.midi)"
            />
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
