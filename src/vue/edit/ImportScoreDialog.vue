<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { readScoreReference, writeScoreReference } from '@henryavila/titan-chordpro-ui'
import { excerptTrack, loadNotation } from '../chart/notation-loader'
import type { model } from '@coderline/alphatab'
import ExternalScore from '../chart/ExternalScore.vue'

const props = defineProps<{
  text?: string
  theme?: 'light' | 'dark'
  resolveScore?: (src: string) => string
  uploadScore?: (file: File) => Promise<{ ref: string }>
}>()
const emit = defineEmits<{ save: [text: string]; close: [] }>()
const dialog = ref<HTMLElement | null>(null)
const src = ref('')
const track = ref(1)
const start = ref(1)
const end = ref(1)
const file = ref<File | null>(null)
const previewUrl = ref('')
const tracks = ref<Array<{ id: number; name: string }>>([])
const total = ref(0)
const error = ref('')
const busy = ref(false)
const score = shallowRef<model.Score | null>(null)
let generation = 0
let controller: AbortController | null = null
let previousFocus: HTMLElement | null = null
const preview = computed(() => {
  if (!score.value || !previewUrl.value || start.value < 1 || end.value < start.value || end.value > total.value) return ''
  try { return writeScoreReference({ src: previewUrl.value, track: track.value, start: start.value, end: end.value }) } catch { return '' }
})
function clear() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  score.value = null
  tracks.value = []
}
function changed() { generation++; controller?.abort(); clear(); file.value = null; busy.value = false }
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
  const chosen = (event.target as HTMLInputElement).files?.[0]
  if (chosen) openFile(chosen)
}
async function save() {
  if (!score.value || busy.value) return
  error.value = ''
  busy.value = true
  const ticket = generation
  try {
    excerptTrack(score.value, track.value, start.value, end.value)
    // Validate before uploading, so an invalid interval never stores a file.
    writeScoreReference({ src: src.value || file.value?.name || '', track: track.value, start: start.value, end: end.value })
    const reference = file.value ? (await props.uploadScore?.(file.value))?.ref : src.value.trim()
    if (!reference?.trim()) throw new Error('Não foi possível guardar o arquivo do solo.')
    if (ticket !== generation) return
    emit('save', writeScoreReference({ src: reference.trim(), track: track.value, start: start.value, end: end.value }))
  } catch (e) { if (ticket === generation) error.value = e instanceof Error ? e.message : 'Não foi possível guardar o solo.' }
  finally { if (ticket === generation) busy.value = false }
}
function keydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !busy.value) emit('close')
  if (e.key !== 'Tab') return
  const elements = Array.from(dialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? [])
  const first = elements[0]; const last = elements.at(-1)
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
}
onMounted(() => {
  previousFocus = document.activeElement as HTMLElement | null
  dialog.value?.querySelector<HTMLInputElement>('input')?.focus()
  if (props.text) {
    try {
      const value = readScoreReference(props.text)
      if (value) { src.value = value.src; track.value = value.track; start.value = value.start; end.value = value.end ?? 1; openFile().then(() => { if (value.end === undefined) end.value = Math.min(4, total.value) }) }
    } catch (e) { error.value = String(e) }
  }
})
onUnmounted(() => { generation++; controller?.abort(); clear(); previousFocus?.focus() })
</script>

<template>
  <div class="cpv-modal" style="align-items:center;padding:16px" @keydown.stop="keydown">
    <div class="cpv-scrim" />
    <form ref="dialog" class="cpv-veil-2 cpv-modal-card cpv-import-score" role="dialog" aria-modal="true" aria-label="Solo de Guitar Pro ou MusicXML" @submit.prevent="save">
      <h2>Solo de Guitar Pro ou MusicXML</h2>
      <p>Abra o arquivo, escolha a faixa e os compassos que entram na cifra.</p>
      <fieldset :disabled="busy">
        <label>Endereço do arquivo <input v-model="src" aria-label="Endereço do arquivo" type="text" @input="changed"></label>
        <button type="button" class="cpv-modal-btn" :disabled="!src.trim()" @click="openFile()">Abrir arquivo</button>
        <label v-if="uploadScore">Ou escolha no aparelho <input type="file" accept=".gp,.gp3,.gp4,.gp5,.gpx,.xml,.musicxml,.mxl" @change="selectFile"></label>
        <template v-if="tracks.length">
          <p>{{ total }} compassos no arquivo. Só o intervalo escolhido entra na cifra.</p>
          <label>Faixa <select v-model.number="track" aria-label="Faixa"><option v-for="t in tracks" :key="t.id" :value="t.id">{{ t.name }}</option></select></label>
          <label>Primeiro compasso <input v-model.number="start" aria-label="Primeiro compasso" type="number" min="1" :max="total" required></label>
          <label>Último compasso <input v-model.number="end" aria-label="Último compasso" type="number" :min="start" :max="total" required></label>
        </template>
      </fieldset>
      <p v-if="busy" role="status">Abrindo ou guardando arquivo…</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <ExternalScore v-if="preview" :text="preview" block-gap="12px" :theme="theme" />
      <div class="cpv-import-score-actions">
        <button type="button" class="cpv-modal-btn" :disabled="busy" @click="emit('close')">Cancelar</button>
        <button type="submit" class="cpv-modal-btn cpv-modal-btn--primary" :disabled="busy || !preview">Salvar trecho na cifra</button>
      </div>
    </form>
  </div>
</template>
