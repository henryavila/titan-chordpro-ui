<script setup lang="ts">
import { computed } from 'vue'
import type { StrumPattern, StrumSlot } from '@henryavila/titan-chordpro-ui'

const props = withDefaults(
  defineProps<{
    pattern: StrumPattern
    /**
     * Absolute beat clock from the metronome (float). Drives one-arrow
     * highlight: slot = floor(clock × slotsPerBeat) % length.
     * Negative / omitted → nothing active.
     */
    beatClock?: number
    /** Beats per bar (for the 1–2–3–4 marks above the grid). */
    barBeats?: number
    /** Show the “other patterns” control. */
    canPick?: boolean
  }>(),
  { beatClock: -1, barBeats: 4, canPick: false },
)

const emit = defineEmits<{ pick: [] }>()

const barBeats = computed(() => Math.max(1, props.barBeats || 4))
const slotsPerBeat = computed(() =>
  Math.max(1, Math.round((props.pattern.grid || props.pattern.slots.length) / barBeats.value)),
)

const activeSlot = computed(() => {
  if (props.beatClock == null || props.beatClock < 0) return -1
  const n = props.pattern.slots.length
  if (!n) return -1
  return Math.floor(props.beatClock * slotsPerBeat.value) % n
})

function isActive(i: number): boolean {
  return activeSlot.value === i
}

function beatMark(i: number): string {
  const spb = slotsPerBeat.value
  if (i % spb !== 0) return ''
  return String(Math.floor(i / spb) % barBeats.value + 1)
}

function slotClass(s: StrumSlot): string {
  const bits = [`strum-slot`, `strum-${s.contact}`]
  if (s.dir) bits.push(`strum-${s.dir}`)
  if (s.essence) bits.push(`strum-e-${s.essence}`)
  return bits.join(' ')
}

function glyph(s: StrumSlot): string {
  if (s.contact === 'rest') return ''
  if (s.essence === 'muted') return '×'
  if (s.dir === 'up') return '↑'
  if (s.dir === 'down') return '↓'
  return '×'
}

function ariaSlot(s: StrumSlot): string {
  if (s.contact === 'rest') return 'pausa'
  const dir = s.dir === 'up' ? 'cima' : s.dir === 'down' ? 'baixo' : ''
  if (s.contact === 'ghost') return `passa ${dir}`.trim()
  const ess =
    s.essence === 'accent'
      ? 'acento'
      : s.essence === 'mute'
        ? 'mute'
        : s.essence === 'muted'
          ? 'abafada'
          : 'normal'
  return `${ess} ${dir}`.trim()
}
</script>

<template>
  <div class="strum-strip" data-strum-strip role="group" :aria-label="pattern.label || 'Batida'">
    <div class="strum-head">
      <span class="strum-title">{{ pattern.label || 'Batida' }}</span>
      <span v-if="pattern.bpm" class="strum-bpm">{{ pattern.bpm }} BPM</span>
      <button
        v-if="canPick"
        type="button"
        class="strum-pick"
        data-strum-pick
        title="Outras batidas"
        @click="emit('pick')"
      >⋯</button>
    </div>
    <div class="strum-row">
      <div
        v-for="(s, i) in pattern.slots"
        :key="i"
        :class="[slotClass(s), { 'strum-active': isActive(i) }]"
        :aria-label="ariaSlot(s)"
        :data-strum-i="i"
      >
        <span v-if="beatMark(i)" class="strum-beat">{{ beatMark(i) }}</span>
        <span class="strum-glyph" aria-hidden="true">{{ glyph(s) }}</span>
        <span v-if="s.essence === 'mute' && s.contact === 'hit'" class="strum-dot" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.strum-strip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px 10px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--line-soft);
}
.strum-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 20px;
}
.strum-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}
.strum-bpm {
  font-family: var(--cpv-font-chords, 'Space Mono', monospace);
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.strum-pick {
  margin-left: auto;
  width: 28px;
  height: 24px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}
.strum-row {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.strum-slot {
  position: relative;
  flex: 0 0 auto;
  width: 18px;
  height: 28px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  border-radius: 6px;
}
.strum-active {
  background: color-mix(in srgb, var(--chord) 28%, transparent);
  box-shadow: inset 0 0 0 1px var(--chord-edge);
}
.strum-active .strum-glyph {
  color: var(--chord);
  transform: scale(1.15);
}
.strum-beat {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  font-weight: 700;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.strum-glyph {
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: var(--text);
  margin-bottom: 2px;
}
.strum-ghost .strum-glyph {
  color: color-mix(in srgb, var(--text) 38%, transparent);
  font-weight: 500;
}
.strum-e-accent .strum-glyph {
  font-size: 17px;
  color: var(--chord);
}
.strum-e-muted .strum-glyph {
  color: var(--muted);
  font-size: 13px;
}
.strum-dot {
  position: absolute;
  bottom: 15px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--text);
}
.strum-rest .strum-glyph {
  opacity: 0;
}
</style>
