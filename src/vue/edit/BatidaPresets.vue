<script setup lang="ts">
import type { StrumPreset } from '@henryavila/titan-chordpro-ui'

defineProps<{
  presets: StrumPreset[]
}>()

const emit = defineEmits<{
  apply: [presetId: string]
  save: []
}>()
</script>

<template>
  <div data-batida-presets style="display:flex;flex-direction:column;gap:8px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);font-weight:700;">Presets</span>
      <button
        type="button"
        data-batida-preset-save
        class="cpv-ghost"
        title="Salvar a batida atual como preset no sistema"
        style="height:28px;padding:0 10px;border-radius:999px;border:1px dashed var(--line);color:var(--text);font-size:11.5px;font-weight:600;cursor:pointer;"
        @click="emit('save')"
      >Salvar como preset</button>
    </div>
    <div v-if="presets.length" style="display:flex;flex-wrap:wrap;gap:6px;">
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
    <p
      v-else
      data-batida-presets-empty
      style="margin:0;font-size:12px;line-height:1.45;color:var(--muted);"
    >Nenhum preset ainda — ajuste a batida e use “Salvar como preset”.</p>
  </div>
</template>
