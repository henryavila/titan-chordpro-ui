<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { LintResult } from '../../core/lint'

const props = defineProps<{
  source: string
  lint: LintResult
  /** The selected block, so the source can jump to the lines it owns. */
  sel?: { label: string; li0: number; li1: number } | null
}>()
const emit = defineEmits<{
  input: [value: string]
  /** Open one undo step for the typing that is about to happen. */
  checkpoint: []
  close: []
}>()

/**
 * Undo works in edits, not in keystrokes: the first change after the caret
 * lands opens one step, and everything typed until the caret leaves goes into
 * it. Without this, a paragraph typed here eats the whole 50-step stack and
 * buries every block operation under it.
 */
let stepOpen = false

function onFocus() {
  stepOpen = false
}

function onInput(value: string) {
  if (!stepOpen) {
    emit('checkpoint')
    stepOpen = true
  }
  emit('input', value)
}

const ta = ref<HTMLTextAreaElement | null>(null)
const height = ref(280)

/** Directive shortcuts, in the order of the design SoT. */
const directives = [
  { label: '{c:}', hint: 'Comentário de ensaio', snippet: '{c:()}' },
  { label: '{soc}', hint: 'Abre e fecha refrão', snippet: '{soc}\n\n{eoc}\n' },
  { label: '{sot}', hint: 'Abre e fecha tablatura', snippet: '{sot}\n\n{eot}\n' },
  { label: '{image:}', hint: 'Referência de partitura', snippet: '{image: }' },
  { label: '[acorde]', hint: 'Acorde na sílaba', snippet: '[]' },
]

/** A directive lands at the caret, not appended to the end of the file. */
async function insert(snippet: string) {
  const el = ta.value
  const cur = props.source
  const at = el ? el.selectionStart : cur.length
  emit('checkpoint')
  stepOpen = true
  emit('input', cur.slice(0, at) + snippet + cur.slice(at))
  await nextTick()
  if (!el) return
  el.focus()
  const caret = at + snippet.length
  el.setSelectionRange(caret, caret)
}

/**
 * Finding the selected block by eye in the raw file is a search; the editor
 * already knows which lines it owns, so it puts the caret on them.
 */
function jumpToSel() {
  const el = ta.value
  const b = props.sel
  if (!el || !b) return
  const lines = props.source.split('\n')
  let from = 0
  for (let i = 0; i < b.li0; i++) from += (lines[i] ?? '').length + 1
  let to = from
  for (let i = b.li0; i <= b.li1; i++) to += (lines[i] ?? '').length + 1
  el.focus()
  el.setSelectionRange(from, Math.max(from, to - 1))
  // Roughly one line height, so the block lands near the top of the field.
  el.scrollTop = Math.max(0, b.li0 * 19.2 - 40)
}

function onResize(e: PointerEvent) {
  e.preventDefault()
  const y0 = e.clientY
  const h0 = height.value
  const host = (e.currentTarget as HTMLElement).closest('.cpv-root') as HTMLElement | null
  const max = (host ? host.clientHeight : 700) - 150
  const move = (ev: PointerEvent) => {
    height.value = Math.max(150, Math.min(max, h0 + (y0 - ev.clientY)))
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}
</script>

<template>
  <div class="cpv-src" :style="{ height: `${height}px` }">
    <div
      role="separator"
      aria-label="Redimensionar painel"
      class="cpv-src-grip"
      @pointerdown="onResize"
    >
      <span />
    </div>
    <div style="flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:5px;padding:0 12px 9px;">
      <span style="flex:none;font-family:'Space Mono',monospace;font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;padding-right:4px;">Source</span>
      <button
        v-for="d in directives"
        :key="d.label"
        :title="d.hint"
        style="height:30px;padding:0 9px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--chord);font-family:'Space Mono',monospace;font-size:11px;font-weight:700;cursor:pointer;"
        @click="insert(d.snippet)"
      >
        {{ d.label }}
      </button>
      <span style="flex:1;" />
      <button
        v-if="sel"
        data-jump-sel
        style="height:30px;padding:0 10px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--text);font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap;"
        @click="jumpToSel"
      >Ir para {{ sel.label }}</button>
      <button class="cpv-ghost" aria-label="Fechar painel de source" style="width:30px;height:30px;color:var(--muted);font-size:15px;" @click="emit('close')">×</button>
    </div>
    <textarea
      ref="ta"
      :value="source"
      spellcheck="false"
      aria-label="Fonte ChordPro"
      @focus="onFocus"
      @input="onInput(($event.target as HTMLTextAreaElement).value)"
    />
    <div style="flex:none;display:flex;align-items:center;gap:9px;padding:8px 12px;border-top:1px solid var(--line-soft);">
      <span
        :style="{ background: lint.ok ? 'var(--chord)' : 'var(--danger)' }"
        style="flex:none;width:8px;height:8px;border-radius:50%;"
      />
      <span style="flex:1;font-size:11.5px;line-height:1.4;color:var(--muted);text-wrap:pretty;">{{ lint.message }}</span>
    </div>
  </div>
</template>
