<script setup lang="ts">
import type { StrumPattern } from '@henryavila/titan-chordpro-ui'

defineProps<{
  patterns: StrumPattern[]
  active: number
}>()

const emit = defineEmits<{
  select: [index: number]
  add: []
  duplicate: []
  remove: []
}>()
</script>

<template>
  <div data-batida-patterns class="batida-patterns">
    <button
      v-for="(p, i) in patterns"
      :key="i"
      type="button"
      :data-batida-pattern="i"
      :class="{ 'is-active': i === active }"
      class="batida-pattern-chip"
      @click="emit('select', i)"
    >{{ p.label || `Padrão ${i + 1}` }}</button>
    <button
      type="button"
      data-batida-add
      class="batida-pattern-chip is-ghost"
      title="Adicionar"
      aria-label="Adicionar padrão"
      @click="emit('add')"
    >+</button>
    <button
      type="button"
      data-batida-dup
      class="batida-pattern-chip is-ghost"
      title="Duplicar"
      aria-label="Duplicar padrão"
      @click="emit('duplicate')"
    >Duplicar</button>
    <button
      v-if="patterns.length > 1"
      type="button"
      data-batida-remove-pattern
      class="batida-pattern-chip is-ghost"
      title="Remover"
      aria-label="Remover padrão"
      @click="emit('remove')"
    >Remover</button>
  </div>
</template>

<style scoped>
.batida-patterns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.batida-pattern-chip {
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.batida-pattern-chip.is-ghost {
  background: transparent;
  border-style: dashed;
  color: var(--muted);
}
.batida-pattern-chip.is-active {
  background: var(--chord-soft);
  border-color: var(--chord-edge);
  color: var(--chord);
}
</style>
