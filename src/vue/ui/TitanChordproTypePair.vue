<script setup lang="ts">
defineProps<{
  density: 'phone' | 'bar'
  xs?: boolean
}>()

defineEmits<{
  smaller: []
  bigger: []
}>()
</script>

<template>
  <span
    class="titan-chordpro-type-pair"
    :class="{ 'is-phone': density === 'phone', 'is-bar': density === 'bar', 'is-xs': xs }"
  >
    <button
      type="button"
      class="titan-chordpro-ghost titan-chordpro-type-minus"
      aria-label="Diminuir tipografia"
      title="Diminuir tipografia"
      @click="$emit('smaller')"
    >A−</button>
    <button
      type="button"
      class="titan-chordpro-ghost titan-chordpro-type-plus"
      aria-label="Aumentar tipografia"
      title="Aumentar tipografia"
      @click="$emit('bigger')"
    >A+</button>
  </span>
</template>
