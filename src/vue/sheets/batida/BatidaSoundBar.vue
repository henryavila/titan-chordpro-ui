<script setup lang="ts">
defineProps<{
  soundEnabled: boolean
  previewRunning: boolean
  canSave: boolean
  canRestart: boolean
  compact: boolean
}>()

const emit = defineEmits<{
  'toggle-sound': []
  'toggle-preview': []
  restart: []
}>()
</script>

<template>
  <div class="batida-grid-bar" :class="{ 'is-compact': compact }" data-batida-sound-row>
    <button
      type="button"
      class="batida-sound-chip"
      data-batida-sound
      role="switch"
      :aria-checked="soundEnabled ? 'true' : 'false'"
      :aria-pressed="soundEnabled ? 'true' : 'false'"
      :aria-label="soundEnabled ? 'Som ligado' : 'Som desligado'"
      @click="emit('toggle-sound')"
    >
      <span class="titan-chordpro-switch" :class="{ 'is-on': soundEnabled }"><span class="titan-chordpro-switch-thumb" /></span>
      <span data-batida-sound-label>{{ soundEnabled ? 'Som' : 'Mudo' }}</span>
    </button>
    <button
      type="button"
      class="batida-preview-btn"
      :class="previewRunning ? 'batida-btn-ghost' : 'batida-btn-primary'"
      data-batida-preview
      :disabled="!canSave"
      :aria-disabled="!canSave ? 'true' : 'false'"
      :aria-pressed="previewRunning ? 'true' : 'false'"
      :aria-label="previewRunning ? 'Parar' : 'Ouvir'"
      @click="emit('toggle-preview')"
    >{{ previewRunning ? 'Parar' : 'Ouvir' }}</button>
    <span class="batida-grid-bar-spacer" />
    <button
      v-if="canRestart"
      type="button"
      data-batida-restart
      class="batida-restart-link"
      aria-label="Recomeçar"
      @click="emit('restart')"
    >Recomeçar</button>
  </div>
</template>

<style scoped>
.batida-grid-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 6px 0;
  margin: 0;
  background: color-mix(in srgb, var(--sheet, var(--surface)) 92%, transparent);
  backdrop-filter: blur(8px);
}
.batida-grid-bar-spacer {
  flex: 1;
  min-width: 8px;
}
.batida-sound-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border-radius: 11px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.batida-preview-btn {
  min-width: 88px;
  height: 40px;
  padding: 0 18px;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 700;
}
.batida-preview-btn.batida-btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.batida-restart-link {
  height: 36px;
  padding: 0 6px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.batida-restart-link:hover {
  color: var(--text);
}
.batida-btn-ghost {
  height: 44px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}
.batida-btn-primary {
  height: 44px;
  padding: 0 22px;
  border-radius: 12px;
  border: 0;
  background: var(--chord);
  color: var(--chord-ink);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.batida-btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.batida-grid-bar.is-compact .batida-btn-ghost,
.batida-grid-bar.is-compact .batida-btn-primary {
  height: 42px;
  font-size: 13px;
}
</style>
