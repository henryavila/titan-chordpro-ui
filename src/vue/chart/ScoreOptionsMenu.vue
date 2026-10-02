<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import { TAB_RHYTHM_OPTIONS } from '../use/useTabRhythm'
import { downloadScoreFile } from './download-score'

const props = withDefaults(
  defineProps<{
    label: string
    view: 'tab' | 'score'
    tabAvailable: boolean
    rhythm: string
    noteNames: boolean
    zoom: number
    zoomLabel: string
    downloading?: boolean
    canEdit?: boolean
    canDelete?: boolean
    text?: string
    resolveScore?: (src: string) => string
    bytes?: Uint8Array | null
    getBytes?: () => Uint8Array | null | undefined
    fileType?: string
  }>(),
  { downloading: false, canEdit: false, canDelete: false },
)
const emit = defineEmits<{
  view: [view: 'tab' | 'score']
  rhythm: [value: string]
  notes: [value: boolean]
  zoom: [value: number]
  adjust: []
  remove: []
}>()

const open = ref(false)
const compact = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const sheetStyle = ref<Record<string, string>>({})
const panelPos = ref<Record<string, string>>({})
const rhythmOptions = [
  { value: 'default', label: 'Padrão do trecho' },
  ...TAB_RHYTHM_OPTIONS,
]
const zoomOptions = computed(() => [
  { value: 0, label: `Auto (${props.zoomLabel})` },
  ...[1.1, 1.3, 1.5, 2].map(value => ({ value, label: `${Math.round(value * 100)}%` })),
])
const optionsLabel = computed(() => `Opções de ${props.label}`)
const showRhythm = computed(() => props.view === 'tab' && props.tabAvailable)

function captureTheme() {
  const el = trigger.value
  if (!el) return
  const cs = getComputedStyle(el)
  const style: Record<string, string> = { fontFamily: cs.fontFamily }
  for (let i = 0; i < cs.length; i++) {
    const name = cs.item(i)
    if (!name.startsWith('--')) continue
    const value = cs.getPropertyValue(name).trim()
    if (value) style[name] = value
  }
  sheetStyle.value = style
}
function measureCompact() {
  compact.value = window.innerWidth < 640
}
async function place() {
  measureCompact()
  await nextTick()
  if (!open.value || compact.value) {
    panelPos.value = {}
    return
  }
  if (!trigger.value || !panel.value) return
  const t = trigger.value.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(320, vw - 16)
  const height = panel.value.offsetHeight
  let left = Math.min(Math.max(8, t.right - width), vw - width - 8)
  let top = t.bottom + 6
  if (top + height > vh - 8 && t.top - 6 - height >= 8) top = t.top - 6 - height
  else if (top + height > vh - 8) top = Math.max(8, vh - height - 8)
  panelPos.value = {
    top: `${top}px`,
    left: `${left}px`,
    right: 'auto',
    width: `${width}px`,
    maxHeight: `${Math.min(Math.max(height, 120), vh - 16)}px`,
  }
}
function close() {
  if (!open.value) return
  open.value = false
  panelPos.value = {}
  trigger.value?.focus()
}
async function toggle(event: Event) {
  event.stopPropagation()
  if (open.value) {
    close()
    return
  }
  captureTheme()
  measureCompact()
  open.value = true
  await place()
}
function pickView(next: 'tab' | 'score') {
  if (next === 'tab' && !props.tabAvailable) return
  emit('view', next)
}
async function onDownload(event: Event) {
  event.stopPropagation()
  if (!props.text) return
  await downloadScoreFile({
    text: props.text,
    resolveScore: props.resolveScore,
    bytes: props.getBytes?.() ?? props.bytes,
    contentType: props.fileType,
  })
  close()
}
function onAdjust() {
  emit('adjust')
  close()
}
function onRemove() {
  emit('remove')
  close()
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    event.stopPropagation()
    close()
  }
}
function onPointerdown(event: PointerEvent) {
  const node = event.target as Node | null
  if (open.value && node && !trigger.value?.contains(node) && !panel.value?.contains(node)) close()
}
function onResize() {
  if (open.value) void place()
}
watch(
  [open, panel, () => props.view, () => props.tabAvailable, () => props.canEdit, () => props.canDelete],
  () => { if (open.value) void place() },
)
onMounted(() => {
  document.addEventListener('pointerdown', onPointerdown)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', onPointerdown)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="titan-chordpro-score-more" @click.stop>
    <button
      ref="trigger"
      type="button"
      class="titan-chordpro-score-more-trigger"
      :aria-label="optionsLabel"
      :aria-expanded="open"
      aria-haspopup="dialog"
      title="Opções do trecho"
      @click="toggle"
    >
      <TitanChordproIcon name="ellipsis" :size="18" />
    </button>
    <Teleport to="body">
      <div
        v-if="open"
        class="titan-chordpro-score-sheet"
        :class="compact ? 'is-sheet' : 'is-menu'"
        :style="sheetStyle"
      >
        <div v-if="compact" class="titan-chordpro-scrim" @click="close" />
        <div
          ref="panel"
          class="titan-chordpro-score-more-card titan-chordpro-veil-2"
          :class="compact ? 'titan-chordpro-bottom-sheet' : 'titan-chordpro-score-more-popover'"
          :style="compact ? undefined : panelPos"
          role="dialog"
          aria-modal="true"
          :aria-label="optionsLabel"
        >
          <div class="titan-chordpro-score-more-head">
            <span>Opções do trecho</span>
            <button type="button" class="titan-chordpro-ghost" aria-label="Fechar opções" @click="close">
              <TitanChordproIcon name="x" :size="16" />
            </button>
          </div>
          <div class="titan-chordpro-reading is-dock" role="group" aria-label="Apresentação">
            <button type="button" :disabled="!tabAvailable" :aria-pressed="view === 'tab'" :class="{ 'is-on': view === 'tab' }" @click="pickView('tab')">TAB</button>
            <button type="button" :aria-pressed="view === 'score'" :class="{ 'is-on': view === 'score' }" @click="pickView('score')">Partitura</button>
          </div>
          <template v-if="showRhythm">
            <div class="titan-chordpro-insert-where">Ritmo da TAB</div>
            <div class="titan-chordpro-score-more-pick" role="group" aria-label="Ritmo da TAB">
              <button
                v-for="option in rhythmOptions"
                :key="option.value"
                type="button"
                class="titan-chordpro-score-zoom-option"
                :aria-label="option.label"
                :aria-pressed="rhythm === option.value"
                @click="emit('rhythm', String(option.value))"
              >
                <span>{{ option.label }}</span>
                <TitanChordproIcon v-if="rhythm === option.value" name="check" :size="16" />
              </button>
            </div>
          </template>
          <button
            type="button"
            class="titan-chordpro-surface-btn titan-chordpro-more-item"
            aria-label="Notas"
            :aria-pressed="noteNames ? 'true' : 'false'"
            :style="noteNames ? { borderColor: 'var(--chord-edge)', background: 'var(--chord-soft)' } : undefined"
            @click="emit('notes', !noteNames)"
          >
            <TitanChordproIcon name="eyeOff" :size="18" />
            <span class="titan-chordpro-more-copy">Notas</span>
            <span>{{ noteNames ? 'visíveis' : 'ocultas' }}</span>
          </button>
          <div class="titan-chordpro-insert-where">Zoom</div>
          <div class="titan-chordpro-score-more-pick" role="group" aria-label="Zoom do solo">
            <button
              v-for="option in zoomOptions"
              :key="option.value"
              type="button"
              class="titan-chordpro-score-zoom-option"
              :aria-pressed="zoom === option.value"
              @click="emit('zoom', option.value)"
            >
              <span>{{ option.label }}</span>
              <TitanChordproIcon v-if="zoom === option.value" name="check" :size="16" />
            </button>
          </div>
          <button
            type="button"
            class="titan-chordpro-surface-btn titan-chordpro-more-item"
            data-download-score
            :aria-busy="downloading || undefined"
            :aria-label="`Baixar ${label}`"
            @click="onDownload"
          >
            <TitanChordproIcon name="download" :size="18" />
            <span class="titan-chordpro-more-copy">Baixar {{ label }}</span>
            <span>arquivo original</span>
          </button>
          <button
            v-if="canEdit"
            type="button"
            class="titan-chordpro-surface-btn titan-chordpro-more-item"
            data-adjust-score
            @click="onAdjust"
          >
            <TitanChordproIcon name="pencil" :size="18" />
            <span class="titan-chordpro-more-copy">Ajustar trecho</span>
            <span>faixa e compassos</span>
          </button>
          <button
            v-if="canDelete"
            type="button"
            class="titan-chordpro-surface-btn titan-chordpro-more-item"
            data-remove-score
            @click="onRemove"
          >
            <TitanChordproIcon name="trash2" :size="18" />
            <span class="titan-chordpro-more-copy">Excluir trecho</span>
            <span>da cifra</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
