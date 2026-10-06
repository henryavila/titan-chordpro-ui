<script setup lang="ts">
import type { BlackKey, WhiteKey } from './model'

defineProps<{
  oct: number
  keys: { whites: WhiteKey[]; blacks: BlackKey[] }
  tabHint: string
}>()

const emit = defineEmits<{
  lower: []
  raise: []
  pitch: [midi: number]
}>()
</script>

<template>
  <div style="flex:1;min-width:260px;display:flex;flex-direction:column;gap:7px;">
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">
      <span class="titan-chordpro-edp-kicker">Teclas · toque para escrever</span>
      <span class="titan-chordpro-edp-meta">oitavas {{ oct }}–{{ oct + 2 }}</span>
      <button class="titan-chordpro-edp-oct" aria-label="Uma oitava abaixo" @click="emit('lower')">−</button>
      <button class="titan-chordpro-edp-oct" aria-label="Uma oitava acima" @click="emit('raise')">+</button>
      <span style="flex:1;" />
      <span style="font-family:'Space Mono',monospace;font-size:10.5px;color:var(--chord);">{{ tabHint }}</span>
    </div>
    <div style="height:88px;overflow-x:auto;">
      <div style="position:relative;height:84px;width:max-content;">
        <div style="display:flex;gap:2px;">
          <button
            v-for="w in keys.whites"
            :key="w.midi"
            class="titan-chordpro-edp-white"
            :aria-label="w.aria"
            :style="{
              borderColor: w.on ? 'var(--chord-edge)' : 'var(--line)',
              background: w.on ? 'var(--chord-soft)' : 'rgba(255,255,255,0.06)',
              color: w.on ? 'var(--chord)' : 'var(--muted)',
            }"
            @click="emit('pitch', w.midi)"
          >{{ w.label }}</button>
        </div>
        <button
          v-for="b in keys.blacks"
          :key="b.midi"
          class="titan-chordpro-edp-black"
          :aria-label="b.aria"
          :style="{
            left: b.left,
            borderColor: b.on ? 'var(--chord-edge)' : 'rgba(255,255,255,0.14)',
            background: b.on ? 'var(--chord-fill)' : '#171A21',
          }"
          @click="emit('pitch', b.midi)"
        />
      </div>
    </div>
  </div>
</template>
