<script setup lang="ts">
import { computed } from 'vue'
import type { ChartBlock } from '@henryavila/titan-chordpro-ui'
import { hiddenCount, hiddenPreview } from './labels'

const props = defineProps<{ block: ChartBlock }>()
const emit = defineEmits<{ unhide: [] }>()
const hidden = computed(() => (props.block.kind === 'hidden' ? props.block : null))
</script>

<template>
  <div v-if="hidden" class="titan-chordpro-hidden-card">
    <span class="titan-chordpro-hidden-eye"><span /></span>
    <span class="titan-chordpro-hidden-body">
      <span class="titan-chordpro-hidden-label">Oculto na leitura · {{ hiddenCount(hidden) }}</span>
      <span class="titan-chordpro-hidden-preview">{{ hiddenPreview(hidden) }}</span>
    </span>
    <button
      class="titan-chordpro-hidden-btn"
      type="button"
      title="Voltar a exibir este bloco"
      @click="emit('unhide')"
    >Reexibir</button>
  </div>
</template>
