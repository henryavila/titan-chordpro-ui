<script setup lang="ts">
defineProps<{
  density: 'row' | 'chip'
  mul: number
  etaLabel: string
  progress: number
}>()

defineEmits<{
  slower: []
  faster: []
}>()
</script>

<template>
  <div
    class="titan-chordpro-speed-hud"
    :class="density === 'chip' ? 'titan-chordpro-hit titan-chordpro-veil-2 is-chip' : 'is-row'"
  >
    <span v-if="density === 'chip'" class="titan-chordpro-modal-kicker">Velocidade</span>
    <button type="button" aria-label="Mais devagar" :title="density === 'chip' ? 'Mais devagar (←)' : undefined" @click="$emit('slower')">−</button>
    <span class="titan-chordpro-speed-hud-mul">{{ mul.toFixed(2) }}×</span>
    <button type="button" aria-label="Mais rápido" :title="density === 'chip' ? 'Mais rápido (→)' : undefined" @click="$emit('faster')">+</button>
    <span class="titan-chordpro-speed-hud-gap" />
    <span class="titan-chordpro-speed-hud-eta">
      <span data-eta>−{{ etaLabel }}</span>
      <span>{{ Math.round(progress * 100) }}%</span>
    </span>
  </div>
</template>
