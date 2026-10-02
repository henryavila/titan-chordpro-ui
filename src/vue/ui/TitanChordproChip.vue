<script setup lang="ts">
withDefaults(
  defineProps<{
    on?: boolean
    /** time = compasso, key = nota, word = “menor”, choice = Manter/Trazer, pad = cartão. */
    size?: 'time' | 'key' | 'word' | 'choice' | 'pad'
    /** Div, so a card can hold a link or a player. */
    static?: boolean
  }>(),
  { on: false, size: 'choice', static: false },
)
</script>

<template>
  <component
    :is="static ? 'div' : 'button'"
    :type="static ? undefined : 'button'"
    class="titan-chordpro-chip"
    :class="[`is-${size}`, { 'is-on': on }]"
  >
    <slot />
  </component>
</template>
