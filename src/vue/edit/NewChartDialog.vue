<script setup lang="ts">
import { computed, ref } from 'vue'
import CpvIcon from '../icon/CpvIcon.vue'
import {
  convert, detect, missingOf, MISSING_LABEL, readMeta, titleFromUrl, writeMeta,
  type ChartMeta, type MetaKey,
} from 'titan-chordpro-ui'

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
const BLANK_BODY = '{c:Intro}\n[G] [C] [D]\n\n{c:Verso 1}\n[G]Primeira linha da letra'

const BLANK_NOTE =
  'Cifra em branco. Identifique a música e o editor abre com Intro e Verso 1 — é só digitar por cima e inserir o resto.'

const step = ref<'import' | 'ficha'>(props.start === 'import' ? 'import' : 'ficha')
const tab = ref<'url' | 'file' | 'text'>('url')
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

const source = ref(props.initialSource)
const meta = ref<ChartMeta>({ ...readMeta(props.initialSource) })

const taps = ref<number[]>([])

const sniff = computed(() => (pasted.value.trim() ? detect(pasted.value) : ''))
const SNIFF_LABEL: Record<string, string> = {
  chordpro: 'ChordPro',
  onsong: 'OnSong',
  plain: 'acordes sobre a letra',
}

const missing = computed(() => missingOf(meta.value))
const missingList = computed(() => {
  const w = missing.value.map((k) => MISSING_LABEL[k] ?? k)
  return w.length > 1 ? `${w.slice(0, -1).join(', ')} e ${w[w.length - 1]}` : (w[0] ?? '')
})
/** Saving for everyone is where a blank field stops being acceptable. */
const strict = computed(() => from.value === 'save')
const flag = (k: string) => (missing.value.includes(k) ? '· falta' : '')
const edge = (k: string) =>
  missing.value.includes(k) ? (strict.value ? 'var(--danger)' : 'var(--line)') : 'var(--chord-edge)'

const keyRoot = computed(() => String(meta.value.key ?? '').replace(/m$/, ''))
const minor = computed(() => /m$/.test(String(meta.value.key ?? '')))

const label = computed(() => {
  if (step.value === 'import') return 'Importar cifra'
  if (from.value === 'blank') return 'Cifra em branco'
  if (from.value === 'save') return 'Falta identificar'
  return 'Identificação'
})

function fail(message: string, hint = '') {
  err.value = message
  errHint.value = hint
  busy.value = false
}

function toFicha(text: string, origin: typeof from.value, why: string) {
  const r = convert(text)
  source.value = r.source
  meta.value = { ...readMeta(r.source) }
  from.value = origin
  note.value = why
  err.value = ''
  busy.value = false
  step.value = 'ficha'
}

function startBlank() {
  source.value = ''
  meta.value = {}
  from.value = 'blank'
  note.value = BLANK_NOTE
  step.value = 'ficha'
}

async function runUrl() {
  const u = url.value.trim()
  if (!u) return fail('Cole o endereço da página', 'Exemplo: https://www.cifraclub.com.br/ministerio-jovem/meu-farol/')
  if (!props.fetchChart)
    return fail('Buscar por link não está disponível', 'A página precisa ser buscada pelo servidor do site. Use Arquivo ou Texto.')
  busy.value = true
  err.value = ''
  try {
    const text = await props.fetchChart(u)
    const r = convert(text)
    if (!r.source.trim()) throw new Error('vazio')
    const guess = titleFromUrl(u)
    source.value = r.source
    const m: ChartMeta = { ...readMeta(r.source), x_origem: u }
    if (!m.title) m.title = guess.title
    if (!m.subtitle) m.subtitle = guess.subtitle
    meta.value = m
    from.value = 'url'
    note.value = `Página lida e convertida de ${r.label}.`
    busy.value = false
    step.value = 'ficha'
  } catch {
    fail('Não deu para ler essa página', 'Confira o endereço, ou use Arquivo ou Texto.')
  }
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
  const body = source.value.trim() ? source.value : BLANK_BODY
  emit('commit', writeMeta(body, meta.value))
}
const goLabel = computed(() =>
  from.value === 'save' ? 'Salvar para todos' : from.value === 'blank' ? 'Abrir editor vazio' : 'Abrir no editor',
)

const geom = computed(() =>
  props.compact
    ? { align: 'flex-end', wrapPad: '0', max: '100%', maxH: '92%', pad: '16px 14px calc(18px + env(safe-area-inset-bottom))', radius: '20px 20px 0 0', cols: 'minmax(0,1fr)', titleSize: '17px', textH: '150px' }
    : { align: 'center', wrapPad: '20px', max: '520px', maxH: '86%', pad: '18px', radius: '18px', cols: 'minmax(0,1fr) minmax(0,1fr)', titleSize: '19px', textH: '180px' },
)
const chip = (on: boolean) => ({
  background: on ? 'var(--chord)' : 'transparent',
  color: on ? 'var(--chord-ink)' : 'var(--text)',
  borderColor: on ? 'var(--chord)' : 'var(--line)',
})
const tabStyle = (on: boolean) => ({
  background: on ? 'var(--chord)' : 'transparent',
  color: on ? 'var(--chord-ink)' : 'var(--muted)',
  fontWeight: on ? 700 : 600,
})
</script>

<template>
  <div
    :style="{ alignItems: geom.align, padding: geom.wrapPad }"
    style="position:absolute;inset:0;z-index:40;display:flex;justify-content:center;"
  >
    <div class="cpv-scrim" @click="emit('close')" />
    <div
      class="cpv-veil-2"
      role="dialog"
      aria-modal="true"
      aria-label="Nova cifra"
      data-new-chart
      :style="{ maxWidth: geom.max, maxHeight: geom.maxH, padding: geom.pad, borderRadius: geom.radius }"
      style="position:relative;width:100%;overflow-y:auto;overscroll-behavior:contain;border:1px solid var(--line);box-shadow:var(--shadow);display:flex;flex-direction:column;gap:12px;animation:cpv-rise .2s ease-out;"
    >
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">{{ label }}</span>
        <button class="cpv-ghost" aria-label="Fechar" style="width:26px;height:26px;color:var(--muted);" @click="emit('close')"><CpvIcon name="x" :size="14" /></button>
      </div>

      <!-- Step one: where the chart comes from. -->
      <template v-if="step === 'import'">
        <div style="display:flex;gap:4px;padding:3px;border-radius:12px;background:var(--surface);border:1px solid var(--line-soft);">
          <button v-for="t in (['url', 'file', 'text'] as const)" :key="t" :data-tab="t" :style="tabStyle(tab === t)" style="flex:1;height:34px;border:0;border-radius:9px;font-family:inherit;font-size:12.5px;cursor:pointer;" @click="tab = t; err = ''">
            {{ t === 'url' ? 'Link' : t === 'file' ? 'Arquivo' : 'Texto' }}
          </button>
        </div>

        <div v-if="tab === 'url'" style="display:flex;flex-direction:column;gap:9px;">
          <input v-model="url" type="url" placeholder="https://www.cifraclub.com.br/artista/musica/" spellcheck="false" data-nova-url style="width:100%;height:44px;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--text);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:12px;" />
          <span style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">Cola o endereço da página da música. Suportado hoje: cifraclub.com.br.</span>
          <button :disabled="busy" data-nova-url-go style="align-self:flex-start;height:42px;padding:0 18px;border:0;border-radius:12px;background:var(--chord);color:var(--chord-ink);font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:9px;" @click="runUrl">
            <span v-if="busy" class="cpv-spin" style="width:14px;height:14px;" />{{ busy ? 'Buscando…' : 'Buscar cifra' }}
          </button>
        </div>

        <div v-else-if="tab === 'file'" style="display:flex;flex-direction:column;gap:9px;">
          <div
            data-nova-drop
            :style="{ borderColor: drag ? 'var(--chord)' : 'var(--line)', background: drag ? 'var(--chord-soft)' : 'transparent' }"
            style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:150px;padding:18px;border:1px dashed;border-radius:15px;cursor:pointer;text-align:center;transition:background .15s ease,border-color .15s ease;"
            @click="fileEl?.click()"
            @dragover.prevent="drag = true"
            @dragleave="drag = false"
            @drop="onDrop"
          >
            <span style="font-size:13.5px;font-weight:600;">{{ busy ? 'Lendo o arquivo…' : drag ? 'Solte aqui' : 'Solte o arquivo ou toque para escolher' }}</span>
            <span style="font-size:11.5px;line-height:1.5;color:var(--muted);max-width:280px;text-wrap:pretty;">ChordPro, OnSong, texto com acordes sobre a letra{{ readPdf ? ', ou PDF que tenha texto de verdade.' : '.' }}</span>
            <span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
              <span v-for="ext in readPdf ? ['.cho', '.txt', '.pro', 'PDF com texto'] : ['.cho', '.txt', '.pro']" :key="ext" style="font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:10px;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:3px 6px;">{{ ext }}</span>
            </span>
          </div>
          <input ref="fileEl" type="file" accept=".cho,.crd,.chopro,.pro,.txt,.onsong,.pdf,text/plain,application/pdf" style="display:none;" @change="onFile" />
        </div>

        <div v-else style="display:flex;flex-direction:column;gap:9px;">
          <textarea v-model="pasted" spellcheck="false" data-nova-text placeholder="Cole aqui a cifra — ChordPro, OnSong ou acordes sobre a letra." :style="{ height: geom.textH }" style="width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:13px;background:var(--surface);color:var(--text);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:11.5px;line-height:1.6;resize:vertical;" />
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button data-nova-text-go style="height:42px;padding:0 18px;border:0;border-radius:12px;background:var(--chord);color:var(--chord-ink);font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;" @click="runText">Converter</button>
            <span v-if="sniff && sniff !== 'vazio'" style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--muted);">
              <span style="width:7px;height:7px;border-radius:50%;background:var(--chord);" />reconhecido: {{ SNIFF_LABEL[sniff] }}
            </span>
          </div>
        </div>

        <div v-if="err" role="alert" style="display:flex;flex-direction:column;gap:4px;padding:11px 12px;border:1px solid var(--danger);border-radius:13px;background:var(--danger-soft);">
          <span style="font-size:12.5px;font-weight:700;color:var(--danger);">{{ err }}</span>
          <span v-if="errHint" style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">{{ errHint }}</span>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:10px;border-top:1px solid var(--line-soft);margin-top:2px;">
          <button data-nova-blank style="min-height:36px;padding:0 10px;border:0;border-radius:10px;background:transparent;color:var(--muted);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:3px;" @click="startBlank">Prefiro começar em branco</button>
        </div>
      </template>

      <!-- Step two: who the song is. -->
      <template v-else>
        <div v-if="note" style="display:flex;align-items:flex-start;gap:9px;padding:10px 12px;border-radius:13px;background:var(--chord-soft);border:1px solid var(--chord-edge);">
          <span style="flex:none;width:7px;height:7px;margin-top:5px;border-radius:50%;background:var(--chord);" />
          <span style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">{{ note }}</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:15px;background:var(--surface);border:1px solid var(--line-soft);">
          <input :value="meta.title ?? ''" data-nova-title placeholder="Nome da música" :style="{ fontSize: geom.titleSize }" style="width:100%;border:0;background:transparent;color:var(--text);font-family:inherit;font-weight:700;letter-spacing:-0.02em;padding:4px 0;" @input="setMeta('title', ($event.target as HTMLInputElement).value)" />
          <input :value="meta.subtitle ?? ''" placeholder="Artista ou ministério" style="width:100%;border:0;background:transparent;color:var(--muted);font-family:inherit;font-size:13px;font-weight:500;padding:4px 0;" @input="setMeta('subtitle', ($event.target as HTMLInputElement).value)" />
        </div>

        <div :style="{ gridTemplateColumns: geom.cols }" style="display:grid;gap:9px;">
          <div :style="{ borderColor: edge('key') }" style="display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:14px;background:var(--surface);border:1px solid;">
            <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Tom {{ flag('key') }}</span>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">
              <button v-for="r in SHARP" :key="r" :data-key-chip="r" :style="chip(keyRoot === r)" style="min-width:34px;height:30px;padding:0 7px;border:1px solid;border-radius:9px;font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:11.5px;font-weight:700;cursor:pointer;" @click="pickKey(r)">{{ r }}</button>
            </div>
            <button :style="chip(minor)" style="align-self:flex-start;height:28px;padding:0 10px;border:1px solid;border-radius:9px;font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;" @click="toggleMinor">menor (m)</button>
          </div>

          <div style="display:flex;flex-direction:column;gap:8px;">
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
        </div>

        <div style="display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:14px;background:var(--surface);border:1px solid var(--line-soft);">
          <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Referência</span>
          <input :value="meta.x_origem ?? ''" placeholder="Link de onde veio, ou vídeo de referência" spellcheck="false" style="width:100%;height:30px;border:0;background:transparent;color:var(--text);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:11.5px;" @input="setMeta('x_origem', ($event.target as HTMLInputElement).value)" />
        </div>

        <span v-if="missing.length" style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">Falta {{ missingList }}. Dá para seguir e preencher depois — vai ser pedido de novo ao salvar.</span>

        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <button style="min-height:40px;padding:0 12px;border:0;border-radius:11px;background:transparent;color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;" @click="back">{{ from === 'blank' || from === 'save' ? 'Cancelar' : 'Voltar' }}</button>
          <button data-nova-go style="height:44px;padding:0 18px;border:0;border-radius:13px;background:var(--chord);color:var(--chord-ink);font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;" @click="go">{{ goLabel }}</button>
        </div>
      </template>
    </div>
  </div>
</template>
