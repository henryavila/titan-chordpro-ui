<script setup lang="ts">
import ChartScoreMenu from './ChartScoreMenu.vue'
import type { ScoreHost } from './score-host'

defineProps<{
  title: string
  host?: ScoreHost
  text: string
  resolveScore?: (src: string) => string
  canDelete: boolean
}>()

const emit = defineEmits<{
  editScore: []
  remove: []
  readSong: []
}>()
</script>

<template>
  <div class="titan-chordpro-score-heading titan-chordpro-score-edit-head">
    <span class="titan-chordpro-notation-title">{{ title }}</span>
    <button
      type="button"
      class="titan-chordpro-song-read"
      data-read-song
      @click.stop="emit('readSong')"
    >Só partitura</button>
    <ChartScoreMenu
      :label="title"
      :host="host"
      :text="text"
      :resolve-score="resolveScore"
      can-edit
      :can-delete="canDelete"
      @edit-score="emit('editScore')"
      @remove="emit('remove')"
      @read-song="emit('readSong')"
    />
  </div>
</template>
