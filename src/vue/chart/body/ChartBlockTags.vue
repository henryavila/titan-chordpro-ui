<script setup lang="ts">
import type { ChartBlock } from '@henryavila/titan-chordpro-ui'
import type { BlockEditApi } from '../../use/useBlockEdit'
import { blockShift, ownCapoLabel, shiftBadge } from './labels'

defineProps<{
  block: ChartBlock
  edit: BlockEditApi | null
  index: number
}>()
</script>

<template>
  <div v-if="ownCapoLabel(block)" class="titan-chordpro-block-tag-row">
    <span class="titan-chordpro-block-tag">{{ ownCapoLabel(block) }}</span>
  </div>
  <div v-if="edit && blockShift(block) !== 0" class="titan-chordpro-block-tag-row">
    <span class="titan-chordpro-block-tag titan-chordpro-block-tag--key">{{ shiftBadge(blockShift(block)) }}</span>
    <button
      class="titan-chordpro-block-tag-btn"
      type="button"
      title="Voltar este bloco ao tom da música"
      @click="edit.resetBlockShift(index)"
    >↺ tom da música</button>
  </div>
</template>
