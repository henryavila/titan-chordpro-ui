<script setup lang="ts">
import { computed } from 'vue'
import ScoreChoice from './ScoreChoice.vue'
const props = defineProps<{ modelValue: number; automaticLabel: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const options = computed(() => [
  { value: 0, label: `Auto (${props.automaticLabel})` },
  ...[1.1, 1.3, 1.5, 2].map(value => ({ value, label: `${Math.round(value * 100)}%` })),
])
</script>
<template>
  <ScoreChoice :model-value="modelValue" label="Zoom do solo" caption="Zoom" compact :options="options"
    @update:model-value="emit('update:modelValue', Number($event))" />
</template>
