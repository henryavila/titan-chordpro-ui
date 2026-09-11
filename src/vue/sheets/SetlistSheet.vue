<script setup lang="ts">
import { computed } from 'vue'
import CpvIcon from '../icon/CpvIcon.vue'

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

const geom = computed(() =>
  props.compact
    ? { align: 'flex-end', pad: '0', max: '100%', radius: '20px 20px 0 0' }
    : { align: 'center', pad: '20px', max: '400px', radius: '18px' },
)

/** Fail / busy / seen. Seen is an SVG check: `✓` is Dingbats, not in Sora. */
</script>

<template>
  <div
    :style="{ alignItems: geom.align, padding: geom.pad }"
    style="position:absolute;inset:0;z-index:29;display:flex;justify-content:center;"
  >
    <div class="cpv-scrim" @click="emit('close')" />
    <div
      class="cpv-veil-2"
      role="dialog"
      aria-label="Lista do ensaio"
      :style="{ maxWidth: geom.max, borderRadius: geom.radius }"
      style="position:relative;width:100%;max-height:78%;display:flex;flex-direction:column;overflow:hidden;animation:cpv-rise .2s ease-out;"
    >
      <div style="flex:none;display:flex;align-items:center;gap:10px;padding:14px 10px 12px 16px;border-bottom:1px solid var(--line-soft);">
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;">
          <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Ensaio · {{ headLabel }}</span>
          <span style="font-size:11.5px;color:var(--muted);">{{ seenLabel }}</span>
        </span>
        <button class="cpv-ghost" aria-label="Fechar" style="flex:none;width:38px;height:38px;color:var(--muted);" @click="emit('close')"><CpvIcon name="x" :size="18" /></button>
      </div>

      <!-- Search earns its place only once the list is too long to scan. -->
      <div v-if="showSearch" style="flex:none;padding:10px 12px;border-bottom:1px solid var(--line-soft);">
        <input
          data-setlist-search
          :value="query"
          placeholder="Buscar na lista"
          aria-label="Buscar na lista"
          style="width:100%;height:42px;padding:0 13px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--text);font-family:inherit;font-size:13.5px;"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div style="flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:5px;padding:10px 12px calc(14px + env(safe-area-inset-bottom));">
        <button
          v-for="it in items"
          :key="it.id"
          data-setlist-item
          :aria-current="it.current ? 'true' : undefined"
          :style="{
            border: `1px solid ${it.current ? 'var(--chord-edge)' : 'var(--line-soft)'}`,
            background: it.current ? 'var(--chord-soft)' : 'var(--surface)',
            opacity: it.failed ? '0.72' : '1',
          }"
          style="display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:8px 12px;border-radius:14px;color:var(--text);font-family:inherit;text-align:left;cursor:pointer;"
          @click="emit('pick', it.i)"
        >
          <span
            :style="{ color: it.current ? 'var(--chord)' : 'var(--muted)' }"
            style="flex:none;font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:12px;font-weight:700;"
          >{{ it.num }}</span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
            <span
              :style="{ color: it.current ? 'var(--chord)' : 'var(--text)' }"
              style="font-size:13.5px;font-weight:600;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
            >{{ it.title }}</span>
            <span v-if="it.sub" style="font-size:10.5px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ it.sub }}</span>
          </span>
          <span
            v-if="it.hasKey"
            style="flex:none;display:flex;align-items:center;height:24px;padding:0 8px;border-radius:8px;background:var(--chord-soft);border:1px solid var(--chord-edge);font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:11.5px;font-weight:700;color:var(--chord);"
          >{{ it.keyLabel }}</span>
          <span
            v-if="it.bpmLabel"
            data-setlist-bpm
            :title="`${it.bpmLabel} BPM`"
            style="flex:none;font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:11px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--muted);letter-spacing:0.02em;"
          >{{ it.bpmLabel }}</span>
          <span
            v-if="it.failed || it.busy || it.seen"
            :style="{ color: it.failed ? 'var(--danger)' : 'var(--muted)' }"
            data-setlist-mark
            style="flex:none;width:20px;display:flex;align-items:center;justify-content:center;"
          >
            <CpvIcon v-if="it.failed" name="alertTri" :size="14" />
            <CpvIcon v-else-if="it.seen" name="check" :size="13" :weight="2" />
            <span v-else style="font-size:12px;font-weight:700;">…</span>
          </span>
        </button>
        <div v-if="noHit" style="padding:22px 4px;text-align:center;font-size:12.5px;color:var(--muted);">Nenhuma música com esse nome.</div>
      </div>
    </div>
  </div>
</template>
