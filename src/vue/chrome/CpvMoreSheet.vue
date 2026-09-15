<script setup lang="ts">
import CpvIcon from '../icon/CpvIcon.vue'
import type { CpvIconName } from '../icon/paths'

defineProps<{
  themeTitle: string
  themeIcon: CpvIconName
  themeLabel: string
  hasKey: boolean
  nashvilleOn: boolean
  nashvilleHint: string
  hideComments: boolean
  metBpm: number
  metRunning: boolean
  hasStrum: boolean
  strumOn: boolean
  ensaioBatida: boolean
  showMine: boolean
  showOriginal: boolean
  mineCount: number
  showQueue: boolean
  pendingCount: number
}>()

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
  <div style="position:absolute;inset:0;z-index:27;">
    <div class="cpv-scrim" @click="emit('close')" />
    <div class="cpv-bottom-sheet cpv-veil-2" role="dialog" aria-label="Mais controles" style="gap:6px;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0 2px 6px;">
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Mais controles</span>
        <button class="cpv-ghost" aria-label="Fechar" style="width:34px;height:34px;color:var(--muted);" @click="emit('close')"><CpvIcon name="x" :size="16" /></button>
      </div>
      <button data-theme-btn class="cpv-surface-btn cpv-more-item" :title="themeTitle" @click="emit('theme')"><CpvIcon :name="themeIcon" :size="18" /><span class="cpv-more-copy">Tema</span><span>{{ themeLabel }}</span></button>
      <button
        class="cpv-surface-btn cpv-more-item"
        data-lens="nashville"
        :disabled="!hasKey"
        :aria-pressed="nashvilleOn ? 'true' : 'false'"
        :style="{
          borderColor: nashvilleOn ? 'var(--chord-edge)' : undefined,
          background: nashvilleOn ? 'var(--chord-soft)' : undefined,
          opacity: hasKey ? '1' : '0.45',
        }"
        @click="emit('toggleNashville')"
      ><CpvIcon name="glasses" :size="18" /><span class="cpv-more-copy">Nashville</span><span>{{ nashvilleHint }}</span></button>
      <button
        class="cpv-surface-btn cpv-more-item"
        data-comments-toggle
        :aria-pressed="hideComments ? 'true' : 'false'"
        :style="{
          borderColor: hideComments ? 'var(--sel-line)' : undefined,
          background: hideComments ? 'var(--sel)' : undefined,
        }"
        @click="emit('toggleComments')"
      ><CpvIcon name="eyeOff" :size="18" /><span class="cpv-more-copy">Comentários de ensaio</span><span>{{ hideComments ? 'ocultos' : 'visíveis' }}</span></button>
      <button class="cpv-surface-btn cpv-more-item" @click="emit('metronome')"><CpvIcon name="metronome" :size="18" /><span class="cpv-more-copy">Metrônomo</span><span>{{ metBpm }} BPM{{ metRunning ? ' · tocando' : '' }}</span></button>
      <button
        v-if="hasStrum"
        class="cpv-surface-btn cpv-more-item"
        data-strum-more
        @click="emit('strum')"
      ><span style="font-size:16px;width:18px;text-align:center;">↓↑</span><span class="cpv-more-copy">Batida</span><span>{{ strumOn ? 'visível' : 'mostrar' }}</span></button>
      <button
        v-if="hasStrum"
        class="cpv-surface-btn cpv-more-item"
        data-ensaio-batida
        :aria-pressed="ensaioBatida ? 'true' : 'false'"
        :style="{
          borderColor: ensaioBatida ? 'var(--chord-edge)' : undefined,
          background: ensaioBatida ? 'var(--chord-soft)' : undefined,
        }"
        @click="emit('toggleEnsaioBatida')"
      ><CpvIcon name="guitar" :size="18" /><span class="cpv-more-copy">{{ ensaioBatida ? 'Sair do ensaio' : 'Ensaio batida' }}</span><span>{{ ensaioBatida ? 'ativo' : 'praticar batida' }}</span></button>
      <button class="cpv-surface-btn cpv-more-item" @click="emit('export')"><CpvIcon name="download" :size="18" /><span class="cpv-more-copy">Exportar</span><span>ChordPro, PDF ou slides</span></button>
      <template v-if="showMine">
        <button class="cpv-surface-btn cpv-more-item" data-more-original @click="emit('toggleOriginal')">
          <CpvIcon name="layers" :size="18" /><span class="cpv-more-copy">{{ showOriginal ? 'Ler minha versão' : 'Ler o original' }}</span><span>{{ mineCount }} {{ mineCount === 1 ? 'ajuste seu' : 'ajustes seus' }}</span>
        </button>
        <button class="cpv-surface-btn cpv-more-item" data-more-my @click="emit('openMy')"><CpvIcon name="list" :size="18" /><span class="cpv-more-copy">Meus ajustes</span><span>Ver e reverter</span></button>
      </template>
      <button
        v-if="showQueue"
        class="cpv-surface-btn cpv-more-item"
        data-more-queue
        @click="emit('openQueue')"
      ><CpvIcon name="msgQuote" :size="18" /><span class="cpv-more-copy">Sugestões dos músicos</span><span>{{ pendingCount }} {{ pendingCount === 1 ? 'pendente' : 'pendentes' }}</span></button>
    </div>
  </div>
</template>
