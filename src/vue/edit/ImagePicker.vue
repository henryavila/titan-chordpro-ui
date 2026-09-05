<script setup lang="ts">
import type { ImageChoice } from '../use/useBlockEdit'

defineProps<{
  items: ImageChoice[]
  resolveImage: (src: string) => string
  replacing: boolean
}>()

const emit = defineEmits<{ pick: [file: string]; close: [] }>()
</script>

<template>
  <div class="cpv-modal" data-image-picker style="align-items:center;padding:20px;">
    <div class="cpv-scrim" @click="emit('close')" />
    <div
      class="cpv-veil-2 cpv-modal-card"
      role="dialog"
      aria-modal="true"
      aria-label="Escolher partitura"
      style="max-width:430px;max-height:min(560px,86%);overflow-y:auto;padding:15px;border-radius:18px;"
    >
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span class="cpv-modal-kicker">{{ replacing ? 'Trocar partitura' : 'Partitura ou solo' }}</span>
        <button class="cpv-ghost" aria-label="Fechar" style="width:26px;height:26px;color:var(--muted);font-size:15px;" @click="emit('close')">×</button>
      </div>
      <span style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">
        O arquivo vem do app — aqui entra a referência no source, no ponto do bloco selecionado.
      </span>
      <div v-if="!items.length" style="font-size:12px;line-height:1.5;color:var(--muted);padding:6px 0;">
        Este app ainda não ofereceu nenhuma partitura para escolher.
      </div>
      <button
        v-for="p in items"
        :key="p.file"
        class="cpv-picker-item"
        type="button"
        @click="emit('pick', p.file)"
      >
        <img :src="resolveImage(p.file)" alt="">
        <span style="display:flex;flex-direction:column;gap:3px;min-width:0;">
          <span style="font-size:13px;font-weight:600;">{{ p.label || p.file }}</span>
          <span style="font-family:'Space Mono',monospace;font-size:10.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ p.file }}</span>
        </span>
      </button>
    </div>
  </div>
</template>
