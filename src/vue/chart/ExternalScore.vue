<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { readScoreReference, scoreAutoScale } from '@henryavila/titan-chordpro-ui'
import type { model } from '@coderline/alphatab'
import type { ScoreReference } from '@henryavila/titan-chordpro-ui'
import { drawNotation, type NotationSystem } from './notation-renderer'
import { excerptTrack, hasTab, loadNotation } from './notation-loader'
import { useTabRhythm } from '../use/useTabRhythm'
import { useNoteNames } from '../use/useNoteNames'
import ScoreZoom from './ScoreZoom.vue'
import ScoreOptionsMenu from './ScoreOptionsMenu.vue'
import { downloadScoreFile } from './download-score'
import type { NoteNameFormat } from '../public'

const props = defineProps<{
  text: string
  blockGap: string
  canEdit?: boolean
  hideTitle?: boolean
  /** Editor preview always shows the authored default. */
  preview?: boolean
  preferredView?: 'tab' | 'score'
  theme?: 'light' | 'dark'
  noteNameFormat?: NoteNameFormat
  resolveScore?: (src: string) => string
}>()
const emit = defineEmits<{ editScore: []; viewChange: [view: 'tab' | 'score'] }>()
const host = ref<HTMLElement | null>(null)
const preference = useTabRhythm()
const noteNames = useNoteNames()
const localView = ref<'tab' | 'score'>('tab')
const view = computed<'tab' | 'score'>({
  get: () => {
    const requested = props.preview || props.canEdit ? localView.value : props.preferredView ?? localView.value
    return requested === 'tab' && !tabAvailable.value ? 'score' : requested
  },
  set: next => {
    localView.value = next
    if (!props.preview && !props.canEdit) emit('viewChange', next)
  },
})
const tabAvailable = ref(false)
const error = ref('')
const downloadError = ref('')
const downloading = ref(false)
const loading = ref(true)
const fileBytes = ref<Uint8Array | null>(null)
const fileType = ref('')
const label = computed(() => {
  try { return readScoreReference(props.text)?.name ?? 'Solo' } catch { return 'Solo' }
})
const zoom = ref(0) // 0 = automatic
const scale = ref(1.1)
const resolvedUrl = computed(() => {
  try {
    const reference = readScoreReference(props.text)
    return reference ? (props.resolveScore?.(reference.src) ?? reference.src) : ''
  } catch { return '' }
})
const zoomLabel = computed(() => `${Math.round(scoreAutoScale(host.value?.clientWidth || 320) * 100)}%`)
const noteLaneHeight = (system: NotationSystem) => `${(system.noteNames.reduce((max, name) => Math.max(max, name.row), 0) + 1) * 20}px`
let score: model.Score | null = null
let reference: ScoreReference | null = null
const systems = ref<NotationSystem[]>([])
let drawing = 0
let observer: ResizeObserver | null = null
let abort: AbortController | null = null
let generation = 0
let disposed = false
let resizeFrame = 0
let lastWidth = 0
async function redraw() {
  if (!score || !reference || !host.value || host.value.clientWidth <= 0) return
  const ticket = ++drawing
  const song = generation
  const colors = getComputedStyle(host.value)
  const value = (key: string, fallback: string) => colors.getPropertyValue(key).trim() || fallback
  scale.value = zoom.value || scoreAutoScale(host.value.clientWidth)
  try {
    const rendered = await drawNotation(score, reference, {
      mode: view.value, rhythm: props.preview ? reference.rhythm : preference.value.value ?? reference.rhythm, width: host.value.clientWidth || 320, scale: scale.value,
      noteNames: !props.preview && noteNames.value.value, noteNameFormat: props.noteNameFormat,
      palette: { ink: value('--text', '#13161d'), secondary: value('--text', '#13161d'),
        line: value('--muted', '#737b88'), accent: value('--chord', '#17713c') },
    })
    if (disposed || ticket !== drawing || song !== generation) return
    systems.value = rendered
    error.value = ''
    loading.value = false
  } catch (e) {
    if (disposed || ticket !== drawing || song !== generation) return
    error.value = e instanceof Error ? e.message : 'Não foi possível desenhar este solo.'
    loading.value = false
  }
}

async function load() {
  const ticket = ++generation
  abort?.abort()
  score = null
  reference = null
  systems.value = []
  error.value = ''
  downloadError.value = ''
  fileBytes.value = null
  fileType.value = ''
  loading.value = true
  const controller = new AbortController()
  abort = controller
  try {
    reference = readScoreReference(props.text)
    if (!reference) throw new Error('Referência do solo inválida.')
    const url = resolvedUrl.value
    const parsedUrl = new URL(url, document.baseURI)
    if (!['http:', 'https:', 'blob:'].includes(parsedUrl.protocol)) throw new Error('Use um endereço HTTP ou HTTPS para o arquivo.')
    const response = await fetch(parsedUrl.href, { signal: controller.signal })
    if (!response.ok) throw new Error('Não foi possível abrir o arquivo do solo.')
    const buffer = new Uint8Array(await response.arrayBuffer())
    if (disposed || ticket !== generation) return
    fileBytes.value = buffer
    fileType.value = response.headers.get('content-type') ?? ''
    const loaded = await loadNotation(buffer)
    if (disposed || ticket !== generation || !host.value) return
    score = loaded
    const track = excerptTrack(score, reference.track, reference.start, reference.end)
    tabAvailable.value = hasTab(track)
    scale.value = zoom.value || scoreAutoScale(host.value.clientWidth)
    await redraw()

  } catch (e) {
    if (disposed || ticket !== generation) return
    error.value = e instanceof Error ? e.message : 'Não foi possível abrir o solo.'
    loading.value = false
  }
}
async function onDownload() {
  if (downloading.value) return
  downloading.value = true
  downloadError.value = ''
  try {
    await downloadScoreFile({
      text: props.text,
      resolveScore: props.resolveScore,
      bytes: fileBytes.value,
      contentType: fileType.value,
    })
  } catch (e) {
    downloadError.value = e instanceof Error ? e.message : 'Não foi possível baixar o arquivo.'
  } finally {
    downloading.value = false
  }
}
watch([() => props.text, resolvedUrl], () => { localView.value = 'tab'; load() })
watch([view, zoom, preference.value, noteNames.value, () => props.theme, () => props.noteNameFormat], redraw, { flush: 'post' })
onMounted(() => {
  load()
  observer = new ResizeObserver(() => {
    const width = host.value?.clientWidth ?? 0
    if (width === lastWidth) return
    lastWidth = width
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => {
      redraw()
    })
  })
  if (host.value) observer.observe(host.value)
})
onUnmounted(() => { disposed = true; cancelAnimationFrame(resizeFrame); generation++; abort?.abort(); observer?.disconnect(); drawing++ })

const rhythm = computed(() => preference.value.value ?? 'default')
defineExpose({
  view,
  tabAvailable,
  zoom,
  zoomLabel,
  downloading,
  download: onDownload,
  fileBytes,
  fileType,
  rhythm,
  setRhythm: preference.set,
  noteNamesOn: computed(() => !!noteNames.value.value),
  setNoteNames: (value: boolean) => noteNames.set(value),
})
</script>

<template>
  <figure class="titan-chordpro-figure titan-chordpro-external-score" data-external-score :style="{ margin: `0 0 ${blockGap}` }">
    <figcaption v-if="preview || !hideTitle" class="titan-chordpro-figure-cap">
      <div v-if="!preview" class="titan-chordpro-score-heading">
        <span class="titan-chordpro-figure-kind">{{ label }}</span>
        <ScoreOptionsMenu
          :label="label"
          :view="view"
          :tab-available="tabAvailable"
          :rhythm="rhythm"
          :note-names="!!noteNames.value.value"
          :zoom="zoom"
          :zoom-label="zoomLabel"
          :downloading="downloading"
          :can-edit="canEdit"
          :text="text"
          :resolve-score="resolveScore"
          :bytes="fileBytes"
          :file-type="fileType"
          @view="view = $event"
          @rhythm="preference.set"
          @notes="noteNames.set"
          @zoom="zoom = $event"
          @adjust="emit('editScore')"
        />
      </div>
      <div v-else class="titan-chordpro-score-controls">
        <button v-for="option in (['tab', 'score'] as const)" :key="option" type="button" class="titan-chordpro-figure-btn"
          :disabled="option === 'tab' && !tabAvailable" :aria-pressed="view === option" @click="view = option">
          {{ option === 'tab' ? 'TAB' : 'Partitura' }}
        </button>
        <ScoreZoom v-model="zoom" :automatic-label="zoomLabel" />
      </div>
    </figcaption>
    <p v-if="loading && !error" role="status">Abrindo solo…</p>
    <p v-if="error" role="alert">{{ error }} <button type="button" @click="load">Tentar novamente</button></p>
    <p v-if="downloadError" role="alert">{{ downloadError }}</p>
    <p v-else-if="!loading && !tabAvailable">Este arquivo não traz posições nas cordas para exibir TAB.</p>
    <div class="titan-chordpro-notation-paper"><div ref="host" class="titan-chordpro-notation-systems">
      <div v-for="(system, i) in systems" :key="i" class="titan-chordpro-notation-system"
        :data-first-bar="system.first" :data-last-bar="system.last" :style="{ width: `${system.width}px` }">
        <div v-if="noteNames.value.value && !preview && system.noteNames.length" class="titan-chordpro-note-names"
          :style="{ width: `${system.width}px`, height: noteLaneHeight(system) }" :aria-label="view === 'tab' ? 'Notas da TAB' : 'Notas da partitura'">
          <span v-for="(name, n) in system.noteNames" :key="n" class="titan-chordpro-note-name" :style="{ left: `${name.x}px`, top: `${name.row * 20}px` }">{{ name.text }}</span>
        </div>
        <div v-html="system.content" />
      </div>
    </div></div>
  </figure>
</template>
