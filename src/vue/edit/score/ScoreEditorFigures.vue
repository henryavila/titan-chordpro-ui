<script setup lang="ts">
import { DURS } from '@henryavila/titan-chordpro-ui'
import type { Dur } from '@henryavila/titan-chordpro-ui'

defineProps<{
  dur: Dur
  slide: boolean
  canRemove: boolean
}>()

const emit = defineEmits<{
  dur: [dur: Dur]
  slide: []
  rest: []
  remove: []
}>()
</script>

<template>
  <div style="flex:none;display:flex;flex-direction:column;gap:7px;">
    <span class="titan-chordpro-edp-kicker">Figura</span>
    <div style="display:flex;gap:5px;">
      <button
        v-for="d in DURS"
        :key="d.d"
        class="titan-chordpro-edp-dur"
        :title="d.name"
        :aria-pressed="dur === d.d"
        :style="{
          borderColor: dur === d.d ? 'var(--chord-edge)' : 'var(--line)',
          background: dur === d.d ? 'var(--chord-soft)' : 'transparent',
          color: dur === d.d ? 'var(--chord)' : 'var(--text)',
        }"
        @click="emit('dur', d.d)"
      >
        <span style="position:relative;display:block;width:21px;height:24px;">
          <span :style="{ background: d.hollow ? 'transparent' : 'currentColor' }" style="position:absolute;left:1px;bottom:1px;width:12px;height:9px;border:1.6px solid currentColor;border-radius:50%;transform:rotate(-20deg);" />
          <span v-if="d.stem" style="position:absolute;left:12px;bottom:5px;width:1.8px;height:18px;background:currentColor;" />
          <span v-if="d.flags >= 1" style="position:absolute;left:13px;top:1px;width:8px;height:2px;background:currentColor;transform:rotate(30deg);transform-origin:left center;" />
          <span v-if="d.flags >= 2" style="position:absolute;left:13px;top:7px;width:8px;height:2px;background:currentColor;transform:rotate(30deg);transform-origin:left center;" />
        </span>
        <span style="font-family:'Space Mono',monospace;font-size:8.5px;color:var(--muted);">{{ d.b }} {{ d.b === 1 ? 'tempo' : 'tempos' }}</span>
      </button>
    </div>
    <div style="display:flex;gap:5px;">
      <button
        class="titan-chordpro-edp-flat"
        :aria-pressed="slide"
        :style="{
          borderColor: slide ? 'var(--chord-edge)' : 'var(--line)',
          background: slide ? 'var(--chord-soft)' : 'transparent',
          color: slide ? 'var(--chord)' : 'var(--text)',
        }"
        @click="emit('slide')"
      >Slide</button>
      <button class="titan-chordpro-edp-flat" data-add-rest @click="emit('rest')">Pausa</button>
      <button
        class="titan-chordpro-edp-flat"
        data-del-note
        :disabled="!canRemove"
        title="Remove a nota selecionada (Backspace)"
        :style="{ color: canRemove ? 'var(--danger)' : 'var(--muted)', opacity: canRemove ? 1 : 0.45 }"
        @click="emit('remove')"
      >Remover</button>
    </div>
  </div>
</template>
