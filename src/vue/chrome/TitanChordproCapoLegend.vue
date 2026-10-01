<script setup lang="ts">
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'

defineProps<{
  shape: string
  real: string
  capo: number
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="titan-chordpro-legend" data-legend>
    <span class="titan-chordpro-legend-half">
      <span class="titan-chordpro-legend-dot" style="background:var(--capo);" />
      <span class="titan-chordpro-legend-name" style="color:var(--capo);">{{ shape }}</span>
      <span class="titan-chordpro-legend-note">com capo {{ capo }}</span>
    </span>
    <span class="titan-chordpro-legend-sep" />
    <span class="titan-chordpro-legend-half">
      <span class="titan-chordpro-legend-dot" style="background:var(--chord);" />
      <span class="titan-chordpro-legend-name" style="color:var(--chord);">{{ real }}</span>
      <span class="titan-chordpro-legend-note">sem capo</span>
    </span>
    <button
      class="titan-chordpro-ghost"
      aria-label="Sair do modo dual"
      title="Sair do modo dual"
      style="flex:none;width:24px;height:24px;border-radius:8px;color:var(--muted);font-size:14px;line-height:1;"
      @click="emit('close')"
    ><TitanChordproIcon name="x" :size="14" /></button>
  </div>
</template>
