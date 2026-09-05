<script setup lang="ts">
import { computed, nextTick, onMounted, onUpdated, ref, watch } from 'vue'
import type { ChartBlock } from '../../core/types'
import type { BlockEditApi, EditRow } from '../use/useBlockEdit'
import ScoreFigure from './ScoreFigure.vue'

const props = withDefaults(
  defineProps<{
    blocks: ChartBlock[]
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
    /** Flip scanned scores when the paper fights the theme. */
    autoInvertScores?: boolean
    theme?: 'light' | 'dark'
    /** Source line → id of the personal adjustment that produced it. */
    mineLines?: Map<number, string> | null
    /** The block editor, when this surface is being written on (E1/E2). */
    edit?: BlockEditApi | null
    pillLane?: string
    pillH?: string
    editLineH?: string
    chordEditPx?: string
  }>(),
  {
    resolveImage: (src: string) => src,
    autoInvertScores: true,
    theme: 'dark',
    mineLines: null,
    edit: null,
    pillLane: '29px',
    pillH: '23px',
    editLineH: '73px',
    chordEditPx: '13px',
  },
)

const emit = defineEmits<{ revertLine: [li: number]; editScore: [bi: number] }>()

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
const emptyRow: EditRow = { li: -1, tokens: [], chords: [], plain: '' }
const rowOf = (li: number): EditRow => editRows.value.get(li) ?? emptyRow

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
// The row input replaces the text in place: it has to take the caret with it,
// but never on a phone, where that would throw the keyboard over the chart.
// The caret goes to the END and nothing is selected — a line is opened to be
// fixed, and selecting it all puts the whole lyric one keystroke from gone.
watch(
  () => props.edit?.editRow.value,
  async () => {
    if (!props.edit?.wantRowFocus.value) return
    props.edit.wantRowFocus.value = false
    await nextTick()
    const el = bodyEl.value?.querySelector<HTMLInputElement>('.cpv-row-input')
    if (!el) return
    el.focus()
    try {
      el.setSelectionRange(el.value.length, el.value.length)
    } catch {
      /* an input type that has no caret range */
    }
  },
)
</script>

<template>
  <div ref="bodyEl">
    <template v-for="(block, i) in blocks" :key="i">
      <div :data-block="i" class="cpv-blockrow">
        <!-- Where a dragged block would land, drawn on the block it lands before. -->
        <span v-if="edit && edit.dropAt.value === i" class="cpv-drop-line" />
        <span
          v-if="edit"
          class="cpv-grip"
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
          class="cpv-blockbody"
          :style="{
            outline: edit && edit.inSel(i) ? '2px solid var(--chord-edge)' : 'none',
            opacity: edit && edit.inDrag(i) ? '0.45' : '1',
          }"
        >
          <!-- A block with a capo of its own explains itself, right there. -->
          <div
            v-if="(block.kind === 'stanza' || block.kind === 'chorus') && block.hasOwnCapo"
            class="cpv-block-tag-row"
          >
            <span class="cpv-block-tag">capo {{ block.blockCapo ?? 0 }} neste bloco</span>
          </div>
          <!-- A section transposed on its own says so, and offers the way back. -->
          <div
            v-if="edit && (block.kind === 'stanza' || block.kind === 'chorus') && block.shift !== 0"
            class="cpv-block-tag-row"
          >
            <span class="cpv-block-tag cpv-block-tag--key">{{ shiftBadge(block.shift) }}</span>
            <button
              class="cpv-block-tag-btn"
              type="button"
              title="Voltar este bloco ao tom da música"
              @click="edit.resetBlockShift(i)"
            >↺ tom da música</button>
          </div>

          <div v-if="block.kind === 'hidden'" class="cpv-hidden-card">
            <span class="cpv-hidden-eye"><span /></span>
            <span class="cpv-hidden-body">
              <span class="cpv-hidden-label">Oculto na leitura · {{ hiddenCount(block) }}</span>
              <span class="cpv-hidden-preview">{{ hiddenPreview(block) }}</span>
            </span>
            <button
              class="cpv-hidden-btn"
              type="button"
              title="Voltar a exibir este bloco"
              @click="edit?.unhideBlock(i)"
            >Reexibir</button>
          </div>

          <div v-else-if="block.kind === 'note'" class="cpv-note">
            <div class="cpv-note-head">
              <span class="cpv-note-rule" />
              <span class="cpv-note-label">Execução</span>
            </div>
            <template v-for="(item, j) in block.items" :key="j">
              <input
                v-if="edit && typingAt(block.lis[j] ?? -1)"
                class="cpv-row-input cpv-row-input--note"
                :value="edit.rowText.value"
                aria-label="Nota de execução"
                @input="edit.rowText.value = ($event.target as HTMLInputElement).value"
                @keydown="edit.onRowKey"
                @blur="edit.commitRow"
              >
              <div
                v-else
                class="cpv-note-item"
                :class="{ 'is-editable': !!edit }"
                @click="edit?.editComment(block.lis[j] ?? -1, item)"
              >{{ item }}</div>
            </template>
          </div>

          <template v-else-if="block.kind === 'comment'">
            <input
              v-if="edit && typingAt(block.li0)"
              ref="rowInput"
              class="cpv-row-input cpv-row-input--comment"
              :value="edit.rowText.value"
              aria-label="Comentário de ensaio"
              @input="edit.rowText.value = ($event.target as HTMLInputElement).value"
              @keydown="edit.onRowKey"
              @blur="edit.commitRow"
            >
            <div
              v-else
              class="cpv-comment"
              :class="{ 'is-editable': !!edit }"
              @click="edit?.editComment(block.li0, block.text)"
            >
              <span class="cpv-comment-dot" />
              <span class="cpv-comment-text">{{ block.text }}</span>
              <span class="cpv-comment-line" />
            </div>
          </template>

          <div v-else-if="block.kind === 'tab'" class="cpv-tab">
            <div v-for="(ex, j) in block.extras" :key="'e' + j" class="cpv-tab-extra">{{ ex }}</div>
            <div class="cpv-tab-staves">
              <div
                v-for="(st, j) in block.staves"
                :key="j"
                class="cpv-tab-row"
                :style="{ height: tabRow }"
              >
                <span class="cpv-tab-label" :style="{ fontSize: tabLabelPx }">{{ st.label }}</span>
                <span class="cpv-tab-rule" />
                <span class="cpv-tab-tokens">
                  <template v-for="(tk, k) in st.tokens" :key="k">
                    <!-- The run sits in its own element: a whitespace-only text
                         run inside a flex box is dropped, and the stave rule and
                         the column alignment would go with it. -->
                    <span v-if="tk.kind === 'gap'" class="cpv-tab-gap" :style="{ fontSize: tabPx }"><span>{{ tk.text }}</span></span>
                    <span v-else-if="tk.kind === 'mark'" class="cpv-tab-mark" :style="{ fontSize: tabPx }"><span>{{ tk.text }}</span></span>
                    <span v-else class="cpv-tab-bar" />
                  </template>
                </span>
              </div>
            </div>
            <div v-if="edit" class="cpv-figure-cap" style="padding-top:8px;">
              <span style="flex:1;" />
              <button class="cpv-figure-btn cpv-figure-btn--go" type="button" @click="emit('editScore', i)">Editar</button>
            </div>
          </div>

          <ScoreFigure
            v-else-if="block.kind === 'score'"
            :text="block.text"
            :block-gap="blockGap"
            :theme="theme"
            :can-edit="!!edit"
            @edit-score="emit('editScore', i)"
          />

          <figure
            v-else-if="block.kind === 'image'"
            class="cpv-figure"
            :style="{ margin: `0 0 ${blockGap}`, padding: '10px 10px 8px' }"
          >
            <div class="cpv-image-frame">
              <img
                :src="resolveImage(block.src)"
                :alt="`Partitura da música: ${fileName(block.src)}`"
                :class="full[block.li0] ? 'cpv-image-full' : 'cpv-image-clip'"
                @load="gradeImage"
              >
            </div>
            <figcaption class="cpv-figure-cap">
              <span class="cpv-figure-kind">Partitura</span>
              <span class="cpv-figure-meta">{{ fileName(block.src) }}</span>
              <button class="cpv-figure-btn" type="button" @click="toggleFull(block.li0)">
                {{ full[block.li0] ? 'Reduzir' : 'Ver inteira' }}
              </button>
            </figcaption>
          </figure>

          <div
            v-else-if="block.kind === 'chorus' || block.kind === 'stanza'"
            class="cpv-block"
            :class="block.kind === 'chorus' ? 'cpv-chorus' : 'cpv-stanza'"
            :style="{ margin: `0 0 ${blockGap}` }"
          >
            <!-- Harmony travels between blocks: the target says where it lands. -->
            <button
              v-if="edit && edit.clip.value && edit.clip.value.bi !== i"
              class="cpv-paste-btn"
              type="button"
              @click="edit.pasteHarmony(i)"
            >Colar harmonia aqui</button>

            <!-- Reading: syllables and chords in one flow. -->
            <template v-if="!edit">
              <div
                v-for="(row, ri) in block.rows"
                :key="ri"
                class="cpv-row"
                :style="{ padding: `${rowPad} 0` }"
              >
                <!-- A line the reader changed carries their mark, and the mark is
                     the way back: one tap reverts that stretch to the original. -->
                <button
                  v-if="mineLines && mineLines.get(row.li)"
                  class="cpv-mine-dot"
                  data-mine-dot
                  title="Ajuste seu — toque para voltar este trecho ao original"
                  aria-label="Voltar este trecho ao original"
                  @click.stop="emit('revertLine', row.li)"
                ><span /></button>
                <span v-for="(s, si) in row.segs" :key="si" class="cpv-word">
                  <span
                    class="cpv-chord-box"
                    :style="{ height: block.shapeCapo > 0 ? chordBox : chordBoxPlain }"
                  >
                    <span
                      v-if="s.loose || s.tight"
                      class="cpv-chord-stack"
                      :class="{ 'cpv-chord-stack--tight': s.tight }"
                    >
                      <!-- Capo shape on top, in the quiet grey; the chord that
                           actually sounds stays green, glued to the lyric. -->
                      <span v-if="s.hasShape" class="cpv-shape" :style="{ fontSize: shapePx }">{{ s.shape }}</span>
                      <span class="cpv-chord" :style="{ fontSize: chordPx }">{{ s.chord }}</span>
                    </span>
                  </span>
                  <span class="cpv-lyric" :style="{ fontSize: lyricPx }">{{ s.text }}</span>
                </span>
              </div>
            </template>

            <!-- Editing: the line becomes measurable syllables with the chords
                 floating above them — which is what lets a chord be dragged to
                 the syllable it belongs on. -->
            <template v-else>
              <div v-for="(row, ri) in block.rows" :key="ri">
                <input
                  v-if="edit.editRow.value === row.li && edit.editKind.value === 'lyric'"
                  class="cpv-row-input"
                  :value="edit.rowText.value"
                  aria-label="Letra desta linha"
                  :style="{ margin: `${pillLane} 0 4px`, fontSize: lyricPx }"
                  @input="edit.rowText.value = ($event.target as HTMLInputElement).value"
                  @keydown="edit.onRowKey"
                  @blur="edit.commitRow"
                >
                <div
                  v-else
                  :data-row="row.li"
                  class="cpv-editrow"
                  title="Toque para editar a letra"
                  :style="{ lineHeight: editLineH, fontSize: lyricPx }"
                  @click="edit.rowClick($event, row.li, rowOf(row.li).plain)"
                >
                  <button
                    v-if="mineLines && mineLines.get(row.li)"
                    class="cpv-mine-dot cpv-mine-dot--edit"
                    data-mine-dot
                    title="Ajuste seu — toque para voltar este trecho ao original"
                    aria-label="Voltar este trecho ao original"
                    :style="{ top: `calc(${pillLane} + 2px)` }"
                    @click.stop="emit('revertLine', row.li)"
                  ><span /></button>
                  <template v-for="(tk, ti) in rowOf(row.li).tokens" :key="ti">
                    <span :class="tk.isWord ? 'cpv-tk-word' : 'cpv-tk-space'"><span
                      v-for="c in tk.chars"
                      :key="c.i"
                      :data-i="c.i"
                    >{{ c.ch }}</span></span>
                  </template>
                  <span
                    v-for="(ch, ci) in rowOf(row.li).chords"
                    :key="`c${ci}`"
                    :data-pill="ch.off"
                    class="cpv-pill"
                    role="button"
                    tabindex="0"
                    title="Arraste para mover · toque para editar · ←/→ ajusta a sílaba"
                    :style="{ height: pillH, fontSize: chordEditPx }"
                    @pointerdown="edit.chordDown($event, row.li, ci, ch.name)"
                    @keydown="edit.chordKey($event, row.li, ci, ch.name)"
                  >{{ ch.name }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>
    <!-- Room under the last block for the selection bar and the dock. -->
    <div v-if="edit" style="height:110px;" />
  </div>
</template>
