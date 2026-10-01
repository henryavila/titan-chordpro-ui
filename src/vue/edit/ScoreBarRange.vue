<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ start: number; end: number; total: number }>()
const emit = defineEmits<{ change: [start: number, end: number] }>()
const percent = (n: number) => props.total > 1 ? (n - 1) / (props.total - 1) * 100 : 0
const selection = computed(() => ({ left: `${percent(props.start)}%`, right: `${100 - percent(props.end)}%` }))
function set(which: 'start' | 'end', raw: string) {
  const n = Number(raw)
  if (!raw || !Number.isFinite(n)) return
  const value = Math.max(1, Math.min(props.total, Math.round(n)))
  if (which === 'start') emit('change', Math.min(value, props.end), props.end)
  else emit('change', props.start, Math.max(value, props.start))
}
function commit(which: 'start' | 'end', event: Event) {
  const input = event.target as HTMLInputElement
  set(which, input.value)
  // Restore the normalized value even if the selected range did not change.
  const n = Number(input.value)
  input.value = String(!input.value || !Number.isFinite(n) ? props[which]
    : which === 'start' ? Math.max(1, Math.min(props.end, Math.round(n)))
      : Math.max(props.start, Math.min(props.total, Math.round(n))))
}
</script>

<template>
  <div class="titan-chordpro-bar-range">
    <div class="titan-chordpro-bar-range-heading"><span>Compassos</span><span>{{ end - start + 1 }} de {{ total }}</span></div>
    <div class="titan-chordpro-bar-range-values">
      <label><span>Início</span><input :value="start" type="number" inputmode="numeric" min="1" :max="end"
        aria-label="Primeiro compasso" @change="commit('start', $event)" @keydown.enter.prevent="commit('start', $event)"></label>
      <span class="titan-chordpro-bar-range-to" aria-hidden="true">→</span>
      <label><span>Fim</span><input :value="end" type="number" inputmode="numeric" :min="start" :max="total"
        aria-label="Último compasso" @change="commit('end', $event)" @keydown.enter.prevent="commit('end', $event)"></label>
    </div>
    <div class="titan-chordpro-bar-range-sliders">
      <div class="titan-chordpro-bar-range-rail"><div :style="selection" /></div>
      <input type="range" min="1" :max="total" step="1" :value="start" :disabled="total === 1"
        aria-label="Início do intervalo" :aria-valuemax="end" :aria-valuetext="`Compasso ${start}`"
        @input="commit('start', $event)">
      <input type="range" min="1" :max="total" step="1" :value="end" :disabled="total === 1"
        aria-label="Fim do intervalo" :aria-valuemin="start" :aria-valuetext="`Compasso ${end}`"
        @input="commit('end', $event)">
    </div>
    <div class="titan-chordpro-bar-range-scale"><span>1</span><button type="button" @click="emit('change', 1, total)">Selecionar tudo</button><span>{{ total }}</span></div>
  </div>
</template>
