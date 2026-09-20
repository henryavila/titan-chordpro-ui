<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AUDIO_ART_DEFAULT_PX,
  AUDIO_KIND_LABEL,
  formatAudioClock,
  type AudioKind,
} from '@henryavila/titan-chordpro-ui'
import defaultArt from '../assets/audio-ref-default.jpg'
import CpvIcon from '../icon/CpvIcon.vue'

const props = defineProps<{
  playing: boolean
  current: number
  duration: number
  error: boolean
  title: string
  artist: string
  art?: string | null
  artWidth?: number
  artHeight?: number
  kind: AudioKind
  kinds: AudioKind[]
}>()

const emit = defineEmits<{
  toggle: []
  skip: [dir: -1 | 1]
  seek: [t: number]
  kind: [kind: AudioKind]
}>()

const kindLabel = computed(() => AUDIO_KIND_LABEL[props.kind])
const canSwitch = computed(() => props.kinds.length > 1)

const open = ref(false)
const artBroken = ref(false)
watch(
  () => props.art,
  () => {
    artBroken.value = false
  },
)
const hostArt = computed(() => String(props.art ?? '').trim())
const usingDefaultArt = computed(() => artBroken.value || !hostArt.value)
const artSrc = computed(() => (usingDefaultArt.value ? defaultArt : hostArt.value))
const artW = computed(() =>
  usingDefaultArt.value ? AUDIO_ART_DEFAULT_PX : (props.artWidth || AUDIO_ART_DEFAULT_PX),
)
const artH = computed(() =>
  usingDefaultArt.value ? AUDIO_ART_DEFAULT_PX : (props.artHeight || AUDIO_ART_DEFAULT_PX),
)

const elapsed = computed(() => formatAudioClock(props.current))
const total = computed(() => (props.duration ? formatAudioClock(props.duration) : '–:––'))
const clock = computed(() =>
  props.duration ? `${elapsed.value} / ${total.value}` : elapsed.value,
)

const played = computed(() => {
  if (!props.duration) return 0
  return Math.max(0, Math.min(1, props.current / props.duration))
})

function onArtError() {
  if (!usingDefaultArt.value) artBroken.value = true
}

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
        <span class="cpv-audio-ref-art is-chip" data-audio-art>
          <img
            :src="artSrc"
            alt=""
            draggable="false"
            :width="artW"
            :height="artH"
            :data-audio-art-default="usingDefaultArt ? '' : undefined"
            @error="onArtError"
          />
        </span>
        <span class="cpv-audio-ref-launch-copy">
          <span class="cpv-audio-ref-kicker">{{ kindLabel }}</span>
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
      <div class="cpv-audio-ref-art" data-audio-art>
        <img
          :src="artSrc"
          alt=""
          draggable="false"
          :width="artW"
          :height="artH"
          :data-audio-art-default="usingDefaultArt ? '' : undefined"
          @error="onArtError"
        />
      </div>

      <div class="cpv-audio-ref-id">
        <p data-audio-title class="cpv-audio-ref-title">{{ title }}</p>
        <p data-audio-artist class="cpv-audio-ref-artist">{{ artist }}</p>
        <div
          class="cpv-audio-ref-kind"
          :class="{ 'is-switch': canSwitch }"
          data-audio-kind
          role="group"
          :aria-label="canSwitch ? 'Tipo de áudio' : kindLabel"
        >
          <template v-if="canSwitch">
            <button
              v-for="k in kinds"
              :key="k"
              type="button"
              :data-audio-kind="k"
              :aria-pressed="kind === k ? 'true' : 'false'"
              :class="{ 'is-on': kind === k }"
              :title="`Ouvir ${AUDIO_KIND_LABEL[k]}`"
              @click="emit('kind', k)"
            >{{ AUDIO_KIND_LABEL[k] }}</button>
          </template>
          <span
            v-else
            :data-audio-kind="kind"
            class="is-on is-solo"
          >{{ kindLabel }}</span>
        </div>
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
          <button
            type="button"
            class="cpv-audio-ref-play"
            data-audio-play
            :aria-label="playing ? 'Pausar referência' : 'Tocar referência'"
            :title="playing ? 'Pausar referência' : 'Tocar referência'"
            @click="emit('toggle')"
          >
            <CpvIcon :name="playing ? 'pause' : 'play'" :size="18" />
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
        <div class="cpv-audio-ref-times">
          <span data-audio-clock>{{ elapsed }}</span>
          <span data-audio-total>{{ total }}</span>
        </div>
      </template>
    </template>
  </div>
</template>
