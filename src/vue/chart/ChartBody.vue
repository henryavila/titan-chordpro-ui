<script setup lang="ts">
import { computed, nextTick, onMounted, onUpdated, ref, watch, useId } from 'vue'
import type { ChartBlock, NotationPreferences } from '@henryavila/titan-chordpro-ui'
import type { TitanChordproIconName } from '../icon/paths'
import InsertSlot from '../edit/InsertSlot.vue'
import type { BlockEditApi, EditRow } from '../use/useBlockEdit'
import EditLyric from './EditLyric.vue'
import ScoreFigure from './ScoreFigure.vue'
import ExternalScore from './ExternalScore.vue'
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import { isInlineScore, isScoreReference, readScoreReference } from '@henryavila/titan-chordpro-ui'
import { readingWords, type ReadingWord } from './readingWords'
import type { NoteNameFormat } from '../public'

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
  },
)

/** A rehearsal label is glued to the block under it — no + in that seam. */
function slotBefore(i: number): boolean {
  if (i === 0) return true
  const prev = props.blocks[i - 1]
  return prev?.kind !== 'comment' && prev?.kind !== 'note'
}

function onInsertChord(e: Event) {
  const host = (e.currentTarget as HTMLElement | null) ?? (e.target as HTMLElement | null)
  const input = host?.closest('.titan-chordpro-row-edit')?.querySelector('input')
  const caret = input?.selectionStart
  const fallback = props.edit?.rowCaret.value ?? input?.value.length ?? 0
  props.edit?.insertChordAtCaret(caret ?? fallback)
}

const emit = defineEmits<{
  revertLine: [li: number]
  editScore: [bi: number]
  toggleNotation: [bi: number]
  scoreViewChange: [bi: number, view: 'tab' | 'score']
  diagram: [payload: { shapeName: string; concert: string; capoFret: number }]
}>()

const notationId = useId()
function canFold(block: ChartBlock): boolean {
  return block.kind === 'tab' || block.kind === 'score' || block.kind === 'image'
}
function notationTitle(block: ChartBlock): string {
  if (block.kind === 'score' && isScoreReference(block.text)) {
    try { return readScoreReference(block.text)?.name ?? 'Solo' } catch { return 'Solo' }
  }
  return block.kind === 'tab' ? 'Tablatura' : 'Partitura'
}
function isFolded(i: number): boolean {
  const id = props.notationIds?.[i]
  return !props.edit && !!id && !!props.collapsedNotation?.has(id)
}
function preferredView(i: number): 'tab' | 'score' | undefined {
  const id = props.notationIds?.[i]
  return id ? props.notationChoices?.[id]?.view : undefined
}

/** Which image blocks the reader opened to full height, keyed by source line. */
const full = ref<Record<number, boolean>>({})
function toggleFull(li: number) {
  full.value = { ...full.value, [li]: !full.value[li] }
}

const bodyEl = ref<HTMLElement | null>(null)

/**
 * Every sung line as the editor draws it, built once per source change —
 * the template asks for it three times per row.
 */
const editRows = computed(() => {
  const m = new Map<number, EditRow>()
  const e = props.edit
  if (!e) return m
  for (const b of props.blocks) {
    if (b.kind !== 'stanza' && b.kind !== 'chorus') continue
    for (const r of b.rows) m.set(r.li, e.buildRow(r.li))
  }
  return m
})
const emptyRow: EditRow = {
  li: -1,
  chords: [],
  plain: '',
  anchors: [],
  played: false,
  columns: [],
  words: [],
}
const rowOf = (li: number): EditRow => editRows.value.get(li) ?? emptyRow

/**
 * Every sung line grouped into words, built once per source change — the
 * template used to regroup on every render, for every row.
 */
const readingRows = computed(() => {
  const m = new Map<number, ReadingWord[]>()
  for (const b of props.blocks) {
    if (b.kind !== 'stanza' && b.kind !== 'chorus') continue
    for (const r of b.rows) m.set(r.li, readingWords(r.segs))
  }
  return m
})
const noWords: ReadingWord[] = []
const wordsOf = (li: number): ReadingWord[] => readingRows.value.get(li) ?? noWords

const bgCache = new Map<string, number | null>()

/**
 * A score is always black ink on white paper. In the dark theme that is a lit
 * rectangle in the middle of the chart, so we measure the file's real paper
 * and invert when it fights the theme. `hue-rotate` gives back the chord
 * colour that `invert` alone would push to its complement.
 */
function paperLuma(img: HTMLImageElement): number | null {
  const key = img.getAttribute('src') ?? ''
  const hit = bgCache.get(key)
  if (hit !== undefined) return hit
  let lum: number | null = null
  try {
    const n = 40
    const c = document.createElement('canvas')
    c.width = n
    c.height = n
    const cx = c.getContext('2d', { willReadFrequently: true })
    if (!cx) throw new Error('no 2d context')
    cx.drawImage(img, 0, 0, n, n)
    const d = cx.getImageData(0, 0, n, n).data
    // Mode, not mean: the mean of white paper with a lot of ink falls to grey
    // and says nothing about the paper.
    const hist = new Array(16).fill(0)
    for (let i = 0; i < d.length; i += 4) {
      if ((d[i + 3] ?? 0) < 128) continue
      const y = (d[i] ?? 0) * 0.299 + (d[i + 1] ?? 0) * 0.587 + (d[i + 2] ?? 0) * 0.114
      hist[Math.min(15, y >> 4)] += 1
    }
    let bi = 0
    for (let i = 1; i < 16; i++) if (hist[i] > hist[bi]) bi = i
    lum = hist[bi] ? (bi * 16 + 8) / 255 : null
  } catch {
    lum = null
  }
  bgCache.set(key, lum)
  return lum
}

function gradeImage(e: Event) {
  gradeOne(e.target as HTMLImageElement)
}

function gradeOne(img: HTMLImageElement | null) {
  if (!img || !img.naturalWidth) return
  // A scanned score usually has fewer pixels than the column offers.
  // Stretching to 100% blurred the chords, so the ceiling is the file's own
  // size: it shrinks on a narrow column, never enlarges.
  img.style.maxWidth = `${img.naturalWidth}px`
  img.style.width = '100%'
  const wrap = img.parentElement
  if (!props.autoInvertScores) {
    img.style.filter = ''
    if (wrap) wrap.style.background = '#FFFFFF'
    return
  }
  const lum = paperLuma(img)
  if (lum === null) return
  const dark = props.theme === 'dark'
  const flip = dark ? lum > 0.62 : lum < 0.38
  // Inverting alone leaves the paper absolute black, darker than the card
  // around it. The reduced contrast lifts the black point towards the card
  // without erasing the ink.
  img.style.filter = flip ? 'invert(1) hue-rotate(180deg) contrast(0.9) brightness(1.03)' : ''
  if (wrap) wrap.style.background = flip ? 'transparent' : lum > 0.5 ? '#FFFFFF' : '#0B0B0C'
}

function fileName(src: string): string {
  return src.split('/').pop() ?? src
}
// ------------------------------------------------------------------- edit

function hiddenCount(block: Extract<ChartBlock, { kind: 'hidden' }>): string {
  const n = block.li1 - block.li0 + 1
  return `${n} ${n === 1 ? 'linha' : 'linhas'}`
}
function hiddenPreview(block: Extract<ChartBlock, { kind: 'hidden' }>): string {
  const first = block.texts.find((t) => t.trim()) ?? ''
  return first.replace(/\[[^\]]*\]/g, '').trim() || '—'
}
function shiftBadge(n: number): string {
  const label = n > 0 ? `+${n}` : `−${Math.abs(n)}`
  return `este bloco: ${label} ${Math.abs(n) === 1 ? 'semitom' : 'semitons'}`
}
/** Whether a comment/note line is the one being typed in right now. */
function typingAt(li: number): boolean {
  const e = props.edit
  return !!e && e.editRow.value === li && e.editKind.value === 'comment'
}

/**
 * The grade is a decision about THIS theme: white paper is inverted in the
 * dark and left alone in the light. Both the filter and the mat behind it are
 * written as inline style, so a theme change that does not re-run this leaves
 * a lit rectangle in the dark — or an inverted, black sheet in the light.
 */
watch(
  () => [props.theme, props.autoInvertScores],
  () =>
    nextTick(() => {
      bodyEl.value?.querySelectorAll('img').forEach((img) => gradeOne(img))
    }),
)

/**
 * Pills sit outside the flow, so their place has to be measured after the
 * browser has laid the syllables out — every render, and again when a font or
 * a resize moves them.
 */
function placePills() {
  if (!props.edit) return
  requestAnimationFrame(() => props.edit?.layoutPills())
}
onMounted(placePills)
onUpdated(placePills)
watch(
  () => [props.lyricPx, props.blocks],
  () => placePills(),
)
// The row input replaces the text in place and takes the caret with it.
// The caret sits on the syllable that was tapped — nothing is selected, so
// one keystroke cannot wipe the line. A tap that missed every letter goes
// to the end.
watch(
  () => props.edit?.editRow.value,
  async () => {
    if (!props.edit?.wantRowFocus.value) return
    props.edit.wantRowFocus.value = false
    await nextTick()
    const el = bodyEl.value?.querySelector<HTMLInputElement>('.titan-chordpro-row-input')
    if (!el) return
    el.focus()
    const lyric = !el.classList.contains('titan-chordpro-row-input--comment') && !el.classList.contains('titan-chordpro-row-input--note')
    const caret = lyric ? props.edit.rowCaret.value : null
    const at = caret == null ? el.value.length : Math.max(0, Math.min(caret, el.value.length))
    try {
      el.setSelectionRange(at, at)
    } catch {
      /* an input type that has no caret range */
    }
  },
)
</script>

<template>
  <div ref="bodyEl" class="titan-chordpro-chart" :style="{ '--titan-chordpro-lyric-px': lyricPx }">
    <template v-for="(block, i) in blocks" :key="i">
      <InsertSlot
        v-if="edit && slotBefore(i)"
        :at="block.li0"
        :edit="edit"
        :items="insertItems"
      />
      <div :data-block="i" class="titan-chordpro-blockrow" :class="{ 'titan-chordpro-notation-row': !edit && canFold(block) }" :data-notation-collapsed="canFold(block) ? isFolded(i) : undefined">
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
          :class="{ 'titan-chordpro-notation-card': !edit && canFold(block) }"
          :style="{
            outline: edit && edit.inSel(i) ? '2px solid var(--chord-edge)' : 'none',
            opacity: edit && edit.inDrag(i) ? '0.45' : '1',
          }"
        >
          <div v-if="!edit && canFold(block)" class="titan-chordpro-notation-fold">
            <button type="button" class="titan-chordpro-notation-fold-toggle" :data-toggle-notation="i" :aria-expanded="!isFolded(i)" :aria-controls="`${notationId}-${block.li0}`"
              :aria-label="`${isFolded(i) ? 'Mostrar' : 'Ocultar'} ${notationTitle(block)}`"
              :title="isFolded(i) ? 'Mostrar conteúdo' : 'Ocultar conteúdo'"
              @click.stop="emit('toggleNotation', i)">
              <span class="titan-chordpro-notation-title">{{ notationTitle(block) }}</span>
              <TitanChordproIcon name="chevronDown" :size="18" />
            </button>
          </div>
          <div v-if="edit?.canDelete.value && block.kind === 'score'" class="titan-chordpro-figure-cap">
            <button type="button" class="titan-chordpro-figure-btn" data-remove-score @click="edit.deleteBlock(i)">Excluir trecho</button>
          </div>
          <!-- A block with a capo of its own explains itself, right there. -->
          <div
            v-if="(block.kind === 'stanza' || block.kind === 'chorus') && block.hasOwnCapo"
            class="titan-chordpro-block-tag-row"
          >
            <span class="titan-chordpro-block-tag">capo {{ block.blockCapo ?? 0 }} neste bloco</span>
          </div>
          <!-- A section transposed on its own says so, and offers the way back. -->
          <div
            v-if="edit && (block.kind === 'stanza' || block.kind === 'chorus') && block.shift !== 0"
            class="titan-chordpro-block-tag-row"
          >
            <span class="titan-chordpro-block-tag titan-chordpro-block-tag--key">{{ shiftBadge(block.shift) }}</span>
            <button
              class="titan-chordpro-block-tag-btn"
              type="button"
              title="Voltar este bloco ao tom da música"
              @click="edit.resetBlockShift(i)"
            >↺ tom da música</button>
          </div>

          <div v-if="block.kind === 'hidden'" class="titan-chordpro-hidden-card">
            <span class="titan-chordpro-hidden-eye"><span /></span>
            <span class="titan-chordpro-hidden-body">
              <span class="titan-chordpro-hidden-label">Oculto na leitura · {{ hiddenCount(block) }}</span>
              <span class="titan-chordpro-hidden-preview">{{ hiddenPreview(block) }}</span>
            </span>
            <button
              class="titan-chordpro-hidden-btn"
              type="button"
              title="Voltar a exibir este bloco"
              @click="edit?.unhideBlock(i)"
            >Reexibir</button>
          </div>

          <div v-else-if="block.kind === 'note'" class="titan-chordpro-note">
            <div class="titan-chordpro-note-head">
              <span class="titan-chordpro-note-rule" />
              <span class="titan-chordpro-note-label">Execução</span>
            </div>
            <template v-for="(item, j) in block.items" :key="j">
              <input
                v-if="edit && typingAt(block.lis[j] ?? -1)"
                class="titan-chordpro-row-input titan-chordpro-row-input--note"
                :value="edit.rowText.value"
                aria-label="Nota de execução"
                @input="edit.rowText.value = ($event.target as HTMLInputElement).value"
                @keydown="edit.onRowKey"
                @blur="edit.commitRow"
              >
              <div
                v-else
                class="titan-chordpro-note-item"
                :class="{ 'is-editable': !!edit }"
                @click="edit?.editComment(block.lis[j] ?? -1, item)"
              >{{ item }}</div>
            </template>
          </div>

          <template v-else-if="block.kind === 'comment'">
            <input
              v-if="edit && typingAt(block.li0)"
              ref="rowInput"
              class="titan-chordpro-row-input titan-chordpro-row-input--comment"
              :value="edit.rowText.value"
              aria-label="Comentário de ensaio"
              @input="edit.rowText.value = ($event.target as HTMLInputElement).value"
              @keydown="edit.onRowKey"
              @blur="edit.commitRow"
            >
            <div
              v-else
              class="titan-chordpro-comment"
              :class="{ 'is-editable': !!edit }"
              @click="edit?.editComment(block.li0, block.text)"
            >
              <span class="titan-chordpro-comment-dot" />
              <span class="titan-chordpro-comment-text">{{ block.text }}</span>
              <span class="titan-chordpro-comment-line" />
            </div>
          </template>

          <div v-else-if="block.kind === 'tab'" v-show="!isFolded(i)" :id="`${notationId}-${block.li0}`" class="titan-chordpro-tab">
            <div v-for="(ex, j) in block.extras" :key="'e' + j" class="titan-chordpro-tab-extra">{{ ex }}</div>
            <div class="titan-chordpro-tab-staves">
              <div
                v-for="(st, j) in block.staves"
                :key="j"
                class="titan-chordpro-tab-row"
                :style="{ height: tabRow }"
              >
                <span class="titan-chordpro-tab-label" :style="{ fontSize: tabLabelPx }">{{ st.label }}</span>
                <span class="titan-chordpro-tab-rule" />
                <span class="titan-chordpro-tab-tokens">
                  <template v-for="(tk, k) in st.tokens" :key="k">
                    <!-- The run sits in its own element: a whitespace-only text
                         run inside a flex box is dropped, and the stave rule and
                         the column alignment would go with it. -->
                    <span v-if="tk.kind === 'gap'" class="titan-chordpro-tab-gap" :style="{ fontSize: tabPx }"><span>{{ tk.text }}</span></span>
                    <span v-else-if="tk.kind === 'mark'" class="titan-chordpro-tab-mark" :style="{ fontSize: tabPx }"><span>{{ tk.text }}</span></span>
                    <span v-else class="titan-chordpro-tab-bar" />
                  </template>
                </span>
              </div>
            </div>
            <div v-if="edit" class="titan-chordpro-figure-cap" style="padding-top:8px;">
              <span style="flex:1;" />
              <button class="titan-chordpro-figure-btn titan-chordpro-figure-btn--go" type="button" @click="emit('editScore', i)">Editar</button>
            </div>
          </div>

          <ExternalScore
            v-show="!isFolded(i)" :id="`${notationId}-${block.li0}`"
            v-else-if="block.kind === 'score' && isScoreReference(block.text)"
            :text="block.text" :hide-title="!edit" :block-gap="edit ? blockGap : '0'" :can-edit="!!edit" :resolve-score="resolveScore" :theme="theme" :note-name-format="noteNameFormat"
            :preferred-view="preferredView(i)"
            @view-change="view => emit('scoreViewChange', i, view)"
            @edit-score="emit('editScore', i)"
          />
          <div v-else-if="block.kind === 'score' && !isInlineScore(block.text)"
            v-show="!isFolded(i)" :id="`${notationId}-${block.li0}`" class="titan-chordpro-figure" data-invalid-score
            style="padding:12px" >
            <p role="status">Trecho de partitura inválido. Remova este trecho e importe o arquivo novamente.</p>
          </div>
          <ScoreFigure
            v-show="!isFolded(i)" :id="`${notationId}-${block.li0}`"
            v-else-if="block.kind === 'score'"
            :text="block.text"
            :block-gap="blockGap"
            :theme="theme"
            :can-edit="!!edit"
            @edit-score="emit('editScore', i)"
          />

          <figure
            v-else-if="block.kind === 'image'"
            v-show="!isFolded(i)" :id="`${notationId}-${block.li0}`"
            class="titan-chordpro-figure"
            :style="{ margin: `0 0 ${blockGap}`, padding: '10px 10px 8px' }"
          >
            <div class="titan-chordpro-image-frame">
              <img
                :src="resolveImage(block.src)"
                :alt="`Partitura da música: ${fileName(block.src)}`"
                :class="full[block.li0] ? 'titan-chordpro-image-full' : 'titan-chordpro-image-clip'"
                @load="gradeImage"
              >
            </div>
            <figcaption class="titan-chordpro-figure-cap">
              <span class="titan-chordpro-figure-kind">Partitura</span>
              <span class="titan-chordpro-figure-meta">{{ fileName(block.src) }}</span>
              <button class="titan-chordpro-figure-btn" type="button" @click="toggleFull(block.li0)">
                {{ full[block.li0] ? 'Reduzir' : 'Ver inteira' }}
              </button>
            </figcaption>
          </figure>

          <div
            v-else-if="block.kind === 'chorus' || block.kind === 'stanza'"
            class="titan-chordpro-block"
            :class="block.kind === 'chorus' ? 'titan-chordpro-chorus' : 'titan-chordpro-stanza'"
            :style="{ margin: `0 0 ${blockGap}` }"
          >
            <!-- Harmony travels between blocks: the target says where it lands. -->
            <button
              v-if="edit && edit.clip.value && edit.clip.value.bi !== i"
              class="titan-chordpro-paste-btn"
              type="button"
              @click="edit.pasteHarmony(i)"
            >Colar harmonia aqui</button>

            <!-- Reading: syllables and chords in one flow. -->
            <template v-if="!edit">
              <div
                v-for="(row, ri) in block.rows"
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
                        :style="{ height: block.shapeCapo > 0 ? chordBox : chordBoxPlain }"
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
                        :style="{ height: block.shapeCapo > 0 ? chordBox : chordBoxPlain }"
                      />
                      <span class="titan-chordpro-lyric" :style="{ fontSize: lyricPx }">{{ word.tail }}</span>
                    </span>
                  </span>
                </span>
              </div>
            </template>

            <!-- Editing: the same columns as reading, so a chord keeps its
                 gap, plus a caret on the letter it is anchored to. -->
            <template v-else>
              <div v-for="(row, ri) in block.rows" :key="ri">
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
          </div>
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
