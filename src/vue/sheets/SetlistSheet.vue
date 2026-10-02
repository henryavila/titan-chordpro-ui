<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import TitanChordproDialogShell from '../ui/TitanChordproDialogShell.vue'
import TitanChordproIconButton from '../ui/TitanChordproIconButton.vue'
import TitanChordproListRow from '../ui/TitanChordproListRow.vue'
import { overlayVisualInsets, type EdgeInsets } from '../use/viewportPin'

export type SetlistItem = {
  i: number
  id: string
  num: string
  title: string
  sub: string
  keyLabel: string
  hasKey: boolean
  bpmLabel: string
  current: boolean
  failed: boolean
  busy: boolean
  seen: boolean
}

const props = defineProps<{
  compact: boolean
  headLabel: string
  seenLabel: string
  showSearch: boolean
  query: string
  items: SetlistItem[]
  noHit: boolean
}>()
const emit = defineEmits<{
  close: []
  pick: [i: number]
  'update:query': [value: string]
}>()

/**
 * Soft keyboards often overlay without shrinking visualViewport (Chrome
 * overlays-content). A short no-hit sheet docked with flex-end then sits
 * under the keyboard. While the musician is searching, lift to the top.
 */
const searchFocused = ref(false)
const searching = computed(
  () => searchFocused.value || props.query.trim().length > 0,
)

const geom = computed(() =>
  props.compact
    ? {
        align: searching.value ? 'flex-start' : 'flex-end',
        pad: '0',
        max: '100%',
        radius: searching.value ? '0 0 20px 20px' : '20px 20px 0 0',
      }
    : { align: 'center', pad: '20px', max: '400px', radius: '18px' },
)

/** Also pin to the visual viewport when the keyboard does resize it. */
const shell = ref<{ rootEl: HTMLElement | null } | null>(null)
const insets = shallowRef<EdgeInsets>({ top: 0, left: 0, right: 0, bottom: 0 })
function syncInsets() {
  insets.value = overlayVisualInsets(shell.value?.rootEl ?? null)
}
onMounted(() => {
  syncInsets()
  window.visualViewport?.addEventListener('resize', syncInsets)
  window.visualViewport?.addEventListener('scroll', syncInsets)
  window.addEventListener('resize', syncInsets)
})
onUnmounted(() => {
  window.visualViewport?.removeEventListener('resize', syncInsets)
  window.visualViewport?.removeEventListener('scroll', syncInsets)
  window.removeEventListener('resize', syncInsets)
})

const wrapStyle = computed(() => ({
  alignItems: geom.value.align,
  padding: geom.value.pad,
  top: `${insets.value.top}px`,
  left: `${insets.value.left}px`,
  right: `${insets.value.right}px`,
  bottom: `${insets.value.bottom}px`,
}))

/** Fail / busy / seen. Seen is an SVG check: `✓` is Dingbats, not in Sora. */
</script>

<template>
  <TitanChordproDialogShell
    ref="shell"
    variant="center"
    :compact="compact"
    :z="29"
    label="Lista do ensaio"
    :closable="false"
    :root-attrs="{ 'data-setlist-overlay': '' }"
    :root-style="wrapStyle"
    :panel-style="{
      maxWidth: geom.max,
      borderRadius: geom.radius,
      maxHeight: '78%',
      overflow: 'hidden',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }"
    @close="emit('close')"
  >
      <div style="flex:none;display:flex;align-items:center;gap:10px;padding:14px 10px 12px 16px;border-bottom:1px solid var(--line-soft);">
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;">
          <span class="titan-chordpro-modal-kicker">Ensaio · {{ headLabel }}</span>
          <span style="font-size:11.5px;color:var(--muted);">{{ seenLabel }}</span>
        </span>
        <TitanChordproIconButton icon="x" :density="compact ? 'phone' : 'bar'" muted aria-label="Fechar" @click="emit('close')" />
      </div>

      <!-- Search earns its place only once the list is too long to scan. -->
      <div v-if="showSearch" style="flex:none;padding:10px 12px;border-bottom:1px solid var(--line-soft);">
        <input
          data-setlist-search
          :value="query"
          placeholder="Buscar na lista"
          aria-label="Buscar na lista"
          style="width:100%;height:42px;padding:0 13px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--text);font-family:inherit;font-size:13.5px;"
          @focus="searchFocused = true"
          @blur="searchFocused = false"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div style="flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:5px;padding:10px 12px calc(14px + env(safe-area-inset-bottom));">
        <TitanChordproListRow
          v-for="it in items"
          :key="it.id"
          data-setlist-item
          :current="it.current"
          :dim="it.failed"
          @click="emit('pick', it.i)"
        >
          <template #lead>
            <span class="titan-chordpro-list-row-num" :class="{ 'is-current': it.current }">{{ it.num }}</span>
          </template>
          <span class="titan-chordpro-list-row-title" :class="{ 'is-current': it.current }">{{ it.title }}</span>
          <span v-if="it.sub" class="titan-chordpro-list-row-sub">{{ it.sub }}</span>
          <template #trail>
            <span
              v-if="it.hasKey"
              style="flex:none;display:flex;align-items:center;height:24px;padding:0 8px;border-radius:8px;background:var(--chord-soft);border:1px solid var(--chord-edge);font-family:var(--titan-chordpro-font-chords,'Space Mono',monospace);font-size:11.5px;font-weight:700;color:var(--chord);"
            >{{ it.keyLabel }}</span>
            <span
              v-if="it.bpmLabel"
              data-setlist-bpm
              :title="`${it.bpmLabel} BPM`"
              style="flex:none;font-family:var(--titan-chordpro-font-chords,'Space Mono',monospace);font-size:11px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--muted);letter-spacing:0.02em;"
            >{{ it.bpmLabel }}</span>
            <span
              v-if="it.failed || it.busy || it.seen"
              :style="{ color: it.failed ? 'var(--danger)' : 'var(--muted)' }"
              data-setlist-mark
              style="flex:none;width:20px;display:flex;align-items:center;justify-content:center;"
            >
              <TitanChordproIcon v-if="it.failed" name="alertTri" :size="14" />
              <TitanChordproIcon v-else-if="it.seen" name="check" :size="13" :weight="2" />
              <span v-else style="font-size:12px;font-weight:700;">…</span>
            </span>
          </template>
        </TitanChordproListRow>
        <div v-if="noHit" style="padding:22px 4px;text-align:center;font-size:12.5px;color:var(--muted);">Nenhuma música com esse nome.</div>
      </div>
  </TitanChordproDialogShell>
</template>
