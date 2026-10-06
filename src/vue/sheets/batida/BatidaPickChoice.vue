<script setup lang="ts">
import { slotEquals, type StrumSlot } from '@henryavila/titan-chordpro-ui'
import { pickAria, pickDirWord, pickGlyph, pickLabel, pickToneClass } from './pick-model'

const props = defineProps<{
  value: StrumSlot
  current: StrumSlot
  kind: 'hit' | 'ghost'
  sub?: string
}>()

const emit = defineEmits<{
  pick: [slot: StrumSlot]
}>()
</script>

<template>
  <button
    type="button"
    class="batida-pick-choice"
    :class="[kind === 'hit' ? pickToneClass(value) : 'is-ghost', { 'is-on': slotEquals(value, current) }]"
    :data-batida-choice="kind"
    :aria-label="pickAria(value)"
    :aria-pressed="slotEquals(value, current) ? 'true' : 'false'"
    @click="emit('pick', props.value)"
  >
    <span class="batida-pick-mark" aria-hidden="true">
      <span class="batida-pick-gl">{{ pickGlyph(value) }}</span>
      <span v-if="kind === 'hit' && value.essence === 'mute'" class="batida-pick-dot" />
    </span>
    <span class="batida-pick-copy">
      <span class="batida-pick-name">{{ kind === 'ghost' ? 'Passa' : pickLabel(value) }}</span>
      <span class="batida-pick-sub">{{ sub ?? pickDirWord(value) }}</span>
    </span>
  </button>
</template>

<style scoped>
.batida-pick-choice {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1.5px solid var(--line);
  background: var(--canvas, var(--surface));
  color: var(--text);
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition: border-color 0.12s, background 0.12s, box-shadow 0.12s;
}
.batida-pick-choice:hover {
  border-color: var(--chord-edge);
}
.batida-pick-choice.is-on {
  border-color: var(--chord-edge);
  background: var(--chord-soft);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--chord) 22%, transparent);
}
.batida-pick-mark {
  position: relative;
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  border: 1px solid var(--line-soft);
  background: color-mix(in srgb, var(--text) 4%, transparent);
  display: grid;
  place-items: center;
}
.batida-pick-choice.is-on .batida-pick-mark {
  border-color: var(--chord-edge);
  background: color-mix(in srgb, var(--chord) 14%, transparent);
}
.batida-pick-gl {
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
  color: var(--text);
}
.batida-pick-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}
.batida-pick-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.01em;
}
.batida-pick-sub {
  font-size: 11px;
  color: color-mix(in srgb, var(--muted) 85%, transparent);
}
.batida-pick-choice.is-on .batida-pick-name {
  color: var(--chord);
}

/* Hit normal — seta forte */
.batida-pick-choice.is-hit .batida-pick-gl {
  font-weight: 800;
  color: var(--text);
}

/* Acento — maior + cor do acorde */
.batida-pick-choice.is-accent .batida-pick-gl {
  font-size: 30px;
  font-weight: 800;
  color: var(--chord);
}
.batida-pick-choice.is-accent .batida-pick-mark {
  border-color: color-mix(in srgb, var(--chord) 40%, var(--line-soft));
}

/* Mute — seta + ponto (igual strip) */
.batida-pick-choice.is-mute .batida-pick-gl {
  font-weight: 800;
  color: var(--text);
}
.batida-pick-dot {
  position: absolute;
  bottom: 11px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--text);
}
.batida-pick-choice.is-on .batida-pick-dot {
  background: var(--chord);
}

/* Abafada — × apagado */
.batida-pick-choice.is-muted .batida-pick-gl {
  font-size: 24px;
  font-weight: 700;
  color: var(--muted);
}

/* Passa — seta meio apagada */
.batida-pick-choice.is-ghost .batida-pick-gl {
  font-size: 26px;
  font-weight: 500;
  color: color-mix(in srgb, var(--text) 38%, transparent);
}
.batida-pick-choice.is-ghost .batida-pick-mark {
  background: transparent;
  border-style: dashed;
}

.batida-pick-choice.is-empty .batida-pick-gl {
  font-weight: 500;
  color: var(--muted);
}
</style>
