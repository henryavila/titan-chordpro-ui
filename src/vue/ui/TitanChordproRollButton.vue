<script setup lang="ts">
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'

defineProps<{
  density: 'phone' | 'wide'
  live: boolean
  off: boolean
  labeled: boolean
  label: string
  name: string
  title: string
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    data-scroll
    class="titan-chordpro-roll"
    :class="{
      'is-phone': density === 'phone',
      'is-live': live,
      'is-icon': !labeled,
    }"
    :title="title"
    :aria-label="name"
    :disabled="off"
    @click="$emit('click')"
  >
    <TitanChordproIcon :name="live ? 'square' : 'chevronsDown'" :size="14" />{{ labeled ? label : '' }}
  </button>
</template>
