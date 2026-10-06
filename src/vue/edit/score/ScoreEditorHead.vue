<script setup lang="ts">
import TitanChordproIcon from '../../icon/TitanChordproIcon.vue'
import TitanChordproSeg from '../../ui/TitanChordproSeg.vue'

defineProps<{
  title: string
  subtitle: string
  narrow: boolean
  metaLine: string
  dirty: boolean
  guitar: boolean
  view: 'score' | 'tab' | 'both'
  grand: boolean
  playing: boolean
  confirmDiscard: boolean
}>()

const emit = defineEmits<{
  swap: []
  view: [next: string]
  grand: []
  play: []
  discard: []
  save: []
}>()
</script>

<template>
  <header class="titan-chordpro-edp-head">
    <div class="titan-chordpro-edp-title" :style="{ minWidth: narrow ? '150px' : '220px' }">
      <div style="display:flex;flex-direction:column;gap:1px;min-width:0;flex:1;">
        <span class="titan-chordpro-edp-title-line">{{ title || 'Partitura' }} <span style="color:var(--muted);font-weight:400;">·</span> {{ subtitle }}</span>
        <span class="titan-chordpro-edp-meta">{{ metaLine }}</span>
      </div>
      <span v-if="dirty" class="titan-chordpro-edp-dirty">alterado</span>
    </div>

    <div class="titan-chordpro-edp-ctrls" :style="{ order: narrow ? 1 : 0 }">
      <button
        class="titan-chordpro-edp-btn titan-chordpro-edp-btn--soft"
        data-swap-inst
        title="Alterna só a forma de digitar — o que fica salvo é o mesmo"
        @click="emit('swap')"
      >
        <span class="titan-chordpro-edp-kicker">Entrada</span>{{ guitar ? 'Violão' : 'Piano' }}<TitanChordproIcon name="arrowLR" :size="14" style="color:var(--muted)" />
      </button>

      <TitanChordproSeg
        class="titan-chordpro-edp-seg"
        label="Vista da partitura"
        :value="grand ? '' : view"
        :options="[
          { value: 'score', label: 'Partitura' },
          { value: 'tab', label: 'TAB' },
          { value: 'both', label: 'Ambos' },
        ]"
        @pick="(next) => emit('view', next)"
      />

      <button
        class="titan-chordpro-edp-btn"
        data-grand
        title="Duas pautas, sol e fá"
        :aria-pressed="grand"
        :style="{
          borderColor: grand ? 'var(--chord-edge)' : 'var(--line)',
          background: grand ? 'var(--chord-soft)' : 'transparent',
          color: grand ? 'var(--chord)' : 'var(--text)',
        }"
        @click="emit('grand')"
      >Pauta dupla</button>

      <button
        class="titan-chordpro-edp-btn"
        data-play
        :style="{
          borderColor: playing ? 'var(--pill)' : 'var(--line)',
          background: playing ? 'var(--pill)' : 'transparent',
          color: playing ? 'var(--pill-ink)' : 'var(--text)',
        }"
        @click="emit('play')"
      >
        <TitanChordproIcon :name="playing ? 'square' : 'play'" :size="12" />
        {{ playing ? 'Parar' : 'Tocar' }}
      </button>
    </div>

    <div style="display:flex;align-items:center;gap:8px;margin-left:auto;" :style="{ order: narrow ? 0 : 1 }">
      <button
        class="titan-chordpro-edp-btn"
        data-score-cancel
        title="Sai sem gravar no bloco"
        :style="{
          borderColor: confirmDiscard ? 'var(--danger)' : 'var(--line)',
          color: confirmDiscard ? 'var(--danger)' : 'var(--text)',
        }"
        @click="emit('discard')"
      >{{ confirmDiscard ? 'Confirmar' : 'Descartar' }}</button>
      <button class="titan-chordpro-edp-btn titan-chordpro-edp-btn--primary" data-score-save :style="{ opacity: dirty ? 1 : 0.6 }" @click="emit('save')">Salvar no bloco</button>
    </div>
  </header>
</template>
