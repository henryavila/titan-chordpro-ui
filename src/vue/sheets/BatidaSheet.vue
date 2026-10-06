<script setup lang="ts">
import {
  type SaveStrumPresetPayload,
  type StrumPattern,
  type StrumPatternSet,
  type StrumPreset,
  type StrumSlot,
} from '@henryavila/titan-chordpro-ui'
import TitanChordproIconButton from '../ui/TitanChordproIconButton.vue'
import BatidaPresets from '../edit/BatidaPresets.vue'
import BatidaSlotPicker from '../edit/BatidaSlotPicker.vue'
import BatidaBeatGrid from './batida/BatidaBeatGrid.vue'
import BatidaMetaRow from './batida/BatidaMetaRow.vue'
import BatidaPatternBar from './batida/BatidaPatternBar.vue'
import BatidaPresetNameDialog from './batida/BatidaPresetNameDialog.vue'
import BatidaPresetReplaceDialog from './batida/BatidaPresetReplaceDialog.vue'
import BatidaSheetActions from './batida/BatidaSheetActions.vue'
import BatidaSoundBar from './batida/BatidaSoundBar.vue'
import { useBatidaDraft } from './batida/useBatidaDraft'

const props = withDefaults(
  defineProps<{
    compact: boolean
    pattern: StrumPattern
    /** Named patterns in the set (defaults to `[pattern]`). */
    patterns?: StrumPattern[]
    activeIndex?: number
    barBeats: number
    canDelete: boolean
    /** Host capability — off hides the presets section. */
    presetsEnabled?: boolean
    /** Host-owned catalog (never shipped by the package). */
    presets?: StrumPreset[]
    /** Acoustic one-shots armed (same flag as the metronome “Som da batida”). */
    soundEnabled?: boolean
    /** Editor preview loop is running. */
    previewRunning?: boolean
    /**
     * Absolute beat clock from the editor preview (−1 = none).
     * Same units as the StrumStrip metronome clock.
     */
    previewClock?: number
  }>(),
  {
    presetsEnabled: false,
    activeIndex: 0,
    presets: () => [],
    soundEnabled: false,
    previewRunning: false,
    previewClock: -1,
  },
)

const emit = defineEmits<{
  close: []
  save: [pattern: StrumPattern]
  'save-set': [set: StrumPatternSet]
  delete: []
  'select-pattern': [index: number]
  'add-pattern': []
  'duplicate-pattern': []
  'remove-pattern': []
  'save-preset': [payload: SaveStrumPresetPayload]
  'toggle-sound': []
  /** Pattern + the same bar-beat count the grid is drawn with — audio must share it. */
  'toggle-preview': [payload: { pattern: StrumPattern; barBeats: number }]
  'update-preview': [pattern: StrumPattern]
  audition: [slot: StrumSlot]
}>()

const {
  draftPatterns,
  draftActive,
  draft,
  pickIndex,
  label,
  sixEightPulse,
  presetNameOpen,
  presetName,
  presetNameErr,
  presetNameDialog,
  pendingPresetId,
  pendingPresetLabel,
  canSave,
  isSixEight,
  density,
  pickSlot,
  pickBeatLabel,
  pickDirHint,
  previewSlot,
  canRestart,
  beatRows,
  slotsPerBeat,
  onDensityChange,
  onSixEightPulseChange,
  openPick,
  applyPick,
  onTogglePreview,
  restartCreation,
  applyPreset,
  commitPreset,
  cancelPendingPreset,
  saveAsPreset,
  closePresetName,
  confirmPresetName,
  selectPattern,
  addPattern,
  duplicatePattern,
  removePattern,
  save,
} = useBatidaDraft(props, emit)
</script>

<template>
  <div
    class="titan-chordpro-sheet batida-sheet-root"
    :class="{ 'is-compact': compact }"
    style="z-index:28;"
  >
    <div class="titan-chordpro-scrim" data-batida-scrim @click="emit('close')" />
    <div
      class="titan-chordpro-veil-2 batida-sheet-panel"
      :class="{ 'is-compact': compact }"
      role="dialog"
      aria-label="Batida"
      aria-modal="true"
      data-batida-sheet
    >
      <div v-if="compact" class="batida-sheet-grab" />
      <div class="batida-sheet-head">
        <span class="titan-chordpro-modal-kicker">Batida</span>
        <TitanChordproIconButton icon="x" :density="compact ? 'phone' : 'bar'" muted aria-label="Fechar" @click="emit('close')" />
      </div>

      <BatidaPatternBar
        :patterns="draftPatterns"
        :active="draftActive"
        @select="selectPattern"
        @add="addPattern"
        @duplicate="duplicatePattern"
        @remove="removePattern"
      />

      <BatidaMetaRow
        v-model:label="label"
        :density="density"
        :is-six-eight="isSixEight"
        :six-eight-pulse="sixEightPulse"
        :bpm="draft.bpm"
        :compact="compact"
        @density-change="onDensityChange"
        @pulse-change="onSixEightPulseChange"
      />

      <BatidaPresets
        v-if="presetsEnabled"
        :presets="presets"
        @apply="applyPreset"
        @save="saveAsPreset"
      />

      <BatidaSoundBar
        :sound-enabled="soundEnabled"
        :preview-running="previewRunning"
        :can-save="canSave"
        :can-restart="canRestart"
        :compact="compact"
        @toggle-sound="emit('toggle-sound')"
        @toggle-preview="onTogglePreview"
        @restart="restartCreation"
      />

      <BatidaBeatGrid
        :compact="compact"
        :rows="beatRows"
        :slots="draft.slots"
        :slots-per-beat="slotsPerBeat"
        :pick-index="pickIndex"
        :preview-running="previewRunning === true"
        :preview-slot="previewSlot"
        @pick="openPick"
      />

      <BatidaSheetActions
        :compact="compact"
        :can-delete="canDelete"
        :can-save="canSave"
        @delete="emit('delete')"
        @save="save"
      />
    </div>

    <BatidaSlotPicker
      v-if="pickSlot && pickIndex >= 0"
      :compact="compact"
      :current="pickSlot"
      :pattern="draft"
      :slot-index="pickIndex"
      :beat-label="pickBeatLabel"
      :dir-hint="pickDirHint"
      @close="pickIndex = -1"
      @pick="applyPick"
    />

    <BatidaPresetReplaceDialog
      v-if="pendingPresetId"
      :label="pendingPresetLabel"
      @cancel="cancelPendingPreset"
      @confirm="commitPreset(pendingPresetId!)"
    />

    <BatidaPresetNameDialog
      v-if="presetNameOpen"
      ref="presetNameDialog"
      v-model="presetName"
      :error="presetNameErr"
      @cancel="closePresetName"
      @confirm="confirmPresetName"
    />
  </div>
</template>

<style scoped>
/* Desktop: centered modal (not a phone sheet docked to the side). */
.batida-sheet-panel {
  position: relative;
  width: 100%;
  max-width: 720px;
  max-height: min(860px, calc(100% - 40px));
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px 24px 20px;
  border-radius: 20px;
  animation: titan-chordpro-rise 0.2s ease-out;
  box-shadow: var(--shadow);
}
.batida-sheet-panel.is-compact {
  max-width: 100%;
  max-height: 88%;
  padding: 12px 14px calc(14px + env(safe-area-inset-bottom));
  border-radius: 20px 20px 0 0;
  gap: 12px;
  box-shadow: none;
}
.batida-sheet-grab {
  width: 40px;
  height: 4px;
  border-radius: 99px;
  background: var(--line);
  margin: 0 auto;
}
.batida-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.batida-sheet-kicker {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
}
.batida-sheet-panel.is-compact .batida-sheet-kicker {
  font-size: 9.5px;
}
</style>
