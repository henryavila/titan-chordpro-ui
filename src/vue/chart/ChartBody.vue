<script setup lang="ts">
import { ref, shallowReactive, useId } from 'vue'
import type { ChartBlock, NotationPreferences } from '@henryavila/titan-chordpro-ui'
import type { TitanChordproIconName } from '../icon/paths'
import InsertSlot from '../edit/InsertSlot.vue'
import type { BlockEditApi } from '../use/useBlockEdit'
import type { ScoreTiming } from './score-timing'
import type { NoteNameFormat } from '../public'
import {
  canFold,
  isExternalScore,
  isSongStaff,
  notationTitle,
  scoreText,
  slotBefore,
} from './body/labels'
import type { ScoreHost } from './body/score-host'
import { useChartRows } from './body/useChartRows'
import { useChartBodyEffects } from './body/useChartBodyEffects'
import { createImageGrader } from './body/image-grade'
import ChartSongStaffHead from './body/ChartSongStaffHead.vue'
import ChartNotationFold from './body/ChartNotationFold.vue'
import ChartScoreEditHead from './body/ChartScoreEditHead.vue'
import ChartBlockTags from './body/ChartBlockTags.vue'
import ChartHiddenBlock from './body/ChartHiddenBlock.vue'
import ChartNoteBlock from './body/ChartNoteBlock.vue'
import ChartCommentBlock from './body/ChartCommentBlock.vue'
import ChartTabBlock from './body/ChartTabBlock.vue'
import ChartScoreBlock from './body/ChartScoreBlock.vue'
import ChartImageBlock from './body/ChartImageBlock.vue'
import ChartLyricBlock from './body/ChartLyricBlock.vue'

const props = withDefaults(
  defineProps<{
    blocks: ChartBlock[]
    collapsedNotation?: ReadonlySet<string>
    notationIds?: Array<string | null>
    notationChoices?: NotationPreferences
    lyricPx: string
    chordPx: string
    shapePx: string
    chordBox: string
    chordBoxPlain: string
    tabPx: string
    tabLabelPx: string
    tabRow: string
    rowPad: string
    blockGap: string
    /** Maps a `{image:}` reference to a URL the host can actually serve. */
    resolveImage?: (src: string) => string
    resolveScore?: (src: string) => string
    noteNameFormat?: NoteNameFormat
    /** Flip scanned scores when the paper fights the theme. */
    autoInvertScores?: boolean
    theme?: 'light' | 'dark'
    /** Source line → id of the personal adjustment that produced it. */
    mineLines?: Map<number, string> | null
    /** The block editor, when this surface is being written on (E1/E2). */
    edit?: BlockEditApi | null
    pillLane?: string
    pillH?: string
    chordEditPx?: string
    /** View tap opens the shape modal. Off in edit and in só letra. */
    diagrams?: boolean
    /** What a + between blocks can insert. Empty outside edit. */
    insertItems?: Array<{ icon: TitanChordproIconName; label: string; go: () => void }>
    /** The page is this staff. No excerpt card, and the view stays on the partitura. */
    songScore?: boolean
    /** Zoom of that staff. 0 is automatic. */
    scoreZoom?: number
  }>(),
  {
    resolveImage: (src: string) => src,
    autoInvertScores: true,
    theme: 'dark',
    mineLines: null,
    edit: null,
    pillLane: '29px',
    pillH: '23px',
    chordEditPx: '13px',
    diagrams: true,
    insertItems: () => [],
    songScore: false,
  },
)

const emit = defineEmits<{
  revertLine: [li: number]
  editScore: [bi: number]
  toggleNotation: [bi: number]
  scoreViewChange: [bi: number, view: 'tab' | 'score']
  diagram: [payload: { shapeName: string; concert: string; capoFret: number }]
  scoreTiming: [payload: ScoreTiming]
  'update:scoreZoom': [value: number]
  readSongScore: [bi: number]
}>()

const notationId = useId()
function domId(block: ChartBlock): string {
  return `${notationId}-${block.li0}`
}
function isFolded(i: number): boolean {
  const id = props.notationIds?.[i]
  return !props.edit && !!id && !!props.collapsedNotation?.has(id)
}
function preferredView(i: number): 'tab' | 'score' | undefined {
  const id = props.notationIds?.[i]
  return id ? props.notationChoices?.[id]?.view : undefined
}

const scoreHosts = shallowReactive<Record<number, ScoreHost | undefined>>({})
function bindScore(i: number, el: unknown) {
  const host = el as ScoreHost | null
  if (host) scoreHosts[i] = host
  else delete scoreHosts[i]
}

/** Which image blocks the reader opened to full height, keyed by source line. */
const full = ref<Record<number, boolean>>({})
function toggleFull(li: number) {
  full.value = { ...full.value, [li]: !full.value[li] }
}

const bodyEl = ref<HTMLElement | null>(null)
const gradeScan = createImageGrader()
const { rowOf, wordsOf } = useChartRows(props)
useChartBodyEffects(props, bodyEl)
</script>

<template>
  <div ref="bodyEl" class="titan-chordpro-chart" :style="{ '--titan-chordpro-lyric-px': lyricPx }">
    <template v-for="(block, i) in blocks" :key="i">
      <InsertSlot
        v-if="edit && slotBefore(blocks, i)"
        :at="block.li0"
        :edit="edit"
        :items="insertItems"
      />
      <div
        :data-block="i"
        class="titan-chordpro-blockrow"
        :class="{ 'titan-chordpro-notation-row': !edit && canFold(block) && !isSongStaff(songScore, block), 'titan-chordpro-song-score': isSongStaff(songScore, block) }"
        :data-notation-collapsed="canFold(block) && !isSongStaff(songScore, block) ? isFolded(i) : undefined"
      >
        <!-- Where a dragged block would land, drawn on the block it lands before. -->
        <span v-if="edit && edit.dropAt.value === i" class="titan-chordpro-drop-line" />
        <span
          v-if="edit"
          class="titan-chordpro-grip"
          role="button"
          tabindex="0"
          :aria-pressed="edit.inSel(i) ? 'true' : 'false'"
          aria-label="Selecionar ou reordenar bloco"
          title="Arraste para reordenar · toque para selecionar"
          :data-grip="i"
          :style="{ opacity: edit.inSel(i) ? '1' : '0.4' }"
          @pointerdown="edit.gripDown($event, i)"
          @keydown="edit.gripKey($event, i)"
        >⋮⋮</span>

        <div
          class="titan-chordpro-blockbody"
          :class="{ 'titan-chordpro-notation-card': !edit && canFold(block) && !isSongStaff(songScore, block) }"
          :style="{
            outline: edit && edit.inSel(i) ? '2px solid var(--chord-edge)' : 'none',
            opacity: edit && edit.inDrag(i) ? '0.45' : '1',
          }"
        >
          <ChartSongStaffHead
            v-if="!edit && isSongStaff(songScore, block)"
            :title="notationTitle(block)"
            @read-song="emit('readSongScore', i)"
          />
          <ChartNotationFold
            v-else-if="!edit && canFold(block)"
            :index="i"
            :title="notationTitle(block)"
            :folded="isFolded(i)"
            :controls-id="domId(block)"
            :external="isExternalScore(block)"
            :host="scoreHosts[i]"
            :text="scoreText(block)"
            :resolve-score="resolveScore"
            @toggle="emit('toggleNotation', i)"
            @read-song="emit('readSongScore', i)"
          />
          <ChartScoreEditHead
            v-else-if="edit && isExternalScore(block)"
            :title="notationTitle(block)"
            :host="scoreHosts[i]"
            :text="scoreText(block)"
            :resolve-score="resolveScore"
            :can-delete="!!edit.canDelete.value"
            @edit-score="emit('editScore', i)"
            @remove="edit.deleteBlock(i)"
            @read-song="emit('readSongScore', i)"
          />
          <ChartBlockTags :block="block" :edit="edit" :index="i" />
          <ChartHiddenBlock v-if="block.kind === 'hidden'" :block="block" @unhide="edit?.unhideBlock(i)" />
          <ChartNoteBlock v-else-if="block.kind === 'note'" :block="block" :edit="edit" />
          <ChartCommentBlock v-else-if="block.kind === 'comment'" :block="block" :edit="edit" />
          <ChartTabBlock
            v-else-if="block.kind === 'tab'"
            :block="block"
            :shown="!isFolded(i)"
            :dom-id="domId(block)"
            :tab-row="tabRow"
            :tab-label-px="tabLabelPx"
            :tab-px="tabPx"
            :editing="!!edit"
            @edit-score="emit('editScore', i)"
          />
          <ChartScoreBlock
            v-else-if="block.kind === 'score'"
            :text="block.text"
            :shown="isSongStaff(songScore, block) || !isFolded(i)"
            :dom-id="domId(block)"
            :block-gap="blockGap"
            :edit="edit"
            :resolve-score="resolveScore"
            :theme="theme"
            :note-name-format="noteNameFormat"
            :preferred-view="preferredView(i)"
            :lock-score="isSongStaff(songScore, block)"
            :zoom="scoreZoom"
            :bind="(el) => bindScore(i, el)"
            @view-change="emit('scoreViewChange', i, $event)"
            @edit-score="emit('editScore', i)"
            @timing="emit('scoreTiming', $event)"
            @update:zoom="emit('update:scoreZoom', $event)"
            @remove="edit?.deleteBlock(i)"
          />
          <ChartImageBlock
            v-else-if="block.kind === 'image'"
            :src="resolveImage(block.src)"
            :file="block.src"
            :shown="!isFolded(i)"
            :dom-id="domId(block)"
            :block-gap="blockGap"
            :expanded="!!full[block.li0]"
            :theme="theme"
            :auto-invert="autoInvertScores"
            :grade="gradeScan"
            @toggle="toggleFull(block.li0)"
          />
          <ChartLyricBlock
            v-else-if="block.kind === 'chorus' || block.kind === 'stanza'"
            :block="block"
            :index="i"
            :edit="edit"
            :words-of="wordsOf"
            :row-of="rowOf"
            :mine-lines="mineLines"
            :diagrams="diagrams"
            :row-pad="rowPad"
            :chord-box="chordBox"
            :chord-box-plain="chordBoxPlain"
            :shape-px="shapePx"
            :chord-px="chordPx"
            :lyric-px="lyricPx"
            :block-gap="blockGap"
            :pill-lane="pillLane"
            :pill-h="pillH"
            :chord-edit-px="chordEditPx"
            @revert-line="emit('revertLine', $event)"
            @diagram="emit('diagram', $event)"
          />
        </div>
      </div>
    </template>
    <InsertSlot
      v-if="edit"
      :at="blocks.length ? (blocks[blocks.length - 1]?.li1 ?? 0) + 1 : 0"
      :edit="edit"
      :items="insertItems"
      up
    />
    <!-- Room under the last block so a new one can sit above the selection bar and the dock. -->
    <div v-if="edit" style="height:240px;" />
  </div>
</template>
