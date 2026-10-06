<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChartBlock } from '@henryavila/titan-chordpro-ui'
import type { BlockEditApi } from '../../use/useBlockEdit'
import { typingAt } from './labels'

const props = defineProps<{
  block: ChartBlock
  edit: BlockEditApi | null
}>()
const comment = computed(() => (props.block.kind === 'comment' ? props.block : null))
const rowInput = ref<HTMLInputElement | null>(null)
</script>

<template>
  <template v-if="comment">
    <input
      v-if="edit && typingAt(edit, comment.li0)"
      ref="rowInput"
      class="titan-chordpro-row-input titan-chordpro-row-input--comment"
      :value="edit.rowText.value"
      aria-label="Comentário de ensaio"
      @input="edit.rowText.value = ($event.target as HTMLInputElement).value"
      @keydown="edit.onRowKey"
      @blur="edit.commitRow"
    >
    <div
      v-else
      class="titan-chordpro-comment"
      :class="{ 'is-editable': !!edit }"
      @click="edit?.editComment(comment.li0, comment.text)"
    >
      <span class="titan-chordpro-comment-dot" />
      <span class="titan-chordpro-comment-text">{{ comment.text }}</span>
      <span class="titan-chordpro-comment-line" />
    </div>
  </template>
</template>
