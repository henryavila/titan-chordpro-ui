<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import TitanChordproIconButton from '../ui/TitanChordproIconButton.vue'
import TitanChordproActionButton from '../ui/TitanChordproActionButton.vue'
import TitanChordproChartIdentityFields from '../ui/TitanChordproChartIdentityFields.vue'
import TitanChordproChip from '../ui/TitanChordproChip.vue'
import {
  applyCifraClubEnrich,
  detectKeyRewrite,
  durationFromYoutubeHtml,
  hostOk,
  missingOf,
  MISSING_LABEL,
  normalizeDurationMmSs,
  proposeCifraClubEnrich,
  readMeta,
  rewriteToKey,
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

const props = withDefaults(
  defineProps<{
    compact: boolean
    source: string
    /** Começar de novo / Nova cifra — only in “Para todos” (content) edit. */
    allowRestart?: boolean
    fetchChart?: (url: string) => Promise<string>
    fetchYoutubeDuration?: (videoId: string) => Promise<string>
    /** When false, Completar com Cifra Club is marked and fetch is refused. */
    online?: boolean
  }>(),
  { online: true },
)
const emit = defineEmits<{ close: []; apply: [source: string]; restart: [] }>()

const meta = ref<ChartMeta>({ ...readMeta(props.source) })
const keyEdit = ref(!String(readMeta(props.source).key ?? '').trim())
const fieldsEl = ref<{ focusTitle: () => void } | null>(null)

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
const activePane = ref<'chart' | 'extras'>('chart')
const bodyEl = ref<HTMLElement | null>(null)
const chartTabEl = ref<HTMLButtonElement | null>(null)
const extrasTabEl = ref<HTMLButtonElement | null>(null)

function showPane(pane: 'chart' | 'extras') {
  activePane.value = pane
  if (bodyEl.value) bodyEl.value.scrollTop = 0
}

function onTabKey(e: KeyboardEvent) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  e.preventDefault()
  showPane(activePane.value === 'chart' ? 'extras' : 'chart')
  void nextTick(() => (activePane.value === 'chart' ? chartTabEl.value : extrasTabEl.value)?.focus())
}

const canFetch = computed(() => !!props.fetchChart)
const netOk = computed(() => props.online !== false)
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
const liveSource = computed(() => writeMeta(props.source, meta.value))
const keyRewrite = computed(() => detectKeyRewrite(liveSource.value))
const fileCapo = computed(() => Math.max(0, Number(meta.value.capo) || 0))
const enrichRewrite = ref<'go' | 'keep' | null>(null)

const patchLabels = computed(() => {
  const p = proposal.value?.patch
  if (!p) return [] as string[]
  const out: string[] = []
  if (p.x_titan_strum) out.push('batida (x_titan_strum)')
  if (p.x_titan_source) out.push('origem')
  for (const k of ['title', 'subtitle', 'key', 'tempo', 'time', 'duration'] as const) {
    if (p[k]) out.push(MISSING_LABEL[k] ?? k)
  }
  return out
})

function setMeta(k: MetaKey, v: string) {
  meta.value = { ...meta.value, [k]: v }
}

function apply() {
  const next = { ...meta.value, duration: normalizeDurationMmSs(meta.value.duration ?? '') }
  meta.value = next
  emit('apply', writeMeta(props.source, next))
}

function rewriteDeclared() {
  const offer = keyRewrite.value
  const target = String(meta.value.key ?? '').trim()
  if (!offer || !target) return
  const r = rewriteToKey(liveSource.value, target)
  if (!r?.changed) return
  meta.value = { ...readMeta(r.source) }
  emit('apply', r.source)
}

function resetEnrich() {
  enrichPhase.value = 'idle'
  enrichErr.value = ''
  enrichNote.value = ''
  proposal.value = null
  ytPick.value = ''
  strumPick.value = 'keep'
  enrichRewrite.value = null
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
  if (!netOk.value) {
    enrichErr.value = 'Sem internet. Use Arquivo ou Texto.'
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
    const live = writeMeta(props.source, meta.value)
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
  if (!netOk.value) {
    enrichErr.value = 'Sem internet. Use Arquivo ou Texto.'
    enrichPhase.value = 'error'
    return
  }
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
  const live = writeMeta(props.source, meta.value)
  let strum: CcStrumChoice = 'keep'
  if (p.strumConflict && strumPick.value === 'replace') {
    strum = trazerCcStrumChoice(p.strumConflict)
  }
  let next = applyCifraClubEnrich(live, p, { youtubeId: youtubeId || null, strum })
  let m = readMeta(next)
  if (youtubeId) m = await fillDuration(youtubeId, m)
  next = writeMeta(next, m)
  if (p.keyRewrite && enrichRewrite.value === 'go') {
    const done = rewriteToKey(next, p.keyRewrite.declaredKey)
    if (done?.changed) next = done.source
    m = readMeta(next)
  }
  meta.value = { ...m }
  keyEdit.value = !String(m.key ?? '').trim()
  emit('apply', next)
}

onMounted(() => {
  if (props.compact) {
    chartTabEl.value?.focus()
    return
  }
  fieldsEl.value?.focusTitle()
})
</script>

<template>
  <div class="titan-chordpro-meta-overlay" :class="{ 'is-compact': props.compact }">
    <div class="titan-chordpro-scrim" @click="emit('close')" />
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Metadados da cifra"
      data-meta-dialog
      class="titan-chordpro-meta-dialog"
    >
      <div class="titan-chordpro-meta-header">
        <div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
          <span class="titan-chordpro-modal-kicker">Editar cifra</span>
          <span style="font-size:20px;font-weight:700;letter-spacing:-0.03em;line-height:1.2;">Metadados</span>
        </div>
        <TitanChordproIconButton icon="x" density="workbench" muted aria-label="Fechar" @click="emit('close')" />
      </div>

      <div v-if="props.compact" class="titan-chordpro-meta-tabs" role="tablist" aria-label="Áreas dos metadados">
        <button id="titan-chordpro-meta-chart-tab" ref="chartTabEl" type="button" role="tab" data-meta-tab="chart" aria-controls="titan-chordpro-meta-chart-panel" :aria-selected="activePane === 'chart'" :tabindex="activePane === 'chart' ? 0 : -1" :class="{ 'is-active': activePane === 'chart' }" @click="showPane('chart')" @keydown="onTabKey">Dados da música</button>
        <button id="titan-chordpro-meta-extras-tab" ref="extrasTabEl" type="button" role="tab" data-meta-tab="extras" aria-controls="titan-chordpro-meta-extras-panel" :aria-selected="activePane === 'extras'" :tabindex="activePane === 'extras' ? 0 : -1" :class="{ 'is-active': activePane === 'extras' }" @click="showPane('extras')" @keydown="onTabKey">Referências e ações</button>
      </div>

      <div ref="bodyEl" class="titan-chordpro-meta-body">
      <section id="titan-chordpro-meta-chart-panel" v-show="!props.compact || activePane === 'chart'" class="titan-chordpro-meta-chart" :role="props.compact ? 'tabpanel' : 'region'" :aria-labelledby="props.compact ? 'titan-chordpro-meta-chart-tab' : undefined" aria-label="Dados da música">
      <div v-if="!props.compact" class="titan-chordpro-meta-section-head">
        <strong>Dados da música</strong>
        <span>Identificação e tempo</span>
      </div>
      <TitanChordproChartIdentityFields
        ref="fieldsEl"
        :meta="meta"
        missing-edge="soft"
        chip-hook="meta"
        v-model:key-edit="keyEdit"
        duration-hint="Necessária para a rolagem automática."
        @patch="setMeta"
      >
        <template #key-extra>
        <span
          v-if="fileCapo"
          data-meta-capo-hint
          style="font-size:11.5px;line-height:1.45;color:var(--muted);"
        >Cifra sugere capo {{ fileCapo }}</span>
        <div
          v-if="keyRewrite"
          data-meta-rewrite
          style="display:flex;flex-direction:column;gap:8px;padding:10px 0 0;border-top:1px solid var(--line);"
        >
          <span style="font-size:12px;line-height:1.45;color:var(--muted);text-wrap:pretty;">
            Declarado: <strong style="color:var(--text);">{{ keyRewrite.declaredKey }}</strong>.
            Escrito: <strong style="color:var(--text);">{{ keyRewrite.writtenKey }}</strong>.
            Reescrever guarda o original ({{ keyRewrite.declaredKey }}) e continua tocando em {{ keyRewrite.writtenKey }}.
          </span>
          <button
            type="button"
            data-meta-rewrite-go
            style="height:36px;border:0;border-radius:11px;background:var(--chord-fill);color:var(--chord);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;"
            @click="rewriteDeclared"
          >Reescrever em {{ keyRewrite.declaredKey }}</button>
        </div>
        </template>
      </TitanChordproChartIdentityFields>

      <div class="titan-chordpro-meta-notes">
        <span v-if="softMissing.length" style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">Falta {{ missingList }}. Dá para aplicar e completar depois.</span>
        <span v-if="durationMissing" style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">{{ durationNote }}</span>
      </div>
      </section>

      <section id="titan-chordpro-meta-extras-panel" v-show="!props.compact || activePane === 'extras'" class="titan-chordpro-meta-extras" :role="props.compact ? 'tabpanel' : 'region'" :aria-labelledby="props.compact ? 'titan-chordpro-meta-extras-tab' : undefined" aria-label="Referências e ações">
      <div v-if="!props.compact" class="titan-chordpro-meta-section-head">
        <strong>Referências e ações</strong>
        <span>Complete sem alterar a letra</span>
      </div>

      <!-- Cifra Club enrich (meta only) -->
      <div
        data-meta-enrich
        style="display:flex;flex-direction:column;gap:10px;padding:12px 14px;border-radius:15px;background:var(--surface);border:1px solid var(--line);"
      >
        <div style="display:flex;flex-direction:column;gap:4px;">
          <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Cifra Club</span>
          <span style="font-size:13px;font-weight:700;letter-spacing:-0.02em;">Completar com Cifra Club</span>
          <span v-if="canFetch && netOk" style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Traz batida, YouTube e o que faltar — sem substituir a cifra.</span>
          <span v-else-if="canFetch" data-offline-hint style="font-size:12px;font-weight:700;color:var(--muted);">Sem internet</span>
        </div>

        <template v-if="!canFetch">
          <span data-meta-enrich-unavailable style="font-size:12px;line-height:1.45;color:var(--muted);">A busca não está disponível neste app.</span>
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
              class="titan-chordpro-meta-url"
              @paste="onEnrichPaste"
              @keydown.enter.prevent="runEnrich"
            >
            <TitanChordproActionButton
              data-meta-enrich-fetch
              size="md"
              style="flex:none"
              :disabled="enrichPhase === 'busy'"
              @click="runEnrich"
            >{{ enrichPhase === 'busy' ? 'Buscando…' : 'Buscar' }}</TitanChordproActionButton>
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
            <TitanChordproChip
              v-if="proposal.youtube.remoteId"
              static
              size="pad"
              data-meta-enrich-yt-remote
              :class="{ 'is-on': ytPick === 'remote' }"
              @click="ytPick = 'remote'"
            >
              <span style="font-size:11px;font-weight:700;">Cifra Club</span>
              <a
                :href="proposal.youtube.remoteUrl"
                target="_blank"
                rel="noopener noreferrer"
                data-meta-enrich-yt-remote-link
                style="font-size:10.5px;font-family:var(--titan-chordpro-font-chords,'Space Mono',monospace);color:var(--chord);text-decoration:none;word-break:break-all;"
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
              <TitanChordproChip
                data-meta-enrich-yt-pick-remote
                size="choice"
                :on="ytPick === 'remote'"
                @click.stop="ytPick = 'remote'"
              >Usar este</TitanChordproChip>
            </TitanChordproChip>
            <TitanChordproChip
              v-if="proposal.youtube.localId"
              static
              size="pad"
              data-meta-enrich-yt-local
              :class="{ 'is-on': ytPick === 'local' }"
              @click="ytPick = 'local'"
            >
              <span style="font-size:11px;font-weight:700;">Já na cifra</span>
              <a
                :href="proposal.youtube.localUrl"
                target="_blank"
                rel="noopener noreferrer"
                data-meta-enrich-yt-local-link
                style="font-size:10.5px;font-family:var(--titan-chordpro-font-chords,'Space Mono',monospace);color:var(--chord);text-decoration:none;word-break:break-all;"
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
              <TitanChordproChip
                data-meta-enrich-yt-pick-local
                size="choice"
                :on="ytPick === 'local'"
                @click.stop="ytPick = 'local'"
              >Usar este</TitanChordproChip>
            </TitanChordproChip>
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
              <TitanChordproChip data-meta-enrich-strum-keep size="choice" :on="strumPick === 'keep'" @click="strumPick = 'keep'">Manter</TitanChordproChip>
              <TitanChordproChip data-meta-enrich-strum-replace size="choice" :on="strumPick === 'replace'" @click="strumPick = 'replace'">Trazer CC</TitanChordproChip>
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
          <div
            v-if="proposal.keyRewrite"
            data-meta-enrich-rewrite
            style="display:flex;flex-direction:column;gap:8px;padding:8px 0 0;"
          >
            <span style="font-size:12px;line-height:1.45;color:var(--muted);text-wrap:pretty;">
              Declarado: <strong style="color:var(--text);">{{ proposal.keyRewrite.declaredKey }}</strong>.
              Escrito: <strong style="color:var(--text);">{{ proposal.keyRewrite.writtenKey }}</strong>.
            </span>
            <TitanChordproChip data-meta-enrich-rewrite-go size="choice" :on="enrichRewrite === 'go'" @click="enrichRewrite = 'go'">Reescrever em {{ proposal.keyRewrite.declaredKey }}</TitanChordproChip>
            <TitanChordproChip data-meta-enrich-rewrite-keep size="choice" :on="enrichRewrite === 'keep'" @click="enrichRewrite = 'keep'">Manter</TitanChordproChip>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px;">
            <TitanChordproActionButton
              data-meta-enrich-apply
              size="md"
              :disabled="Boolean(proposal.youtube && !ytPick)"
              @click="commitEnrich"
            >Trazer metadados</TitanChordproActionButton>
            <TitanChordproActionButton data-meta-enrich-cancel tone="ghost" @click="resetEnrich">Cancelar busca</TitanChordproActionButton>
          </div>
          <span v-if="enrichErr" data-meta-enrich-error style="font-size:12px;color:var(--danger);">{{ enrichErr }}</span>
        </div>

      </div>

      <div class="titan-chordpro-meta-reference" style="display:flex;flex-direction:column;gap:8px;padding:12px 14px;border-radius:15px;background:var(--surface);border:1px solid var(--line);">
        <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Referência</span>
        <input
          :value="meta.x_titan_source ?? ''"
          data-meta-source
          type="url"
          inputmode="url"
          autocomplete="url"
          aria-label="Link de referência"
          placeholder="Link de onde veio, ou vídeo de referência"
          spellcheck="false"
          class="titan-chordpro-meta-url"
          @input="setMeta('x_titan_source', ($event.target as HTMLInputElement).value)"
        >
      </div>

        <div
          v-if="props.allowRestart"
          data-meta-restart-box
          class="titan-chordpro-meta-restart"
        >
          <template v-if="!restartAsk">
            <span class="titan-chordpro-modal-kicker">Nova cifra</span>
            <button
              type="button"
              data-meta-restart
              style="align-self:flex-start;min-height:36px;padding:0;border:0;background:transparent;color:var(--text);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;text-decoration:underline;text-underline-offset:3px;"
              @click="askRestart"
            >Começar de novo</button>
            <span style="font-size:11px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Importe outra música ou comece em branco.</span>
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
              <TitanChordproActionButton data-meta-restart-confirm tone="danger" size="md" @click="confirmRestart">Sim, abrir Nova cifra</TitanChordproActionButton>
              <TitanChordproActionButton data-meta-restart-cancel tone="ghost" @click="cancelRestart">Cancelar</TitanChordproActionButton>
            </div>
          </div>
        </div>
      </section>
      </div>

      <div class="titan-chordpro-meta-footer">
        <TitanChordproActionButton tone="ghost" @click="emit('close')">Cancelar</TitanChordproActionButton>
        <TitanChordproActionButton data-meta-apply @click="apply">Aplicar</TitanChordproActionButton>
      </div>
    </div>
  </div>
</template>

<style>
.titan-chordpro-meta-overlay {
  position: absolute;
  inset: 0;
  z-index: 47;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.titan-chordpro-meta-dialog {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(960px, 100%);
  height: min(660px, 100%);
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--canvas);
  box-shadow: var(--shadow);
  animation: titan-chordpro-rise .2s ease-out;
}
.titan-chordpro-meta-header,
.titan-chordpro-meta-footer {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 22px;
  background: var(--canvas);
}
.titan-chordpro-meta-header { border-bottom: 1px solid var(--line-soft); }
.titan-chordpro-meta-footer { border-top: 1px solid var(--line-soft); }
.titan-chordpro-meta-footer button {
  min-height: 44px;
}
.titan-chordpro-meta-body {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 22px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 20px 22px;
}
.titan-chordpro-meta-chart,
.titan-chordpro-meta-extras {
  display: flex;
  flex-direction: column;
  gap: 11px;
  min-width: 0;
}
.titan-chordpro-meta-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 0 2px 3px;
}
.titan-chordpro-meta-section-head strong { font-size: 13px; }
.titan-chordpro-meta-section-head span { color: var(--muted); font-size: 11px; }
.titan-chordpro-meta-notes {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}
.titan-chordpro-meta-tabs { display: none; }
.titan-chordpro-meta-overlay.is-compact {
  align-items: flex-end;
  padding: 0;
}
.titan-chordpro-meta-overlay.is-compact .titan-chordpro-meta-dialog {
  width: 100%;
  height: min(720px, 94%);
  border-radius: 22px 22px 0 0;
}
.titan-chordpro-meta-overlay.is-compact .titan-chordpro-meta-header { padding: 15px 16px 12px; }
.titan-chordpro-meta-overlay.is-compact .titan-chordpro-meta-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  flex: none;
  padding: 0 12px 10px;
  border-bottom: 1px solid var(--line-soft);
}
.titan-chordpro-meta-tabs button {
  min-height: 42px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--muted);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.titan-chordpro-meta-tabs button.is-active {
  background: var(--chord-fill);
  color: var(--chord);
}
.titan-chordpro-meta-restart {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid var(--line-soft);
  border-radius: 15px;
  background: var(--surface);
}
.titan-chordpro-meta-url {
  flex: 1;
  width: 100%;
  min-width: 0;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--canvas);
  color: var(--text);
  font-family: var(--titan-chordpro-font-chords, 'Space Mono', monospace);
  font-size: 11.5px;
}
.titan-chordpro-meta-reference .titan-chordpro-meta-url { flex: none; }
.titan-chordpro-meta-overlay.is-compact .titan-chordpro-meta-body {
  display: block;
  padding: 14px 16px 22px;
}
.titan-chordpro-meta-overlay.is-compact .titan-chordpro-meta-chart,
.titan-chordpro-meta-overlay.is-compact .titan-chordpro-meta-extras { gap: 10px; }
.titan-chordpro-meta-overlay.is-compact .titan-chordpro-meta-footer {
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
}
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
