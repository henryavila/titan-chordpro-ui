<script setup lang="ts">
import CpvIcon from '../icon/CpvIcon.vue'
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
    class="cpv-swipe-veil"
    data-song-swipe
    :data-intent="view.intent"
    :data-armed="view.armed ? '1' : '0'"
    :style="{ '--cpv-swipe-p': String(view.progress) }"
    aria-hidden="true"
  >
    <div class="cpv-swipe-stamp">
      <CpvIcon
        :name="view.intent === 'prev' ? 'chevronLeft' : 'chevronRight'"
        :size="40"
        :weight="2.2"
      />
      <span class="cpv-swipe-kicker">{{
        view.armed ? 'Solte para ir' : view.intent === 'prev' ? 'Anterior' : 'Próxima'
      }}</span>
      <span
        v-if="(view.intent === 'prev' ? prevTitle : nextTitle)"
        class="cpv-swipe-title"
      >{{ view.intent === 'prev' ? prevTitle : nextTitle }}</span>
    </div>
  </div>
</template>
