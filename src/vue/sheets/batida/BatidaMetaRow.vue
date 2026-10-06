<script setup lang="ts">
defineProps<{
  label: string
  density: number
  isSixEight: boolean
  sixEightPulse: number
  bpm: number | null
  compact: boolean
}>()

const emit = defineEmits<{
  'update:label': [value: string]
  'density-change': [raw: string]
  'pulse-change': [raw: string]
}>()
</script>

<template>
  <div class="batida-meta-row" :class="{ 'is-compact': compact }">
    <label class="batida-field batida-field-grow">
      <span class="batida-field-label">Nome</span>
      <input
        :value="label"
        data-batida-label
        type="text"
        class="batida-field-control"
        @input="emit('update:label', ($event.target as HTMLInputElement).value)"
      />
    </label>
    <label class="batida-field">
      <span class="batida-field-label">Densidade</span>
      <select
        data-batida-density
        data-batida-grid
        :value="String(density)"
        class="batida-field-control"
        @change="emit('density-change', ($event.target as HTMLSelectElement).value)"
      >
        <option value="2">2 / tempo</option>
        <option value="4">4 / tempo</option>
      </select>
    </label>
    <label
      v-if="isSixEight"
      class="batida-field"
    >
      <span class="batida-field-label">6/8</span>
      <select
        data-batida-pulse
        :value="String(sixEightPulse)"
        class="batida-field-control"
        @change="emit('pulse-change', ($event.target as HTMLSelectElement).value)"
      >
        <option value="2">2 compostos</option>
        <option value="6">6 colcheias</option>
      </select>
    </label>
    <div v-if="bpm" class="batida-bpm">
      <span>{{ bpm }} BPM</span>
    </div>
  </div>
</template>

<style scoped>
.batida-meta-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-end;
}
.batida-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 160px;
}
.batida-field-grow {
  flex: 1;
  min-width: 200px;
}
.batida-field-label {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
}
.batida-field-control {
  height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  font: inherit;
}
.batida-meta-row.is-compact .batida-field-control {
  height: 38px;
}
.batida-bpm {
  display: flex;
  align-items: flex-end;
  padding-bottom: 10px;
  font-family: var(--titan-chordpro-font-chords, 'Space Mono', monospace);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
</style>
