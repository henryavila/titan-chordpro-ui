<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { fileName } from './labels'
import type { ImageGrade } from './image-grade'

const props = defineProps<{
  src: string
  file: string
  shown: boolean
  domId: string
  blockGap: string
  expanded: boolean
  theme: 'light' | 'dark'
  autoInvert: boolean
  grade: ImageGrade
}>()
const emit = defineEmits<{ toggle: [] }>()
const imgEl = ref<HTMLImageElement | null>(null)

function onLoad(e: Event) {
  props.grade(e.target as HTMLImageElement, { autoInvert: props.autoInvert, theme: props.theme })
}

/**
 * The grade is a decision about THIS theme: white paper is inverted in the
 * dark and left alone in the light. Both the filter and the mat behind it are
 * written as inline style, so a theme change that does not re-run this leaves
 * a lit rectangle in the dark — or an inverted, black sheet in the light.
 */
watch(
  () => [props.theme, props.autoInvert],
  () => nextTick(() => props.grade(imgEl.value, { autoInvert: props.autoInvert, theme: props.theme })),
)
</script>

<template>
  <figure
    v-show="shown"
    :id="domId"
    class="titan-chordpro-figure"
    :style="{ margin: `0 0 ${blockGap}`, padding: '10px 10px 8px' }"
  >
    <div class="titan-chordpro-image-frame">
      <img
        ref="imgEl"
        :src="src"
        :alt="`Partitura da música: ${fileName(file)}`"
        :class="expanded ? 'titan-chordpro-image-full' : 'titan-chordpro-image-clip'"
        @load="onLoad"
      >
    </div>
    <figcaption class="titan-chordpro-figure-cap">
      <span class="titan-chordpro-figure-kind">Partitura</span>
      <span class="titan-chordpro-figure-meta">{{ fileName(file) }}</span>
      <button class="titan-chordpro-figure-btn" type="button" @click="emit('toggle')">
        {{ expanded ? 'Reduzir' : 'Ver inteira' }}
      </button>
    </figcaption>
  </figure>
</template>
