<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CpvIcon from '../icon/CpvIcon.vue'
import {
  maskDurationMmSs,
  missingOf,
  MISSING_LABEL,
  normalizeDurationMmSs,
  readMeta,
  writeMeta,
  type ChartMeta,
  type MetaKey,
} from '@henryavila/titan-chordpro-ui'

/**
 * Full chart identity — title, artist, key, tempo, time, duration, reference.
 * The edit chrome only surfaces a door into this form; cramped header fields
 * cannot carry duration (auto-scroll) or time signature without burying them.
 */

const props = defineProps<{ compact: boolean; source: string }>()
const emit = defineEmits<{ close: []; apply: [source: string] }>()

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const TIMES = ['4/4', '3/4', '6/8', '2/4']

const meta = ref<ChartMeta>({ ...readMeta(props.source) })
const keyEdit = ref(!String(readMeta(props.source).key ?? '').trim())
const taps = ref<number[]>([])
const titleEl = ref<HTMLInputElement | null>(null)

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
        max: '480px',
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

function apply() {
  const next = { ...meta.value, duration: normalizeDurationMmSs(meta.value.duration ?? '') }
  meta.value = next
  emit('apply', writeMeta(props.source, next))
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
      </div>

      <div style="display:flex;flex-direction:column;gap:4px;padding:8px 12px;border-radius:14px;background:var(--surface);border:1px solid var(--line-soft);">
        <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Referência</span>
        <input
          :value="meta.x_origem ?? ''"
          data-meta-origem
          placeholder="Link de onde veio, ou vídeo de referência"
          spellcheck="false"
          style="width:100%;height:30px;border:0;background:transparent;color:var(--text);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:11.5px;"
          @input="setMeta('x_origem', ($event.target as HTMLInputElement).value)"
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
