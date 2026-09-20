<script setup lang="ts">
import CpvIcon from '../icon/CpvIcon.vue'
import ReadingSwitch from '../ReadingSwitch.vue'

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
    class="cpv-chrome"
    :class="{ 'is-hidden': hidden }"
    style="position:absolute;bottom:0;left:0;right:0;z-index:13;padding:0 10px calc(12px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:stretch;gap:8px;"
  >
    <slot />
    <div v-if="hintFit" class="cpv-hit cpv-veil-2" style="display:flex;align-items:center;gap:8px;padding:9px 8px 9px 13px;border-radius:14px;animation:cpv-rise .25s ease-out;">
      <span style="flex:1;font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Ajuste encaixa a cifra no espaço da tela — e dá para voltar ao padrão quando quiser.</span>
      <button class="cpv-ghost" aria-label="Entendi" style="flex:none;width:32px;height:32px;color:var(--muted);" @click="emit('dismissHint')"><CpvIcon name="x" :size="14" /></button>
    </div>

    <div class="cpv-hit cpv-veil" style="display:flex;flex-direction:column;border-radius:20px;overflow:hidden;">
      <div style="padding:6px;border-bottom:1px solid var(--line-soft);">
        <ReadingSwitch variant="dock" :letra="letra" :height="dockCtrlH" @cifra="emit('cifra')" @letra="emit('letra')" />
      </div>
      <div v-if="setlistOn" style="display:flex;align-items:center;gap:6px;padding:6px;border-bottom:1px solid var(--line-soft);">
        <button
          data-song-prev
          aria-label="Música anterior"
          :disabled="noPrev"
          :style="{ opacity: noPrev ? '0.32' : '1' }"
          style="flex:none;width:44px;height:44px;border:1px solid var(--line);border-radius:13px;background:transparent;color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer;"
          @click="emit('prev')"
        ><CpvIcon name="chevronLeft" :size="16" /></button>
        <button
          data-setlist-open
          title="Abrir a lista do ensaio"
          style="flex:1;min-width:0;height:44px;padding:0 12px;border:0;border-radius:13px;background:var(--surface);color:var(--text);font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:9px;"
          @click="emit('openList')"
        >
          <span style="flex:none;font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:12.5px;font-weight:700;color:var(--chord);">{{ posLabel }}</span>
          <span style="flex:1;min-width:0;font-size:11.5px;font-weight:500;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;">{{ nextChipShort }}</span>
          <CpvIcon name="listMusic" :size="14" />
        </button>
        <button
          data-song-next
          aria-label="Próxima música"
          :disabled="noNext"
          :style="{ opacity: noNext ? '0.32' : '1' }"
          style="flex:none;width:44px;height:44px;border:1px solid var(--line);border-radius:13px;background:transparent;color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer;"
          @click="emit('next')"
        ><CpvIcon name="chevronRight" :size="16" /></button>
      </div>
      <div v-if="scrolling" style="display:flex;align-items:center;gap:6px;padding:7px 8px;border-bottom:1px solid var(--line-soft);">
        <button aria-label="Mais devagar" style="flex:none;width:40px;height:36px;border:1px solid var(--line);border-radius:11px;background:transparent;color:var(--text);font-size:16px;line-height:1;cursor:pointer;" @click="emit('slower')">−</button>
        <span style="flex:none;min-width:58px;text-align:center;font-family:'Space Mono',monospace;font-size:13.5px;font-weight:700;color:var(--text);">{{ mul.toFixed(2) }}×</span>
        <button aria-label="Mais rápido" style="flex:none;width:40px;height:36px;border:1px solid var(--line);border-radius:11px;background:transparent;color:var(--text);font-size:16px;line-height:1;cursor:pointer;" @click="emit('faster')">+</button>
        <span style="flex:1;" />
        <span style="flex:none;display:flex;align-items:baseline;gap:8px;padding-right:6px;font-family:'Space Mono',monospace;">
          <span data-eta style="font-size:12px;color:var(--text);">−{{ etaLabel }}</span>
          <span style="font-size:10px;letter-spacing:0.08em;color:var(--muted);font-weight:700;">{{ Math.round(progress * 100) }}%</span>
        </span>
      </div>
      <div :style="{ gap: width < 360 ? '3px' : '4px' }" style="display:flex;align-items:center;justify-content:space-between;padding:6px;">
        <button
          data-scroll
          :aria-label="dockPlayName"
          :title="scrollTitle"
          :disabled="scrollOff"
          :style="{ background: rollLive ? 'var(--pill)' : 'var(--chord)', color: 'var(--chord-ink)', minWidth: dockCtrlH, height: dockCtrlH, padding: dockPlayLabeled ? '0 20px' : '0', gap: dockPlayLabeled ? '9px' : '0', opacity: scrollOff ? '0.38' : '1', cursor: scrollOff ? 'default' : 'pointer' }"
          style="flex:none;overflow:hidden;border-radius:14px;border:0;font-family:inherit;font-size:13.5px;font-weight:700;display:flex;align-items:center;justify-content:center;white-space:nowrap;"
          @click="emit('toggleScroll')"
        >
          <CpvIcon :name="rollLive ? 'square' : 'chevronsDown'" :size="14" />{{ dockPlayLabel }}
        </button>
        <span :style="{ height: dockCtrlH }" style="flex:none;display:flex;align-items:center;gap:2px;padding:0 2px;border-radius:14px;background:var(--surface);">
          <button class="cpv-ghost" aria-label="Diminuir tipografia" :style="{ width: dockTypeW, height: bp === 'xs' ? '40px' : '44px' }" style="flex:none;font-size:13px;font-weight:600;" @click="emit('smallerType')">A−</button>
          <button class="cpv-ghost" aria-label="Aumentar tipografia" :style="{ width: dockTypeW, height: bp === 'xs' ? '40px' : '44px' }" style="flex:none;font-size:17px;font-weight:600;" @click="emit('biggerType')">A+</button>
        </span>
        <button
          v-if="canEdit"
          data-edit
          class="cpv-ghost"
          aria-label="Editar esta cifra"
          title="Editar esta cifra"
          :style="{ width: dockIconSize, height: dockCtrlH }"
          style="flex:none;display:flex;align-items:center;justify-content:center;border-radius:14px;"
          @click="emit('edit')"
        ><CpvIcon name="pencil" :size="16" /></button>
        <button
          data-fit
          class="cpv-ghost"
          aria-label="Ajuste ao espaço"
          title="Modo ajuste ao espaço"
          :aria-pressed="fitOn ? 'true' : 'false'"
          :style="{
            width: dockIconSize,
            height: dockCtrlH,
            background: fitOn ? 'var(--sel)' : undefined,
            border: fitOn ? '1px solid var(--sel-line)' : undefined,
          }"
          style="flex:none;display:flex;align-items:center;justify-content:center;border-radius:14px;"
          @click="emit('toggleFit')"
        ><CpvIcon name="scan" :size="16" /></button>
        <button
          class="cpv-ghost cpv-more-hit"
          aria-label="Mais controles"
          title="Mais controles"
          data-more
          :style="{ width: dockIconSize, height: dockCtrlH }"
          style="flex:none;border-radius:14px;"
          @click="emit('more')"
        >
          <CpvIcon name="ellipsis" :size="16" />
          <span
            v-if="(queueCount ?? 0) > 0"
            class="cpv-dock-queue-badge"
            data-more-queue-badge
          >{{ queueCount }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
