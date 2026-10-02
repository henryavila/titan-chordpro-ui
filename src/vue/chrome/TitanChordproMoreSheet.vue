<script setup lang="ts">
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import TitanChordproDialogShell from '../ui/TitanChordproDialogShell.vue'
import type { MoreSheetModel } from './dock-model'

defineProps<MoreSheetModel>()

const emit = defineEmits<{
  close: []
  theme: []
  toggleNashville: []
  toggleComments: []
  metronome: []
  strum: []
  toggleEnsaioBatida: []
  export: []
  toggleOriginal: []
  openMy: []
  openQueue: []
}>()
</script>

<template>
  <TitanChordproDialogShell
    variant="sheet"
    :z="27"
    label="Mais controles"
    kicker="Mais controles"
    :panel-style="{ gap: '6px' }"
    @close="emit('close')"
  >
      <button data-theme-btn class="titan-chordpro-surface-btn titan-chordpro-more-item" :title="themeTitle" @click="emit('theme')"><TitanChordproIcon :name="themeIcon" :size="18" /><span class="titan-chordpro-more-copy">Tema</span><span>{{ themeLabel }}</span></button>
      <button
        class="titan-chordpro-surface-btn titan-chordpro-more-item"
        :class="{ 'is-chord': nashvilleOn }"
        data-lens="nashville"
        :disabled="!hasKey"
        :aria-pressed="nashvilleOn ? 'true' : 'false'"
        :style="{ opacity: hasKey ? '1' : '0.45' }"
        @click="emit('toggleNashville')"
      ><TitanChordproIcon name="glasses" :size="18" /><span class="titan-chordpro-more-copy">Graus</span><span>{{ nashvilleHint }}</span></button>
      <button
        class="titan-chordpro-surface-btn titan-chordpro-more-item"
        :class="{ 'is-sel': hideComments }"
        data-comments-toggle
        :aria-pressed="hideComments ? 'true' : 'false'"
        @click="emit('toggleComments')"
      ><TitanChordproIcon :name="hideComments ? 'eyeOff' : 'eye'" :size="18" /><span class="titan-chordpro-more-copy">Comentários</span><span>{{ hideComments ? 'ocultos' : 'visíveis' }}</span></button>
      <button data-met-btn class="titan-chordpro-surface-btn titan-chordpro-more-item" :class="{ 'is-chord': metRunning }" @click="emit('metronome')"><TitanChordproIcon name="metronome" :size="18" /><span class="titan-chordpro-more-copy">Metrônomo</span><span>{{ metBpm }} BPM{{ metRunning ? ' · tocando' : '' }}</span></button>
      <button
        v-if="hasStrum"
        class="titan-chordpro-surface-btn titan-chordpro-more-item"
        :class="{ 'is-chord': strumOn }"
        data-strum-more
        @click="emit('strum')"
      ><span style="font-size:16px;width:18px;text-align:center;">↓↑</span><span class="titan-chordpro-more-copy">Batida</span><span>{{ strumOn ? 'visível' : 'mostrar' }}</span></button>
      <button
        v-if="hasStrum"
        class="titan-chordpro-surface-btn titan-chordpro-more-item"
        :class="{ 'is-chord': ensaioBatida }"
        data-ensaio-batida
        :aria-pressed="ensaioBatida ? 'true' : 'false'"
        @click="emit('toggleEnsaioBatida')"
      ><TitanChordproIcon name="guitar" :size="18" /><span class="titan-chordpro-more-copy">{{ ensaioBatida ? 'Sair do ensaio' : 'Ensaio batida' }}</span><span>{{ ensaioBatida ? 'ativo' : 'praticar batida' }}</span></button>
      <button class="titan-chordpro-surface-btn titan-chordpro-more-item" @click="emit('export')"><TitanChordproIcon name="download" :size="18" /><span class="titan-chordpro-more-copy">Exportar</span><span>ChordPro, PDF ou slides</span></button>
      <template v-if="showMine">
        <button class="titan-chordpro-surface-btn titan-chordpro-more-item" data-more-original @click="emit('toggleOriginal')">
          <TitanChordproIcon name="layers" :size="18" /><span class="titan-chordpro-more-copy">{{ showOriginal ? 'Ler minha versão' : 'Ler o original' }}</span><span>{{ mineCount }} {{ mineCount === 1 ? 'ajuste seu' : 'ajustes seus' }}</span>
        </button>
        <button class="titan-chordpro-surface-btn titan-chordpro-more-item" data-more-my @click="emit('openMy')"><TitanChordproIcon name="list" :size="18" /><span class="titan-chordpro-more-copy">Meus ajustes</span><span>Ver e reverter</span></button>
      </template>
      <button
        v-if="showQueue"
        class="titan-chordpro-surface-btn titan-chordpro-more-item is-queue"
        data-more-queue
        @click="emit('openQueue')"
      ><TitanChordproIcon name="msgQuote" :size="18" /><span class="titan-chordpro-more-copy">Sugestões dos músicos</span><span>{{ pendingCount }} {{ pendingCount === 1 ? 'pendente' : 'pendentes' }}</span></button>
  </TitanChordproDialogShell>
</template>
