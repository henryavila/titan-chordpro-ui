<script setup lang="ts">
import type { BarChip } from './model'

defineProps<{
  bars: BarChip[]
  atLabel: string
  closed: boolean
  fillStatus: string
  narrow: boolean
  keyHint: string
  canUndo: boolean
  showSrc: boolean
}>()

const emit = defineEmits<{
  bar: [bi: number]
  undo: []
  src: []
}>()
</script>

<template>
  <div class="titan-chordpro-edp-bars">
    <span class="titan-chordpro-edp-kicker">Compassos</span>
    <div style="display:flex;gap:7px;overflow-x:auto;max-width:100%;">
      <button
        v-for="b in bars"
        :key="b.bi"
        class="titan-chordpro-edp-bar"
        title="Ir para este compasso"
        :style="{ borderColor: b.on ? 'var(--chord-edge)' : 'var(--line)' }"
        @click="emit('bar', b.bi)"
      >
        <span :style="{ color: b.on ? 'var(--chord)' : 'var(--muted)' }" style="font-family:'Space Mono',monospace;font-size:9px;font-weight:700;">{{ b.label }}</span>
        <span style="display:flex;gap:2px;">
          <span
            v-for="(t, ti) in b.beats"
            :key="ti"
            :style="{ background: t.full ? 'var(--chord)' : t.part ? 'var(--chord-fill)' : 'var(--surface)' }"
            style="width:13px;height:9px;border-radius:2px;"
          />
        </span>
      </button>
    </div>
    <span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--chord);font-weight:700;">{{ atLabel }}</span>
    <span :style="{ color: closed ? 'var(--muted)' : 'var(--danger)' }" style="font-family:'Space Mono',monospace;font-size:11px;">{{ fillStatus }}</span>
    <div style="flex:1;" />
    <span v-if="!narrow" style="font-size:11px;color:var(--muted);">a nota nova entra depois da selecionada · {{ keyHint }}</span>
    <button class="titan-chordpro-edp-mini" :disabled="!canUndo" title="Desfazer (Ctrl+Z)" @click="emit('undo')">Desfazer</button>
    <button class="titan-chordpro-edp-mini" data-score-src @click="emit('src')">{{ showSrc ? 'Ocultar fonte' : 'Ver fonte' }}</button>
  </div>
</template>
