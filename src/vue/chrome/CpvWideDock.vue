<script setup lang="ts">
import CpvIcon from '../icon/CpvIcon.vue'
import ReadingSwitch from '../ReadingSwitch.vue'
import type { CpvIconName } from '../icon/paths'

defineProps<{
  hidden: boolean
  showMine: boolean
  mineLabel: string
  showOriginal: boolean
  hintFit: boolean
  scrolling: boolean
  mul: number
  etaLabel: string
  progress: number
  setlistOn: boolean
  noPrev: boolean
  noNext: boolean
  posLabel: string
  scrollTitle: string
  scrollOff: boolean
  rollLive: boolean
  fitOn: boolean
  letra: boolean
  hasKey: boolean
  nashvilleOn: boolean
  hideComments: boolean
  metRunning: boolean
  metBpm: number
  hasStrum: boolean
  strumOn: boolean
  /** Ensaio Batida chrome profile active. */
  ensaioBatida: boolean
  themeTitle: string
  themeIcon: CpvIconName
  themeLabel: string
  canEdit: boolean
  dirty: boolean
}>()

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
    class="cpv-chrome"
    :class="{ 'is-hidden': hidden }"
    style="position:absolute;bottom:0;left:0;right:0;z-index:13;display:flex;flex-direction:column;align-items:center;gap:10px;padding:0 16px 18px;"
  >
    <slot />
    <div v-if="showMine" class="cpv-hit cpv-veil-2 cpv-mine-switch" data-mine-switch>
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
        class="cpv-ghost"
        data-open-my
        aria-label="Ver e reverter meus ajustes"
        title="Ver e reverter meus ajustes"
        style="width:30px;height:30px;border-radius:10px;color:var(--muted);font-size:15px;line-height:1;"
        @click="emit('openMy')"
      ><CpvIcon name="ellipsis" :size="16" /></button>
    </div>

    <div v-if="hintFit" class="cpv-hit cpv-veil-2" style="display:flex;align-items:center;gap:8px;max-width:360px;padding:7px 8px 7px 13px;border-radius:13px;animation:cpv-rise .25s ease-out;">
      <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Ajuste encaixa a cifra no espaço da tela — e dá para voltar ao padrão quando quiser.</span>
      <button class="cpv-ghost" aria-label="Entendi" style="flex:none;width:26px;height:26px;color:var(--muted);" @click="emit('dismissHint')"><CpvIcon name="x" :size="14" /></button>
    </div>

    <div v-if="scrolling" class="cpv-hit cpv-veil-2" style="display:flex;align-items:center;gap:10px;padding:7px 8px 7px 14px;border-radius:14px;animation:cpv-rise .2s ease-out;">
      <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Velocidade</span>
      <button aria-label="Mais devagar" title="Mais devagar (←)" style="width:32px;height:30px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--text);font-size:15px;line-height:1;cursor:pointer;" @click="emit('slower')">−</button>
      <span style="min-width:56px;text-align:center;font-family:'Space Mono',monospace;font-size:13px;font-weight:700;color:var(--text);">{{ mul.toFixed(2) }}×</span>
      <button aria-label="Mais rápido" title="Mais rápido (→)" style="width:32px;height:30px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--text);font-size:15px;line-height:1;cursor:pointer;" @click="emit('faster')">+</button>
      <span style="width:1px;height:22px;background:var(--line);" />
      <span style="display:flex;flex-direction:column;align-items:flex-end;gap:1px;min-width:52px;padding-right:6px;">
        <span data-eta style="font-family:'Space Mono',monospace;font-size:11px;color:var(--text);">−{{ etaLabel }}</span>
        <span style="font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);font-weight:700;">{{ Math.round(progress * 100) }}%</span>
      </span>
    </div>

    <div class="cpv-hit cpv-veil" style="display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px;padding:6px;border-radius:17px;">
      <template v-if="setlistOn">
        <button
          data-song-prev
          aria-label="Música anterior"
          title="Música anterior"
          :disabled="noPrev"
          :style="{ opacity: noPrev ? '0.32' : '1' }"
          style="width:38px;height:38px;border:0;border-radius:12px;background:transparent;color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer;"
          @click="emit('prev')"
        ><CpvIcon name="chevronLeft" :size="16" /></button>
        <button
          data-setlist-open
          title="Abrir a lista do ensaio"
          style="height:38px;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:transparent;color:var(--text);font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:8px;"
          @click="emit('openList')"
        >
          <span style="flex:none;font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:12px;font-weight:700;color:var(--chord);">{{ posLabel }}</span>
          <span style="flex:none;font-size:12px;font-weight:600;color:var(--muted);">Lista</span>
          <CpvIcon name="listMusic" :size="14" />
        </button>
        <button
          data-song-next
          aria-label="Próxima música"
          title="Próxima música"
          :disabled="noNext"
          :style="{ opacity: noNext ? '0.32' : '1' }"
          style="width:38px;height:38px;border:0;border-radius:12px;background:transparent;color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer;"
          @click="emit('next')"
        ><CpvIcon name="chevronRight" :size="16" /></button>
        <span style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />
      </template>
      <button
        data-scroll
        :title="scrollTitle"
        :disabled="scrollOff"
        :style="{ background: rollLive ? 'var(--pill)' : 'transparent', color: rollLive ? 'var(--pill-ink)' : 'var(--text)', border: `1px solid ${rollLive ? 'var(--pill)' : 'var(--line)'}`, opacity: scrollOff ? '0.32' : '1', cursor: scrollOff ? 'default' : 'pointer' }"
        class="cpv-bar-btn"
        style="height:36px;padding:0 14px 0 12px;border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:9px;"
        @click="emit('toggleScroll')"
      >
        <CpvIcon :name="rollLive ? 'square' : 'chevronsDown'" :size="14" />{{ rollLive ? 'Parar' : 'Rolar' }}
      </button>
      <span style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />
      <button class="cpv-ghost" aria-label="Diminuir tipografia" title="Diminuir tipografia" style="width:36px;height:36px;font-size:12px;font-weight:600;" @click="emit('smallerType')">A−</button>
      <button class="cpv-ghost" aria-label="Aumentar tipografia" title="Aumentar tipografia" style="width:36px;height:36px;font-size:16px;font-weight:600;" @click="emit('biggerType')">A+</button>
      <button
        data-fit
        title="Modo ajuste ao espaço"
        :style="{ background: fitOn ? 'var(--sel)' : 'transparent', border: `1px solid ${fitOn ? 'var(--sel-line)' : 'transparent'}`, color: 'var(--text)' }"
        class="cpv-bar-btn"
        style="height:36px;padding:0 12px;border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;"
        @click="emit('toggleFit')"
      >
        <CpvIcon name="scan" :size="16" />Ajuste
      </button>
      <span style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />
      <ReadingSwitch variant="bar" :letra="letra" @cifra="emit('cifra')" @letra="emit('letra')" />
      <button
        data-lens="nashville"
        title="Nashville — graus no lugar dos nomes"
        class="cpv-bar-btn"
        :disabled="!hasKey"
        :aria-pressed="nashvilleOn ? 'true' : 'false'"
        :style="{
          background: nashvilleOn ? 'var(--chord-fill)' : 'transparent',
          color: nashvilleOn ? 'var(--chord)' : 'var(--text)',
          border: `1px solid ${nashvilleOn ? 'var(--chord-edge)' : 'var(--line)'}`,
          opacity: hasKey ? '1' : '0.4',
          cursor: hasKey ? 'pointer' : 'default',
        }"
        style="height:36px;padding:0 12px;border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:8px;"
        @click="emit('toggleNashville')"
      >
        <CpvIcon name="glasses" :size="16" />Graus
      </button>
      <button
        data-comments-toggle
        :title="hideComments ? 'Mostrar comentários de ensaio' : 'Ocultar comentários de ensaio'"
        class="cpv-bar-btn"
        :aria-pressed="hideComments ? 'true' : 'false'"
        :style="{
          background: hideComments ? 'var(--sel)' : 'transparent',
          color: 'var(--text)',
          border: `1px solid ${hideComments ? 'var(--sel-line)' : 'var(--line)'}`,
        }"
        style="height:36px;padding:0 12px;border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;"
        @click="emit('toggleComments')"
      >
        <CpvIcon name="eyeOff" :size="16" />Comentários
      </button>
      <button
        data-met-btn
        title="Metrônomo (M)"
        class="cpv-bar-btn"
        :style="{ background: metRunning ? 'var(--chord-fill)' : 'transparent', color: metRunning ? 'var(--chord)' : 'var(--text)', border: `1px solid ${metRunning ? 'var(--chord-edge)' : 'var(--line)'}` }"
        style="height:36px;padding:0 12px;border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;font-variant-numeric:tabular-nums;"
        @click="emit('toggleMet')"
      >
        <CpvIcon name="metronome" :size="16" />{{ metRunning ? `${metBpm} BPM` : 'Metrônomo' }}
      </button>
      <button
        v-if="hasStrum"
        data-strum-btn
        title="Batida"
        class="cpv-bar-btn"
        :style="{ background: strumOn ? 'var(--chord-fill)' : 'transparent', color: strumOn ? 'var(--chord)' : 'var(--text)', border: `1px solid ${strumOn ? 'var(--chord-edge)' : 'var(--line)'}` }"
        style="height:36px;padding:0 12px;border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;"
        @click="emit('toggleStrum')"
      >↓↑ Batida</button>
      <button
        v-if="hasStrum"
        data-ensaio-batida
        title="Ensaio batida"
        class="cpv-bar-btn"
        :aria-pressed="ensaioBatida ? 'true' : 'false'"
        :style="{ background: ensaioBatida ? 'var(--chord-fill)' : 'transparent', color: ensaioBatida ? 'var(--chord)' : 'var(--text)', border: `1px solid ${ensaioBatida ? 'var(--chord-edge)' : 'var(--line)'}` }"
        style="height:36px;padding:0 12px;border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;"
        @click="emit('toggleEnsaioBatida')"
      ><CpvIcon name="guitar" :size="16" />{{ ensaioBatida ? 'Sair do ensaio' : 'Ensaio batida' }}</button>
      <span style="width:1px;height:22px;background:var(--line-soft);margin:0 3px;" />
      <button data-theme-btn class="cpv-ghost" :title="themeTitle" style="height:36px;padding:0 12px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:8px;" @click="emit('theme')">
        <CpvIcon :name="themeIcon" :size="16" />{{ themeLabel }}
      </button>
      <button
        v-if="canEdit"
        data-edit
        class="cpv-ghost"
        aria-label="Editar esta cifra"
        :title="dirty ? 'Editar esta cifra · rascunho' : 'Editar esta cifra'"
        style="height:36px;padding:0 12px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:8px;"
        @click="emit('edit')"
      >
        <CpvIcon name="pencil" :size="16" />{{ dirty ? 'Editar · rascunho' : 'Editar' }}
      </button>
      <button class="cpv-ghost" aria-label="Exportar" title="Exportar CHO, PDF ou slides" style="width:36px;height:36px;" @click="emit('export')"><CpvIcon name="download" :size="16" /></button>
    </div>
  </div>
</template>
