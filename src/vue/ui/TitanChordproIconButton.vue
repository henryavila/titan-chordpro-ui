<script setup lang="ts">
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import type { TitanChordproIconName } from '../icon/paths'

withDefaults(
  defineProps<{
    icon: TitanChordproIconName
    density?: 'phone' | 'bar'
    labeled?: boolean
    pressed?: boolean
    toggle?: boolean
    title?: string
    badge?: number
  }>(),
  { density: 'bar', labeled: false, pressed: false, toggle: false },
)

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="titan-chordpro-icon-btn titan-chordpro-ghost"
    :class="{
      'is-phone': density === 'phone',
      'is-labeled': labeled,
      'is-sel': pressed,
    }"
    :title="title"
    :aria-pressed="toggle ? (pressed ? 'true' : 'false') : undefined"
    @click="$emit('click')"
  >
    <TitanChordproIcon :name="icon" :size="16" />
    <slot />
    <span
      v-if="(badge ?? 0) > 0"
      class="titan-chordpro-dock-queue-badge"
      data-more-queue-badge
    >{{ badge }}</span>
  </button>
</template>
