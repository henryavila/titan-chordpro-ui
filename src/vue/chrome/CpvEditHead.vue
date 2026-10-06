<script setup lang="ts">
import { ref } from 'vue'
import CpvIcon from '../icon/CpvIcon.vue'
import type { WriteMode } from '../public'

const props = defineProps<{
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
  charts: { id: string; label: string; isDefault: boolean }[]
  chartId: string
  chartLabel: string
}>()

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

const addOpen = ref(false)
const renameOpen = ref(false)
const chartOpen = ref(false)
const confirmDelete = ref(false)
const addLabel = ref('')
const renameLabel = ref('')

const named = () => props.charts.length > 1
const openIsDefault = () => props.charts.some((c) => c.id === props.chartId && c.isDefault)
const chipLabel = () => (props.chartLabel && props.chartLabel !== 'default' ? props.chartLabel : 'Versão')

function versionSlug(label: string): string {
  const base = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
  let id = base && /^[a-z0-9_]/.test(base) ? base : 'versao'
  const taken = new Set(props.charts.map((c) => c.id))
  if (!taken.has(id)) return id
  let n = 2
  while (taken.has(`${id}_${n}`) && n < 40) n += 1
  return `${id}_${n}`.slice(0, 64)
}

function closeMenu() {
  chartOpen.value = false
  addOpen.value = false
  renameOpen.value = false
  confirmDelete.value = false
}

function toggleMenu() {
  if (chartOpen.value) closeMenu()
  else chartOpen.value = true
}

function pickChart(id: string) {
  closeMenu()
  emit('select-chart', id)
}

function openAdd() {
  addOpen.value = true
  renameOpen.value = false
  confirmDelete.value = false
  addLabel.value = ''
}

function openRename() {
  renameOpen.value = true
  addOpen.value = false
  confirmDelete.value = false
  renameLabel.value = props.chartLabel === 'default' ? '' : props.chartLabel
}

function goAdd() {
  const label = addLabel.value.trim()
  const id = versionSlug(label)
  if (!label || !id) return
  emit('chart-add', { id, label })
  closeMenu()
}

function goRename() {
  const label = renameLabel.value.trim()
  if (!label) return
  emit('chart-rename', label)
  closeMenu()
}

function askDelete() {
  if (!confirmDelete.value) {
    confirmDelete.value = true
    return
  }
  emit('chart-delete')
  closeMenu()
}

function makeDefault() {
  emit('chart-default')
  closeMenu()
}
</script>

<template>
  <div
    class="cpv-edit-chrome"
    :style="{ padding: chromePad, '--cpv-page-max': pageMax }"
    :ref="(el) => emit('bindHead', el)"
  >
    <div
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

      <div v-if="named() || contentEdit" class="cpv-version-chip">
        <button
          type="button"
          data-chart-switch
          data-chart-edit-label
          class="cpv-head-chip"
          aria-label="Versão"
          title="Versão"
          :aria-expanded="chartOpen"
          aria-haspopup="dialog"
          @click="toggleMenu"
        >
          <span class="cpv-chart-switch-label">{{ chipLabel() }}</span>
          <CpvIcon name="chevronDown" :size="10" />
        </button>
        <div
          v-if="chartOpen"
          class="cpv-veil-2 cpv-chart-menu cpv-version-menu"
          role="dialog"
          aria-label="Versão"
        >
          <div class="cpv-version-menu-title">Versão</div>
          <template v-if="!addOpen && !renameOpen">
            <template v-if="named()">
              <button
                v-for="c in charts"
                :key="c.id"
                type="button"
                :data-chart-option="c.id"
                :aria-selected="c.id === chartId"
                class="cpv-version-row"
                @click="pickChart(c.id)"
              >
                <span>{{ c.label === 'default' ? 'Padrão' : c.label }}</span>
                <span v-if="c.isDefault" class="cpv-version-mark">padrão</span>
              </button>
              <div v-if="contentEdit" class="cpv-version-rule" />
            </template>
            <button v-if="contentEdit && named()" type="button" data-chart-rename class="cpv-version-action" @click="openRename">Renomear</button>
            <button v-if="contentEdit" type="button" data-chart-add class="cpv-version-action" @click="openAdd">Nova versão</button>
            <button
              v-if="contentEdit && named()"
              type="button"
              data-chart-delete
              class="cpv-version-action"
              :class="{ 'is-danger': confirmDelete }"
              @click="askDelete"
            >{{ confirmDelete ? `Apagar ${chipLabel()}` : 'Apagar' }}</button>
            <button
              v-if="contentEdit && named() && !openIsDefault()"
              type="button"
              data-chart-default
              class="cpv-version-action"
              @click="makeDefault"
            >Tornar padrão</button>
          </template>
          <form v-else-if="addOpen" class="cpv-version-form" @submit.prevent="goAdd">
            <p class="cpv-version-hint">{{ named() ? `Copia ${chipLabel()}` : 'Copia esta cifra. A atual fica como Padrão.' }}</p>
            <input
              data-chart-label
              v-model="addLabel"
              placeholder="Nome"
              aria-label="Nome da versão"
            />
            <button data-chart-add-go type="submit">Criar</button>
          </form>
          <form v-else class="cpv-version-form" @submit.prevent="goRename">
            <input
              data-chart-rename-input
              v-model="renameLabel"
              aria-label="Novo rótulo"
            />
            <button data-chart-rename-go type="submit">Renomear</button>
          </form>
        </div>
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
          v-if="wMode === 'local' && !compact"
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
