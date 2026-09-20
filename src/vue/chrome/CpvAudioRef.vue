<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatAudioClock } from '@henryavila/titan-chordpro-ui'
import CpvIcon from '../icon/CpvIcon.vue'

const props = defineProps<{
  playing: boolean
  current: number
  duration: number
  error: boolean
  title: string
  artist: string
  art?: string | null
}>()

const emit = defineEmits<{
  toggle: []
  skip: [dir: -1 | 1]
  seek: [t: number]
}>()

const open = ref(false)
const artBroken = ref(false)
watch(
  () => props.art,
  () => {
    artBroken.value = false
  },
)
const artSrc = computed(() => {
  if (artBroken.value) return ''
  return String(props.art ?? '').trim()
})

const elapsed = computed(() => formatAudioClock(props.current))
const total = computed(() => (props.duration ? formatAudioClock(props.duration) : '–:––'))
const clock = computed(() =>
  props.duration ? `${elapsed.value} / ${total.value}` : elapsed.value,
)

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
    :class="{ 'is-playing': playing, 'is-closed': !open }"
    data-audio-ref
    role="region"
    aria-label="Áudio de referência"
    :aria-expanded="open ? 'true' : 'false'"
    @pointerdown.stop
  >
    <template v-if="!open">
      <button
        type="button"
        class="cpv-audio-ref-launch"
        data-audio-open
        aria-label="Abrir referência"
        title="Abrir referência"
        @click="open = true"
      >
        <span class="cpv-audio-ref-art is-chip" data-audio-art :class="{ 'is-empty': !artSrc }">
          <img
            v-if="artSrc"
            :src="artSrc"
            alt=""
            draggable="false"
            @error="artBroken = true"
          />
          <CpvIcon v-else name="music2" :size="16" />
        </span>
        <span class="cpv-audio-ref-launch-copy">
          <span class="cpv-audio-ref-kicker">Referência</span>
          <span class="cpv-audio-ref-launch-title">{{ title }}</span>
        </span>
      </button>
      <button
        type="button"
        class="cpv-audio-ref-play"
        data-audio-play
        :aria-label="playing ? 'Pausar referência' : 'Tocar referência'"
        :title="playing ? 'Pausar referência' : 'Tocar referência'"
        @click="emit('toggle')"
      >
        <CpvIcon :name="playing ? 'pause' : 'play'" :size="15" />
      </button>
    </template>

    <template v-else>
      <div class="cpv-audio-ref-art" data-audio-art :class="{ 'is-empty': !artSrc }">
        <img
          v-if="artSrc"
          :src="artSrc"
          alt=""
          draggable="false"
          @error="artBroken = true"
        />
        <CpvIcon v-else name="music2" :size="22" />
      </div>

      <div class="cpv-audio-ref-id">
        <p data-audio-title class="cpv-audio-ref-title">{{ title }}</p>
        <p data-audio-artist class="cpv-audio-ref-artist">{{ artist }}</p>
      </div>

      <button
        type="button"
        class="cpv-audio-ref-close"
        data-audio-close
        aria-label="Fechar referência"
        title="Fechar referência"
        @click="open = false"
      >
        <CpvIcon name="x" :size="14" />
      </button>

      <button
        type="button"
        class="cpv-audio-ref-play"
        data-audio-play
        :aria-label="playing ? 'Pausar referência' : 'Tocar referência'"
        :title="playing ? 'Pausar referência' : 'Tocar referência'"
        @click="emit('toggle')"
      >
        <CpvIcon :name="playing ? 'pause' : 'play'" :size="15" />
      </button>

      <p v-if="error" class="cpv-audio-ref-error">Não foi possível tocar</p>

      <template v-else>
        <div class="cpv-audio-ref-transport">
          <button
            type="button"
            class="cpv-audio-ref-skip"
            data-audio-skip="-1"
            aria-label="Recuar 10 segundos"
            @click="emit('skip', -1)"
          >−10</button>
          <div
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
          <button
            type="button"
            class="cpv-audio-ref-skip"
            data-audio-skip="1"
            aria-label="Avançar 10 segundos"
            @click="emit('skip', 1)"
          >+10</button>
        </div>
        <div class="cpv-audio-ref-times">
          <span data-audio-clock>{{ elapsed }}</span>
          <span data-audio-total>{{ total }}</span>
        </div>
      </template>
    </template>
  </div>
</template>
