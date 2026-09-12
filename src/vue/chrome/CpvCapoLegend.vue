<script setup lang="ts">
import CpvIcon from '../icon/CpvIcon.vue'

defineProps<{
  shape: string
  real: string
  capo: number
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="cpv-legend" data-legend>
    <span class="cpv-legend-half">
      <span class="cpv-legend-dot" style="background:var(--capo);" />
      <span class="cpv-legend-name" style="color:var(--capo);">{{ shape }}</span>
      <span class="cpv-legend-note">com capo {{ capo }}</span>
    </span>
    <span class="cpv-legend-sep" />
    <span class="cpv-legend-half">
      <span class="cpv-legend-dot" style="background:var(--chord);" />
      <span class="cpv-legend-name" style="color:var(--chord);">{{ real }}</span>
      <span class="cpv-legend-note">sem capo</span>
    </span>
    <button
      class="cpv-ghost"
      aria-label="Sair do modo dual"
      title="Sair do modo dual"
      style="flex:none;width:24px;height:24px;border-radius:8px;color:var(--muted);font-size:14px;line-height:1;"
      @click="emit('close')"
    ><CpvIcon name="x" :size="14" /></button>
  </div>
</template>
