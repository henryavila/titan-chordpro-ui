<script setup lang="ts">
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import type { SongSwipeView } from '../use/song-swipe'

defineProps<{
  view: SongSwipeView
  nextTitle: string
  prevTitle: string
}>()
</script>

<template>
  <div
    v-if="view.peeking"
    class="titan-chordpro-swipe-veil"
    data-song-swipe
    :data-intent="view.intent"
    :data-armed="view.armed ? '1' : '0'"
    :style="{
      '--titan-chordpro-swipe-p': String(view.progress),
      '--titan-chordpro-swipe-stamp-top': `${view.stampTop}px`,
    }"
    aria-hidden="true"
  >
    <div class="titan-chordpro-swipe-stamp">
      <TitanChordproIcon
        :name="view.intent === 'prev' ? 'chevronLeft' : 'chevronRight'"
        :size="40"
        :weight="2.2"
      />
      <span class="titan-chordpro-swipe-kicker">{{
        view.armed ? 'Solte para ir' : view.intent === 'prev' ? 'Anterior' : 'Próxima'
      }}</span>
      <span
        v-if="(view.intent === 'prev' ? prevTitle : nextTitle)"
        class="titan-chordpro-swipe-title"
      >{{ view.intent === 'prev' ? prevTitle : nextTitle }}</span>
    </div>
  </div>
</template>
