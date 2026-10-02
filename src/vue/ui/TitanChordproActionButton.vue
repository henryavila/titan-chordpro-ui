<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'chord' | 'pill' | 'danger' | 'ghost'
    size?: 'lg' | 'md' | 'sm'
    block?: boolean
    bordered?: boolean
  }>(),
  { tone: 'chord', size: 'lg', block: false, bordered: false },
)
</script>

<template>
  <button
    type="button"
    class="titan-chordpro-action"
    :class="[`is-${tone}`, `is-${size}`, { 'is-block': block, 'is-bordered': bordered }]"
  >
    <slot />
  </button>
</template>
