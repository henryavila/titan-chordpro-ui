<script setup lang="ts">
import TitanChordproIcon from '../../icon/TitanChordproIcon.vue'
import ChartScoreMenu from './ChartScoreMenu.vue'
import type { ScoreHost } from './score-host'

defineProps<{
  index: number
  title: string
  folded: boolean
  controlsId: string
  external: boolean
  host?: ScoreHost
  text: string
  resolveScore?: (src: string) => string
}>()

const emit = defineEmits<{
  toggle: []
  readSong: []
}>()
</script>

<template>
  <div class="titan-chordpro-notation-fold" :class="{ 'has-more': external }" @click.stop="emit('toggle')">
    <button
      type="button"
      class="titan-chordpro-notation-fold-toggle"
      :data-toggle-notation="index"
      :aria-expanded="!folded"
      :aria-controls="controlsId"
      :aria-label="`${folded ? 'Mostrar' : 'Ocultar'} ${title}`"
      :title="folded ? 'Mostrar conteúdo' : 'Ocultar conteúdo'"
      @click.stop="emit('toggle')"
    >
      <TitanChordproIcon name="chevronDown" :size="18" />
      <span class="titan-chordpro-notation-title">{{ title }}</span>
    </button>
    <button
      v-if="external"
      type="button"
      class="titan-chordpro-song-read"
      data-read-song
      @click.stop="emit('readSong')"
    >Só partitura</button>
    <ChartScoreMenu
      v-if="external && !folded"
      :label="title"
      :host="host"
      :text="text"
      :resolve-score="resolveScore"
      @read-song="emit('readSong')"
    />
  </div>
</template>
