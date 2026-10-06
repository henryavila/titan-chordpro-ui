<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import {
  detectKeyRewrite,
  normalizeDurationMmSs,
  readMeta,
  rewriteToKey,
  writeMeta,
  type ChartMeta,
  type MetaKey,
} from '@henryavila/titan-chordpro-ui'
import TitanChordproIconButton from '../ui/TitanChordproIconButton.vue'
import TitanChordproActionButton from '../ui/TitanChordproActionButton.vue'
import TitanChordproChartIdentityFields from '../ui/TitanChordproChartIdentityFields.vue'
import CifraClubEnrich from './ficha/CifraClubEnrich.vue'
import FichaGapNotes from './ficha/FichaGapNotes.vue'
import MetaRestart from './ficha/MetaRestart.vue'

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

const fileCapo = computed(() => Math.max(0, Number(meta.value.capo) || 0))
const liveSource = computed(() => writeMeta(props.source, meta.value))
const keyRewrite = computed(() => detectKeyRewrite(liveSource.value))

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

function onEnrichApply(next: string) {
  const m = readMeta(next)
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
        <FichaGapNotes :meta="meta" soft-tail="Dá para aplicar e completar depois." />
      </div>
      </section>

      <section id="titan-chordpro-meta-extras-panel" v-show="!props.compact || activePane === 'extras'" class="titan-chordpro-meta-extras" :role="props.compact ? 'tabpanel' : 'region'" :aria-labelledby="props.compact ? 'titan-chordpro-meta-extras-tab' : undefined" aria-label="Referências e ações">
      <div v-if="!props.compact" class="titan-chordpro-meta-section-head">
        <strong>Referências e ações</strong>
        <span>Complete sem alterar a letra</span>
      </div>

      <CifraClubEnrich
        :compact="props.compact"
        :source="props.source"
        :meta="meta"
        :fetch-chart="props.fetchChart"
        :fetch-youtube-duration="props.fetchYoutubeDuration"
        :online="props.online"
        @apply="onEnrichApply"
      />

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

      <MetaRestart v-if="props.allowRestart" @restart="emit('restart')" />
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
