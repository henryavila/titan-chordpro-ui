<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { OFFLINE_CIFRACLUB_LINE, readMeta, type ChartMeta, type KeyRewriteOffer } from '@henryavila/titan-chordpro-ui'
import TitanChordproIconButton from '../ui/TitanChordproIconButton.vue'
import { BLANK_NOTE } from './ficha/blank-chart'
import ChartFicha from './ficha/ChartFicha.vue'
import ChartImport from './ficha/ChartImport.vue'
import type { ChartOrigin } from './ficha/origins'
import type { FichaFrom, FichaOpen } from './ficha/types'

/**
 * A song with no chart is not a dead end: whoever may write for everyone starts
 * here. Importing is the normal way in; blank is for whoever already has it all
 * in their head. Both come out at the same details form and the same editor.
 */

const props = withDefaults(
  defineProps<{
    compact: boolean
    /**
     * Fetches the page behind a link. The browser cannot reach the site from
     * inside the viewer, so this is the host's backend — without it, the Link
     * tab says so instead of pretending.
     */
    fetchChart?: (url: string) => Promise<string>
    /**
     * Host fetch of a YouTube watch page (HTML) or a ready `MM:SS` duration.
     * Used after Cifra Club import when `{x_titan_youtube:}` is present.
     */
    fetchYoutubeDuration?: (videoId: string) => Promise<string>
    /** When false, Cifra Club is marked and fetch is refused. */
    online?: boolean
    /** Reads a PDF that has text. Without it, PDFs are refused up front. */
    readPdf?: (file: File) => Promise<string>
    /**
     * Where the flow opens: at the sources, straight at a blank chart, or at
     * the details of a chart already in hand.
     */
    start?: 'import' | 'blank' | 'ficha'
    initialSource?: string
    initialNote?: string
  }>(),
  { start: 'import', initialSource: '', initialNote: '', online: true },
)
const emit = defineEmits<{ close: []; commit: [source: string] }>()

const step = ref<'import' | 'ficha'>(props.start === 'import' ? 'import' : 'ficha')
const tab = ref<ChartOrigin>('url')
const err = ref('')
const errHint = ref('')
const note = ref(props.start === 'blank' ? BLANK_NOTE : props.initialNote)
const from = ref<FichaFrom>(props.start === 'blank' ? 'blank' : props.start === 'ficha' ? 'save' : 'url')
const url = ref('')
const pasted = ref('')
const source = ref(props.initialSource)
const meta = ref<ChartMeta>({ ...readMeta(props.initialSource) })
const keyEdit = ref(!String(readMeta(props.initialSource).key ?? '').trim())
const keyRewrite = ref<KeyRewriteOffer | null>(null)
const importEl = ref<{ focusUrl: () => void } | null>(null)

const netOk = computed(() => props.online !== false)
const label = computed(() => {
  if (step.value === 'import') return 'Importar cifra'
  if (from.value === 'blank') return 'Cifra em branco'
  if (from.value === 'save') return 'Falta identificar'
  return 'Identificação'
})
const headline = computed(() => {
  if (step.value !== 'import') return ''
  if (tab.value === 'url') return 'Trazer do Cifra Club'
  if (tab.value === 'file') return 'Abrir um arquivo'
  return 'Colar a cifra'
})
const lede = computed(() => {
  if (tab.value === 'url')
    return netOk.value
      ? 'Cole o link da página. O Titan monta a cifra e pede o que o site não traz.'
      : OFFLINE_CIFRACLUB_LINE
  if (tab.value === 'file') return 'ChordPro, OnSong ou acordes sobre a letra. Arraste ou toque para escolher.'
  return 'Cole ChordPro, OnSong ou a cifra com acordes sobre a letra.'
})

const geom = computed(() =>
  props.compact
    ? { align: 'flex-end', wrapPad: '0', max: '100%', maxH: '92%', pad: '18px 16px calc(18px + env(safe-area-inset-bottom))', radius: '22px 22px 0 0', cols: 'minmax(0,1fr)', titleSize: '18px', textH: '150px' }
    : { align: 'center', wrapPad: '20px', max: step.value === 'ficha' ? '480px' : '420px', maxH: step.value === 'ficha' ? '92%' : '86%', pad: '20px 18px 16px', radius: '20px', cols: 'minmax(0,1fr) minmax(0,1fr)', titleSize: '20px', textH: '160px' },
)

function onOpen(payload: FichaOpen) {
  source.value = payload.source
  meta.value = { ...payload.meta }
  keyEdit.value = payload.keyEdit
  keyRewrite.value = payload.keyRewrite
  from.value = payload.from
  note.value = payload.note
  step.value = 'ficha'
}

function back() {
  if (from.value === 'blank' || from.value === 'save') {
    emit('close')
    return
  }
  step.value = 'import'
  tab.value = from.value === 'url' ? 'url' : from.value === 'arquivo' ? 'file' : 'text'
  err.value = ''
}

onMounted(() => {
  if (step.value === 'import' && tab.value === 'url') importEl.value?.focusUrl()
})
</script>

<template>
  <div
    :style="{ alignItems: geom.align, padding: geom.wrapPad }"
    style="position:absolute;inset:0;z-index:40;display:flex;justify-content:center;"
  >
    <div class="titan-chordpro-scrim" @click="emit('close')" />
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nova cifra"
      data-new-chart
      :style="{ maxWidth: geom.max, maxHeight: geom.maxH, padding: geom.pad, borderRadius: geom.radius, background: 'var(--canvas)' }"
      style="position:relative;width:100%;overflow-y:auto;overscroll-behavior:contain;border:1px solid var(--line);box-shadow:var(--shadow);display:flex;flex-direction:column;gap:14px;animation:titan-chordpro-rise .2s ease-out;"
    >
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div style="display:flex;flex-direction:column;gap:6px;min-width:0;">
          <span class="titan-chordpro-modal-kicker">{{ label }}</span>
          <span v-if="headline" style="font-size:20px;font-weight:700;letter-spacing:-0.03em;line-height:1.2;">{{ headline }}</span>
          <span v-if="step === 'import'" style="font-size:12.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">{{ lede }}</span>
        </div>
        <TitanChordproIconButton icon="x" :density="compact ? 'phone' : 'bar'" muted aria-label="Fechar" @click="emit('close')" />
      </div>

      <ChartImport
        v-if="step === 'import'"
        ref="importEl"
        v-model:tab="tab"
        v-model:url="url"
        v-model:pasted="pasted"
        v-model:err="err"
        v-model:err-hint="errHint"
        :text-height="geom.textH"
        :online="netOk"
        :fetch-chart="props.fetchChart"
        :fetch-youtube-duration="props.fetchYoutubeDuration"
        :read-pdf="props.readPdf"
        @open="onOpen"
      />
      <ChartFicha
        v-else
        :source="source"
        :meta="meta"
        :key-edit="keyEdit"
        :key-rewrite="keyRewrite"
        :from="from"
        :note="note"
        :title-size="geom.titleSize"
        :columns="geom.cols"
        @commit="emit('commit', $event)"
        @close="emit('close')"
        @back="back"
      />
    </div>
  </div>
</template>

<style>
[data-new-chart] input::placeholder,
[data-new-chart] textarea::placeholder {
  color: var(--muted);
  font-weight: 500;
  opacity: 0.85;
}
[data-new-chart] [data-nova-duration]::placeholder {
  font-size: 16px;
}
</style>
