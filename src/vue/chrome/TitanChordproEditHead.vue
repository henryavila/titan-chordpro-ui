<script setup lang="ts">
import { ref } from 'vue'
import { chartIdFromLabel } from '@henryavila/titan-chordpro-ui'
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import TitanChordproChartSwitch from '../ui/TitanChordproChartSwitch.vue'
import type { EditHeadModel } from './dock-model'

const props = defineProps<EditHeadModel>()

const emit = defineEmits<{
  bindHead: [el: unknown]
  openMeta: []
  undo: []
  redo: []
  discard: []
  save: []
  read: []
  'select-chart': [id: string]
  'chart-add': [value: { id: string; label: string }]
  'chart-rename': [label: string]
  'chart-delete': []
  'chart-default': []
}>()

const chartOpen = ref(false)
const addOpen = ref(false)
const renameOpen = ref(false)
const confirmDelete = ref(false)
const addLabel = ref('')
const renameLabel = ref('')
const named = () => props.charts.length > 1
const chipLabel = () => (props.chartLabel && props.chartLabel !== 'default' ? props.chartLabel : 'Versão')

function goAdd() {
  const label = addLabel.value.trim()
  if (!label) return
  emit('chart-add', { id: chartIdFromLabel(label, props.charts.map((c) => c.id)), label })
  addLabel.value = ''
  addOpen.value = false
  chartOpen.value = false
}
</script>

<template>
  <div
    style="position:absolute;top:0;left:0;right:0;z-index:12;display:flex;justify-content:center;"
    :style="{ padding: chromePad }"
  >
    <div
      :ref="(el) => emit('bindHead', el)"
      class="titan-chordpro-veil titan-chordpro-head is-edit"
      :class="[phone ? 'is-phone' : 'is-wide', contentEdit ? 'is-content' : '']"
      data-titan-chordpro-head
      :style="{ '--titan-chordpro-page-max': pageMax }"
    >
      <span
        data-edit-badge
        class="titan-chordpro-edit-badge"
        :style="{
          background: wMode === 'persisted' ? 'var(--danger-soft)' : 'var(--chord-fill)',
          color: wMode === 'persisted' ? 'var(--danger)' : 'var(--chord)',
        }"
      >{{ editBadge }}</span>

      <div class="titan-chordpro-head-id">
        <span class="titan-chordpro-head-name">
          <span data-chart-title class="titan-chordpro-head-title">{{ title }}</span>
          <span v-if="subtitle" class="titan-chordpro-head-sub">{{ subtitle }}</span>
          <span v-else-if="wMode === 'local' && !compact" class="titan-chordpro-head-sub">ajuste local · ainda não vai para todos</span>
        </span>
      </div>

      <TitanChordproChartSwitch
        v-if="named() || contentEdit"
        v-model:open="chartOpen"
        edit
        :charts="charts"
        :label="chipLabel()"
        @select="emit('select-chart', $event)"
      >
        <template #row="{ chart }">
          <span>{{ chart.label === 'default' ? 'Padrão' : chart.label }}</span>
          <span v-if="chart.isDefault" class="titan-chordpro-version-mark">padrão</span>
        </template>
        <template v-if="contentEdit">
            <button v-if="named()" type="button" data-chart-rename class="titan-chordpro-version-action" @click="renameOpen = !renameOpen">Renomear</button>
            <button type="button" data-chart-add class="titan-chordpro-version-action" @click="addOpen = !addOpen">Nova versão</button>
            <button v-if="named()" type="button" data-chart-delete class="titan-chordpro-version-action" @click="confirmDelete ? emit('chart-delete') : (confirmDelete = true)">{{ confirmDelete ? `Apagar ${chipLabel()}` : 'Apagar' }}</button>
            <button v-if="named() && !charts.some((c) => c.id === chartId && c.isDefault)" type="button" data-chart-default class="titan-chordpro-version-action" @click="chartOpen = false; emit('chart-default')">Tornar padrão</button>
            <form v-if="addOpen" class="titan-chordpro-version-form" @submit.prevent="goAdd">
              <input data-chart-label v-model="addLabel" aria-label="Nome da versão" />
              <button data-chart-add-go type="submit">Criar</button>
            </form>
            <form v-if="renameOpen" class="titan-chordpro-version-form" @submit.prevent="emit('chart-rename', renameLabel); renameOpen = false; chartOpen = false">
              <input data-chart-rename-input v-model="renameLabel" aria-label="Novo rótulo" />
              <button data-chart-rename-go type="submit">Renomear</button>
            </form>
        </template>
      </TitanChordproChartSwitch>

      <div class="titan-chordpro-head-edit-acts">
        <button
          data-meta-open
          type="button"
          class="titan-chordpro-head-edit-meta"
          :title="metaGapLabel || `Metadados · ${metaSummary}`"
          :aria-label="metaGapLabel ? `Metadados — ${metaGapLabel}` : 'Editar metadados'"
          :style="{
            borderColor: metaGaps ? 'var(--danger)' : 'var(--chord-edge)',
            background: metaGaps ? 'var(--danger-soft)' : 'var(--chord-soft)',
            color: metaGaps ? 'var(--danger)' : 'var(--chord)',
          }"
          @click="emit('openMeta')"
        >
          <TitanChordproIcon name="list" :size="14" />
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
        ><TitanChordproIcon name="undo2" :size="16" /></button>
        <button
          v-if="canRedo"
          data-redo
          title="Refazer (Ctrl+Shift+Z)"
          aria-label="Refazer"
          :style="{ width: compact ? '32px' : '34px', height: compact ? '32px' : '34px' }"
          style="border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer;"
          @click="emit('redo')"
        ><TitanChordproIcon name="redo2" :size="16" /></button>
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
