<script setup lang="ts">
import { computed } from 'vue'
import { formatAudioClock } from '@henryavila/titan-chordpro-ui'
import CpvIcon from '../icon/CpvIcon.vue'

const props = defineProps<{
  playing: boolean
  current: number
  duration: number
  error: boolean
}>()

const emit = defineEmits<{
  toggle: []
  skip: [dir: -1 | 1]
  seek: [t: number]
}>()

const clock = computed(() => {
  const now = formatAudioClock(props.current)
  if (!props.duration) return now
  return `${now} / ${formatAudioClock(props.duration)}`
})

const played = computed(() => {
  if (!props.duration) return 0
  return Math.max(0, Math.min(1, props.current / props.duration))
})

function onSeek(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  const box = el.getBoundingClientRect()
  if (box.width <= 0 || !props.duration) return
  const t = ((e.clientX - box.left) / box.width) * props.duration
  emit('seek', t)
}
</script>

<template>
  <div
    class="cpv-hit cpv-audio-ref"
    data-audio-ref
    role="region"
    aria-label="Áudio de referência"
    @pointerdown.stop
  >
    <div class="cpv-audio-ref-top">
      <span class="cpv-audio-ref-kicker">
        <CpvIcon name="music2" :size="14" />
        Referência
      </span>
      <span data-audio-clock class="cpv-audio-ref-clock">{{ clock }}</span>
    </div>

    <p v-if="error" class="cpv-audio-ref-error">Não foi possível tocar</p>

    <div v-else class="cpv-audio-ref-row">
      <button
        type="button"
        class="cpv-audio-ref-skip"
        data-audio-skip="-1"
        aria-label="Recuar 10 segundos"
        @click="emit('skip', -1)"
      >−10</button>
      <button
        type="button"
        class="cpv-audio-ref-play"
        data-audio-play
        :aria-label="playing ? 'Pausar referência' : 'Tocar referência'"
        :title="playing ? 'Pausar referência' : 'Tocar referência'"
        @click="emit('toggle')"
      >
        <CpvIcon :name="playing ? 'pause' : 'play'" :size="16" />
      </button>
      <button
        type="button"
        class="cpv-audio-ref-skip"
        data-audio-skip="1"
        aria-label="Avançar 10 segundos"
        @click="emit('skip', 1)"
      >+10</button>
    </div>

    <div
      v-if="!error"
      class="cpv-audio-ref-seek"
      data-audio-seek
      role="slider"
      :aria-valuemin="0"
      :aria-valuemax="Math.round(duration || 0)"
      :aria-valuenow="Math.round(current)"
      :aria-label="`Posição da referência, ${clock}`"
      @pointerdown="onSeek"
    >
      <span class="cpv-audio-ref-seek-fill" :style="{ width: `${played * 100}%` }" />
    </div>
  </div>
</template>
