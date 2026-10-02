<script setup lang="ts">
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'

defineProps<{
  density: 'phone' | 'wide'
}>()

defineEmits<{
  dismiss: []
}>()
</script>

<template>
  <div
    class="titan-chordpro-hit titan-chordpro-veil-2 titan-chordpro-fit-hint"
    :class="`is-${density}`"
  >
    <span class="titan-chordpro-fit-hint-copy">Ajuste encaixa a cifra no espaço da tela — e dá para voltar ao padrão quando quiser.</span>
    <button
      type="button"
      class="titan-chordpro-ghost titan-chordpro-fit-hint-x"
      aria-label="Entendi"
      @click="$emit('dismiss')"
    ><TitanChordproIcon name="x" :size="14" /></button>
  </div>
</template>
