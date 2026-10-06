<script setup lang="ts">
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import ReadingSwitch from '../ReadingSwitch.vue'
import TitanChordproRollButton from '../ui/TitanChordproRollButton.vue'
import TitanChordproTypePair from '../ui/TitanChordproTypePair.vue'
import TitanChordproBarButton from '../ui/TitanChordproBarButton.vue'
import TitanChordproIconButton from '../ui/TitanChordproIconButton.vue'
import TitanChordproFitHint from '../ui/TitanChordproFitHint.vue'
import TitanChordproSpeedHud from '../ui/TitanChordproSpeedHud.vue'
import TitanChordproSetlistNav from '../ui/TitanChordproSetlistNav.vue'
import type { WideDockModel } from './dock-model'

defineProps<WideDockModel>()

const emit = defineEmits<{
  original: [on: boolean]
  openMy: []
  dismissHint: []
  slower: []
  faster: []
  prev: []
  openList: []
  next: []
  toggleScroll: []
  smallerType: []
  biggerType: []
  toggleFit: []
  cifra: []
  letra: []
  partitura: []
  toggleNashville: []
  toggleComments: []
  toggleMet: []
  toggleStrum: []
  toggleEnsaioBatida: []
  theme: []
  edit: []
  export: []
}>()
</script>

<template>
  <div
    class="titan-chordpro-chrome"
    :class="{ 'is-hidden': hidden }"
    style="position:absolute;bottom:0;left:0;right:0;z-index:13;display:flex;flex-direction:column;align-items:center;gap:10px;padding:0 16px 18px;"
  >
    <slot />
    <div v-if="showMine" class="titan-chordpro-hit titan-chordpro-veil-2 titan-chordpro-mine-switch" data-mine-switch>
      <button
        data-read-mine
        :style="{
          border: `1px solid ${showOriginal ? 'var(--line)' : 'var(--chord-edge)'}`,
          background: showOriginal ? 'transparent' : 'var(--chord-fill)',
          color: showOriginal ? 'var(--muted)' : 'var(--chord)',
        }"
        @click="emit('original', false)"
      >{{ mineLabel }}</button>
      <button
        data-read-orig
        :style="{
          border: `1px solid ${showOriginal ? 'var(--sel-line)' : 'var(--line)'}`,
          background: showOriginal ? 'var(--sel)' : 'transparent',
          color: showOriginal ? 'var(--text)' : 'var(--muted)',
        }"
        @click="emit('original', true)"
      >Original</button>
      <button
        class="titan-chordpro-ghost"
        data-open-my
        aria-label="Ver e reverter meus ajustes"
        title="Ver e reverter meus ajustes"
        style="width:30px;height:30px;border-radius:10px;color:var(--muted);font-size:15px;line-height:1;"
        @click="emit('openMy')"
      ><TitanChordproIcon name="ellipsis" :size="16" /></button>
    </div>

    <TitanChordproFitHint v-if="hintFit" density="wide" @dismiss="emit('dismissHint')" />

    <TitanChordproSpeedHud
      v-if="scrolling"
      density="chip"
      :mul="mul"
      :eta-label="etaLabel"
      :progress="progress"
      @slower="emit('slower')"
      @faster="emit('faster')"
    />

    <div class="titan-chordpro-hit titan-chordpro-veil" style="display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px;padding:6px;border-radius:17px;">
      <template v-if="setlistOn">
        <TitanChordproSetlistNav
          density="wide"
          :no-prev="noPrev"
          :no-next="noNext"
          :pos-label="posLabel"
          next-label=""
          @prev="emit('prev')"
          @open-list="emit('openList')"
          @next="emit('next')"
        />
        <span style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />
      </template>
      <TitanChordproRollButton
        density="wide"
        :live="rollLive"
        :off="scrollOff"
        labeled
        :label="rollLive ? 'Parar' : 'Rolar'"
        :name="rollLive ? 'Parar' : 'Rolar'"
        :title="scrollTitle"
        @click="emit('toggleScroll')"
      />
      <span style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />
      <TitanChordproTypePair density="bar" :score="scoreReading" @smaller="emit('smallerType')" @bigger="emit('biggerType')" />
      <TitanChordproBarButton
        v-if="!scoreReading"
        data-fit
        icon="scan"
        label="Ajuste"
        title="Modo ajuste ao espaço"
        toggle
        :pressed="fitOn ? 'sel' : false"
        @click="emit('toggleFit')"
      />
      <span style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />
      <ReadingSwitch variant="bar" :letra="letra" :partitura="partitura" :partitura-on="partituraOn" @cifra="emit('cifra')" @letra="emit('letra')" @partitura="emit('partitura')" />
      <TitanChordproBarButton
        v-if="!scoreReading"
        data-lens="nashville"
        icon="glasses"
        label="Graus"
        title="Graus — no lugar dos nomes"
        toggle
        :disabled="!hasKey"
        :pressed="nashvilleOn ? 'chord' : false"
        @click="emit('toggleNashville')"
      />
      <TitanChordproBarButton
        v-if="!scoreReading"
        data-comments-toggle
        :icon="hideComments ? 'eyeOff' : 'eye'"
        label="Comentários"
        :title="hideComments ? 'Mostrar comentários' : 'Ocultar comentários'"
        toggle
        :pressed="hideComments ? 'sel' : false"
        @click="emit('toggleComments')"
      />
      <TitanChordproBarButton
        data-met-btn
        icon="metronome"
        title="Metrônomo (M)"
        toggle
        :pressed="metRunning ? 'chord' : false"
        @click="emit('toggleMet')"
      >{{ metRunning ? `${metBpm} BPM` : 'Metrônomo' }}</TitanChordproBarButton>
      <TitanChordproBarButton
        v-if="hasStrum"
        data-strum-btn
        title="Batida"
        toggle
        :pressed="strumOn ? 'chord' : false"
        @click="emit('toggleStrum')"
      >↓↑ Batida</TitanChordproBarButton>
      <TitanChordproBarButton
        v-if="hasStrum"
        data-ensaio-batida
        icon="guitar"
        :label="ensaioBatida ? 'Sair do ensaio' : 'Ensaio batida'"
        title="Ensaio batida"
        toggle
        :pressed="ensaioBatida ? 'chord' : false"
        @click="emit('toggleEnsaioBatida')"
      />
      <span style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />
      <TitanChordproIconButton
        data-theme-btn
        labeled
        :icon="themeIcon"
        :title="themeTitle"
        @click="emit('theme')"
      >{{ themeLabel }}</TitanChordproIconButton>
      <TitanChordproIconButton
        v-if="canEdit"
        data-edit
        labeled
        icon="pencil"
        :title="dirty ? 'Editar esta cifra · rascunho' : 'Editar esta cifra'"
        aria-label="Editar esta cifra"
        @click="emit('edit')"
      >{{ dirty ? 'Editar · rascunho' : 'Editar' }}</TitanChordproIconButton>
      <TitanChordproIconButton
        icon="download"
        title="Exportar CHO, PDF ou slides"
        aria-label="Exportar"
        @click="emit('export')"
      />
    </div>
  </div>
</template>
