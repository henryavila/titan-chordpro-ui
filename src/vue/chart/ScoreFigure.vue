<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { parseScore } from 'titan-chordpro-ui'
import { drawScore, loadVex, vexNow } from '../edit/score-draw'

const props = withDefaults(
  defineProps<{
    /** The whole `{sos}…{eos}` block, as it stands in the file. */
    text: string
    blockGap: string
    canEdit?: boolean
    /** Only to invalidate the drawing: the colours are read from the CSS vars. */
    theme?: 'light' | 'dark'
  }>(),
  { canEdit: false, theme: 'dark' },
)

const emit = defineEmits<{ editScore: [] }>()

const host = ref<HTMLElement | null>(null)
const view = ref<'score' | 'tab' | 'both'>('both')
const ready = ref(!!vexNow())
let ro: ResizeObserver | null = null
let sig = ''

const parsed = computed(() => parseScore(props.text))
const kind = computed(() =>
  view.value === 'tab' ? 'Tablatura' : view.value === 'score' ? 'Partitura' : 'Partitura + TAB',
)
const meta = computed(() => {
  const m = parsed.value.meta
  return [m.key ? `tom de ${m.key}` : '', m.tempo ? `${m.tempo} BPM` : ''].filter(Boolean).join(' · ')
})

/** Redraw only when the picture changes: the SVG is rebuilt whole each time. */
function draw() {
  const el = host.value
  if (!el || !ready.value) return
  const w = Math.max(300, (el.clientWidth || 320) - 8)
  // The engraver paints with explicit colours, so the theme is part of what
  // the picture IS: leaving it out of the signature kept a dark-theme staff on
  // a light chart until something else happened to move.
  const next = `${props.text}|${view.value}|${w}|${props.theme}`
  if (next === sig) return
  sig = next
  const cs = getComputedStyle(el)
  const varOf = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  try {
    drawScore(el, parsed.value.notes, {
      view: view.value,
      time: parsed.value.meta.time,
      minWidth: w,
      ink: cs.color || varOf('--text', '#EAECF2'),
      accent: varOf('--chord', '#84DFA6'),
      dim: varOf('--muted', '#888F9E'),
    })
  } catch {
    // The block still reads without the engraver: fall back to the source,
    // which is the score. A drawing that throws must not take the chart down.
    el.replaceChildren()
    sig = ''
    ready.value = false
  }
}

watch([() => props.text, view, ready, () => props.theme], () => draw())

onMounted(() => {
  loadVex().then((v) => {
    ready.value = !!v
    draw()
  })
  const el = host.value
  if (el && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => draw())
    ro.observe(el)
  }
})
onUnmounted(() => ro?.disconnect())
</script>

<template>
  <figure
    class="cpv-figure"
    data-score
    :style="{ margin: `0 0 ${blockGap}`, padding: '12px 12px 10px' }"
  >
    <div ref="host" class="cpv-score-host" />
    <!-- Without the engraver the block still reads: the source is the score. -->
    <div v-if="!ready" class="cpv-score-body">{{ text }}</div>
    <figcaption class="cpv-figure-cap">
      <span class="cpv-figure-kind">{{ kind }}</span>
      <span class="cpv-figure-meta">{{ meta }}</span>
      <button
        v-for="v in ([['score', 'Pauta'], ['tab', 'TAB'], ['both', 'Ambos']] as const)"
        :key="v[0]"
        class="cpv-figure-btn"
        type="button"
        :aria-pressed="view === v[0]"
        :style="{
          borderColor: view === v[0] ? 'var(--chord-edge)' : 'var(--line)',
          background: view === v[0] ? 'var(--chord-soft)' : 'transparent',
          color: view === v[0] ? 'var(--chord)' : 'var(--muted)',
        }"
        @click="view = v[0]"
      >{{ v[1] }}</button>
      <button v-if="canEdit" class="cpv-figure-btn cpv-figure-btn--go" type="button" @click="emit('editScore')">Editar</button>
    </figcaption>
  </figure>
</template>
