<script setup lang="ts">
import ReadingSwitch from '../ReadingSwitch.vue'
import TitanChordproRollButton from '../ui/TitanChordproRollButton.vue'
import TitanChordproTypePair from '../ui/TitanChordproTypePair.vue'
import TitanChordproIconButton from '../ui/TitanChordproIconButton.vue'
import TitanChordproFitHint from '../ui/TitanChordproFitHint.vue'
import TitanChordproSpeedHud from '../ui/TitanChordproSpeedHud.vue'
import TitanChordproSetlistNav from '../ui/TitanChordproSetlistNav.vue'

defineProps<{
  hidden: boolean
  hintFit: boolean
  letra: boolean
  dockCtrlH: string
  setlistOn: boolean
  noPrev: boolean
  noNext: boolean
  posLabel: string
  nextChipShort: string
  scrolling: boolean
  mul: number
  etaLabel: string
  progress: number
  width: number
  dockPlayName: string
  scrollTitle: string
  scrollOff: boolean
  rollLive: boolean
  dockPlayLabeled: boolean
  dockPlayLabel: string
  dockTypeW: string
  bp: string
  canEdit: boolean
  dirty: boolean
  dockIconSize: string
  fitOn: boolean
  queueCount?: number
}>()

const emit = defineEmits<{
  dismissHint: []
  cifra: []
  letra: []
  prev: []
  openList: []
  next: []
  slower: []
  faster: []
  toggleScroll: []
  smallerType: []
  biggerType: []
  edit: []
  toggleFit: []
  more: []
}>()
</script>

<template>
  <div
    class="titan-chordpro-phone-stack"
    :class="{ 'is-zen': hidden }"
    :style="{ '--titan-chordpro-dock-ctrl-h': dockCtrlH, '--titan-chordpro-dock-type-w': dockTypeW }"
  >
    <TitanChordproFitHint v-if="hintFit && !hidden" density="phone" @dismiss="emit('dismissHint')" />

    <div class="titan-chordpro-hit titan-chordpro-veil" style="display:flex;flex-direction:column;border-radius:20px;overflow:hidden;">
      <div data-phone-lead class="titan-chordpro-phone-lead">
        <slot />
        <ReadingSwitch v-show="!hidden" variant="dock" :letra="letra" :height="dockCtrlH" @cifra="emit('cifra')" @letra="emit('letra')" />
      </div>
      <div class="titan-chordpro-chrome" :class="{ 'is-hidden': hidden }">
      <TitanChordproSetlistNav
        v-if="setlistOn"
        density="phone"
        :no-prev="noPrev"
        :no-next="noNext"
        :pos-label="posLabel"
        :next-label="nextChipShort"
        @prev="emit('prev')"
        @open-list="emit('openList')"
        @next="emit('next')"
      />
      <TitanChordproSpeedHud
        v-if="scrolling"
        density="row"
        :mul="mul"
        :eta-label="etaLabel"
        :progress="progress"
        @slower="emit('slower')"
        @faster="emit('faster')"
      />
      <div :style="{ gap: width < 360 ? '3px' : '4px' }" style="display:flex;align-items:center;justify-content:space-between;padding:6px;">
        <TitanChordproRollButton
          density="phone"
          :live="rollLive"
          :off="scrollOff"
          :labeled="dockPlayLabeled"
          :label="dockPlayLabel"
          :name="dockPlayName"
          :title="scrollTitle"
          @click="emit('toggleScroll')"
        />
        <TitanChordproTypePair density="phone" :xs="bp === 'xs'" @smaller="emit('smallerType')" @bigger="emit('biggerType')" />
        <TitanChordproIconButton
          v-if="canEdit"
          data-edit
          density="phone"
          icon="pencil"
          :title="dirty ? 'Editar esta cifra · rascunho' : 'Editar esta cifra'"
          :aria-label="dirty ? 'Editar esta cifra · rascunho' : 'Editar esta cifra'"
          @click="emit('edit')"
        />
        <TitanChordproIconButton
          data-fit
          density="phone"
          icon="scan"
          title="Modo ajuste ao espaço"
          aria-label="Ajuste ao espaço"
          toggle
          :pressed="fitOn"
          @click="emit('toggleFit')"
        />
        <TitanChordproIconButton
          class="titan-chordpro-more-hit"
          data-more
          density="phone"
          icon="ellipsis"
          title="Mais controles"
          aria-label="Mais controles"
          :badge="queueCount"
          @click="emit('more')"
        />
      </div>
      </div>
    </div>
  </div>
</template>
