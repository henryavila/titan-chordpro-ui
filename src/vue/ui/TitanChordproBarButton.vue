<script setup lang="ts">
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import type { TitanChordproIconName } from '../icon/paths'

withDefaults(
  defineProps<{
    icon?: TitanChordproIconName
    label?: string
    pressed?: false | 'chord' | 'sel'
    disabled?: boolean
    dash?: boolean
    toggle?: boolean
    title?: string
  }>(),
  { pressed: false, disabled: false, dash: false, toggle: false },
)

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="titan-chordpro-bar-btn"
    :class="{
      'is-chord': pressed === 'chord',
      'is-sel': pressed === 'sel',
      'is-dash': dash,
    }"
    :title="title"
    :disabled="disabled"
    :aria-pressed="toggle ? (pressed ? 'true' : 'false') : undefined"
    @click="$emit('click')"
  >
    <TitanChordproIcon v-if="icon" :name="icon" :size="16" />
    <slot>{{ label }}</slot>
  </button>
</template>
