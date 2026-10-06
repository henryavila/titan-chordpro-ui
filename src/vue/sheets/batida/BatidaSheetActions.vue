<script setup lang="ts">
defineProps<{
  compact: boolean
  canDelete: boolean
  canSave: boolean
}>()

const emit = defineEmits<{
  delete: []
  save: []
}>()
</script>

<template>
  <div class="batida-sheet-actions" :class="{ 'is-compact': compact }">
    <button
      v-if="canDelete"
      type="button"
      data-batida-delete
      class="batida-btn-ghost"
      @click="emit('delete')"
    >Apagar</button>
    <span class="batida-actions-spacer" />
    <button
      type="button"
      data-batida-save
      class="batida-btn-primary"
      :disabled="!canSave"
      :aria-disabled="!canSave ? 'true' : 'false'"
      @click="emit('save')"
    >Salvar</button>
  </div>
</template>

<style scoped>
.batida-sheet-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.batida-actions-spacer {
  flex: 1;
  font-size: 12px;
  color: var(--muted);
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
.batida-sheet-actions.is-compact .batida-btn-ghost,
.batida-sheet-actions.is-compact .batida-btn-primary {
  height: 42px;
  font-size: 13px;
}
</style>
