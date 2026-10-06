<script setup lang="ts">
import type { ChartRow } from '@henryavila/titan-chordpro-ui'
import type { EditRow } from '../../use/block-edit/rows'
import type { BlockEditApi } from '../../use/useBlockEdit'
import EditLyric from '../EditLyric.vue'

const props = defineProps<{
  rows: ChartRow[]
  rowOf: (li: number) => EditRow
  edit: BlockEditApi
  mineLines: Map<number, string> | null
  lyricPx: string
  pillLane: string
  pillH: string
  chordEditPx: string
}>()

const emit = defineEmits<{ revertLine: [li: number] }>()

function onInsertChord(e: Event) {
  const host = (e.currentTarget as HTMLElement | null) ?? (e.target as HTMLElement | null)
  const input = host?.closest('.titan-chordpro-row-edit')?.querySelector('input')
  const caret = input?.selectionStart
  const fallback = props.edit.rowCaret.value ?? input?.value.length ?? 0
  props.edit.insertChordAtCaret(caret ?? fallback)
}
</script>

<template>
  <div v-for="(row, ri) in rows" :key="ri">
    <div
      v-if="edit.editRow.value === row.li && edit.editKind.value === 'lyric'"
      class="titan-chordpro-row-edit"
      :style="{ margin: `${pillLane} 0 4px` }"
    >
      <input
        class="titan-chordpro-row-input"
        :value="edit.rowText.value"
        aria-label="Letra desta linha"
        :style="{ fontSize: lyricPx }"
        @input="edit.rowText.value = ($event.target as HTMLInputElement).value"
        @keydown="edit.onRowKey"
        @blur="edit.commitRow"
      >
      <button
        type="button"
        class="titan-chordpro-insert-chord"
        data-insert-chord
        title="Inserir cifra onde está o cursor"
        aria-label="Inserir cifra onde está o cursor"
        @pointerdown.prevent="onInsertChord"
        @keydown.enter.prevent="onInsertChord"
        @keydown.space.prevent="onInsertChord"
      >Cifra</button>
    </div>
    <div
      v-else-if="rowOf(row.li).played"
      :data-row="row.li"
      data-played
      class="titan-chordpro-editrow"
      title="Toque para editar a letra"
      :style="{ fontSize: lyricPx }"
      @click="edit.rowClick($event, row.li, rowOf(row.li).plain)"
    >
      <button
        v-if="mineLines && mineLines.get(row.li)"
        class="titan-chordpro-mine-dot titan-chordpro-mine-dot--edit"
        data-mine-dot
        title="Ajuste seu — toque para voltar este trecho ao original"
        aria-label="Voltar este trecho ao original"
        @click.stop="emit('revertLine', row.li)"
      ><span /></button>
      <span class="titan-chordpro-reading-flow">
        <span
          v-for="col in rowOf(row.li).columns"
          :key="col.idx"
          class="titan-chordpro-reading-word"
        >
          <span class="titan-chordpro-word">
            <span class="titan-chordpro-chord-box" :style="{ minHeight: pillH }">
              <span
                :data-pill="col.off"
                class="titan-chordpro-pill titan-chordpro-pill--flow"
                role="button"
                tabindex="0"
                title="Arraste para mover · toque para editar · ←/→ ajusta a sílaba"
                :style="{ height: pillH, fontSize: chordEditPx }"
                @pointerdown="edit.chordDown($event, row.li, col.idx, col.name)"
                @keydown="edit.chordKey($event, row.li, col.idx, col.name)"
              >{{ col.name }}</span>
            </span>
            <EditLyric
              :chars="col.marks"
              :anchors="rowOf(row.li).anchors"
              :end="col.off === rowOf(row.li).plain.length"
            />
          </span>
          <span v-if="col.tail.length" class="titan-chordpro-word">
            <span class="titan-chordpro-chord-box" :style="{ minHeight: pillH }" />
            <EditLyric :chars="col.tail" :anchors="rowOf(row.li).anchors" />
          </span>
        </span>
      </span>
    </div>
    <div
      v-else
      :data-row="row.li"
      class="titan-chordpro-editrow"
      title="Toque para editar a letra"
      :style="{ fontSize: lyricPx }"
      @click="edit.rowClick($event, row.li, rowOf(row.li).plain)"
    >
      <button
        v-if="mineLines && mineLines.get(row.li)"
        class="titan-chordpro-mine-dot titan-chordpro-mine-dot--edit"
        data-mine-dot
        title="Ajuste seu — toque para voltar este trecho ao original"
        aria-label="Voltar este trecho ao original"
        :style="{ top: `calc(${pillH} + 4px)` }"
        @click.stop="emit('revertLine', row.li)"
      ><span /></button>
      <span class="titan-chordpro-reading-flow">
        <span
          v-for="(word, wi) in rowOf(row.li).words"
          :key="wi"
          class="titan-chordpro-reading-word"
        >
          <span v-for="(cell, ci) in word.cells" :key="ci" class="titan-chordpro-word">
            <span class="titan-chordpro-chord-box" :style="{ height: pillH }">
              <span
                v-if="cell.chord"
                :data-pill="cell.chord.off"
                class="titan-chordpro-pill titan-chordpro-pill--flow"
                role="button"
                tabindex="0"
                title="Arraste para mover · toque para editar · ←/→ ajusta a sílaba"
                :style="{ height: pillH, fontSize: chordEditPx }"
                @pointerdown="edit.chordDown($event, row.li, cell.chord.idx, cell.chord.name)"
                @keydown="edit.chordKey($event, row.li, cell.chord.idx, cell.chord.name)"
              >{{ cell.chord.name }}</span>
            </span>
            <EditLyric
              :chars="cell.chars"
              :anchors="rowOf(row.li).anchors"
              :end="!!cell.chord && cell.chord.off === rowOf(row.li).plain.length"
            />
          </span>
          <span v-if="word.tail.length" class="titan-chordpro-word">
            <span class="titan-chordpro-chord-box" :style="{ height: pillH }" />
            <EditLyric :chars="word.tail" :anchors="rowOf(row.li).anchors" />
          </span>
        </span>
        <span v-if="!rowOf(row.li).words.length" class="titan-chordpro-lyric">&nbsp;</span>
      </span>
    </div>
  </div>
</template>
