<script setup lang="ts">
import { isInlineScore, isScoreReference } from '@henryavila/titan-chordpro-ui'
import ExternalScore from '../ExternalScore.vue'
import ScoreFigure from '../ScoreFigure.vue'
import type { BlockEditApi } from '../../use/useBlockEdit'
import type { NoteNameFormat } from '../../public'
import type { ScoreTiming } from '../score-timing'

defineProps<{
  text: string
  shown: boolean
  domId: string
  blockGap: string
  edit: BlockEditApi | null
  resolveScore?: (src: string) => string
  theme: 'light' | 'dark'
  noteNameFormat?: NoteNameFormat
  preferredView?: 'tab' | 'score'
  lockScore: boolean
  zoom?: number
  bind?: (el: unknown) => void
}>()

const emit = defineEmits<{
  viewChange: [view: 'tab' | 'score']
  editScore: []
  timing: [payload: ScoreTiming]
  'update:zoom': [value: number]
  remove: []
}>()
</script>

<template>
  <div v-if="edit?.canDelete.value && !isScoreReference(text)" class="titan-chordpro-figure-cap">
    <button type="button" class="titan-chordpro-figure-btn" data-remove-score @click="emit('remove')">Excluir trecho</button>
  </div>
  <ExternalScore
    v-if="isScoreReference(text)"
    v-show="shown"
    :id="domId"
    :ref="(el) => bind?.(el)"
    :text="text"
    hide-title
    :block-gap="edit ? blockGap : '0'"
    :can-edit="!!edit"
    :resolve-score="resolveScore"
    :theme="theme"
    :note-name-format="noteNameFormat"
    :preferred-view="lockScore ? 'score' : preferredView"
    :lock-score="lockScore"
    :zoom="lockScore ? zoom : undefined"
    @view-change="emit('viewChange', $event)"
    @edit-score="emit('editScore')"
    @timing="emit('timing', $event)"
    @update:zoom="emit('update:zoom', $event)"
  />
  <div
    v-else-if="!isInlineScore(text)"
    v-show="shown"
    :id="domId"
    class="titan-chordpro-figure"
    data-invalid-score
    style="padding:12px"
  >
    <p role="status">Trecho de partitura inválido. Remova este trecho e importe o arquivo novamente.</p>
  </div>
  <ScoreFigure
    v-else
    v-show="shown"
    :id="domId"
    :text="text"
    :block-gap="blockGap"
    :theme="theme"
    :can-edit="!!edit"
    @edit-score="emit('editScore')"
  />
</template>
