<script setup lang="ts">
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import type { TitanChordproIconName } from '../icon/paths'

withDefaults(
  defineProps<{
    icon: TitanChordproIconName
    /** Named sizes. `bar` 36, `phone` 44, `workbench` 40, `import` 44 bordered, `pill` round. */
    density?: 'phone' | 'bar' | 'workbench' | 'import' | 'pill'
    labeled?: boolean
    pressed?: boolean
    toggle?: boolean
    muted?: boolean
    /** Dirty mark on the phone edit control. */
    dot?: boolean
    title?: string
    badge?: number
  }>(),
  { density: 'bar', labeled: false, pressed: false, toggle: false, muted: false, dot: false },
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
      'is-workbench': density === 'workbench',
      'is-import': density === 'import',
      'is-pill': density === 'pill',
      'is-labeled': labeled,
      'is-sel': pressed,
      'is-muted': muted,
    }"
    :title="title"
    :aria-pressed="toggle ? (pressed ? 'true' : 'false') : undefined"
    @click="$emit('click')"
  >
    <TitanChordproIcon :name="icon" :size="16" />
    <slot />
    <span v-if="(badge ?? 0) > 0" class="titan-chordpro-dock-queue-badge">{{ badge }}</span>
    <span v-if="dot" class="titan-chordpro-edit-dot" data-edit-dirty />
  </button>
</template>
