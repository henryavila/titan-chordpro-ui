<script setup lang="ts">
import { computed } from 'vue'
import {
  listSlotChoices,
  slotEquals,
  type StrumPattern,
  type StrumSlot,
} from '@henryavila/titan-chordpro-ui'
import CpvIcon from '../icon/CpvIcon.vue'

const props = defineProps<{
  compact: boolean
  current: StrumSlot
  beatLabel: string
  /** When set with slotIndex, only legal directions are listed. */
  pattern?: StrumPattern
  slotIndex?: number
  dirHint?: string
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

const essOrder = ['normal', 'accent', 'mute', 'muted'] as const

const choices = computed(() =>
  props.pattern != null && props.slotIndex != null
    ? listSlotChoices(props.pattern, props.slotIndex)
    : listSlotChoices(),
)
const hits = computed(() => choices.value.filter((c) => c.contact === 'hit'))
const ghosts = computed(() => choices.value.filter((c) => c.contact === 'ghost'))
const singleDir = computed(() => {
  const dirs = new Set(choices.value.map((c) => c.dir).filter(Boolean))
  return dirs.size === 1
})

/** Dual-dir: one column per hand direction (baixo | cima). */
const dualColumns = computed(() => {
  if (singleDir.value) return null
  return (['down', 'up'] as const).map((dir) => ({
    dir,
    label: dir === 'down' ? 'Baixo' : 'Cima',
    hits: essOrder
      .map((e) => hits.value.find((h) => h.dir === dir && h.essence === e))
      .filter((h): h is NonNullable<typeof h> => !!h),
    ghost: ghosts.value.find((g) => g.dir === dir) ?? null,
  }))
})

/** Single-dir: flat hit list for a 2-column option grid. */
const singleHits = computed(() => {
  if (!singleDir.value) return []
  return essOrder
    .map((e) => hits.value.find((h) => h.essence === e))
    .filter((h): h is NonNullable<typeof h> => !!h)
})
const singleGhost = computed(() => (singleDir.value ? ghosts.value[0] ?? null : null))

/** Primary mark — same vocabulary as StrumStrip. */
function glyph(s: StrumSlot): string {
  if (s.dir == null) return '·'
  if (s.contact === 'ghost') return s.dir === 'up' ? '↑' : '↓'
  if (s.essence === 'muted') return '×'
  if (s.dir === 'up') return '↑'
  if (s.dir === 'down') return '↓'
  return '·'
}

/** Secondary copy — no arrow (the tile already shows direction). */
function labelOf(s: StrumSlot): string {
  if (s.contact === 'ghost') return 'Passa'
  return ESS_LABEL[s.essence ?? 'normal'] ?? 'Normal'
}

function dirHint(s: StrumSlot): string {
  if (s.dir == null) return ''
  return s.dir === 'up' ? 'cima' : 'baixo'
}

function toneClass(s: StrumSlot): string {
  if (s.dir == null) return 'is-empty'
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



const titleHint = computed(() => {
  if (props.dirHint) return props.dirHint
  if (singleDir.value) {
    const d = choices.value[0]?.dir
    return d === 'up' ? 'só ↑' : d === 'down' ? 'só ↓' : ''
  }
  return 'Defina o sentido'
})
</script>

<template>
  <div
    class="cpv-sheet batida-picker-root"
    :class="{ 'is-compact': compact }"
    style="z-index:29;"
  >
    <div class="cpv-scrim" data-batida-pick-scrim @click="emit('close')" />
    <div
      class="cpv-veil-2 batida-picker"
      :class="{ 'is-compact': compact }"
      role="dialog"
      aria-label="Escolher batida"
      aria-modal="true"
      data-batida-picker
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
          <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">{{ beatLabel }} · {{ titleHint }}</span>
          <span style="font-size:14px;font-weight:700;color:var(--text);">Escolher batida</span>
        </span>
        <button class="cpv-ghost" aria-label="Fechar" style="width:34px;height:34px;color:var(--muted);" @click="emit('close')">
          <CpvIcon name="x" :size="16" />
        </button>
      </div>

      <!-- Dual direction: column Baixo | column Cima (never mix in one row). -->
      <div
        v-if="dualColumns"
        class="batida-pick-dirs"
        data-batida-pick-dirs
      >
        <div
          v-for="col in dualColumns"
          :key="col.dir"
          class="batida-pick-dir-col"
          :data-batida-dir-col="col.dir"
        >
          <div class="batida-pick-sec">{{ col.label }} · tocar</div>
          <button
            v-for="s in col.hits"
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
          <div class="batida-pick-sec">Passar</div>
          <button
            v-if="col.ghost"
            type="button"
            class="batida-pick-choice is-ghost"
            :class="{ 'is-on': slotEquals(col.ghost, current) }"
            data-batida-choice="ghost"
            :aria-label="ariaOf(col.ghost)"
            :aria-pressed="slotEquals(col.ghost, current) ? 'true' : 'false'"
            @click="emit('pick', col.ghost)"
          >
            <span class="batida-pick-mark" aria-hidden="true">
              <span class="batida-pick-gl">{{ glyph(col.ghost) }}</span>
            </span>
            <span class="batida-pick-copy">
              <span class="batida-pick-name">Passa</span>
              <span class="batida-pick-sub">não tocar</span>
            </span>
          </button>
        </div>
      </div>

      <!-- Single direction: 2-column option grid is fine. -->
      <template v-else>
        <div class="batida-pick-sec">Tocar</div>
        <div class="batida-pick-grid is-options">
          <button
            v-for="s in singleHits"
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
        <div class="batida-pick-grid is-options">
          <button
            v-if="singleGhost"
            type="button"
            class="batida-pick-choice is-ghost"
            :class="{ 'is-on': slotEquals(singleGhost, current) }"
            data-batida-choice="ghost"
            :aria-label="ariaOf(singleGhost)"
            :aria-pressed="slotEquals(singleGhost, current) ? 'true' : 'false'"
            @click="emit('pick', singleGhost)"
          >
            <span class="batida-pick-mark" aria-hidden="true">
              <span class="batida-pick-gl">{{ glyph(singleGhost) }}</span>
            </span>
            <span class="batida-pick-copy">
              <span class="batida-pick-name">Passa</span>
              <span class="batida-pick-sub">{{ dirHint(singleGhost) }} · não tocar</span>
            </span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.batida-picker {
  position: relative;
  width: 100%;
  max-width: 520px;
  max-height: min(720px, calc(100% - 48px));
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  animation: cpv-rise 0.2s ease-out;
  box-shadow: var(--shadow);
}
.batida-picker.is-compact {
  max-width: 100%;
  max-height: 78%;
  padding: 14px 14px calc(14px + env(safe-area-inset-bottom));
  border-radius: 20px 20px 0 0;
  gap: 12px;
  box-shadow: none;
}
.batida-pick-sec {
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
  padding: 2px 2px 0;
}
.batida-pick-dirs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: start;
}
.batida-pick-dir-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.batida-pick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.batida-pick-grid.is-options {
  grid-template-columns: 1fr 1fr;
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

.batida-pick-choice.is-empty .batida-pick-gl {
  font-weight: 500;
  color: var(--muted);
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
.batida-pick-cur.is-empty .batida-pick-gl {
  color: var(--muted);
  font-weight: 500;
}
.batida-pick-cur.is-accent .batida-pick-gl {
  font-size: 22px;
}
.batida-pick-cur .batida-pick-dot {
  bottom: 8px;
  background: var(--chord);
}
</style>
