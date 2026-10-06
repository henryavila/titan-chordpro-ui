<script setup lang="ts">
import type { StrumSlot } from '@henryavila/titan-chordpro-ui'
import { slotClass, slotGlyph, slotShortTag } from './slot-visual'

defineProps<{
  compact: boolean
  rows: { beat: number; indices: number[] }[]
  slots: StrumSlot[]
  slotsPerBeat: number
  pickIndex: number
  previewRunning: boolean
  previewSlot: number
}>()

const emit = defineEmits<{
  pick: [index: number]
}>()
</script>

<template>
  <div
    data-batida-beats
    class="batida-beats"
    :class="{ 'is-compact': compact }"
  >
    <div
      v-for="row in rows"
      :key="row.beat"
      data-batida-beat-row
      class="batida-beat-row"
    >
      <span class="batida-beat-num">{{ row.beat }}</span>
      <div class="batida-beat-slots" :style="{ gridTemplateColumns: `repeat(${row.indices.length}, minmax(0, 1fr))` }">
        <button
          v-for="i in row.indices"
          :key="i"
          type="button"
          :class="[slotClass(slots[i]!), { 'is-focus': pickIndex === i, 'is-preview': previewRunning === true && previewSlot === i }]"
          :data-batida-slot="i"
          :aria-label="`tempo ${row.beat}, subdivisão ${(i % slotsPerBeat) + 1}`"
          @click="emit('pick', i)"
        >
          <span class="batida-slot-gl" aria-hidden="true">
            {{ slotGlyph(slots[i]!) }}
            <span
              v-if="slots[i]!.contact === 'hit' && slots[i]!.essence === 'mute'"
              class="batida-slot-dot"
            />
          </span>
          <span class="batida-slot-tag">{{ slotShortTag(slots[i]!) || '\u00a0' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.batida-beats {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
}
.batida-beats.is-compact {
  gap: 8px;
}
.batida-beat-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.batida-beat-num {
  flex: none;
  width: 22px;
  font-family: var(--titan-chordpro-font-chords, 'Space Mono', monospace);
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  text-align: center;
}
.batida-beat-slots {
  flex: 1;
  display: grid;
  gap: 8px;
}
.batida-beats.is-compact .batida-beat-slots {
  gap: 4px;
}
.batida-slot {
  position: relative;
  min-height: 72px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 6px 8px;
  font: inherit;
  transition: border-color 0.12s, background 0.12s, box-shadow 0.12s;
}
.batida-beats.is-compact .batida-slot {
  min-height: 58px;
  border-radius: 12px;
  gap: 3px;
  padding: 8px 4px 6px;
}
.batida-slot.is-empty {
  border-style: dashed;
  background: transparent;
}
.batida-slot.is-empty .batida-slot-gl {
  font-weight: 500;
  color: var(--muted);
}
.batida-slot-gl {
  position: relative;
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
  min-height: 28px;
  display: grid;
  place-items: center;
}
.batida-beats.is-compact .batida-slot-gl {
  font-size: 22px;
  min-height: 24px;
}
.batida-slot-tag {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1;
  min-height: 11px;
  letter-spacing: 0.02em;
}
.batida-beats.is-compact .batida-slot-tag {
  font-size: 9.5px;
  min-height: 10px;
}
.batida-slot-dot {
  position: absolute;
  bottom: -1px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text);
}
.batida-slot.is-ghost .batida-slot-gl {
  font-weight: 500;
  color: color-mix(in srgb, var(--text) 38%, transparent);
}
.batida-slot.is-ghost {
  border-style: dashed;
}
.batida-slot.is-accent .batida-slot-gl {
  font-size: 30px;
  color: var(--chord);
}
.batida-beats.is-compact .batida-slot.is-accent .batida-slot-gl {
  font-size: 26px;
}
.batida-slot.is-accent {
  border-color: var(--chord-edge);
}
.batida-slot.is-accent .batida-slot-tag {
  color: var(--chord);
}
.batida-slot.is-mute .batida-slot-gl {
  font-weight: 800;
}
.batida-slot.is-muted .batida-slot-gl {
  font-size: 22px;
  font-weight: 700;
  color: var(--muted);
}
.batida-slot.is-focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--chord) 28%, transparent);
  border-color: var(--chord-edge);
  background: var(--chord-soft);
}
.batida-slot.is-preview {
  border-color: var(--chord-edge);
  background: var(--chord-soft);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--chord) 40%, transparent);
}
</style>
