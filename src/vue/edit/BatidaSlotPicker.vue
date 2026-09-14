<script setup lang="ts">
import { computed } from 'vue'
import { listSlotChoices, slotEquals, type StrumSlot } from '@henryavila/titan-chordpro-ui'
import CpvIcon from '../icon/CpvIcon.vue'

const props = defineProps<{
  compact: boolean
  current: StrumSlot
  beatLabel: string
}>()

const emit = defineEmits<{
  close: []
  pick: [slot: StrumSlot]
}>()

const ESS_LABEL: Record<string, string> = {
  normal: 'Normal',
  accent: 'Acento',
  mute: 'Mute',
  muted: 'Abafada',
}

const choices = computed(() => listSlotChoices())
const hits = computed(() => choices.value.filter((c) => c.contact === 'hit'))
const ghosts = computed(() => choices.value.filter((c) => c.contact === 'ghost'))

/** Primary mark — same vocabulary as StrumStrip. */
function glyph(s: StrumSlot): string {
  if (s.contact === 'ghost') return s.dir === 'up' ? '↑' : '↓'
  if (s.essence === 'muted') return '×'
  if (s.dir === 'up') return '↑'
  if (s.dir === 'down') return '↓'
  return '×'
}

/** Secondary copy — no arrow (the tile already shows direction). */
function labelOf(s: StrumSlot): string {
  if (s.contact === 'ghost') return 'Passa'
  return ESS_LABEL[s.essence ?? 'normal'] ?? 'Normal'
}

function dirHint(s: StrumSlot): string {
  return s.dir === 'up' ? 'cima' : 'baixo'
}

function toneClass(s: StrumSlot): string {
  if (s.contact === 'ghost') return 'is-ghost'
  if (s.essence === 'accent') return 'is-accent'
  if (s.essence === 'mute') return 'is-mute'
  if (s.essence === 'muted') return 'is-muted'
  return 'is-hit'
}

function ariaOf(s: StrumSlot): string {
  if (s.contact === 'ghost') return `Passa ${dirHint(s)}`
  return `${labelOf(s)} ${dirHint(s)}`
}

const geom = computed(() =>
  props.compact
    ? {
        left: '0',
        right: '0',
        bottom: '0',
        width: 'auto',
        maxHeight: '78%',
        padding: '14px 14px calc(14px + env(safe-area-inset-bottom))',
        borderRadius: '20px 20px 0 0',
      }
    : {
        left: 'auto',
        right: '16px',
        bottom: '96px',
        width: 'min(360px,calc(100% - 32px))',
        maxHeight: '72%',
        padding: '14px',
        borderRadius: '17px',
      },
)

const essOrder = ['normal', 'accent', 'mute', 'muted'] as const
</script>

<template>
  <div style="position:absolute;inset:0;z-index:29;">
    <div class="cpv-scrim" data-batida-pick-scrim @click="emit('close')" />
    <div
      class="cpv-veil-2 batida-picker"
      role="dialog"
      aria-label="Escolher batida"
      data-batida-picker
      :style="geom"
      style="position:absolute;overflow-y:auto;display:flex;flex-direction:column;gap:12px;animation:cpv-rise .2s ease-out;"
    >
      <div style="display:flex;align-items:center;gap:10px;">
        <span
          class="batida-pick-cur"
          :class="toneClass(current)"
          aria-hidden="true"
        >
          <span class="batida-pick-gl">{{ glyph(current) }}</span>
          <span v-if="current.contact === 'hit' && current.essence === 'mute'" class="batida-pick-dot" />
        </span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
          <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">{{ beatLabel }}</span>
          <span style="font-size:14px;font-weight:700;color:var(--text);">Escolher batida</span>
        </span>
        <button class="cpv-ghost" aria-label="Fechar" style="width:34px;height:34px;color:var(--muted);" @click="emit('close')">
          <CpvIcon name="x" :size="16" />
        </button>
      </div>

      <div class="batida-pick-sec">Tocar</div>
      <div
        v-for="e in essOrder"
        :key="e"
        class="batida-pick-grid"
      >
        <button
          v-for="s in hits.filter((h) => h.essence === e)"
          :key="`${s.dir}-${s.essence}`"
          type="button"
          class="batida-pick-choice"
          :class="[toneClass(s), { 'is-on': slotEquals(s, current) }]"
          data-batida-choice="hit"
          :aria-label="ariaOf(s)"
          :aria-pressed="slotEquals(s, current) ? 'true' : 'false'"
          @click="emit('pick', s)"
        >
          <span class="batida-pick-mark" aria-hidden="true">
            <span class="batida-pick-gl">{{ glyph(s) }}</span>
            <span v-if="s.essence === 'mute'" class="batida-pick-dot" />
          </span>
          <span class="batida-pick-copy">
            <span class="batida-pick-name">{{ labelOf(s) }}</span>
            <span class="batida-pick-sub">{{ dirHint(s) }}</span>
          </span>
        </button>
      </div>

      <div class="batida-pick-sec">Passar / não tocar</div>
      <div class="batida-pick-grid">
        <button
          v-for="s in ghosts"
          :key="`ghost-${s.dir}`"
          type="button"
          class="batida-pick-choice is-ghost"
          :class="{ 'is-on': slotEquals(s, current) }"
          data-batida-choice="ghost"
          :aria-label="ariaOf(s)"
          :aria-pressed="slotEquals(s, current) ? 'true' : 'false'"
          @click="emit('pick', s)"
        >
          <span class="batida-pick-mark" aria-hidden="true">
            <span class="batida-pick-gl">{{ glyph(s) }}</span>
          </span>
          <span class="batida-pick-copy">
            <span class="batida-pick-name">Passa</span>
            <span class="batida-pick-sub">{{ dirHint(s) }} · não tocar</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.batida-pick-sec {
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
  padding: 2px 2px 0;
}
.batida-pick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
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

/* Header current preview */
.batida-pick-cur {
  position: relative;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--chord-soft);
  border: 1px solid var(--chord-edge);
  display: grid;
  place-items: center;
  color: var(--chord);
}
.batida-pick-cur .batida-pick-gl {
  font-size: 20px;
  font-weight: 800;
  color: var(--chord);
}
.batida-pick-cur.is-ghost .batida-pick-gl {
  font-weight: 500;
  color: color-mix(in srgb, var(--chord) 45%, transparent);
}
.batida-pick-cur.is-muted .batida-pick-gl {
  color: var(--muted);
}
.batida-pick-cur.is-accent .batida-pick-gl {
  font-size: 22px;
}
.batida-pick-cur .batida-pick-dot {
  bottom: 8px;
  background: var(--chord);
}
</style>
