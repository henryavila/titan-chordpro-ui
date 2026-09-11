<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type CpvIconName } from './paths'

const props = withDefaults(
  defineProps<{
    name: CpvIconName
    /** CSS px. Dock chrome is 16 so every neighbour paints the same box. */
    size?: number
    weight?: number
  }>(),
  { size: 16, weight: 2 },
)

const nodes = computed(() => ICONS[props.name])
const box = computed(() => `${props.size}px`)
</script>

<template>
  <svg
    class="cpv-ico"
    :data-icon="name"
    :width="size"
    :height="size"
    :style="{ width: box, height: box }"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="weight"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <component :is="n.tag" v-for="(n, i) in nodes" :key="i" v-bind="n.attrs" />
  </svg>
</template>
