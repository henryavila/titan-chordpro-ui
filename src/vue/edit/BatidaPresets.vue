<script setup lang="ts">
import { computed } from 'vue'
import { listStrumPresets } from '@henryavila/titan-chordpro-ui'

const emit = defineEmits<{
  apply: [presetId: string]
}>()

const presets = computed(() => listStrumPresets())
</script>

<template>
  <div data-batida-presets style="display:flex;flex-direction:column;gap:8px;">
    <span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);font-weight:700;">Presets</span>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      <button
        v-for="p in presets"
        :key="p.id"
        type="button"
        class="cpv-ghost"
        :data-batida-preset="p.id"
        :aria-label="`Aplicar preset ${p.label}`"
        style="height:34px;padding:0 12px;border-radius:999px;border:1px solid var(--line);color:var(--text);font-size:12.5px;font-weight:600;cursor:pointer;"
        @click="emit('apply', p.id)"
      >{{ p.label }}</button>
    </div>
  </div>
</template>
