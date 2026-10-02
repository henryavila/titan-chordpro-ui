<script setup lang="ts">
import { computed } from 'vue'
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import SelectionBar from '../edit/SelectionBar.vue'
import TitanChordproBarButton from '../ui/TitanChordproBarButton.vue'
import TitanChordproTypePair from '../ui/TitanChordproTypePair.vue'
import TitanChordproIconButton from '../ui/TitanChordproIconButton.vue'
import type { EditDockModel } from './dock-model'

const props = defineProps<EditDockModel>()

const emit = defineEmits<{
  seenHint: []
  dropClip: []
  editScore: []
  source: []
  smallerType: []
  biggerType: []
  theme: []
  createBatida: []
  editBatida: []
}>()

const showBatidaTools = computed(() => props.wMode === 'local' || props.wMode === 'persisted')
</script>

<template>
  <div
    style="position:absolute;bottom:0;left:0;right:0;z-index:13;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 16px 18px;pointer-events:none;"
  >
    <div v-if="editHint" class="titan-chordpro-clip-bar titan-chordpro-veil-2" data-edit-hint style="border-style:solid;">
      <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">
        Toque na linha para editar a letra · Cifra entra onde está o cursor ·
        segure o acorde e arraste até a sílaba · o + insere naquele lugar ·
        <TitanChordproIcon name="gripV" :size="14" /> seleciona e reordena o bloco.
      </span>
      <button
        class="titan-chordpro-ghost"
        aria-label="Entendi"
        style="flex:none;width:26px;height:26px;color:var(--muted);font-size:14px;line-height:1;"
        @click="emit('seenHint')"
      ><TitanChordproIcon name="x" :size="14" /></button>
    </div>

    <div v-if="clipLabel" class="titan-chordpro-clip-bar titan-chordpro-veil-2">
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

    <div class="titan-chordpro-veil" style="pointer-events:auto;position:relative;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px;padding:6px;border-radius:17px;">
      <TitanChordproBarButton
        v-if="showBatidaTools && !hasStrum"
        data-batida-create
        icon="plus"
        label="Criar batida"
        title="Criar batida"
        dash
        @click="emit('createBatida')"
      />
      <TitanChordproBarButton
        v-if="showBatidaTools && hasStrum"
        data-batida-edit-chrome
        icon="pencil"
        label="Editar batida"
        title="Editar batida"
        @click="emit('editBatida')"
      />

      <span v-if="showBatidaTools" style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />

      <TitanChordproBarButton
        v-if="showSource"
        data-source
        icon="braces"
        title="Fonte ChordPro assistida"
        @click="emit('source')"
      >
        Fonte
        <span v-if="!lintOk" title="Diretiva sem par nesta cifra" style="width:6px;height:6px;border-radius:50%;background:var(--danger);" />
      </TitanChordproBarButton>
      <TitanChordproTypePair density="bar" @smaller="emit('smallerType')" @bigger="emit('biggerType')" />
      <TitanChordproIconButton data-theme-btn :icon="themeIcon" :title="themeTitle" @click="emit('theme')" />
    </div>
  </div>
</template>
