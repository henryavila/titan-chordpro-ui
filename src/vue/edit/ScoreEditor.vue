<script setup lang="ts">
import { useScoreEditor } from './score/useScoreEditor'
import ScoreEditorBars from './score/ScoreEditorBars.vue'
import ScoreEditorFigures from './score/ScoreEditorFigures.vue'
import ScoreEditorHead from './score/ScoreEditorHead.vue'
import ScoreEditorPiano from './score/ScoreEditorPiano.vue'
import ScoreEditorStage from './score/ScoreEditorStage.vue'
import ScoreEditorStrings from './score/ScoreEditorStrings.vue'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    /** The block's source: a `{x_titan_start_of_score}` score, a legacy text tab, or empty. */
    source?: string
    entry?: 'guitar' | 'piano'
    view?: 'score' | 'tab' | 'both'
    grand?: boolean
  }>(),
  { title: '', subtitle: '', source: '', entry: 'guitar', view: 'both', grand: false },
)

const emit = defineEmits<{ save: [source: string]; cancel: [] }>()

const {
  rootEl,
  bindHost,
  guitar,
  view,
  grand,
  narrow,
  line,
  dirty,
  playing,
  confirmDiscard,
  showSrc,
  source,
  imported,
  vexReady,
  blankHint,
  strip,
  keysHint,
  canUndo,
  canRemove,
  dur,
  slide,
  rows,
  curFret,
  oct,
  keys,
  hint,
  notes,
  swapInst,
  pickView,
  toggleGrand,
  togglePlay,
  discard,
  save,
  goBar,
  undo,
  toggleSrc,
  setDur,
  toggleSlide,
  addRest,
  del,
  addFret,
  setFret,
  lowerOct,
  raiseOct,
  addPitch,
} = useScoreEditor(props, {
  save: (next) => emit('save', next),
  cancel: () => emit('cancel'),
})
</script>

<template>
  <div ref="rootEl" class="titan-chordpro-edp" data-score-editor>
    <ScoreEditorHead
      :title="title"
      :subtitle="subtitle"
      :narrow="narrow"
      :meta-line="line"
      :dirty="dirty"
      :guitar="guitar"
      :view="view"
      :grand="grand"
      :playing="playing"
      :confirm-discard="confirmDiscard"
      @swap="swapInst"
      @view="pickView"
      @grand="toggleGrand"
      @play="togglePlay"
      @discard="discard"
      @save="save"
    />
    <ScoreEditorStage
      :narrow="narrow"
      :host="bindHost"
      :empty="!notes.length"
      :empty-hint="blankHint"
      :vex-ready="vexReady"
      :imported="imported"
      :show-src="showSrc"
      :source="source"
    />
    <ScoreEditorBars
      :bars="strip.bars"
      :at-label="strip.atLabel"
      :closed="strip.closed"
      :fill-status="strip.fillStatus"
      :narrow="narrow"
      :key-hint="keysHint"
      :can-undo="canUndo"
      :show-src="showSrc"
      @bar="goBar"
      @undo="undo"
      @src="toggleSrc"
    />
    <footer class="titan-chordpro-edp-foot">
      <ScoreEditorFigures
        :dur="dur"
        :slide="slide"
        :can-remove="canRemove"
        @dur="setDur"
        @slide="toggleSlide"
        @rest="addRest"
        @remove="del"
      />
      <ScoreEditorStrings v-if="guitar" :rows="rows" :fret="curFret" @place="addFret" @fret="setFret" />
      <ScoreEditorPiano v-else :oct="oct" :keys="keys" :tab-hint="hint" @lower="lowerOct" @raise="raiseOct" @pitch="addPitch" />
    </footer>
  </div>
</template>
