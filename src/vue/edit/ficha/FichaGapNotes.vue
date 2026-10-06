<script setup lang="ts">
import { computed } from 'vue'
import type { ChartMeta } from '@henryavila/titan-chordpro-ui'
import { durationGapNote, joinGapLabels, softGapKeys } from './gaps'

const props = defineProps<{
  meta: ChartMeta
  /** Sentence after "Falta título, tom e …." Each ficha keeps its own. */
  softTail: string
}>()

const soft = computed(() => softGapKeys(props.meta))
const list = computed(() => joinGapLabels(soft.value))
const durationNote = computed(() => durationGapNote(props.meta))
</script>

<template>
  <span v-if="soft.length" style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">Falta {{ list }}. {{ softTail }}</span>
  <span v-if="durationNote" style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">{{ durationNote }}</span>
</template>
