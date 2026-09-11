<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CpvIcon from '../icon/CpvIcon.vue'
import {
  convert, detect, durationFromYoutubeHtml, hostOk, maskDurationMmSs, missingOf, MISSING_LABEL,
  normalizeDurationMmSs, readMeta, titleFromUrl, writeMeta,
  type ChartMeta, type MetaKey,
} from '@henryavila/titan-chordpro-ui'
import type { CpvIconName } from '../icon/paths'

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
     * Used after Cifra Club import when `{x_youtube:}` is present.
     */
    fetchYoutubeDuration?: (videoId: string) => Promise<string>
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
  { start: 'import', initialSource: '', initialNote: '' },
)
const emit = defineEmits<{ close: []; commit: [source: string] }>()

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const TIMES = ['4/4', '3/4', '6/8', '2/4']
const BLANK_BODY = '{c:INTRODUÇÃO}\n[G] [C] [D]\n\n{c:Verso 1}\n[G]Primeira linha da letra'

const BLANK_NOTE =
  'Cifra em branco. Identifique a música e o editor abre com INTRODUÇÃO e Verso 1 — é só digitar por cima e inserir o resto.'

type Origin = 'url' | 'file' | 'text'
const ORIGINS: Array<{ id: Origin; title: string; hint: string; icon: CpvIconName }> = [
  { id: 'url', title: 'Cifra Club', hint: 'Link da página', icon: 'link' },
  { id: 'file', title: 'Arquivo', hint: '.cho, texto ou PDF', icon: 'fileInput' },
  { id: 'text', title: 'Texto', hint: 'Colar a cifra', icon: 'alignLeft' },
]

const step = ref<'import' | 'ficha'>(props.start === 'import' ? 'import' : 'ficha')
const tab = ref<Origin>('url')
const busy = ref(false)
const err = ref('')
const errHint = ref('')
const note = ref(props.start === 'blank' ? BLANK_NOTE : props.initialNote)
const from = ref<'url' | 'arquivo' | 'texto' | 'blank' | 'save'>(
  props.start === 'blank' ? 'blank' : props.start === 'ficha' ? 'save' : 'url',
)

const url = ref('')
const pasted = ref('')
const drag = ref(false)
const fileEl = ref<HTMLInputElement | null>(null)
const urlEl = ref<HTMLInputElement | null>(null)

const source = ref(props.initialSource)
const meta = ref<ChartMeta>({ ...readMeta(props.initialSource) })
const keyEdit = ref(!String(readMeta(props.initialSource).key ?? '').trim())

const taps = ref<number[]>([])

const sniff = computed(() => (pasted.value.trim() ? detect(pasted.value) : ''))
const SNIFF_LABEL: Record<string, string> = {
  chordpro: 'ChordPro',
  onsong: 'OnSong',
  plain: 'acordes sobre a letra',
  cifraclub: 'Cifra Club',
}

const missing = computed(() => missingOf(meta.value))
const durationMissing = computed(() => missing.value.includes('duration'))
const durationNote = computed(() => {
  if (!durationMissing.value) return ''
  return String(meta.value.duration ?? '').trim()
    ? 'Essa duração não serve para a rolagem — use minutos e segundos (ex.: 4:26), pelo menos 20s.'
    : 'Falta a duração. Sem ela a cifra não rola — olhe o tempo no YouTube ou no Spotify.'
})
const softMissing = computed(() => missing.value.filter((k) => k !== 'duration'))
const missingList = computed(() => {
  const w = softMissing.value.map((k) => MISSING_LABEL[k] ?? k)
  return w.length > 1 ? `${w.slice(0, -1).join(', ')} e ${w[w.length - 1]}` : (w[0] ?? '')
})
/** Saving for everyone is where a blank field stops being acceptable. */
const strict = computed(() => from.value === 'save')
const flag = (k: string) => (missing.value.includes(k) ? '· falta' : '')
const edge = (k: string) => {
  if (!missing.value.includes(k)) return 'var(--chord-edge)'
  return k === 'duration' || strict.value ? 'var(--danger)' : 'var(--line)'
}

const keyRoot = computed(() => String(meta.value.key ?? '').replace(/m$/, ''))
const minor = computed(() => /m$/.test(String(meta.value.key ?? '')))
const showKeyPad = computed(() => keyEdit.value || !keyRoot.value)

const others = computed(() => ORIGINS.filter((o) => o.id !== tab.value))
const canFetch = computed(() => !!props.fetchChart)
const urlGuess = computed(() => {
  const u = url.value.trim()
  if (!hostOk(u)) return null
  const g = titleFromUrl(u)
  return g.title ? g : null
})

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
    return 'Cole o link da página. O Titan monta a cifra e pede o que o site não traz.'
  if (tab.value === 'file') return 'ChordPro, OnSong ou acordes sobre a letra. Arraste ou toque para escolher.'
  return 'Cole ChordPro, OnSong ou a cifra com acordes sobre a letra.'
})

function fail(message: string, hint = '') {
  err.value = message
  errHint.value = hint
  busy.value = false
}

function pickTab(next: Origin) {
  tab.value = next
  err.value = ''
  errHint.value = ''
}

function toFicha(text: string, origin: typeof from.value, why: string) {
  const r = convert(text)
  source.value = r.source
  meta.value = { ...readMeta(r.source) }
  keyEdit.value = !String(meta.value.key ?? '').trim()
  from.value = origin
  note.value = why
  err.value = ''
  busy.value = false
  step.value = 'ficha'
}

function startBlank() {
  source.value = ''
  meta.value = {}
  keyEdit.value = true
  from.value = 'blank'
  note.value = BLANK_NOTE
  step.value = 'ficha'
}

async function fillDurationFromYoutube(m: ChartMeta): Promise<ChartMeta> {
  const id = String(m.x_youtube ?? '').trim()
  if (!id || !props.fetchYoutubeDuration) return m
  try {
    const raw = await props.fetchYoutubeDuration(id)
    const dur =
      /^\d{1,2}:\d{2}$/.test(raw.trim()) || /^\d+:\d{2}:\d{2}$/.test(raw.trim())
        ? normalizeDurationMmSs(raw.trim())
        : durationFromYoutubeHtml(raw)
    if (dur) return { ...m, duration: dur }
  } catch {
    /* keep asking on the ficha */
  }
  return m
}

async function runUrl() {
  const u = url.value.trim()
  if (!u)
    return fail(
      'Cole o endereço do Cifra Club',
      'Exemplo: https://www.cifraclub.com.br/ministerio-jovem/meu-farol/',
    )
  if (!hostOk(u))
    return fail(
      'Só o Cifra Club',
      'Cole um endereço de cifraclub.com.br. Arquivo ou Texto aceitam cifra de outro lugar.',
    )
  if (!props.fetchChart)
    return fail('Buscar no Cifra Club não está disponível', 'A página precisa ser buscada pelo servidor do site. Use Arquivo ou Texto.')
  busy.value = true
  err.value = ''
  try {
    const text = await props.fetchChart(u)
    const r = convert(text)
    if (!r.source.trim()) throw new Error('vazio')
    const guess = titleFromUrl(u)
    let m: ChartMeta = { ...readMeta(r.source), x_origem: u }
    if (!m.title) m.title = guess.title
    if (!m.subtitle) m.subtitle = guess.subtitle
    m = await fillDurationFromYoutube(m)
    source.value = writeMeta(r.source, m)
    meta.value = m
    keyEdit.value = !String(m.key ?? '').trim()
    from.value = 'url'
    const still = missingOf(m)
    note.value = still.length
      ? still.includes('duration')
        ? 'Convertido do Cifra Club. Falta a duração para a rolagem — confira no YouTube se o site não trouxe.'
        : `Convertido do Cifra Club. Complete: ${still.map((k) => MISSING_LABEL[k] ?? k).join(', ')}.`
      : 'Convertido do Cifra Club — tempo, compasso e duração vieram preenchidos.'
    busy.value = false
    step.value = 'ficha'
  } catch {
    fail('Não deu para ler essa cifra no Cifra Club', 'Confira o endereço, ou use Arquivo ou Texto.')
  }
}

function onUrlPaste(e: ClipboardEvent) {
  const t = (e.clipboardData?.getData('text') ?? '').trim()
  if (!hostOk(t)) return
  e.preventDefault()
  url.value = t
  err.value = ''
  if (props.fetchChart) void runUrl()
}

function runText() {
  const t = pasted.value
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
  err.value = ''
  errHint.value = ''
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

function setMeta(k: MetaKey, v: string) {
  meta.value = { ...meta.value, [k]: v }
}
function onDurationInput(e: Event) {
  setMeta('duration', maskDurationMmSs((e.target as HTMLInputElement).value))
}
function onDurationBlur() {
  setMeta('duration', normalizeDurationMmSs(meta.value.duration ?? ''))
}
function bpmStep(d: number) {
  const cur = parseInt(String(meta.value.tempo ?? ''), 10)
  setMeta('tempo', String(Math.max(30, Math.min(260, (Number.isNaN(cur) ? 90 : cur) + d))))
}
/** Nobody knows a bpm by heart; everybody can tap their foot. */
function tapTempo() {
  const now = Date.now()
  taps.value = [...taps.value.filter((t) => now - t < 3000), now]
  if (taps.value.length < 2) return
  const gaps = taps.value.slice(1).map((t, i) => t - (taps.value[i] as number))
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
  setMeta('tempo', String(Math.round(60000 / avg)))
}
const tapLabel = computed(() => {
  const live = taps.value.filter((t) => Date.now() - t < 3000).length
  return live > 1 ? `batendo… ${live}` : 'bater no ritmo'
})
function pickKey(root: string) {
  setMeta('key', root + (minor.value ? 'm' : ''))
}
function toggleMinor() {
  const cur = String(meta.value.key ?? '')
  if (!cur) return
  setMeta('key', /m$/.test(cur) ? cur.replace(/m$/, '') : `${cur}m`)
}

function back() {
  if (from.value === 'blank' || from.value === 'save') return emit('close')
  step.value = 'import'
  tab.value = from.value === 'url' ? 'url' : from.value === 'arquivo' ? 'file' : 'text'
  err.value = ''
}
function go() {
  if (durationMissing.value) return
  const next = { ...meta.value, duration: normalizeDurationMmSs(meta.value.duration ?? '') }
  meta.value = next
  const body = source.value.trim() ? source.value : BLANK_BODY
  emit('commit', writeMeta(body, next))
}
const goLabel = computed(() =>
  from.value === 'save' ? 'Salvar para todos' : from.value === 'blank' ? 'Abrir editor vazio' : 'Abrir no editor',
)

const geom = computed(() =>
  props.compact
    ? { align: 'flex-end', wrapPad: '0', max: '100%', maxH: '92%', pad: '18px 16px calc(18px + env(safe-area-inset-bottom))', radius: '22px 22px 0 0', cols: 'minmax(0,1fr)', titleSize: '18px', textH: '150px' }
    : { align: 'center', wrapPad: '20px', max: step.value === 'ficha' ? '480px' : '420px', maxH: step.value === 'ficha' ? '92%' : '86%', pad: '20px 18px 16px', radius: '20px', cols: 'minmax(0,1fr) minmax(0,1fr)', titleSize: '20px', textH: '160px' },
)
const chip = (on: boolean) => ({
  background: on ? 'var(--chord)' : 'transparent',
  color: on ? 'var(--chord-ink)' : 'var(--text)',
  borderColor: on ? 'var(--chord)' : 'var(--line)',
})

onMounted(() => {
  if (step.value === 'import' && tab.value === 'url') urlEl.value?.focus()
})
</script>

<template>
  <div
    :style="{ alignItems: geom.align, padding: geom.wrapPad }"
    style="position:absolute;inset:0;z-index:40;display:flex;justify-content:center;"
  >
    <div class="cpv-scrim" style="background:color-mix(in srgb, var(--scrim) 55%, #000);" @click="emit('close')" />
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nova cifra"
      data-new-chart
      :style="{ maxWidth: geom.max, maxHeight: geom.maxH, padding: geom.pad, borderRadius: geom.radius, background: 'var(--canvas)' }"
      style="position:relative;width:100%;overflow-y:auto;overscroll-behavior:contain;border:1px solid var(--line);box-shadow:var(--shadow);display:flex;flex-direction:column;gap:14px;animation:cpv-rise .2s ease-out;"
    >
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div style="display:flex;flex-direction:column;gap:6px;min-width:0;">
          <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">{{ label }}</span>
          <span v-if="headline" style="font-size:20px;font-weight:700;letter-spacing:-0.03em;line-height:1.2;">{{ headline }}</span>
          <span v-if="step === 'import'" style="font-size:12.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">{{ lede }}</span>
        </div>
        <button class="cpv-ghost" aria-label="Fechar" style="flex:none;width:32px;height:32px;border-radius:10px;color:var(--muted);" @click="emit('close')"><CpvIcon name="x" :size="16" /></button>
      </div>

      <!-- Step one: where the chart comes from. Cifra Club is the normal way in. -->
      <template v-if="step === 'import'">
        <div
          v-if="tab === 'url'"
          style="display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:16px;background:color-mix(in srgb, var(--chord) 12%, var(--canvas));border:1px solid var(--chord-edge);"
        >
          <input
            ref="urlEl"
            v-model="url"
            type="url"
            placeholder="cifraclub.com.br/artista/musica"
            aria-label="Endereço no Cifra Club"
            spellcheck="false"
            data-nova-url
            :disabled="busy"
            style="width:100%;height:48px;padding:0 14px;border:1px solid var(--line);border-radius:13px;background:var(--canvas);color:var(--text);font-family:inherit;font-size:14.5px;"
            @keydown.enter.prevent="runUrl"
            @paste="onUrlPaste"
          />
          <span v-if="urlGuess" style="font-size:12.5px;line-height:1.4;font-weight:600;">
            {{ urlGuess.title }}<span v-if="urlGuess.subtitle" style="font-weight:500;color:var(--muted);"> · {{ urlGuess.subtitle }}</span>
          </span>
          <span v-else style="font-size:11.5px;line-height:1.45;color:var(--muted);">Só Cifra Club — cole o endereço da página da cifra.</span>
          <div
            v-if="!canFetch"
            role="status"
            style="display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--line-soft);"
          >
            <span style="font-size:12.5px;font-weight:700;">Buscar no Cifra Club não está disponível</span>
            <span style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">A página precisa ser buscada pelo servidor do site. Use Arquivo ou Texto.</span>
          </div>
          <button
            :disabled="busy || !canFetch"
            data-nova-url-go
            :style="{ opacity: busy || !canFetch ? 0.5 : 1, cursor: busy || !canFetch ? 'not-allowed' : 'pointer' }"
            style="width:100%;height:48px;border:0;border-radius:13px;background:var(--chord);color:var(--chord-ink);font-family:inherit;font-size:14.5px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:9px;"
            @click="runUrl"
          >
            <span v-if="busy" class="cpv-spin" style="width:14px;height:14px;" />{{ busy ? 'Buscando…' : 'Buscar cifra' }}
          </button>
        </div>

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
          <span style="width:40px;height:40px;border-radius:12px;background:var(--chord-soft);color:var(--chord);display:flex;align-items:center;justify-content:center;"><CpvIcon name="fileInput" :size="18" /></span>
          <span style="font-size:14.5px;font-weight:700;">{{ busy ? 'Lendo o arquivo…' : drag ? 'Solte aqui' : 'Solte o arquivo ou toque para escolher' }}</span>
          <span style="font-size:11.5px;line-height:1.5;color:var(--muted);max-width:280px;text-wrap:pretty;">ChordPro, OnSong, texto com acordes sobre a letra{{ readPdf ? ', ou PDF que tenha texto de verdade.' : '.' }}</span>
          <span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
            <span v-for="ext in readPdf ? ['.cho', '.txt', '.pro', 'PDF com texto'] : ['.cho', '.txt', '.pro']" :key="ext" style="font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:10px;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:3px 6px;">{{ ext }}</span>
          </span>
          <input ref="fileEl" type="file" accept=".cho,.crd,.chopro,.pro,.txt,.onsong,.pdf,text/plain,application/pdf" style="display:none;" @change="onFile" />
        </div>

        <div v-else style="display:flex;flex-direction:column;gap:10px;">
          <textarea
            v-model="pasted"
            spellcheck="false"
            data-nova-text
            placeholder="Cole aqui a cifra — ChordPro, OnSong ou acordes sobre a letra."
            :style="{ height: geom.textH }"
            style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--canvas);color:var(--text);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:12px;line-height:1.6;resize:vertical;"
          />
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button data-nova-text-go style="flex:1;min-width:140px;height:48px;padding:0 18px;border:0;border-radius:13px;background:var(--chord);color:var(--chord-ink);font-family:inherit;font-size:14.5px;font-weight:700;cursor:pointer;" @click="runText">Converter</button>
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
              <span style="flex:none;width:28px;height:28px;border-radius:9px;background:var(--hover);color:var(--muted);display:flex;align-items:center;justify-content:center;"><CpvIcon :name="o.icon" :size="14" /></span>
              <span style="display:flex;flex-direction:column;gap:2px;min-width:0;">
                <span style="font-size:13px;font-weight:700;">{{ o.title }}</span>
                <span style="font-size:11px;line-height:1.35;color:var(--muted);">{{ o.hint }}</span>
              </span>
            </button>
          </div>
        </div>

        <button data-nova-blank style="align-self:flex-start;min-height:36px;padding:0;border:0;background:transparent;color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;" @click="startBlank">Começar em branco</button>
      </template>

      <!-- Step two: who the song is. -->
      <template v-else>
        <div v-if="note" style="display:flex;align-items:flex-start;gap:9px;padding:11px 13px;border-radius:14px;background:color-mix(in srgb, var(--chord) 12%, var(--canvas));border:1px solid var(--chord-edge);">
          <span style="flex:none;width:7px;height:7px;margin-top:5px;border-radius:50%;background:var(--chord);" />
          <span style="font-size:12px;line-height:1.5;color:var(--text);text-wrap:pretty;">{{ note }}</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:15px;background:var(--surface);border:1px solid var(--line-soft);">
          <input :value="meta.title ?? ''" data-nova-title placeholder="Nome da música" :style="{ fontSize: geom.titleSize }" style="width:100%;border:0;background:transparent;color:var(--text);font-family:inherit;font-weight:700;letter-spacing:-0.02em;padding:4px 0;" @input="setMeta('title', ($event.target as HTMLInputElement).value)" />
          <input :value="meta.subtitle ?? ''" placeholder="Artista ou ministério" style="width:100%;border:0;background:transparent;color:var(--muted);font-family:inherit;font-size:13px;font-weight:500;padding:4px 0;" @input="setMeta('subtitle', ($event.target as HTMLInputElement).value)" />
        </div>

        <div :style="{ borderColor: edge('duration') }" style="display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:15px;background:var(--canvas);border:1px solid;">
          <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Duração {{ flag('duration') }}</span>
          <div style="display:flex;align-items:baseline;gap:8px;">
            <input
              :value="meta.duration ?? ''"
              placeholder="MM:SS"
              inputmode="numeric"
              autocomplete="off"
              spellcheck="false"
              maxlength="5"
              aria-label="Duração em minutos e segundos"
              data-nova-duration
              :style="{ fontSize: meta.duration ? '22px' : '16px' }"
              style="flex:1;min-width:0;height:36px;border:0;background:transparent;color:var(--text);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-weight:700;letter-spacing:-0.02em;"
              @input="onDurationInput"
              @blur="onDurationBlur"
            />
            <span style="font-size:11px;color:var(--muted);">MM:SS</span>
          </div>
          <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Tempo da música, como no YouTube. A rolagem precisa disso.</span>
          <a
            v-if="meta.x_youtube"
            :href="'https://www.youtube.com/watch?v=' + meta.x_youtube"
            target="_blank"
            rel="noopener noreferrer"
            data-nova-youtube
            style="font-size:11.5px;font-weight:600;color:var(--chord);text-decoration:none;"
          >Abrir no YouTube</a>
        </div>

        <div :style="{ gridTemplateColumns: geom.cols }" style="display:grid;gap:9px;">
          <div :style="{ borderColor: edge('tempo') }" style="display:flex;flex-direction:column;gap:7px;padding:10px 12px;border-radius:14px;background:var(--surface);border:1px solid;">
            <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Andamento {{ flag('tempo') }}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <button class="cpv-ghost" aria-label="Diminuir" style="flex:none;width:32px;height:32px;border:1px solid var(--line);border-radius:10px;font-size:15px;" @click="bpmStep(-1)">−</button>
              <input :value="meta.tempo ?? ''" inputmode="numeric" placeholder="—" data-nova-bpm style="flex:1;min-width:0;height:32px;border:0;background:transparent;color:var(--text);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:16px;font-weight:700;text-align:center;" @input="setMeta('tempo', ($event.target as HTMLInputElement).value.replace(/[^\d]/g, '').slice(0, 3))" />
              <button class="cpv-ghost" aria-label="Aumentar" style="flex:none;width:32px;height:32px;border:1px solid var(--line);border-radius:10px;font-size:15px;" @click="bpmStep(1)">+</button>
              <span style="font-size:10.5px;color:var(--muted);">bpm</span>
            </div>
            <button data-nova-tap style="align-self:flex-start;height:28px;padding:0 10px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--muted);font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;" @click="tapTempo">{{ tapLabel }}</button>
          </div>

          <div :style="{ borderColor: edge('time') }" style="display:flex;flex-direction:column;gap:7px;padding:10px 12px;border-radius:14px;background:var(--surface);border:1px solid;">
            <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Compasso {{ flag('time') }}</span>
            <div style="display:flex;gap:5px;flex-wrap:wrap;">
              <button v-for="t in TIMES" :key="t" :data-time-chip="t" :style="chip(meta.time === t)" style="height:32px;padding:0 12px;border:1px solid;border-radius:10px;font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:12.5px;font-weight:700;cursor:pointer;" @click="setMeta('time', t)">{{ t }}</button>
            </div>
          </div>
        </div>

        <div :style="{ borderColor: edge('key') }" style="display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-radius:14px;background:var(--surface);border:1px solid;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Tom {{ flag('key') }}</span>
            <button
              v-if="!showKeyPad && keyRoot"
              style="height:28px;padding:0 10px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--muted);font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;"
              @click="keyEdit = true"
            >Trocar</button>
          </div>
          <div v-if="!showKeyPad" style="display:flex;align-items:baseline;gap:8px;">
            <span style="font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:22px;font-weight:700;color:var(--chord);">{{ meta.key }}</span>
          </div>
          <template v-else>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">
              <button v-for="r in SHARP" :key="r" :data-key-chip="r" :style="chip(keyRoot === r)" style="min-width:34px;height:30px;padding:0 7px;border:1px solid;border-radius:9px;font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:11.5px;font-weight:700;cursor:pointer;" @click="pickKey(r)">{{ r }}</button>
            </div>
            <button :style="chip(minor)" style="align-self:flex-start;height:28px;padding:0 10px;border:1px solid;border-radius:9px;font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;" @click="toggleMinor">menor (m)</button>
          </template>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;padding:8px 12px;border-radius:14px;background:var(--surface);border:1px solid var(--line-soft);">
          <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Referência</span>
          <input :value="meta.x_origem ?? ''" placeholder="Link de onde veio, ou vídeo de referência" spellcheck="false" style="width:100%;height:30px;border:0;background:transparent;color:var(--text);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:11.5px;" @input="setMeta('x_origem', ($event.target as HTMLInputElement).value)" />
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;">
          <span v-if="softMissing.length" style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">Falta {{ missingList }}. Dá para seguir e preencher depois — vai ser pedido de novo ao salvar.</span>
          <span v-if="durationMissing" style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">{{ durationNote }}</span>
        </div>

        <div style="position:sticky;bottom:0;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0 0;margin-top:4px;background:var(--canvas);border-top:1px solid var(--line-soft);">
          <button style="min-height:40px;padding:0 12px;border:0;border-radius:11px;background:transparent;color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;" @click="back">{{ from === 'blank' || from === 'save' ? 'Cancelar' : 'Voltar' }}</button>
          <button data-nova-go :disabled="durationMissing" :style="{ opacity: durationMissing ? 0.45 : 1, cursor: durationMissing ? 'not-allowed' : 'pointer' }" style="height:48px;padding:0 20px;border:0;border-radius:13px;background:var(--chord);color:var(--chord-ink);font-family:inherit;font-size:14px;font-weight:700;" @click="go">{{ goLabel }}</button>
        </div>
      </template>
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
