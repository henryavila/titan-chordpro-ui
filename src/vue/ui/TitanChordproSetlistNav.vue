<script setup lang="ts">
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'

defineProps<{
  density: 'phone' | 'wide'
  noPrev: boolean
  noNext: boolean
  posLabel: string
  nextLabel: string
}>()

defineEmits<{
  prev: []
  openList: []
  next: []
}>()
</script>

<template>
  <div class="titan-chordpro-setlist-nav" :class="`is-${density}`">
    <button
      type="button"
      data-song-prev
      aria-label="Música anterior"
      title="Música anterior"
      :disabled="noPrev"
      @click="$emit('prev')"
    ><TitanChordproIcon name="chevronLeft" :size="16" /></button>
    <button
      type="button"
      data-setlist-open
      title="Abrir a lista do ensaio"
      @click="$emit('openList')"
    >
      <span class="titan-chordpro-setlist-nav-pos">{{ posLabel }}</span>
      <span class="titan-chordpro-setlist-nav-mid">{{ density === 'phone' ? nextLabel : 'Lista' }}</span>
      <TitanChordproIcon name="listMusic" :size="14" />
    </button>
    <button
      type="button"
      data-song-next
      aria-label="Próxima música"
      title="Próxima música"
      :disabled="noNext"
      @click="$emit('next')"
    ><TitanChordproIcon name="chevronRight" :size="16" /></button>
  </div>
</template>
