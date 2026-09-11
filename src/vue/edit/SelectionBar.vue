<script setup lang="ts">
import { computed } from 'vue'
import type { BlockEditApi } from '../use/useBlockEdit'
import type { WriteMode } from '../use/useOverlay'
import CpvIcon from '../icon/CpvIcon.vue'

const props = defineProps<{
  edit: BlockEditApi
  compact: boolean
  wMode: WriteMode | null
}>()

const emit = defineEmits<{ editScore: [] }>()

const e = computed(() => props.edit)
/**
 * In the local mode there is no delete: hiding IS the removal, and the label
 * says so — the block stays in the file for everyone else.
 */
const hideLabel = computed(() => (props.wMode === 'local' ? 'Remover daqui' : 'Ocultar'))
const hideTitle = computed(() =>
  props.wMode === 'local'
    ? 'Remover este bloco da sua leitura — reversível pelo botão Reexibir'
    : 'Ocultar este bloco na leitura',
)
const canDelete = computed(() => props.wMode === 'content')
// The 8.5px caps become noise on a narrow bar: on a phone only the value
// stays, in a size readable while standing.
const capShow = computed(() => (props.compact ? 'none' : 'block'))
const valPx = computed(() => (props.compact ? '12.5px' : '11px'))
</script>

<template>
  <div
    class="cpv-selbar cpv-veil-2"
    data-sel-bar
    :style="{
      width: compact ? '100%' : 'max-content',
      flexWrap: compact ? 'nowrap' : 'wrap',
      overflowX: compact ? 'auto' : 'visible',
      justifyContent: compact ? 'flex-start' : 'center',
    }"
  >
    <span class="cpv-selbar-name">
      <CpvIcon name="gripV" :size="14" />
      <span :style="{ display: capShow }" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ e.selLabel.value }}</span>
    </span>

    <template v-if="e.selHasChords.value">
      <div class="cpv-selbar-group cpv-selbar-group--chord">
        <button data-sec-down title="Descer só este bloco meio tom" aria-label="Descer só este bloco meio tom" @click="e.secShift(-1)">−</button>
        <span class="cpv-selbar-val">
          <span :style="{ display: capShow }" class="cpv-selbar-cap" style="color:var(--chord);">transpor bloco</span>
          <span :style="{ fontSize: valPx }" style="color:var(--chord);">{{ e.selShiftLabel.value }}</span>
        </span>
        <button data-sec-up title="Subir só este bloco meio tom" aria-label="Subir só este bloco meio tom" @click="e.secShift(1)">+</button>
        <button
          v-if="e.selShift.value !== 0"
          data-sec-reset
          title="Voltar este bloco ao tom da música"
          aria-label="Voltar este bloco ao tom da música"
          style="display:flex;align-items:center;"
          @click="e.secReset()"
        ><CpvIcon name="rotateCcw" :size="14" /></button>
      </div>

      <div class="cpv-selbar-group cpv-selbar-group--capo">
        <button title="Descer o capo deste bloco uma casa" aria-label="Descer o capo deste bloco" @click="e.setBlockCapo(-1, false)">−</button>
        <span class="cpv-selbar-val">
          <span :style="{ display: capShow }" class="cpv-selbar-cap" style="color:var(--muted);">capo do bloco</span>
          <span :style="{ fontSize: valPx }" style="color:var(--text);">{{ e.selCapoLabel.value }}</span>
        </span>
        <button data-block-capo-up title="Subir o capo deste bloco uma casa" aria-label="Subir o capo deste bloco" @click="e.setBlockCapo(1, false)">+</button>
        <template v-if="e.selCapoOwn.value">
          <button
            data-block-dual
            class="cpv-selbar-dual"
            title="Mostrar acorde real e forma do capo neste bloco"
            :aria-pressed="e.selDualOn.value"
            :style="{
              background: e.selDualOn.value ? 'var(--chord-fill)' : 'transparent',
              color: e.selDualOn.value ? 'var(--chord)' : 'var(--muted)',
            }"
            @click="e.toggleBlockDual()"
          >{{ e.selDualOn.value ? 'dual on' : 'dual off' }}</button>
          <button title="Seguir o capo da música" aria-label="Seguir o capo da música" style="color:var(--muted);display:flex;align-items:center;" @click="e.setBlockCapo(0, true)"><CpvIcon name="rotateCcw" :size="14" /></button>
        </template>
      </div>

      <button class="cpv-selbar-btn" data-copy-harmony @click="e.copyHarmony()">Copiar harmonia</button>
      <button
        class="cpv-selbar-btn"
        data-place-chord
        :style="{
          background: e.placing.value ? 'var(--chord-fill)' : 'transparent',
          borderColor: e.placing.value ? 'var(--chord-edge)' : 'var(--line)',
        }"
        @click="e.togglePlacing()"
      >{{ e.placing.value ? 'Escolhendo sílaba' : 'Adicionar acorde' }}</button>
    </template>

    <button v-if="e.selIsScore.value" class="cpv-selbar-btn" data-edit-score @click="emit('editScore')">Editar partitura</button>
    <button v-if="e.selIsImage.value" class="cpv-selbar-btn" data-swap-image @click="e.openPicker('replace')">Trocar imagem</button>

    <div style="flex:none;display:flex;align-items:center;gap:2px;">
      <button class="cpv-selbar-icon" data-nudge-up title="Mover bloco para cima (Alt+↑)" aria-label="Mover bloco para cima" style="border-radius:10px 4px 4px 10px;" @click="e.nudgeBlock(-1)"><CpvIcon name="chevronUp" :size="16" /></button>
      <button class="cpv-selbar-icon" data-nudge-down title="Mover bloco para baixo (Alt+↓)" aria-label="Mover bloco para baixo" style="border-radius:4px 10px 10px 4px;" @click="e.nudgeBlock(1)"><CpvIcon name="chevronDown" :size="16" /></button>
    </div>

    <button
      v-if="e.selIsHidden.value"
      class="cpv-selbar-btn cpv-selbar-btn--go"
      data-unhide
      title="Voltar a exibir na leitura"
      @click="e.sel.value !== null && e.unhideBlock(e.sel.value)"
    >Reexibir</button>
    <button
      v-else
      class="cpv-selbar-btn"
      data-hide
      :title="hideTitle"
      :style="{ color: wMode === 'local' ? 'var(--danger)' : 'var(--text)' }"
      style="display:flex;align-items:center;gap:6px;"
      @click="e.hideBlock()"
    ><CpvIcon name="eyeOff" :size="14" />{{ hideLabel }}</button>

    <button class="cpv-selbar-icon" data-duplicate title="Duplicar bloco" aria-label="Duplicar bloco" @click="e.duplicateBlock()"><CpvIcon name="copy" :size="16" /></button>
    <button
      v-if="canDelete"
      class="cpv-selbar-icon cpv-selbar-icon--danger"
      data-delete
      title="Excluir bloco"
      aria-label="Excluir bloco"
      @click="e.deleteBlock()"
    ><CpvIcon name="trash2" :size="16" /></button>
    <button class="cpv-selbar-icon cpv-selbar-icon--ghost" data-close-sel aria-label="Fechar seleção" @click="e.clearSel()"><CpvIcon name="x" :size="16" /></button>
  </div>
</template>
