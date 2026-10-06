<script setup lang="ts">
import { computed } from 'vue'
import type { ChartBlock, ReadingWord } from '@henryavila/titan-chordpro-ui'
import type { EditRow } from '../../use/block-edit/rows'
import type { BlockEditApi } from '../../use/useBlockEdit'
import ChartReadingRows from './ChartReadingRows.vue'
import ChartEditRows from './ChartEditRows.vue'

const props = defineProps<{
  block: ChartBlock
  index: number
  edit: BlockEditApi | null
  wordsOf: (li: number) => ReadingWord[]
  rowOf: (li: number) => EditRow
  mineLines: Map<number, string> | null
  diagrams: boolean
  rowPad: string
  chordBox: string
  chordBoxPlain: string
  shapePx: string
  chordPx: string
  lyricPx: string
  blockGap: string
  pillLane: string
  pillH: string
  chordEditPx: string
}>()

const emit = defineEmits<{
  revertLine: [li: number]
  diagram: [payload: { shapeName: string; concert: string; capoFret: number }]
}>()

const song = computed(() =>
  props.block.kind === 'stanza' || props.block.kind === 'chorus' ? props.block : null,
)
</script>

<template>
  <div
    v-if="song"
    class="titan-chordpro-block"
    :class="song.kind === 'chorus' ? 'titan-chordpro-chorus' : 'titan-chordpro-stanza'"
    :style="{ margin: `0 0 ${blockGap}` }"
  >
    <button
      v-if="edit && edit.clip.value && edit.clip.value.bi !== index"
      class="titan-chordpro-paste-btn"
      type="button"
      @click="edit.pasteHarmony(index)"
    >Colar harmonia aqui</button>
    <ChartReadingRows
      v-if="!edit"
      :rows="song.rows"
      :words-of="wordsOf"
      :mine-lines="mineLines"
      :diagrams="diagrams"
      :row-pad="rowPad"
      :shape-capo="song.shapeCapo"
      :chord-box="chordBox"
      :chord-box-plain="chordBoxPlain"
      :shape-px="shapePx"
      :chord-px="chordPx"
      :lyric-px="lyricPx"
      @revert-line="emit('revertLine', $event)"
      @diagram="emit('diagram', $event)"
    />
    <ChartEditRows
      v-else
      :rows="song.rows"
      :row-of="rowOf"
      :edit="edit"
      :mine-lines="mineLines"
      :lyric-px="lyricPx"
      :pill-lane="pillLane"
      :pill-h="pillH"
      :chord-edit-px="chordEditPx"
      @revert-line="emit('revertLine', $event)"
    />
  </div>
</template>
