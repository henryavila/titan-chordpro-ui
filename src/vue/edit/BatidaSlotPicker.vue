<script setup lang="ts">
import { computed } from 'vue'
import {
  listSlotChoices,
  type StrumPattern,
  type StrumSlot,
} from '@henryavila/titan-chordpro-ui'
import TitanChordproIconButton from '../ui/TitanChordproIconButton.vue'
import BatidaPickBoard from '../sheets/batida/BatidaPickBoard.vue'
import { pickGlyph, pickTitleHint, pickToneClass } from '../sheets/batida/pick-model'

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

const choices = computed(() =>
  props.pattern != null && props.slotIndex != null
    ? listSlotChoices(props.pattern, props.slotIndex)
    : listSlotChoices(),
)

const titleHint = computed(() => pickTitleHint(props.dirHint, choices.value))
</script>

<template>
  <div
    class="titan-chordpro-sheet batida-picker-root"
    :class="{ 'is-compact': compact }"
    style="z-index:29;"
  >
    <div class="titan-chordpro-scrim" data-batida-pick-scrim @click="emit('close')" />
    <div
      class="titan-chordpro-veil-2 batida-picker"
      :class="{ 'is-compact': compact }"
      role="dialog"
      aria-label="Escolher batida"
      aria-modal="true"
      data-batida-picker
    >
      <div style="display:flex;align-items:center;gap:10px;">
        <span
          class="batida-pick-cur"
          :class="pickToneClass(current)"
          aria-hidden="true"
        >
          <span class="batida-pick-gl">{{ pickGlyph(current) }}</span>
          <span v-if="current.contact === 'hit' && current.essence === 'mute'" class="batida-pick-dot" />
        </span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
          <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">{{ beatLabel }} · {{ titleHint }}</span>
          <span style="font-size:14px;font-weight:700;color:var(--text);">Escolher batida</span>
        </span>
        <TitanChordproIconButton icon="x" density="bar" muted aria-label="Fechar" @click="emit('close')" />
      </div>

      <BatidaPickBoard
        :choices="choices"
        :current="current"
        @pick="emit('pick', $event)"
      />
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
  animation: titan-chordpro-rise 0.2s ease-out;
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
.batida-pick-gl {
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
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
