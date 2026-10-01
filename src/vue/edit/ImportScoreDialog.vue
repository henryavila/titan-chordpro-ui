<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { readScoreReference, writeScoreReference, isTabRhythm } from '@henryavila/titan-chordpro-ui'
import { excerptTrack, loadNotation } from '../chart/notation-loader'
import type { model } from '@coderline/alphatab'
import type { TabRhythm } from '@henryavila/titan-chordpro-ui'
import { TAB_RHYTHM_OPTIONS } from '../use/useTabRhythm'
import ScoreChoice from '../chart/ScoreChoice.vue'
import ScoreBarRange from './ScoreBarRange.vue'
import CpvIcon from '../icon/CpvIcon.vue'
import ExternalScore from '../chart/ExternalScore.vue'

const props = defineProps<{
  text?: string
  theme?: 'light' | 'dark'
  resolveScore?: (src: string) => string
  uploadScore?: (file: File) => Promise<{ ref: string }>
}>()
const emit = defineEmits<{ save: [text: string]; close: [] }>()
const dialog = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const src = ref('')
const name = ref('Solo')
const track = ref(1)
const start = ref(1)
const end = ref(1)
const rhythm = ref<TabRhythm>('base')
const file = ref<File | null>(null)
const previewUrl = ref('')
const tracks = ref<Array<{ id: number; name: string }>>([])
const total = ref(0)
const error = ref('')
const busy = ref(false)
const dragDepth = ref(0)
const dragging = computed(() => dragDepth.value > 0 && !!props.uploadScore && !busy.value)
const score = shallowRef<model.Score | null>(null)
const trackOptions = computed(() => tracks.value.map(t => ({ value: t.id, label: t.name })))
const fileName = computed(() => file.value?.name || src.value.split('/').at(-1) || 'Arquivo musical')
function changeRange(first: number, last: number) { start.value = first; end.value = last }
let generation = 0
let controller: AbortController | null = null
let previousFocus: HTMLElement | null = null
const preview = computed(() => {
  if (!score.value || !previewUrl.value || start.value < 1 || end.value < start.value || end.value > total.value) return ''
  try { return writeScoreReference({ src: previewUrl.value, track: track.value, start: start.value, end: end.value, rhythm: rhythm.value, name: name.value.trim() }) } catch { return '' }
})
function clear() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  score.value = null
  tracks.value = []
  total.value = 0
}
async function openFile(chosen?: File) {
  const ticket = ++generation
  controller?.abort()
  controller = new AbortController()
  clear()
  file.value = chosen ?? null
  busy.value = true
  error.value = ''
  try {
    let bytes: ArrayBuffer
    if (chosen) bytes = await chosen.arrayBuffer()
    else {
      const url = new URL(props.resolveScore?.(src.value.trim()) ?? src.value.trim(), document.baseURI)
      if (!['http:', 'https:', 'blob:'].includes(url.protocol)) throw new Error('Use um endereço HTTP ou HTTPS.')
      const response = await fetch(url.href, { signal: controller.signal })
      if (!response.ok) throw new Error('Não foi possível abrir o arquivo.')
      bytes = await response.arrayBuffer()
    }
    const loaded = await loadNotation(new Uint8Array(bytes))
    if (ticket !== generation) return
    if (!loaded.tracks.length || !loaded.masterBars.length) throw new Error('O arquivo não contém uma partitura.')
    score.value = loaded
    total.value = loaded.masterBars.length
    tracks.value = loaded.tracks.map((t, i) => ({ id: i + 1, name: t.name || `Faixa ${i + 1}` }))
    if (!props.text || chosen) { track.value = 1; start.value = 1; end.value = Math.min(4, total.value) }
    previewUrl.value = URL.createObjectURL(new Blob([bytes]))
  } catch (e) {
    if (ticket === generation) error.value = e instanceof Error ? e.message : 'Não foi possível abrir o arquivo.'
  } finally { if (ticket === generation) busy.value = false }
}
function selectFile(event: Event) {
  const input = event.target as HTMLInputElement
  chooseFiles(Array.from(input.files ?? []))
  input.value = ''
}
function chooseFiles(files: File[]) {
  if (!props.uploadScore || busy.value || !files.length) return
  if (files.length !== 1) {
    error.value = 'Solte apenas um arquivo musical por vez.'
    return
  }
  const chosen = files[0]
  if (!chosen) return
  if (!/\.(gp[345]?|gpx|xml|musicxml|mxl)$/i.test(chosen.name)) {
    error.value = 'Escolha um arquivo Guitar Pro ou MusicXML (GP, GPX, GP3–5, XML, MusicXML ou MXL).'
    return
  }
  void openFile(chosen)
}
function dragEnter(event: DragEvent) {
  if (props.uploadScore && !busy.value && event.dataTransfer?.types.includes('Files')) dragDepth.value++
}
function dragOver(event: DragEvent) {
  if (event.dataTransfer) event.dataTransfer.dropEffect = props.uploadScore && !busy.value ? 'copy' : 'none'
}
function dropFile(event: DragEvent) {
  dragDepth.value = 0
  chooseFiles(Array.from(event.dataTransfer?.files ?? []))
}
async function save() {
  if (!score.value || busy.value) return
  error.value = ''
  busy.value = true
  const ticket = generation
  try {
    excerptTrack(score.value, track.value, start.value, end.value)
    // Validate before uploading, so an invalid interval never stores a file.
    writeScoreReference({ src: src.value || file.value?.name || '', track: track.value, start: start.value, end: end.value, rhythm: rhythm.value, name: name.value.trim() })
    const reference = file.value ? (await props.uploadScore?.(file.value))?.ref : src.value.trim()
    if (!reference?.trim()) throw new Error('Não foi possível guardar o arquivo do solo.')
    if (ticket !== generation) return
    emit('save', writeScoreReference({ src: reference.trim(), track: track.value, start: start.value, end: end.value, rhythm: rhythm.value, name: name.value.trim() }))
  } catch (e) { if (ticket === generation) error.value = e instanceof Error ? e.message : 'Não foi possível guardar o solo.' }
  finally { if (ticket === generation) busy.value = false }
}
function keydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !busy.value) emit('close')
  if (e.key !== 'Tab') return
  const elements = Array.from(dialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]') ?? []).filter(el => el.tabIndex >= 0 && !el.hidden && el.getClientRects().length > 0)
  const first = elements[0]; const last = elements.at(-1)
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
}
onMounted(() => {
  previousFocus = document.activeElement as HTMLElement | null
  dialog.value?.querySelector<HTMLButtonElement>('button')?.focus()
  if (props.text) {
    try {
      const value = readScoreReference(props.text)
      if (value) { name.value = value.name ?? 'Solo'; rhythm.value = value.rhythm ?? 'extended'; src.value = value.src; track.value = value.track; start.value = value.start; end.value = value.end ?? 1; openFile().then(() => { if (value.end === undefined) end.value = total.value || 1 }) }
    } catch (e) { error.value = String(e) }
  }
})
onUnmounted(() => { generation++; controller?.abort(); clear(); previousFocus?.focus() })
</script>

<template>
  <div class="cpv-modal cpv-import-score-modal" @keydown.stop="keydown" @dragover.prevent @drop.prevent>
    <div class="cpv-scrim" />
    <form ref="dialog" class="cpv-veil-2 cpv-modal-card cpv-import-score" role="dialog" aria-modal="true" aria-label="Solo de Guitar Pro ou MusicXML" @submit.prevent="save">
      <header class="cpv-import-score-head">
        <div><span class="cpv-modal-kicker">Guitar Pro · MusicXML</span><h2>{{ text ? 'Ajustar trecho' : 'Importar solo' }}</h2><p>Escolha o que entra na cifra e confira a prévia.</p></div>
        <button type="button" class="cpv-import-score-close" aria-label="Fechar importação" :disabled="busy" @click="emit('close')"><CpvIcon name="x" :size="20" /></button>
      </header>
      <div class="cpv-import-score-body">
        <fieldset class="cpv-import-score-controls" :disabled="busy">
          <div class="cpv-import-score-file" :class="{ 'cpv-import-score-file--drop': uploadScore, 'cpv-import-score-file--dragging': dragging }"
            @dragenter.prevent="dragEnter" @dragover.prevent.stop="dragOver"
            @dragleave.prevent="dragDepth = Math.max(0, dragDepth - 1)" @drop.prevent.stop="dropFile">
            <span class="cpv-import-score-file-icon"><CpvIcon name="fileInput" :size="22" /></span>
            <div><strong>{{ file || src ? fileName : 'Seu arquivo musical' }}</strong><p>{{ total ? `${total} compassos disponíveis` : 'GP, GPX, GP3–5, XML ou MXL' }}</p></div>
            <input v-if="uploadScore" ref="fileInput" type="file" hidden accept=".gp,.gp3,.gp4,.gp5,.gpx,.xml,.musicxml,.mxl" @change="selectFile">
            <button v-if="uploadScore" type="button" class="cpv-modal-btn" @click="fileInput?.click()">{{ file || src ? 'Trocar arquivo' : 'Escolher arquivo' }}</button>
            <p v-if="uploadScore" class="cpv-import-score-drop-hint" role="status">{{ dragging ? 'Solte o arquivo aqui' : 'Ou arraste e solte o arquivo aqui' }}</p>
          </div>
          <template v-if="tracks.length">
            <label class="cpv-import-score-field"><span class="cpv-import-score-label">Nome do trecho</span>
              <input v-model="name" class="cpv-import-score-name" aria-label="Nome do trecho" required placeholder="Solo">
            </label>
            <div class="cpv-import-score-field">
              <span class="cpv-import-score-label">Instrumento / faixa</span>
              <ScoreChoice :model-value="track" label="Faixa" caption="" :options="trackOptions" @update:model-value="track = Number($event)" />
            </div>
            <ScoreBarRange :start="start" :end="end" :total="total" @change="changeRange" />
            <div class="cpv-import-score-field">
              <span class="cpv-import-score-label">Ritmo padrão da TAB</span>
              <ScoreChoice :model-value="rhythm" label="Ritmo padrão da TAB" caption="" :options="TAB_RHYTHM_OPTIONS"
                @update:model-value="value => { if (isTabRhythm(value)) rhythm = value }" />
              <p>Quem lê pode escolher outro visual, sem alterar este padrão.</p>
            </div>
          </template>
          <p v-if="busy" class="cpv-import-score-status" role="status">Abrindo ou guardando arquivo…</p>
          <p v-if="error" class="cpv-import-score-error" role="alert">{{ error }}</p>
        </fieldset>
        <section class="cpv-import-score-preview" aria-label="Prévia do trecho">
          <div class="cpv-import-score-preview-head"><span class="cpv-modal-kicker">Prévia do trecho</span><span v-if="preview">{{ start === end ? `Compasso ${start}` : `Compassos ${start}–${end}` }}</span></div>
          <ExternalScore v-if="preview" :text="preview" preview block-gap="0" :theme="theme" />
          <div v-else class="cpv-import-score-empty"><CpvIcon name="fileInput" :size="32" /><p>{{ busy ? 'Preparando a prévia…' : 'Abra um arquivo para visualizar e selecionar seu trecho.' }}</p></div>
        </section>
      </div>
      <footer class="cpv-import-score-actions">
        <span v-if="preview">{{ end - start + 1 }} {{ end === start ? 'compasso selecionado' : 'compassos selecionados' }}</span>
        <button type="button" class="cpv-modal-btn" :disabled="busy" @click="emit('close')">Cancelar</button>
        <button type="submit" class="cpv-modal-btn cpv-modal-btn--primary" :disabled="busy || !preview">Salvar trecho na cifra</button>
      </footer>
    </form>
  </div>
</template>
