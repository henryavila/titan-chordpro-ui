<script setup lang="ts">
export type SegOption = {
  value: string
  label: string
  attrs?: Record<string, string>
}

defineProps<{
  label: string
  value: string
  options: SegOption[]
}>()

defineEmits<{
  pick: [value: string]
}>()
</script>

<template>
  <div class="titan-chordpro-seg" role="group" :aria-label="label">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      v-bind="opt.attrs"
      :aria-pressed="value === opt.value ? 'true' : 'false'"
      :class="{ 'is-on': value === opt.value }"
      @click="$emit('pick', opt.value)"
    >{{ opt.label }}</button>
  </div>
</template>
