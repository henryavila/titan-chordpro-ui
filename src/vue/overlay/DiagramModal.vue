<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { drawDiagram, resolveDiagram, type ChordDefine } from '@henryavila/titan-chordpro-ui'
import CpvIcon from '../icon/CpvIcon.vue'

/** Movement below this stays a tap, so the instrument buttons still click. */
const DRAG_SLOP_PX = 12
/** Release past this and the sheet leaves. Under it, the sheet snaps back. */
const DISMISS_PX = 96
/** Blur on the chart behind the sheet. Full at the first movement, gone at DISMISS_PX. */
const BLUR_MAX_PX = 22
const EXIT_MS = 200

export type DiagramInstrumentChoice = 'guitar' | 'ukulele' | 'piano'

const props = defineProps<{
  shapeName: string
  concert: string
  capoFret: number
  instrument: DiagramInstrumentChoice
  defines: ChordDefine[]
}>()

const emit = defineEmits<{
  close: []
  instrument: [value: DiagramInstrumentChoice]
}>()

const instruments = [
  { id: 'guitar', label: 'Violão' },
  { id: 'ukulele', label: 'Ukulele' },
  { id: 'piano', label: 'Piano' },
] as const

const token = computed(() => {
  const shape = props.shapeName || props.concert
  return props.instrument === 'piano' ? props.concert || shape : shape
})

const playable = computed(() => token.value)

const resolved = computed(() =>
  resolveDiagram({
    token: token.value,
    instrument: props.instrument,
    overrides: props.defines,
  }),
)

const svg = computed(() => {
  const hit = resolved.value
  if (hit.class !== 'hit') return ''
  const drawn = drawDiagram({
    instrument: props.instrument,
    voicing: hit.voicing,
    capoFret: props.instrument === 'piano' ? 0 : props.capoFret,
    token: token.value,
  })
  return drawn.svg
})

const sounds = computed(
  () => props.instrument !== 'piano' && props.capoFret > 0 && props.concert && props.concert !== playable.value,
)

const panelRef = ref<HTMLElement | null>(null)
const dragY = ref(0)
const dragging = ref(false)
const scrimOpacity = computed(() => Math.max(0, 1 - dragY.value / 220))
const scrimBlur = computed(() => {
  if (dragY.value <= 0) return 0
  const gone = Math.min(1, dragY.value / DISMISS_PX)
  return BLUR_MAX_PX * (1 - gone)
})

let pointerId = -1
let originX = 0
let originY = 0
let tracking = false
let swallowClick = false
let exitTimer = 0

function detachDrag() {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
}

function onDragDown(e: PointerEvent) {
  if (e.button !== 0) return
  tracking = true
  dragging.value = false
  pointerId = e.pointerId
  originX = e.clientX
  originY = e.clientY
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
  window.addEventListener('pointercancel', onDragEnd)
  e.stopPropagation()
}

function onDragMove(e: PointerEvent) {
  if (!tracking || e.pointerId !== pointerId) return
  const dx = e.clientX - originX
  const dy = e.clientY - originY
  if (!dragging.value) {
    if (Math.hypot(dx, dy) < DRAG_SLOP_PX) return
    if (dy <= 0 || Math.abs(dx) > dy) {
      tracking = false
      detachDrag()
      return
    }
    dragging.value = true
    swallowClick = true
  }
  dragY.value = Math.max(0, dy)
}

function onDragEnd(e: PointerEvent) {
  if (e.pointerId !== pointerId) return
  const cancelled = e.type === 'pointercancel'
  detachDrag()
  if (!tracking) return
  tracking = false
  if (!dragging.value) return
  const y = dragY.value
  dragging.value = false
  if (!cancelled && y >= DISMISS_PX) {
    const h = panelRef.value?.clientHeight || 0
    dragY.value = h > DISMISS_PX ? h : 640
    window.clearTimeout(exitTimer)
    exitTimer = window.setTimeout(() => emit('close'), EXIT_MS)
    return
  }
  dragY.value = 0
  window.setTimeout(() => {
    swallowClick = false
  }, 400)
}

function onDragClick(e: MouseEvent) {
  if (!swallowClick) return
  swallowClick = false
  e.preventDefault()
  e.stopPropagation()
}

onBeforeUnmount(() => {
  detachDrag()
  window.clearTimeout(exitTimer)
})
</script>

<template>
  <div
    class="cpv-diagram"
    data-diagram-modal
    :class="{ 'is-dragging': dragging }"
    :style="{ '--diagram-scrim': String(scrimOpacity), '--diagram-blur': `${scrimBlur}px` }"
  >
    <div class="cpv-diagram-blur" data-diagram-blur />
    <div class="cpv-diagram-scrim" data-diagram-scrim @click="emit('close')" />
    <div
      ref="panelRef"
      class="cpv-diagram-panel"
      data-diagram-panel
      role="dialog"
      aria-modal="true"
      aria-labelledby="cpv-diagram-title"
      :style="dragY > 0 ? { transform: `translate3d(0, ${dragY}px, 0)` } : undefined"
      @pointerdown="onDragDown"
      @click.capture="onDragClick"
      @click.stop
    >
      <div class="cpv-diagram-grab" data-diagram-grab aria-hidden="true">
        <CpvIcon name="chevronDown" :size="22" />
      </div>
      <div class="cpv-diagram-stage" data-diagram-stage>
        <div
          v-if="svg"
          class="cpv-diagram-draw"
          data-diagram-draw
          :data-diagram-kind="instrument"
          v-html="svg"
        />
        <p v-else class="cpv-diagram-miss" data-diagram-miss>Sem forma neste instrumento</p>
      </div>

      <header class="cpv-diagram-head">
        <div>
          <h2 id="cpv-diagram-title" data-diagram-name>{{ playable }}</h2>
          <p v-if="sounds" data-diagram-sounds>soa {{ concert }}</p>
        </div>
        <button type="button" class="cpv-diagram-close" data-diagram-close aria-label="Fechar" @click="emit('close')">
          <CpvIcon name="x" :size="18" />
        </button>
      </header>

      <div class="cpv-diagram-instruments" role="group" aria-label="Instrumento">
        <button
          v-for="item in instruments"
          :key="item.id"
          type="button"
          class="cpv-diagram-instrument"
          :data-diagram-instrument="item.id"
          :aria-pressed="instrument === item.id"
          @click="emit('instrument', item.id)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cpv-diagram {
  position: absolute;
  inset: 0;
  z-index: 40;
}
.cpv-diagram-blur {
  position: absolute;
  inset: 0;
  pointer-events: none;
  backdrop-filter: blur(var(--diagram-blur, 0px));
  -webkit-backdrop-filter: blur(var(--diagram-blur, 0px));
  transition: backdrop-filter 200ms ease, -webkit-backdrop-filter 200ms ease;
}
.cpv-diagram-scrim {
  position: absolute;
  inset: 0;
  background: var(--scrim);
  opacity: var(--diagram-scrim, 1);
  transition: opacity 200ms ease;
}
.cpv-diagram.is-dragging .cpv-diagram-blur,
.cpv-diagram.is-dragging .cpv-diagram-scrim {
  transition: none;
}
.cpv-diagram-panel {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--canvas);
  color: var(--text);
  touch-action: none;
  user-select: none;
  transition: transform 200ms ease;
}
.cpv-diagram.is-dragging .cpv-diagram-panel {
  transition: none;
}
.cpv-diagram-grab {
  position: absolute;
  top: 4px;
  left: 0;
  right: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  color: var(--muted);
  pointer-events: none;
}
.cpv-diagram-stage {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 72px 12px 60px;
  container-type: size;
}
.cpv-diagram-draw {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: var(--text);
}
/* One octave stretched to the stage width reads as a banner on a tablet. */
.cpv-diagram-draw[data-diagram-kind='piano'] {
  width: min(100cqi, 32rem, calc(100cqh * 1.75));
  height: auto;
  aspect-ratio: 126 / 72;
  max-height: 100%;
}
.cpv-diagram-draw :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}
.cpv-diagram-head {
  position: absolute;
  top: 30px;
  left: 14px;
  right: 14px;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}
.cpv-diagram-head h2 {
  margin: 0;
  font-family: 'Space Mono', ui-monospace, monospace;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--chord);
}
.cpv-diagram-head p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
}
.cpv-diagram-close {
  pointer-events: auto;
  flex: none;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  padding: 0;
  cursor: pointer;
}
.cpv-diagram-miss {
  margin: 0;
  font-size: 18px;
  color: var(--muted);
}
.cpv-diagram-instruments {
  position: absolute;
  left: 14px;
  bottom: 12px;
  z-index: 1;
  display: flex;
  gap: 6px;
}
.cpv-diagram-instrument {
  border: 0;
  border-radius: 999px;
  background: var(--veil-2);
  color: var(--muted);
  font: inherit;
  font-size: 13px;
  line-height: 1;
  padding: 6px 10px;
  cursor: pointer;
}
.cpv-diagram-instrument[aria-pressed='true'] {
  background: var(--chord);
  color: var(--chord-ink);
}
</style>
