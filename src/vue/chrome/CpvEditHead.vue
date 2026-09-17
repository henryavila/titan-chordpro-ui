<script setup lang="ts">
import CpvIcon from '../icon/CpvIcon.vue'
import type { WriteMode } from '../public'

defineProps<{
  phone: boolean
  compact: boolean
  contentEdit: boolean
  pageMax: string
  chromePad: string
  editBadge: string
  wMode: WriteMode | null
  title: string
  subtitle: string
  metaGapLabel: string
  metaSummary: string
  metaGaps: number
  dirty: boolean
  canUndo: boolean
  canRedo: boolean
  confirmDiscard: boolean
  discardLabel: string
}>()

const emit = defineEmits<{
  bindHead: [el: unknown]
  openMeta: []
  undo: []
  redo: []
  discard: []
  save: []
  read: []
}>()
</script>

<template>
  <div
    style="position:absolute;top:0;left:0;right:0;z-index:12;display:flex;justify-content:center;"
    :style="{ padding: chromePad }"
  >
    <div
      :ref="(el) => emit('bindHead', el)"
      class="cpv-veil cpv-head is-edit"
      :class="[phone ? 'is-phone' : 'is-wide', contentEdit ? 'is-content' : '']"
      data-cpv-head
      :style="{ '--cpv-page-max': pageMax }"
    >
      <span
        data-edit-badge
        class="cpv-edit-badge"
        :style="{
          background: wMode === 'persisted' ? 'var(--danger-soft)' : 'var(--chord-fill)',
          color: wMode === 'persisted' ? 'var(--danger)' : 'var(--chord)',
        }"
      >{{ editBadge }}</span>

      <div class="cpv-head-id">
        <span class="cpv-head-name">
          <span data-chart-title class="cpv-head-title">{{ title }}</span>
          <span v-if="subtitle" class="cpv-head-sub">{{ subtitle }}</span>
          <span v-else-if="wMode === 'local' && !compact" class="cpv-head-sub">ajuste local · ainda não vai para todos</span>
        </span>
      </div>

      <div class="cpv-head-edit-acts">
        <button
          data-meta-open
          type="button"
          class="cpv-head-edit-meta"
          :title="metaGapLabel || `Metadados · ${metaSummary}`"
          :aria-label="metaGapLabel ? `Metadados — ${metaGapLabel}` : 'Editar metadados'"
          :style="{
            borderColor: metaGaps ? 'var(--danger)' : 'var(--chord-edge)',
            background: metaGaps ? 'var(--danger-soft)' : 'var(--chord-soft)',
            color: metaGaps ? 'var(--danger)' : 'var(--chord)',
          }"
          @click="emit('openMeta')"
        >
          <CpvIcon name="list" :size="14" />
          <span style="font-size:12px;font-weight:700;">Metadados</span>
          <span
            v-if="!compact && metaSummary !== 'preencher'"
            style="font-family:'Space Mono',monospace;font-size:10.5px;font-weight:700;opacity:0.8;"
          >{{ metaSummary }}</span>
          <span v-else-if="metaGaps" style="font-size:10px;font-weight:700;opacity:0.85;">falta</span>
        </button>

        <span
          v-if="dirty"
          title="Alterações não salvas"
          :style="{ display: compact ? 'none' : 'flex' }"
          style="align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:9px;background:var(--surface);font-size:11px;font-weight:600;color:var(--text);"
        ><span style="width:7px;height:7px;border-radius:50%;background:var(--chord);" />não salvo</span>
        <button
          data-undo
          title="Desfazer (Ctrl+Z)"
          aria-label="Desfazer"
          :disabled="!canUndo"
          :style="{ opacity: canUndo ? '1' : '0.4', width: compact ? '32px' : '34px', height: compact ? '32px' : '34px' }"
          style="border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer;"
          @click="emit('undo')"
        ><CpvIcon name="undo2" :size="16" /></button>
        <button
          v-if="canRedo"
          data-redo
          title="Refazer (Ctrl+Shift+Z)"
          aria-label="Refazer"
          :style="{ width: compact ? '32px' : '34px', height: compact ? '32px' : '34px' }"
          style="border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer;"
          @click="emit('redo')"
        ><CpvIcon name="redo2" :size="16" /></button>
        <span
          v-if="wMode === 'local'"
          style="display:flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:9px;background:var(--chord-soft);border:1px solid var(--chord-edge);font-size:11px;font-weight:600;color:var(--chord);"
        ><span style="width:7px;height:7px;border-radius:50%;background:var(--chord);" />salvo neste celular</span>
        <template v-if="dirty">
          <button
            data-discard
            title="Voltar ao último salvo"
            :style="{ color: confirmDiscard ? 'var(--danger)' : 'var(--muted)', height: compact ? '32px' : '34px' }"
            style="padding:0 11px;border:1px solid var(--line);border-radius:10px;background:transparent;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;"
            @click="emit('discard')"
          >{{ discardLabel }}</button>
          <button
            data-save
            title="Salvar — passa a valer para todos (Ctrl+S)"
            :style="{ height: compact ? '32px' : '34px', padding: compact ? '0 11px' : '0 13px' }"
            style="border:0;border-radius:10px;background:var(--danger);color:var(--chord-ink);font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;"
            @click="emit('save')"
          >{{ compact ? 'Salvar' : 'Salvar para todos' }}</button>
        </template>
        <button
          data-read
          title="Voltar para leitura"
          :style="{ height: compact ? '32px' : '34px' }"
          style="padding:0 12px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--text);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;"
          @click="emit('read')"
        >Ler</button>
      </div>
    </div>
  </div>
</template>
