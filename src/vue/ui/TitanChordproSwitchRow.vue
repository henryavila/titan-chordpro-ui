<script setup lang="ts">
defineProps<{
  on: boolean
  disabled?: boolean
  title: string
  hint: string
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="titan-chordpro-switch-row"
    :class="{ 'is-on': on && !disabled }"
    role="switch"
    :aria-checked="on ? 'true' : 'false'"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <span class="titan-chordpro-switch" aria-hidden="true">
      <span class="titan-chordpro-switch-thumb" />
    </span>
    <span class="titan-chordpro-switch-copy">
      <span class="titan-chordpro-switch-title">{{ title }}</span>
      <span class="titan-chordpro-switch-hint">{{ hint }}</span>
    </span>
  </button>
</template>
