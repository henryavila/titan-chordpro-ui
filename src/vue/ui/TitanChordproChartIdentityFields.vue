<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  maskDurationMmSs,
  missingOf,
  normalizeDurationMmSs,
  type ChartMeta,
  type MetaKey,
} from '@henryavila/titan-chordpro-ui'
import TitanChordproChip from './TitanChordproChip.vue'
import TitanChordproStepper from './TitanChordproStepper.vue'

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const TIMES = ['4/4', '3/4', '6/8', '2/4']

const props = withDefaults(
  defineProps<{
    meta: ChartMeta
    /** soft: missing field keeps a quiet line. chord: missing field uses the chord edge. */
    missingEdge?: 'soft' | 'chord'
    /** meta: data-meta-*. plain: data-time-chip / data-key-chip. */
    chipHook?: 'meta' | 'plain'
    keyEdit: boolean
    durationHint: string
    titleSize?: string
    /** Inline columns when the form is a grid. Empty uses the stylesheet. */
    columns?: string
    strict?: boolean
    showSource?: boolean
  }>(),
  { titleSize: '20px', strict: false, showSource: false, missingEdge: 'chord', chipHook: 'plain' },
)

const emit = defineEmits<{
  patch: [key: MetaKey, value: string]
  'update:keyEdit': [value: boolean]
}>()

const titleEl = ref<HTMLInputElement | null>(null)
const taps = ref<number[]>([])

const missing = computed(() => missingOf(props.meta))
const keyRoot = computed(() => String(props.meta.key ?? '').replace(/m$/, ''))
const minor = computed(() => /m$/.test(String(props.meta.key ?? '')))
const showKeyPad = computed(() => props.keyEdit || !keyRoot.value)
const tapLabel = computed(() => {
  const live = taps.value.filter((t) => Date.now() - t < 3000).length
  return live > 1 ? `batendo… ${live}` : 'bater no ritmo'
})

function flag(k: string) {
  return missing.value.includes(k) ? '· falta' : ''
}

function edge(k: string) {
  const miss = missing.value.includes(k)
  if (props.missingEdge === 'soft') {
    if (!miss) return 'var(--line-soft)'
    return k === 'duration' ? 'color-mix(in srgb, var(--danger) 45%, transparent)' : 'var(--line)'
  }
  if (!miss) return 'var(--chord-edge)'
  return k === 'duration' || props.strict ? 'var(--danger)' : 'var(--line)'
}

function setMeta(k: MetaKey, v: string) {
  emit('patch', k, v)
}

function onDurationInput(e: Event) {
  setMeta('duration', maskDurationMmSs((e.target as HTMLInputElement).value))
}

function onDurationBlur() {
  setMeta('duration', normalizeDurationMmSs(props.meta.duration ?? ''))
}

function bpmStep(d: number) {
  const cur = parseInt(String(props.meta.tempo ?? ''), 10)
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

function pickKey(root: string) {
  setMeta('key', root + (minor.value ? 'm' : ''))
}

function toggleMinor() {
  const cur = String(props.meta.key ?? '')
  if (!cur) return
  setMeta('key', /m$/.test(cur) ? cur.replace(/m$/, '') : `${cur}m`)
}

function timeAttr(t: string): Record<string, string> {
  return props.chipHook === 'meta' ? { 'data-meta-time': t } : { 'data-time-chip': t }
}

function keyAttr(r: string): Record<string, string> {
  return props.chipHook === 'meta' ? { 'data-meta-key': r } : { 'data-key-chip': r }
}

defineExpose({
  focusTitle() {
    titleEl.value?.focus()
    titleEl.value?.select()
  },
})
</script>

<template>
  <div class="titan-chordpro-id-name">
    <input
      ref="titleEl"
      class="titan-chordpro-id-title"
      :style="{ fontSize: titleSize }"
      :value="meta.title ?? ''"
      :data-meta-title="chipHook === 'meta' ? '' : undefined"
      :data-nova-title="chipHook === 'plain' ? '' : undefined"
      :aria-label="chipHook === 'meta' ? 'Nome da música' : undefined"
      placeholder="Nome da música"
      @input="setMeta('title', ($event.target as HTMLInputElement).value)"
    >
    <input
      class="titan-chordpro-id-sub"
      :value="meta.subtitle ?? ''"
      :data-meta-subtitle="chipHook === 'meta' ? '' : undefined"
      :aria-label="chipHook === 'meta' ? 'Artista ou ministério' : undefined"
      placeholder="Artista ou ministério"
      @input="setMeta('subtitle', ($event.target as HTMLInputElement).value)"
    >
  </div>

  <div class="titan-chordpro-id-card is-duration" :style="{ borderColor: edge('duration') }">
    <span class="titan-chordpro-id-kicker">Duração {{ flag('duration') }}</span>
    <div class="titan-chordpro-id-duration-row">
      <input
        class="titan-chordpro-id-duration"
        :value="meta.duration ?? ''"
        placeholder="MM:SS"
        inputmode="numeric"
        autocomplete="off"
        spellcheck="false"
        maxlength="5"
        aria-label="Duração em minutos e segundos"
        :data-meta-duration="chipHook === 'meta' ? '' : undefined"
        :data-nova-duration="chipHook === 'plain' ? '' : undefined"
        :style="{ fontSize: meta.duration ? '22px' : '16px' }"
        @input="onDurationInput"
        @blur="onDurationBlur"
      >
      <span class="titan-chordpro-id-mmss">MM:SS</span>
    </div>
    <span class="titan-chordpro-id-hint">{{ durationHint }}</span>
    <slot name="duration-extra" />
  </div>

  <div class="titan-chordpro-meta-rhythm" :style="columns ? { gridTemplateColumns: columns } : undefined">
    <div class="titan-chordpro-id-card is-field" :style="{ borderColor: edge('tempo') }">
      <span class="titan-chordpro-id-kicker">Andamento {{ flag('tempo') }}</span>
      <div class="titan-chordpro-id-bpm-row">
        <TitanChordproStepper size="sm" down-label="Diminuir" up-label="Aumentar" @down="bpmStep(-1)" @up="bpmStep(1)">
          <input
            class="titan-chordpro-id-bpm"
            :value="meta.tempo ?? ''"
            :aria-label="chipHook === 'meta' ? 'Andamento em bpm' : undefined"
            inputmode="numeric"
            placeholder="—"
            :data-meta-tempo="chipHook === 'meta' ? '' : undefined"
            :data-nova-bpm="chipHook === 'plain' ? '' : undefined"
            @input="setMeta('tempo', ($event.target as HTMLInputElement).value.replace(/[^\d]/g, '').slice(0, 3))"
          >
        </TitanChordproStepper>
        <span class="titan-chordpro-id-bpm-unit">bpm</span>
      </div>
      <button
        type="button"
        class="titan-chordpro-quiet-btn"
        :data-meta-tap="chipHook === 'meta' ? '' : undefined"
        :data-nova-tap="chipHook === 'plain' ? '' : undefined"
        @click="tapTempo"
      >{{ tapLabel }}</button>
    </div>

    <div class="titan-chordpro-id-card is-field" :style="{ borderColor: edge('time') }">
      <span class="titan-chordpro-id-kicker">Compasso {{ flag('time') }}</span>
      <div class="titan-chordpro-id-chips">
        <TitanChordproChip
          v-for="t in TIMES"
          :key="t"
          size="time"
          :on="meta.time === t"
          v-bind="timeAttr(t)"
          @click="setMeta('time', t)"
        >{{ t }}</TitanChordproChip>
      </div>
    </div>
  </div>

  <div class="titan-chordpro-id-card is-field is-key" :style="{ borderColor: edge('key') }">
    <div class="titan-chordpro-id-key-head">
      <span class="titan-chordpro-id-kicker">Tom {{ flag('key') }}</span>
      <button
        v-if="!showKeyPad && keyRoot"
        type="button"
        class="titan-chordpro-quiet-btn"
        @click="emit('update:keyEdit', true)"
      >Trocar</button>
    </div>
    <div v-if="!showKeyPad" class="titan-chordpro-id-key-shown">
      <span :data-meta-key-shown="chipHook === 'meta' ? '' : undefined">{{ meta.key }}</span>
    </div>
    <template v-else>
      <div class="titan-chordpro-id-keys">
        <TitanChordproChip
          v-for="r in SHARP"
          :key="r"
          size="key"
          :on="keyRoot === r"
          v-bind="keyAttr(r)"
          @click="pickKey(r)"
        >{{ r }}</TitanChordproChip>
      </div>
      <TitanChordproChip size="word" :on="minor" @click="toggleMinor">menor (m)</TitanChordproChip>
    </template>
    <slot name="key-extra" />
  </div>

  <div v-if="showSource" class="titan-chordpro-id-source">
    <span class="titan-chordpro-id-kicker">Referência</span>
    <input
      class="titan-chordpro-id-source-input"
      :value="meta.x_titan_source ?? ''"
      placeholder="Link de onde veio, ou vídeo de referência"
      spellcheck="false"
      @input="setMeta('x_titan_source', ($event.target as HTMLInputElement).value)"
    >
  </div>
</template>
