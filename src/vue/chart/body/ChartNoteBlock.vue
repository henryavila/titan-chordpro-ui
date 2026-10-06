<script setup lang="ts">
import { computed } from 'vue'
import type { ChartBlock } from '@henryavila/titan-chordpro-ui'
import type { BlockEditApi } from '../../use/useBlockEdit'
import { typingAt } from './labels'

const props = defineProps<{
  block: ChartBlock
  edit: BlockEditApi | null
}>()
const note = computed(() => (props.block.kind === 'note' ? props.block : null))
</script>

<template>
  <div v-if="note" class="titan-chordpro-note">
    <div class="titan-chordpro-note-head">
      <span class="titan-chordpro-note-rule" />
      <span class="titan-chordpro-note-label">Execução</span>
    </div>
    <template v-for="(item, j) in note.items" :key="j">
      <input
        v-if="edit && typingAt(edit, note.lis[j] ?? -1)"
        class="titan-chordpro-row-input titan-chordpro-row-input--note"
        :value="edit.rowText.value"
        aria-label="Nota de execução"
        @input="edit.rowText.value = ($event.target as HTMLInputElement).value"
        @keydown="edit.onRowKey"
        @blur="edit.commitRow"
      >
      <div
        v-else
        class="titan-chordpro-note-item"
        :class="{ 'is-editable': !!edit }"
        @click="edit?.editComment(note.lis[j] ?? -1, item)"
      >{{ item }}</div>
    </template>
  </div>
</template>
