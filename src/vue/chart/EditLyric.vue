<script setup lang="ts">
import type { AnchorChar } from '@henryavila/titan-chordpro-ui'

defineProps<{
  chars: AnchorChar[]
  /** Source offsets that carry a caret. */
  anchors: number[]
  /** The chord is anchored after the last letter — there is no character there. */
  end?: boolean
}>()
</script>

<template>
  <!-- No whitespace between the spans: a text node would shift the caret off the letter. -->
  <span class="titan-chordpro-lyric"><span v-for="c in chars" :key="c.i" :data-i="c.i" :data-anchor="anchors.includes(c.i) ? '' : undefined">{{ c.ch }}</span><span v-if="end" class="titan-chordpro-anchor-end" data-anchor /></span>
</template>
