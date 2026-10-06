<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  convert,
  detect,
  MISSING_LABEL,
  missingOf,
  OFFLINE_LABEL,
  readMeta,
  titleFromUrl,
  writeMeta,
  type ChartMeta,
} from '@henryavila/titan-chordpro-ui'
import TitanChordproIcon from '../../icon/TitanChordproIcon.vue'
import TitanChordproActionButton from '../../ui/TitanChordproActionButton.vue'
import { BLANK_NOTE } from './blank-chart'
import { cifraReadFailed } from './cifra-url'
import CifraClubLink from './CifraClubLink.vue'
import { CHART_ORIGINS, type ChartOrigin } from './origins'
import type { FichaOpen } from './types'
import { fillYoutubeDuration } from './youtube-duration'

const props = defineProps<{
  tab: ChartOrigin
  url: string
  pasted: string
  err: string
  errHint: string
  textHeight: string
  online: boolean
  fetchChart?: (url: string) => Promise<string>
  fetchYoutubeDuration?: (videoId: string) => Promise<string>
  readPdf?: (file: File) => Promise<string>
}>()

const emit = defineEmits<{
  'update:tab': [tab: ChartOrigin]
  'update:url': [url: string]
  'update:pasted': [text: string]
  'update:err': [message: string]
  'update:errHint': [hint: string]
  open: [payload: FichaOpen]
}>()

const SNIFF_LABEL: Record<string, string> = {
  chordpro: 'ChordPro',
  onsong: 'OnSong',
  plain: 'acordes sobre a letra',
  cifraclub: 'Cifra Club',
}

const busy = ref(false)
const drag = ref(false)
const fileEl = ref<HTMLInputElement | null>(null)
const linkEl = ref<{ focus: () => void } | null>(null)

const sniff = computed(() => (props.pasted.trim() ? detect(props.pasted) : ''))
const canFetch = computed(() => !!props.fetchChart)
const origins = computed(() =>
  CHART_ORIGINS.map((o) =>
    o.id === 'url' && !props.online ? { ...o, hint: OFFLINE_LABEL } : o,
  ),
)
const others = computed(() => origins.value.filter((o) => o.id !== props.tab))

function fail(message: string, hint = '') {
  emit('update:err', message)
  emit('update:errHint', hint)
  busy.value = false
}

function onBlocked(message: string, hint: string) {
  emit('update:err', message)
  emit('update:errHint', hint)
}

function pickTab(next: ChartOrigin) {
  emit('update:tab', next)
  emit('update:err', '')
  emit('update:errHint', '')
}

function openFicha(payload: FichaOpen) {
  busy.value = false
  emit('update:err', '')
  emit('open', payload)
}

function toFicha(text: string, origin: FichaOpen['from'], why: string) {
  const r = convert(text)
  const meta = { ...readMeta(r.source) }
  openFicha({
    source: r.source,
    meta,
    keyEdit: !String(meta.key ?? '').trim(),
    keyRewrite: r.keyRewrite ?? null,
    from: origin,
    note: why,
  })
}

function startBlank() {
  emit('open', {
    source: '',
    meta: {},
    keyEdit: true,
    keyRewrite: null,
    from: 'blank',
    note: BLANK_NOTE,
  })
}

async function onGo(url: string) {
  if (!props.fetchChart) return
  busy.value = true
  emit('update:err', '')
  try {
    const text = await props.fetchChart(url)
    const r = convert(text)
    if (!r.source.trim()) throw new Error('vazio')
    const guess = titleFromUrl(url)
    let m: ChartMeta = { ...readMeta(r.source), x_titan_source: url }
    if (!m.title) m.title = guess.title
    if (!m.subtitle) m.subtitle = guess.subtitle
    m = await fillYoutubeDuration(m, String(m.x_titan_youtube ?? ''), props.fetchYoutubeDuration)
    const still = missingOf(m)
    const note = still.length
      ? still.includes('duration')
        ? 'Convertido do Cifra Club. Falta a duração para a rolagem — confira no YouTube se o site não trouxe.'
        : `Convertido do Cifra Club. Complete: ${still.map((k) => MISSING_LABEL[k] ?? k).join(', ')}.`
      : 'Convertido do Cifra Club — tempo, compasso e duração vieram preenchidos.'
    openFicha({
      source: writeMeta(r.source, m),
      meta: m,
      keyEdit: !String(m.key ?? '').trim(),
      keyRewrite: r.keyRewrite ?? null,
      from: 'url',
      note,
    })
  } catch {
    const failed = cifraReadFailed('bring')
    fail(failed.message, failed.hint)
  }
}

function runText() {
  const t = props.pasted
  if (!t.trim()) return fail('Nada colado ainda', 'Cole a cifra na caixa acima.')
  const r = convert(t)
  if (!r.source.trim()) return fail('Não deu para ler esse texto', 'Nenhuma linha de letra ou acorde foi reconhecida.')
  toFicha(
    t,
    'texto',
    r.changed ? `Convertido de ${r.label} para ChordPro.` : 'Já estava em ChordPro — nada precisou ser convertido.',
  )
}

async function takeFile(f: File) {
  busy.value = true
  emit('update:err', '')
  emit('update:errHint', '')
  const isPdf = /\.pdf$/i.test(f.name) || f.type === 'application/pdf'
  try {
    if (isPdf && !props.readPdf) throw new Error('sem-pdf')
    const text = isPdf ? await (props.readPdf as (file: File) => Promise<string>)(f) : await f.text()
    const r = convert(text)
    if (!r.source.trim()) throw new Error('sem-texto')
    toFicha(
      text,
      'arquivo',
      `Lido de ${f.name}${r.changed ? ` e convertido de ${r.label}.` : ' — já estava em ChordPro.'}`,
    )
  } catch (e) {
    const why = String((e as Error)?.message)
    if (why === 'sem-pdf') fail('PDF não está disponível aqui', 'Abra a versão em texto, ou cole o conteúdo na aba Texto.')
    else if (why === 'sem-texto')
      fail('Este PDF não tem texto', 'Parece um PDF digitalizado (imagem). Abra a versão em texto ou cole o conteúdo na aba Texto.')
    else fail('Não deu para ler o arquivo', 'Tente um .cho, .txt ou um PDF com texto selecionável.')
  }
}

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (f) void takeFile(f)
  input.value = ''
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  drag.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) void takeFile(f)
}

defineExpose({
  focusUrl() {
    linkEl.value?.focus()
  },
})
</script>

<template>
  <!-- Where the chart comes from. Cifra Club is the normal way in. -->
  <CifraClubLink
    v-if="tab === 'url'"
    ref="linkEl"
    voice="bring"
    :url="url"
    :busy="busy"
    :online="online"
    :can-fetch="canFetch"
    @update:url="emit('update:url', $event)"
    @blocked="onBlocked"
    @go="onGo"
  />

  <div
    v-else-if="tab === 'file'"
    data-nova-drop
    :style="{ borderColor: drag ? 'var(--chord)' : 'var(--line)', background: drag ? 'var(--chord-soft)' : 'var(--canvas)' }"
    style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:168px;padding:22px 16px;border:1px dashed;border-radius:16px;cursor:pointer;text-align:center;transition:background .15s ease,border-color .15s ease;"
    @click="fileEl?.click()"
    @dragover.prevent="drag = true"
    @dragleave="drag = false"
    @drop="onDrop"
  >
    <span style="width:40px;height:40px;border-radius:12px;background:var(--chord-soft);color:var(--chord);display:flex;align-items:center;justify-content:center;"><TitanChordproIcon name="fileInput" :size="18" /></span>
    <span style="font-size:14.5px;font-weight:700;">{{ busy ? 'Lendo o arquivo…' : drag ? 'Solte aqui' : 'Solte o arquivo ou toque para escolher' }}</span>
    <span style="font-size:11.5px;line-height:1.5;color:var(--muted);max-width:280px;text-wrap:pretty;">ChordPro, OnSong, texto com acordes sobre a letra{{ readPdf ? ', ou PDF que tenha texto de verdade.' : '.' }}</span>
    <span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
      <span v-for="ext in readPdf ? ['.cho', '.txt', '.pro', 'PDF com texto'] : ['.cho', '.txt', '.pro']" :key="ext" style="font-family:var(--titan-chordpro-font-chords,'Space Mono',monospace);font-size:10px;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:3px 6px;">{{ ext }}</span>
    </span>
    <input ref="fileEl" type="file" accept=".cho,.crd,.chopro,.pro,.txt,.onsong,.pdf,text/plain,application/pdf" style="display:none;" @change="onFile">
  </div>

  <div v-else style="display:flex;flex-direction:column;gap:10px;">
    <textarea
      :value="pasted"
      spellcheck="false"
      data-nova-text
      placeholder="Cole aqui a cifra — ChordPro, OnSong ou acordes sobre a letra."
      :style="{ height: textHeight }"
      style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--canvas);color:var(--text);font-family:var(--titan-chordpro-font-chords,'Space Mono',monospace);font-size:12px;line-height:1.6;resize:vertical;"
      @input="emit('update:pasted', ($event.target as HTMLTextAreaElement).value)"
    />
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <TitanChordproActionButton data-nova-text-go style="flex:1;min-width:140px" @click="runText">Converter</TitanChordproActionButton>
      <span v-if="sniff && sniff !== 'vazio'" style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--muted);">
        <span style="width:7px;height:7px;border-radius:50%;background:var(--chord);" />reconhecido: {{ SNIFF_LABEL[sniff] }}
      </span>
    </div>
  </div>

  <div v-if="err" role="alert" style="display:flex;flex-direction:column;gap:4px;padding:11px 12px;border:1px solid var(--danger);border-radius:13px;background:var(--danger-soft);">
    <span style="font-size:12.5px;font-weight:700;color:var(--danger);">{{ err }}</span>
    <span v-if="errHint" style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">{{ errHint }}</span>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Outras origens</span>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;">
      <button
        v-for="o in others"
        :key="o.id"
        :data-tab="o.id"
        style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--text);font-family:inherit;text-align:left;cursor:pointer;"
        @click="pickTab(o.id)"
      >
        <span style="flex:none;width:28px;height:28px;border-radius:9px;background:var(--hover);color:var(--muted);display:flex;align-items:center;justify-content:center;"><TitanChordproIcon :name="o.icon" :size="14" /></span>
        <span style="display:flex;flex-direction:column;gap:2px;min-width:0;">
          <span style="font-size:13px;font-weight:700;">{{ o.title }}</span>
          <span style="font-size:11px;line-height:1.35;color:var(--muted);">{{ o.hint }}</span>
        </span>
      </button>
    </div>
  </div>

  <button data-nova-blank style="align-self:flex-start;min-height:36px;padding:0;border:0;background:transparent;color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;" @click="startBlank">Começar em branco</button>
</template>
