<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CpvIcon from '../icon/CpvIcon.vue'
import {
  applyCifraClubEnrich,
  durationFromYoutubeHtml,
  hasChartEnvelope,
  hostOk,
  maskDurationMmSs,
  missingOf,
  MISSING_LABEL,
  normalizeDurationMmSs,
  songDurationSec,
  proposeCifraClubEnrich,
  readMeta,
  rewriteToKey,
  inferWrittenKey,
  parse,
  keyIndex,
  keyRootOf,
  trazerCcStrumChoice,
  writeMeta,
  youtubeEmbedUrl,
  type CcStrumChoice,
  type ChartMeta,
  type EnrichProposal,
  type MetaKey,
} from '@henryavila/titan-chordpro-ui'

/**
 * Full chart identity — title, artist, key, tempo, time, duration, reference.
 * Also: Completar com Cifra Club (meta only — never replaces the body),
 * and Começar de novo (content edit only; explicit confirm → Nova cifra).
 */

const props = defineProps<{
  compact: boolean
  source: string
  /** Começar de novo / Nova cifra — only in “Para todos” (content) edit. */
  allowRestart?: boolean
  fetchChart?: (url: string) => Promise<string>
  fetchYoutubeDuration?: (videoId: string) => Promise<string>
}>()
const emit = defineEmits<{ close: []; apply: [source: string]; restart: [] }>()

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const TIMES = ['4/4', '3/4', '6/8', '2/4']

const meta = ref<ChartMeta>({ ...readMeta(props.source) })
const keyEdit = ref(!String(readMeta(props.source).key ?? '').trim())
/** Fields the user edited. An empty value there is a clear, not a readMeta echo. */
const touched = ref<ReadonlySet<MetaKey>>(new Set())
const taps = ref<number[]>([])
const titleEl = ref<HTMLInputElement | null>(null)

type EnrichPhase = 'idle' | 'busy' | 'preview' | 'youtube' | 'error'
const enrichPhase = ref<EnrichPhase>('idle')
const enrichUrl = ref('')
const enrichErr = ref('')
const enrichNote = ref('')
const proposal = ref<EnrichProposal | null>(null)
const ytPick = ref<'remote' | 'local' | 'skip' | ''>('')
/** Batida conflict: Manter (default) vs Trazer CC. */
const strumPick = ref<'keep' | 'replace'>('keep')
/** Two-step gate: first click reveals confirm; only confirm emits `restart`. */
const restartAsk = ref(false)

const canFetch = computed(() => !!props.fetchChart)
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
const flag = (k: string) => (missing.value.includes(k) ? '· falta' : '')
const edge = (k: string) => {
  if (!missing.value.includes(k)) return 'var(--chord-edge)'
  return k === 'duration' ? 'var(--danger)' : 'var(--line)'
}

const keyRoot = computed(() => String(meta.value.key ?? '').replace(/m$/, ''))
const minor = computed(() => /m$/.test(String(meta.value.key ?? '')))
const showKeyPad = computed(() => keyEdit.value || !keyRoot.value)
const writtenKey = computed(() => inferWrittenKey(parse(props.source).source))
const keyMismatch = computed(() => {
  const a = keyIndex(keyRootOf(writtenKey.value || ''))
  const b = keyIndex(keyRootOf(meta.value.key || ''))
  return a != null && b != null && a !== b
})

const wide = computed(
  () => enrichPhase.value === 'youtube' || enrichPhase.value === 'preview',
)

const geom = computed(() =>
  props.compact
    ? {
        align: 'flex-end',
        wrapPad: '0',
        max: '100%',
        maxH: '92%',
        pad: '18px 16px calc(18px + env(safe-area-inset-bottom))',
        radius: '22px 22px 0 0',
        cols: 'minmax(0,1fr)',
        titleSize: '18px',
      }
    : {
        align: 'center',
        wrapPad: '20px',
        max: wide.value ? '720px' : '480px',
        maxH: '92%',
        pad: '20px 18px 16px',
        radius: '20px',
        cols: 'minmax(0,1fr) minmax(0,1fr)',
        titleSize: '20px',
      },
)

const chip = (on: boolean) => ({
  background: on ? 'var(--chord)' : 'transparent',
  color: on ? 'var(--chord-ink)' : 'var(--text)',
  borderColor: on ? 'var(--chord)' : 'var(--line)',
})

const patchLabels = computed(() => {
  const p = proposal.value?.patch
  if (!p) return [] as string[]
  const out: string[] = []
  if (p.x_strum) out.push('batida (x_strum)')
  if (p.x_source) out.push('origem')
  for (const k of ['title', 'subtitle', 'key', 'tempo', 'time', 'duration'] as const) {
    if (p[k]) out.push(MISSING_LABEL[k] ?? k)
  }
  return out
})

function setMeta(k: MetaKey, v: string) {
  const nextTouched = new Set(touched.value)
  nextTouched.add(k)
  touched.value = nextTouched
  meta.value = { ...meta.value, [k]: v }
}
function onDurationInput(e: Event) {
  setMeta('duration', maskDurationMmSs((e.target as HTMLInputElement).value))
}
function onDurationBlur() {
  const cur = meta.value.duration ?? ''
  const next = normalizeDurationMmSs(cur)
  if (next === cur) return
  // Tabbing through only reformats. Do not mark duration touched, and do not
  // replace a stored length the mask would read as different seconds.
  if (!touched.value.has('duration')) {
    const curSec = songDurationSec(cur)
    const nextSec = songDurationSec(next)
    if (curSec !== nextSec) return
  }
  meta.value = { ...meta.value, duration: next }
}
function bpmStep(d: number) {
  const cur = parseInt(String(meta.value.tempo ?? ''), 10)
  setMeta('tempo', String(Math.max(30, Math.min(260, (Number.isNaN(cur) ? 90 : cur) + d))))
}
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

const IDENTITY_CLEAR = ['title', 'subtitle', 'artist'] as const

/**
 * N>1 writes only fields that changed, so a tempo save does not rewrite `{t:}` or `{composer:}`.
 * An empty value the user typed is still a field, even when it equals `readMeta`.
 */
/**
 * `4:26` and `04:26` are one duration (same parsed seconds).
 * `426` is 426 seconds, not 4:26. If only one side parses, they differ.
 * If neither parses, compare the stored text, not the mask.
 */
function sameDuration(orig: string, next: string): boolean {
  const a = songDurationSec(orig)
  const b = songDurationSec(next)
  if (a != null && b != null) return a === b
  if (a == null && b == null) return orig.trim() === next.trim()
  return false
}

function sameField(key: MetaKey, orig: string, next: string): boolean {
  if (key === 'duration') return sameDuration(orig, next)
  return orig.trim() === next.trim()
}

/**
 * The mask reads `426` as `04:26`. Leave an untouched second count as stored
 * when that mask would change the length. A duration the user edited is `MM:SS`.
 */
function durationToWrite(raw: string): string {
  const masked = normalizeDurationMmSs(raw)
  if (touched.value.has('duration')) return masked
  const origSec = songDurationSec(raw)
  const maskSec = songDurationSec(masked)
  if (origSec != null && maskSec != null && origSec !== maskSec) return raw.trim()
  return masked
}

function fieldsToWrite(source: string, next: ChartMeta): ChartMeta {
  if (!hasChartEnvelope(source)) return next
  const orig = readMeta(source)
  const patch: ChartMeta = {}
  const keys = new Set<MetaKey>([...(Object.keys(orig) as MetaKey[]), ...(Object.keys(next) as MetaKey[])])
  for (const key of keys) {
    const same = sameField(key, orig[key] ?? '', next[key] ?? '')
    if (same && !(touched.value.has(key) && (next[key] ?? '').trim() === '')) continue
    patch[key] = next[key] ?? ''
  }
  return patch
}

/**
 * `{title:}` then `{t:Second}`: readMeta is empty and parse shows Second.
 * A clear the user typed must remove that alias. A tempo save must not.
 */
function explicitIdentityClears(source: string, next: ChartMeta): MetaKey[] {
  let shown: { title?: string; subtitle?: string; artist?: string }
  try {
    shown = parse(source).meta
  } catch {
    return []
  }
  const read = readMeta(source)
  const out: MetaKey[] = []
  for (const key of IDENTITY_CLEAR) {
    if (!touched.value.has(key)) continue
    if ((next[key] ?? '').trim() !== '') continue
    if ((read[key] ?? '').trim() !== '') continue
    if ((shown[key] ?? '').trim() === '') continue
    out.push(key)
  }
  return out
}

function commitMeta(source: string, next: ChartMeta): string {
  let out = writeMeta(source, fieldsToWrite(source, next))
  for (const key of explicitIdentityClears(source, next)) {
    out = writeMeta(out, { [key]: '' }, { target: 'song' })
  }
  return out
}

function apply() {
  const next = { ...meta.value, duration: durationToWrite(meta.value.duration ?? '') }
  meta.value = next
  emit('apply', commitMeta(props.source, next))
}

function rewriteDeclared() {
  const target = String(meta.value.key ?? '').trim()
  if (!target) return
  const r = rewriteToKey(props.source, target)
  if (!r?.changed) return
  emit('apply', r.source)
}

function resetEnrich() {
  enrichPhase.value = 'idle'
  enrichErr.value = ''
  enrichNote.value = ''
  proposal.value = null
  ytPick.value = ''
  strumPick.value = 'keep'
}

const strumConflictNote = computed(() => {
  const c = proposal.value?.strumConflict
  if (!c) return ''
  const loc = c.local.patterns[c.local.activeIndex] ?? c.local.patterns[0]
  const rem = c.remote.patterns[0]
  const localBit = loc
    ? `${loc.label || 'Padrão'}${loc.bpm != null ? ` · ${loc.bpm} bpm` : ''}`
    : 'local'
  const remoteBit =
    c.remote.patterns.length > 1
      ? `${c.remote.patterns.length} padrões CC`
      : rem
        ? `${rem.label || 'Padrão'}${rem.bpm != null ? ` · ${rem.bpm} bpm` : ''}`
        : 'CC'
  return `Batida local (${localBit}) e Cifra Club (${remoteBit}) — escolha Manter ou Trazer CC.`
})

function askRestart() {
  restartAsk.value = true
}
function cancelRestart() {
  restartAsk.value = false
}
function confirmRestart() {
  restartAsk.value = false
  emit('restart')
}

async function runEnrich() {
  const u = enrichUrl.value.trim()
  if (!u) {
    enrichErr.value = 'Cole o endereço do Cifra Club'
    enrichPhase.value = 'error'
    return
  }
  if (!hostOk(u)) {
    enrichErr.value = 'Só cifraclub.com.br'
    enrichPhase.value = 'error'
    return
  }
  if (!props.fetchChart) {
    enrichErr.value = 'Buscar no Cifra Club não está disponível neste site'
    enrichPhase.value = 'error'
    return
  }
  enrichPhase.value = 'busy'
  enrichErr.value = ''
  try {
    const html = await props.fetchChart(u)
    const live = commitMeta(props.source, meta.value)
    const p = proposeCifraClubEnrich(live, html, { url: u })
    proposal.value = p
    ytPick.value = ''
    strumPick.value = 'keep'
    if (p.youtube) {
      enrichPhase.value = 'youtube'
      enrichNote.value = p.capoWarning ?? ''
    } else {
      enrichPhase.value = 'preview'
      enrichNote.value = p.capoWarning ?? ''
    }
  } catch {
    enrichErr.value = 'Não deu para ler essa página no Cifra Club'
    enrichPhase.value = 'error'
  }
}

function onEnrichPaste(e: ClipboardEvent) {
  const t = (e.clipboardData?.getData('text') ?? '').trim()
  if (!hostOk(t)) return
  e.preventDefault()
  enrichUrl.value = t
  enrichErr.value = ''
  if (props.fetchChart) void runEnrich()
}

async function fillDuration(id: string, m: ChartMeta): Promise<ChartMeta> {
  if (!id || !props.fetchYoutubeDuration) return m
  if (String(m.duration ?? '').trim()) return m
  try {
    const raw = await props.fetchYoutubeDuration(id)
    const dur =
      /^\d{1,2}:\d{2}$/.test(raw.trim()) || /^\d+:\d{2}:\d{2}$/.test(raw.trim())
        ? normalizeDurationMmSs(raw.trim())
        : durationFromYoutubeHtml(raw)
    if (dur) return { ...m, duration: dur }
  } catch {
    /* keep asking on the form */
  }
  return m
}

async function commitEnrich() {
  const p = proposal.value
  if (!p) return
  if (p.youtube && !ytPick.value) {
    enrichErr.value = 'Escolha qual vídeo usar, ou pule o YouTube'
    return
  }
  enrichPhase.value = 'busy'
  enrichErr.value = ''
  const youtubeId =
    ytPick.value === 'remote'
      ? p.youtube?.remoteId
      : ytPick.value === 'local'
        ? p.youtube?.localId
        : null
  const live = commitMeta(props.source, meta.value)
  let strum: CcStrumChoice = 'keep'
  if (p.strumConflict && strumPick.value === 'replace') {
    strum = trazerCcStrumChoice(p.strumConflict)
  }
  let next = applyCifraClubEnrich(live, p, { youtubeId: youtubeId || null, strum })
  let m = readMeta(next)
  if (youtubeId) m = await fillDuration(youtubeId, m)
  next = commitMeta(next, m)
  meta.value = { ...m }
  keyEdit.value = !String(m.key ?? '').trim()
  emit('apply', next)
}

onMounted(() => {
  titleEl.value?.focus()
  titleEl.value?.select()
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
      aria-label="Metadados da cifra"
      data-meta-dialog
      :style="{ maxWidth: geom.max, maxHeight: geom.maxH, padding: geom.pad, borderRadius: geom.radius, background: 'var(--canvas)' }"
      style="position:relative;width:100%;overflow-y:auto;overscroll-behavior:contain;border:1px solid var(--line);box-shadow:var(--shadow);display:flex;flex-direction:column;gap:14px;animation:cpv-rise .2s ease-out;"
    >
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div style="display:flex;flex-direction:column;gap:6px;min-width:0;">
          <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Metadados</span>
          <span style="font-size:20px;font-weight:700;letter-spacing:-0.03em;line-height:1.2;">Identificação da cifra</span>
          <span style="font-size:12.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">Título, tom, andamento, compasso e duração — o que a leitura e a rolagem precisam.</span>
        </div>
        <button class="cpv-ghost" aria-label="Fechar" style="flex:none;width:32px;height:32px;border-radius:10px;color:var(--muted);" @click="emit('close')"><CpvIcon name="x" :size="16" /></button>
      </div>

      <!-- Cifra Club enrich (meta only) -->
      <div
        data-meta-enrich
        style="display:flex;flex-direction:column;gap:10px;padding:12px 14px;border-radius:15px;background:var(--surface);border:1px solid var(--line);"
      >
        <div style="display:flex;flex-direction:column;gap:4px;">
          <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Cifra Club</span>
          <span style="font-size:13px;font-weight:700;letter-spacing:-0.02em;">Completar com Cifra Club</span>
          <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Traz batida, YouTube e o que faltar — sem substituir a cifra.</span>
        </div>

        <template v-if="!canFetch">
          <span data-meta-enrich-unavailable style="font-size:12px;line-height:1.45;color:var(--muted);">Buscar no Cifra Club não está disponível — o site precisa buscar a página.</span>
        </template>
        <template v-else>
          <div style="display:flex;gap:8px;align-items:stretch;">
            <input
              v-model="enrichUrl"
              type="url"
              data-meta-enrich-url
              placeholder="cifraclub.com.br/artista/musica"
              spellcheck="false"
              :disabled="enrichPhase === 'busy'"
              style="flex:1;min-width:0;height:40px;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:var(--canvas);color:var(--text);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:11.5px;"
              @paste="onEnrichPaste"
              @keydown.enter.prevent="runEnrich"
            >
            <button
              data-meta-enrich-fetch
              :disabled="enrichPhase === 'busy'"
              style="flex:none;height:40px;padding:0 14px;border:0;border-radius:12px;background:var(--chord);color:var(--chord-ink);font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;"
              @click="runEnrich"
            >{{ enrichPhase === 'busy' ? 'Buscando…' : 'Buscar' }}</button>
          </div>
        </template>

        <span v-if="enrichPhase === 'error' && enrichErr" data-meta-enrich-error style="font-size:12px;line-height:1.45;color:var(--danger);">{{ enrichErr }}</span>

        <!-- YouTube ask -->
        <div
          v-if="enrichPhase === 'youtube' && proposal?.youtube"
          data-meta-enrich-youtube
          style="display:flex;flex-direction:column;gap:10px;padding-top:4px;"
        >
          <div style="display:flex;flex-direction:column;gap:4px;">
            <span style="font-size:12.5px;font-weight:700;">Qual vídeo é o certo?</span>
            <span data-meta-enrich-yt-title style="font-size:12px;color:var(--muted);">{{ proposal.youtube.songTitle }}</span>
          </div>
          <div :style="{ gridTemplateColumns: props.compact ? '1fr' : '1fr 1fr' }" style="display:grid;gap:10px;">
            <div
              v-if="proposal.youtube.remoteId"
              data-meta-enrich-yt-remote
              :style="chip(ytPick === 'remote')"
              style="display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid;border-radius:14px;cursor:pointer;"
              @click="ytPick = 'remote'"
            >
              <span style="font-size:11px;font-weight:700;">Cifra Club</span>
              <a
                :href="proposal.youtube.remoteUrl"
                target="_blank"
                rel="noopener noreferrer"
                data-meta-enrich-yt-remote-link
                style="font-size:10.5px;font-family:var(--cpv-font-chords,'Space Mono',monospace);color:var(--chord);text-decoration:none;word-break:break-all;"
                @click.stop
              >{{ proposal.youtube.remoteUrl }}</a>
              <div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000;">
                <iframe
                  :src="youtubeEmbedUrl(proposal.youtube.remoteId)"
                  title="YouTube Cifra Club"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                  style="position:absolute;inset:0;width:100%;height:100%;border:0;"
                />
              </div>
              <button
                type="button"
                data-meta-enrich-yt-pick-remote
                :style="chip(ytPick === 'remote')"
                style="height:34px;border:1px solid;border-radius:10px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;"
                @click.stop="ytPick = 'remote'"
              >Usar este</button>
            </div>
            <div
              v-if="proposal.youtube.localId"
              data-meta-enrich-yt-local
              :style="chip(ytPick === 'local')"
              style="display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid;border-radius:14px;cursor:pointer;"
              @click="ytPick = 'local'"
            >
              <span style="font-size:11px;font-weight:700;">Já na cifra</span>
              <a
                :href="proposal.youtube.localUrl"
                target="_blank"
                rel="noopener noreferrer"
                data-meta-enrich-yt-local-link
                style="font-size:10.5px;font-family:var(--cpv-font-chords,'Space Mono',monospace);color:var(--chord);text-decoration:none;word-break:break-all;"
                @click.stop
              >{{ proposal.youtube.localUrl }}</a>
              <div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000;">
                <iframe
                  :src="youtubeEmbedUrl(proposal.youtube.localId)"
                  title="YouTube local"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                  style="position:absolute;inset:0;width:100%;height:100%;border:0;"
                />
              </div>
              <button
                type="button"
                data-meta-enrich-yt-pick-local
                :style="chip(ytPick === 'local')"
                style="height:34px;border:1px solid;border-radius:10px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;"
                @click.stop="ytPick = 'local'"
              >Usar este</button>
            </div>
          </div>
          <button
            type="button"
            data-meta-enrich-yt-skip
            style="align-self:flex-start;height:30px;padding:0 10px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--muted);font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;"
            @click="ytPick = 'skip'"
          >Pular YouTube</button>
        </div>

        <!-- Preview patch -->
        <div
          v-if="(enrichPhase === 'preview' || enrichPhase === 'youtube') && proposal"
          data-meta-enrich-preview
          style="display:flex;flex-direction:column;gap:6px;"
        >
          <span v-if="patchLabels.length" style="font-size:12px;line-height:1.45;color:var(--text);">
            Vai preencher: <strong>{{ patchLabels.join(', ') }}</strong>
          </span>
          <span v-else style="font-size:12px;line-height:1.45;color:var(--muted);">Nada novo além do que você escolher no YouTube.</span>
          <span
            v-if="proposal.strumMissing"
            data-meta-enrich-no-strum
            style="font-size:12px;line-height:1.45;color:var(--muted);text-wrap:pretty;"
          >Cifra Club não traz batida nesta página (o menu Batidas pode aparecer vazio).</span>
          <div
            v-if="proposal.strumConflict"
            data-meta-enrich-strum-conflict
            style="display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-radius:12px;background:var(--canvas);border:1px solid var(--line);"
          >
            <span style="font-size:12px;line-height:1.45;color:var(--text);text-wrap:pretty;">{{ strumConflictNote }}</span>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button
                type="button"
                data-meta-enrich-strum-keep
                :style="chip(strumPick === 'keep')"
                style="height:34px;padding:0 12px;border:1px solid;border-radius:10px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;"
                @click="strumPick = 'keep'"
              >Manter</button>
              <button
                type="button"
                data-meta-enrich-strum-replace
                :style="chip(strumPick === 'replace')"
                style="height:34px;padding:0 12px;border:1px solid;border-radius:10px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;"
                @click="strumPick = 'replace'"
              >Trazer CC</button>
            </div>
            <span
              v-if="strumPick === 'replace' && (proposal.strumConflict.local.patterns.length > 1 || proposal.strumConflict.remote.patterns.length > 1)"
              style="font-size:11px;line-height:1.45;color:var(--muted);text-wrap:pretty;"
            >A batida ativa local fica como cópia nomeada; os padrões do Cifra Club entram ativos.</span>
          </div>
          <span
            v-for="c in proposal.conflicts"
            :key="c.key"
            data-meta-enrich-conflict
            style="font-size:11.5px;line-height:1.45;color:var(--muted);"
          >Mantido local: {{ MISSING_LABEL[c.key] ?? c.key }} {{ c.local }} (CC {{ c.remote }})</span>
          <span v-if="enrichNote || proposal.capoWarning" data-meta-enrich-capo style="font-size:11.5px;line-height:1.45;color:var(--muted);">{{ enrichNote || proposal.capoWarning }}</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px;">
            <button
              data-meta-enrich-apply
              :disabled="Boolean(proposal.youtube && !ytPick)"
              style="height:40px;padding:0 16px;border:0;border-radius:12px;background:var(--chord);color:var(--chord-ink);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;"
              @click="commitEnrich"
            >Trazer metadados</button>
            <button
              data-meta-enrich-cancel
              style="height:40px;padding:0 12px;border:0;border-radius:12px;background:transparent;color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;"
              @click="resetEnrich"
            >Cancelar busca</button>
          </div>
          <span v-if="enrichErr" data-meta-enrich-error style="font-size:12px;color:var(--danger);">{{ enrichErr }}</span>
        </div>

        <div
          v-if="props.allowRestart"
          data-meta-restart-box
          style="display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px solid var(--line-soft);"
        >
          <template v-if="!restartAsk">
            <button
              type="button"
              data-meta-restart
              style="align-self:flex-start;min-height:36px;padding:0;border:0;background:transparent;color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:3px;"
              @click="askRestart"
            >Começar de novo</button>
            <span style="font-size:11px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Abre Nova cifra (importar ou branco). A cifra atual só some quando você concluir.</span>
          </template>
          <div
            v-else
            data-meta-restart-confirm-panel
            style="display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:12px;background:var(--canvas);border:1px solid var(--danger);"
          >
            <span style="font-size:12.5px;font-weight:700;color:var(--text);">Substituir esta cifra?</span>
            <span style="font-size:12px;line-height:1.45;color:var(--muted);text-wrap:pretty;">
              Abre Nova cifra para importar do Cifra Club ou começar do zero. Ao concluir, esta cifra é substituída. Cancelar Nova cifra mantém o que está aqui.
            </span>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button
                type="button"
                data-meta-restart-confirm
                style="height:40px;padding:0 14px;border:0;border-radius:12px;background:var(--danger);color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;"
                @click="confirmRestart"
              >Sim, abrir Nova cifra</button>
              <button
                type="button"
                data-meta-restart-cancel
                style="height:40px;padding:0 12px;border:0;border-radius:12px;background:transparent;color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;"
                @click="cancelRestart"
              >Cancelar</button>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:15px;background:var(--surface);border:1px solid var(--line-soft);">
        <input
          ref="titleEl"
          :value="meta.title ?? ''"
          data-meta-title
          placeholder="Nome da música"
          :style="{ fontSize: geom.titleSize }"
          style="width:100%;border:0;background:transparent;color:var(--text);font-family:inherit;font-weight:700;letter-spacing:-0.02em;padding:4px 0;"
          @input="setMeta('title', ($event.target as HTMLInputElement).value)"
        >
        <input
          :value="meta.subtitle ?? ''"
          data-meta-subtitle
          placeholder="Artista ou ministério"
          style="width:100%;border:0;background:transparent;color:var(--muted);font-family:inherit;font-size:13px;font-weight:500;padding:4px 0;"
          @input="setMeta('subtitle', ($event.target as HTMLInputElement).value)"
        >
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
            data-meta-duration
            :style="{ fontSize: meta.duration ? '22px' : '16px' }"
            style="flex:1;min-width:0;height:36px;border:0;background:transparent;color:var(--text);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-weight:700;letter-spacing:-0.02em;"
            @input="onDurationInput"
            @blur="onDurationBlur"
          >
          <span style="font-size:11px;color:var(--muted);">MM:SS</span>
        </div>
        <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Tempo da música, como no YouTube. A rolagem automática precisa disso.</span>
      </div>

      <div :style="{ gridTemplateColumns: geom.cols }" style="display:grid;gap:9px;">
        <div :style="{ borderColor: edge('tempo') }" style="display:flex;flex-direction:column;gap:7px;padding:10px 12px;border-radius:14px;background:var(--surface);border:1px solid;">
          <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Andamento {{ flag('tempo') }}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <button class="cpv-ghost" aria-label="Diminuir" style="flex:none;width:32px;height:32px;border:1px solid var(--line);border-radius:10px;font-size:15px;" @click="bpmStep(-1)">−</button>
            <input
              :value="meta.tempo ?? ''"
              inputmode="numeric"
              placeholder="—"
              data-meta-tempo
              style="flex:1;min-width:0;height:32px;border:0;background:transparent;color:var(--text);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:16px;font-weight:700;text-align:center;"
              @input="setMeta('tempo', ($event.target as HTMLInputElement).value.replace(/[^\d]/g, '').slice(0, 3))"
            >
            <button class="cpv-ghost" aria-label="Aumentar" style="flex:none;width:32px;height:32px;border:1px solid var(--line);border-radius:10px;font-size:15px;" @click="bpmStep(1)">+</button>
            <span style="font-size:10.5px;color:var(--muted);">bpm</span>
          </div>
          <button data-meta-tap style="align-self:flex-start;height:28px;padding:0 10px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--muted);font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;" @click="tapTempo">{{ tapLabel }}</button>
        </div>

        <div :style="{ borderColor: edge('time') }" style="display:flex;flex-direction:column;gap:7px;padding:10px 12px;border-radius:14px;background:var(--surface);border:1px solid;">
          <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Compasso {{ flag('time') }}</span>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            <button
              v-for="t in TIMES"
              :key="t"
              :data-meta-time="t"
              :style="chip(meta.time === t)"
              style="height:32px;padding:0 12px;border:1px solid;border-radius:10px;font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:12.5px;font-weight:700;cursor:pointer;"
              @click="setMeta('time', t)"
            >{{ t }}</button>
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
          <span data-meta-key-shown style="font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:22px;font-weight:700;color:var(--chord);">{{ meta.key }}</span>
        </div>
        <template v-else>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            <button
              v-for="r in SHARP"
              :key="r"
              :data-meta-key="r"
              :style="chip(keyRoot === r)"
              style="min-width:34px;height:30px;padding:0 7px;border:1px solid;border-radius:9px;font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:11.5px;font-weight:700;cursor:pointer;"
              @click="pickKey(r)"
            >{{ r }}</button>
          </div>
          <button :style="chip(minor)" style="align-self:flex-start;height:28px;padding:0 10px;border:1px solid;border-radius:9px;font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;" @click="toggleMinor">menor (m)</button>
        </template>
        <div
          v-if="keyMismatch && writtenKey && meta.key"
          data-meta-rewrite
          style="display:flex;flex-direction:column;gap:8px;padding:10px 0 0;border-top:1px solid var(--line);"
        >
          <span style="font-size:12px;line-height:1.45;color:var(--muted);text-wrap:pretty;">
            Os acordes estão em <strong style="color:var(--text);">{{ writtenKey }}</strong>, o tom declarado é
            <strong style="color:var(--text);">{{ meta.key }}</strong>. Reescrever grava a cifra em {{ meta.key }} e guarda o transpose para continuar soando {{ writtenKey }}.
          </span>
          <button
            type="button"
            data-meta-rewrite-go
            style="height:36px;border:0;border-radius:11px;background:var(--chord-fill);color:var(--chord);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;"
            @click="rewriteDeclared"
          >Reescrever em {{ meta.key }}</button>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:4px;padding:8px 12px;border-radius:14px;background:var(--surface);border:1px solid var(--line-soft);">
        <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Referência</span>
        <input
          :value="meta.x_source ?? ''"
          data-meta-source
          placeholder="Link de onde veio, ou vídeo de referência"
          spellcheck="false"
          style="width:100%;height:30px;border:0;background:transparent;color:var(--text);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:11.5px;"
          @input="setMeta('x_source', ($event.target as HTMLInputElement).value)"
        >
      </div>

      <div style="display:flex;flex-direction:column;gap:4px;">
        <span v-if="softMissing.length" style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">Falta {{ missingList }}. Dá para aplicar e completar depois.</span>
        <span v-if="durationMissing" style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">{{ durationNote }}</span>
      </div>

      <div style="position:sticky;bottom:0;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0 0;margin-top:4px;background:var(--canvas);border-top:1px solid var(--line-soft);">
        <button style="min-height:40px;padding:0 12px;border:0;border-radius:11px;background:transparent;color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;" @click="emit('close')">Cancelar</button>
        <button
          data-meta-apply
          style="height:48px;padding:0 20px;border:0;border-radius:13px;background:var(--chord);color:var(--chord-ink);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;"
          @click="apply"
        >Aplicar</button>
      </div>
    </div>
  </div>
</template>

<style>
[data-meta-dialog] input::placeholder {
  color: var(--muted);
  font-weight: 500;
  opacity: 0.85;
}
[data-meta-dialog] [data-meta-duration]::placeholder {
  font-size: 16px;
  letter-spacing: 0.08em;
}
</style>
