<script setup lang="ts">
defineProps<{
  /** lg = tom 60×56, md = capo 48×44, sm = bpm 32×32. */
  size: 'lg' | 'md' | 'sm'
  downLabel: string
  upLabel: string
}>()

defineEmits<{
  down: []
  up: []
}>()
</script>

<template>
  <span class="titan-chordpro-stepper" :class="`is-${size}`">
    <button type="button" class="titan-chordpro-stepper-btn" :aria-label="downLabel" @click="$emit('down')">−</button>
    <slot />
    <button type="button" class="titan-chordpro-stepper-btn" :aria-label="upLabel" @click="$emit('up')">+</button>
  </span>
</template>
