<script setup lang="ts">
import { computed } from 'vue'
import {
  diffStrumPattern,
  type StrumPattern,
  type StrumSlot,
  type StrumSlotMark,
} from '@henryavila/titan-chordpro-ui'
import { slotIndexAtClock } from './use/useStrumSound'

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
    /** Open-editor pencil — strip stays a read-only projection. */
    canEdit?: boolean
    /**
     * When set (including `null` = nothing before), the strip is a review
     * diff: each slot is marked same / changed / added against this pattern.
     */
    compare?: StrumPattern | null
    /** Review of a removed batida — every slot is marked removed. */
    removed?: boolean
  }>(),
  { beatClock: -1, barBeats: 4, canPick: false, canEdit: false, removed: false },
)

const emit = defineEmits<{ pick: []; edit: [] }>()

const barBeats = computed(() => Math.max(1, props.barBeats || 4))
const slotsPerBeat = computed(() =>
  Math.max(1, Math.round((props.pattern.grid || props.pattern.slots.length) / barBeats.value)),
)

const activeSlot = computed(() =>
  slotIndexAtClock(
    props.beatClock ?? -1,
    props.pattern.slots.length,
    props.pattern.grid || props.pattern.slots.length,
    barBeats.value,
  ),
)

function isActive(i: number): boolean {
  return activeSlot.value === i
}

const review = computed(() => {
  if (props.removed) return diffStrumPattern(props.pattern, null)
  if (props.compare === undefined) return null
  return diffStrumPattern(props.compare, props.pattern)
})

function slotMark(i: number): StrumSlotMark | '' {
  return review.value?.marks[i] ?? ''
}

function wasGlyph(i: number): string {
  const s = review.value?.was[i]
  return s ? glyph(s) : ''
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
  <div
    class="strum-strip"
    :class="{ 'is-diff': !!review }"
    data-strum-strip
    role="group"
    :aria-label="pattern.label || 'Batida'"
  >
    <div class="strum-head">
      <span class="strum-title">{{ pattern.label || 'Batida' }}</span>
      <span v-if="pattern.bpm" class="strum-bpm">{{ pattern.bpm }} BPM</span>
      <span style="margin-left:auto;display:flex;align-items:center;gap:2px;">
        <button
          v-if="canEdit"
          type="button"
          class="strum-edit"
          data-strum-edit
          title="Editar batida"
          aria-label="Editar batida"
          @click="emit('edit')"
        >✎</button>
        <button
          v-if="canPick"
          type="button"
          class="strum-pick"
          data-strum-pick
          title="Outras batidas"
          @click="emit('pick')"
        >⋯</button>
      </span>
    </div>
    <div class="strum-row" data-strum-row>
      <div
        v-for="(s, i) in pattern.slots"
        :key="i"
        :class="[slotClass(s), { 'strum-active': isActive(i), [`strum-diff-${slotMark(i)}`]: !!slotMark(i) }]"
        :aria-label="ariaSlot(s)"
        :data-strum-i="i"
        :data-strum-diff="slotMark(i) || undefined"
      >
        <span v-if="beatMark(i)" class="strum-beat">{{ beatMark(i) }}</span>
        <span v-if="wasGlyph(i)" class="strum-was" data-strum-was aria-hidden="true">{{ wasGlyph(i) }}</span>
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
  min-width: 0;
  max-width: 100%;
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
.strum-pick,
.strum-edit {
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
.strum-edit {
  background: var(--chord-soft);
  color: var(--chord);
}
/* Fill the reading column: slots grow across the strip, capped so short
   patterns stay readable. They shrink before a horizontal bar appears. */
.strum-row {
  display: flex;
  width: 100%;
  min-width: 0;
  justify-content: center;
  gap: 2px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.strum-slot {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  max-width: 36px;
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
.strum-strip.is-diff .strum-slot {
  height: 40px;
}
.strum-was {
  position: absolute;
  top: 12px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: var(--muted);
  text-decoration: line-through;
  opacity: 0.85;
  pointer-events: none;
}
.strum-diff-same {
  opacity: 0.72;
}
.strum-diff-changed {
  background: color-mix(in srgb, var(--chord) 22%, transparent);
  box-shadow: inset 0 0 0 1.5px var(--chord-edge);
}
.strum-diff-changed .strum-glyph {
  color: var(--chord);
}
.strum-diff-added {
  background: color-mix(in srgb, var(--chord) 16%, transparent);
  box-shadow: inset 0 0 0 1px var(--chord-edge);
}
.strum-diff-removed {
  background: var(--danger-soft);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--danger) 40%, transparent);
}
.strum-diff-removed .strum-glyph {
  color: var(--danger);
  text-decoration: line-through;
  opacity: 0.7;
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
  bottom: calc(50% + 2px);
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--text);
}
.strum-rest .strum-glyph {
  opacity: 0;
}

/* Desktop: taller cells + larger glyphs so the pulse is followable at stand distance. */
@media (min-width: 640px) {
  .strum-strip {
    gap: 8px;
    padding: 10px 14px 12px;
  }
  .strum-title {
    font-size: 11px;
  }
  .strum-bpm {
    font-size: 13px;
  }
  .strum-row {
    gap: 4px;
  }
  .strum-slot {
    min-width: 0;
    /* Cap high enough that 12-slot patterns fill a ~880–980px column. */
    max-width: 80px;
    height: 48px;
    border-radius: 8px;
  }
  .strum-strip.is-diff .strum-slot {
    height: 64px;
  }
  .strum-beat {
    font-size: 10px;
  }
  .strum-glyph {
    font-size: 22px;
    margin-bottom: 4px;
  }
  .strum-e-accent .strum-glyph {
    font-size: 26px;
  }
  .strum-e-muted .strum-glyph {
    font-size: 20px;
  }
  .strum-dot {
    width: 4px;
    height: 4px;
  }
  .strum-active {
    background: color-mix(in srgb, var(--chord) 40%, transparent);
    box-shadow: inset 0 0 0 1.5px var(--chord-edge);
  }
  .strum-active .strum-glyph {
    transform: scale(1.2);
  }
  .strum-was {
    top: 16px;
    font-size: 14px;
  }
}
</style>
