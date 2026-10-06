<script setup lang="ts">
import type { StringRow } from './model'

defineProps<{
  rows: StringRow[]
  fret: number | undefined
}>()

const emit = defineEmits<{
  place: [str: number, at: number | null]
  fret: [fret: number]
}>()
</script>

<template>
  <div style="flex:1;min-width:260px;display:flex;flex-wrap:wrap;gap:14px;">
    <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:7px;">
      <span class="titan-chordpro-edp-kicker">Cordas · toque para escrever</span>
      <div style="flex:1;overflow-x:auto;padding-bottom:4px;">
        <div style="display:flex;flex-direction:column;gap:2px;width:max-content;min-width:100%;">
          <div v-for="r in rows" :key="r.label" style="display:flex;align-items:stretch;height:26px;">
            <span style="flex:none;width:20px;display:flex;align-items:center;font-family:'Space Mono',monospace;font-size:11px;font-weight:700;color:var(--muted);">{{ r.label }}</span>
            <button
              v-for="(c, ci) in r.cells"
              :key="ci"
              class="titan-chordpro-edp-cell"
              :aria-label="c.aria"
              :aria-pressed="c.on"
              :disabled="c.bar"
              :style="{
                width: c.w,
                borderColor: c.bar ? 'transparent' : c.selected ? 'var(--sel-line)' : c.on ? 'var(--chord-edge)' : 'transparent',
                background: c.bar ? 'var(--line)' : c.playing ? 'var(--chord-fill)' : c.on ? 'var(--chord-soft)' : c.selected ? 'var(--surface)' : 'transparent',
                color: c.bar ? 'transparent' : c.on ? 'var(--chord)' : 'var(--muted)',
              }"
              @click="!c.bar && emit('place', c.str, c.at)"
            >{{ c.txt }}<span :style="{ background: c.bar || c.on ? 'transparent' : 'var(--line-soft)' }" style="position:absolute;left:0;right:0;top:50%;height:1px;" /></button>
          </div>
        </div>
      </div>
    </div>
    <div style="flex:none;display:flex;flex-direction:column;gap:7px;">
      <span class="titan-chordpro-edp-kicker">Casa</span>
      <div style="display:grid;grid-template-columns:repeat(7,34px);gap:4px;">
        <button
          v-for="f in 14"
          :key="f"
          class="titan-chordpro-edp-fret"
          :aria-pressed="fret === f - 1"
          :style="{
            borderColor: fret === f - 1 ? 'var(--chord-edge)' : 'var(--line)',
            background: fret === f - 1 ? 'var(--chord-soft)' : 'transparent',
            color: fret === f - 1 ? 'var(--chord)' : 'var(--text)',
          }"
          @click="emit('fret', f - 1)"
        >{{ f - 1 }}</button>
      </div>
    </div>
  </div>
</template>
