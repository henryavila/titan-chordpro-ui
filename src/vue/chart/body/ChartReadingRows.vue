<script setup lang="ts">
import type { ChartRow, ReadingWord } from '@henryavila/titan-chordpro-ui'

defineProps<{
  rows: ChartRow[]
  wordsOf: (li: number) => ReadingWord[]
  mineLines: Map<number, string> | null
  diagrams: boolean
  rowPad: string
  shapeCapo: number
  chordBox: string
  chordBoxPlain: string
  shapePx: string
  chordPx: string
  lyricPx: string
}>()

const emit = defineEmits<{
  revertLine: [li: number]
  diagram: [payload: { shapeName: string; concert: string; capoFret: number }]
}>()
</script>

<template>
  <div
    v-for="(row, ri) in rows"
    :key="ri"
    class="titan-chordpro-row titan-chordpro-reading-row"
    :style="{ padding: `${rowPad} 0` }"
  >
    <!-- A line the reader changed carries their mark, and the mark is
         the way back: one tap reverts that stretch to the original. -->
    <button
      v-if="mineLines && mineLines.get(row.li)"
      class="titan-chordpro-mine-dot"
      data-mine-dot
      title="Ajuste seu — toque para voltar este trecho ao original"
      aria-label="Voltar este trecho ao original"
      @click.stop="emit('revertLine', row.li)"
    ><span /></button>
    <span class="titan-chordpro-reading-flow">
      <span v-for="(word, wi) in wordsOf(row.li)" :key="wi" class="titan-chordpro-reading-word">
        <span v-for="(c, ci) in word.cells" :key="ci" class="titan-chordpro-word">
          <span
            class="titan-chordpro-chord-box"
            :style="{ height: shapeCapo > 0 ? chordBox : chordBoxPlain }"
          >
            <button
              v-if="diagrams && c.hasChord"
              type="button"
              class="titan-chordpro-chord-hit"
              data-diagram-hit
              :data-shape="c.shapeName || c.chord"
              :data-concert="c.concert || c.chord"
              :aria-label="`Forma de ${c.shapeName || c.chord}`"
              @click.stop="emit('diagram', { shapeName: c.shapeName || c.chord, concert: c.concert || c.chord, capoFret: c.capoFret || 0 })"
            >
              <span class="titan-chordpro-chord-stack">
                <span v-if="c.hasShape" class="titan-chordpro-shape" :style="{ fontSize: shapePx }">{{ c.shape }}</span>
                <span class="titan-chordpro-chord" :style="{ fontSize: chordPx }">{{ c.chord }}</span>
              </span>
            </button>
            <span v-else-if="c.hasChord" class="titan-chordpro-chord-stack">
              <span v-if="c.hasShape" class="titan-chordpro-shape" :style="{ fontSize: shapePx }">{{ c.shape }}</span>
              <span class="titan-chordpro-chord" :style="{ fontSize: chordPx }">{{ c.chord }}</span>
            </span>
          </span>
          <span class="titan-chordpro-lyric" :style="{ fontSize: lyricPx }">{{ c.text }}</span>
        </span>
        <!-- The space that followed the word, carried as its own
             column so the chord lane keeps its height across it. -->
        <span v-if="word.hasTail" class="titan-chordpro-word">
          <span
            class="titan-chordpro-chord-box"
            :style="{ height: shapeCapo > 0 ? chordBox : chordBoxPlain }"
          />
          <span class="titan-chordpro-lyric" :style="{ fontSize: lyricPx }">{{ word.tail }}</span>
        </span>
      </span>
    </span>
  </div>
</template>
