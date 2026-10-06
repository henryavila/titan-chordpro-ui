<script setup lang="ts">
defineProps<{
  density: 'phone' | 'bar'
  xs?: boolean
  /** Steps the staff zoom instead of the lyric type size. */
  score?: boolean
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
      :aria-label="score ? 'Diminuir a partitura' : 'Diminuir tipografia'"
      :title="score ? 'Diminuir a partitura' : 'Diminuir tipografia'"
      @click="$emit('smaller')"
    >A−</button>
    <button
      type="button"
      class="titan-chordpro-ghost titan-chordpro-type-plus"
      :aria-label="score ? 'Aumentar a partitura' : 'Aumentar tipografia'"
      :title="score ? 'Aumentar a partitura' : 'Aumentar tipografia'"
      @click="$emit('bigger')"
    >A+</button>
  </span>
</template>
