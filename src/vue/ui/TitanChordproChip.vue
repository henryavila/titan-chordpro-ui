<script setup lang="ts">
withDefaults(
  defineProps<{
    on?: boolean
    /** time = compasso, key = nota, word = “menor”, choice = Manter/Trazer. */
    size?: 'time' | 'key' | 'word' | 'choice'
  }>(),
  { on: false, size: 'choice' },
)
</script>

<template>
  <button
    type="button"
    class="titan-chordpro-chip"
    :class="[`is-${size}`, { 'is-on': on }]"
  >
    <slot />
  </button>
</template>
