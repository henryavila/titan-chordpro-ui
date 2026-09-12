<script setup lang="ts">
import CpvIcon from '../icon/CpvIcon.vue'
import SelectionBar from '../edit/SelectionBar.vue'
import type { CpvIconName } from '../icon/paths'
import type { WriteMode } from '../public'
import type { BlockEditApi } from '../use/useBlockEdit'

defineProps<{
  compact: boolean
  editHint: boolean
  clipLabel: string | null
  edit: BlockEditApi
  wMode: WriteMode | null
  insertWhere: string
  insertOpen: boolean
  insertItems: Array<{ icon: CpvIconName; label: string; go: () => void }>
  showSource: boolean
  lintOk: boolean
  themeTitle: string
  themeIcon: CpvIconName
}>()

const emit = defineEmits<{
  seenHint: []
  dropClip: []
  editScore: []
  insert: []
  source: []
  smallerType: []
  biggerType: []
  theme: []
}>()
</script>

<template>
  <div
    style="position:absolute;bottom:0;left:0;right:0;z-index:13;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 16px 18px;pointer-events:none;"
  >
    <div v-if="editHint" class="cpv-clip-bar cpv-veil-2" data-edit-hint style="border-style:solid;">
      <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">
        Toque na linha para editar a letra · segure o acorde e arraste até a sílaba ·
        <CpvIcon name="gripV" :size="14" /> seleciona e reordena o bloco.
      </span>
      <button
        class="cpv-ghost"
        aria-label="Entendi"
        style="flex:none;width:26px;height:26px;color:var(--muted);font-size:14px;line-height:1;"
        @click="emit('seenHint')"
      ><CpvIcon name="x" :size="14" /></button>
    </div>

    <div v-if="clipLabel" class="cpv-clip-bar cpv-veil-2">
      <span style="font-size:11.5px;line-height:1.4;color:var(--text);text-wrap:pretty;">
        Harmonia de <strong style="color:var(--chord);">{{ clipLabel }}</strong> na mão — toque em “Colar harmonia aqui” nos blocos destino.
      </span>
      <button
        style="flex:none;height:28px;padding:0 10px;border:0;border-radius:9px;background:var(--surface);color:var(--muted);font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;"
        @click="emit('dropClip')"
      >Dispensar</button>
    </div>

    <SelectionBar
      v-if="edit.sel.value !== null"
      :edit="edit"
      :compact="compact"
      :w-mode="wMode"
      @edit-score="emit('editScore')"
    />

    <div class="cpv-veil" style="pointer-events:auto;position:relative;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px;padding:6px;border-radius:17px;">
      <div v-if="insertOpen" class="cpv-insert-menu cpv-veil-2">
        <div class="cpv-insert-where">{{ insertWhere }}</div>
        <button
          v-for="it in insertItems"
          :key="it.label"
          class="cpv-insert-item"
          type="button"
          @click="it.go()"
        ><span><CpvIcon :name="it.icon" :size="16" /></span>{{ it.label }}</button>
      </div>

      <button
        data-insert
        title="Inserir bloco"
        :style="{
          border: `1px solid ${insertOpen ? 'var(--sel-line)' : 'var(--line)'}`,
          background: insertOpen ? 'var(--sel)' : 'transparent',
        }"
        style="height:36px;padding:0 13px;border-radius:12px;color:var(--text);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;"
        @click="emit('insert')"
      ><CpvIcon name="plus" :size="16" style="color:var(--chord)" />Inserir</button>

      <span style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />

      <button
        v-if="showSource"
        data-source
        title="Fonte ChordPro assistida"
        style="height:36px;padding:0 12px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--text);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;"
        @click="emit('source')"
      >
        <CpvIcon name="braces" :size="16" />Fonte
        <span v-if="!lintOk" title="Diretiva sem par nesta cifra" style="width:6px;height:6px;border-radius:50%;background:var(--danger);" />
      </button>
      <button class="cpv-ghost" aria-label="Diminuir tipografia" style="width:36px;height:36px;font-size:12px;font-weight:600;" @click="emit('smallerType')">A−</button>
      <button class="cpv-ghost" aria-label="Aumentar tipografia" style="width:36px;height:36px;font-size:16px;font-weight:600;" @click="emit('biggerType')">A+</button>
      <button data-theme-btn class="cpv-ghost" :title="themeTitle" style="width:36px;height:36px;" @click="emit('theme')"><CpvIcon :name="themeIcon" :size="16" /></button>
    </div>
  </div>
</template>
