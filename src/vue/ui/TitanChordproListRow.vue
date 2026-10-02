<script setup lang="ts">
withDefaults(
  defineProps<{
    current?: boolean
    dim?: boolean
    /** Coluna (setlist). Falso = uma linha com o miolo no fluxo (fila). */
    stack?: boolean
  }>(),
  { current: false, dim: false, stack: true },
)
</script>

<template>
  <button
    type="button"
    class="titan-chordpro-list-row"
    :class="{ 'is-current': current, 'is-dim': dim }"
    :aria-current="current ? 'true' : undefined"
  >
    <slot name="lead" />
    <span v-if="stack" class="titan-chordpro-list-row-copy"><slot /></span>
    <slot v-else />
    <slot name="trail" />
  </button>
</template>
