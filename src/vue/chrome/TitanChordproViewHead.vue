<script setup lang="ts">
import { ref } from 'vue'
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import TitanChordproChip from '../ui/TitanChordproChip.vue'
import TitanChordproIconButton from '../ui/TitanChordproIconButton.vue'
import TitanChordproSwitchRow from '../ui/TitanChordproSwitchRow.vue'
import type { ViewHeadModel } from './view-head'

defineProps<ViewHeadModel>()

const capoOpen = defineModel<boolean>('capoOpen', { default: false })
const chartOpen = ref(false)

const emit = defineEmits<{
  'open-setlist': []
  'open-tone': []
  'toggle-fs': []
  shift: [n: number]
  'reset-tone': []
  'capo-nudge': [n: number]
  'toggle-map': []
  'capo-zero': []
  'bind-capo': [el: unknown]
  'select-chart': [id: string]
}>()
</script>

<template>
  <div
    class="titan-chordpro-hit titan-chordpro-veil titan-chordpro-head"
    :class="[variant === 'phone' ? 'is-phone' : 'is-wide', hitClass]"
    data-titan-chordpro-head
    :style="variant === 'wide' ? { '--titan-chordpro-page-max': pageMax } : undefined"
  >
    <button
      v-if="setlistOn"
      data-setlist-open
      class="titan-chordpro-head-id"
      title="Abrir a lista do ensaio"
      @click="emit('open-setlist')"
    >
      <span class="titan-chordpro-head-pos titan-chordpro-head-chip">{{ posLabel }}</span>
      <span class="titan-chordpro-head-name">
        <span data-chart-title class="titan-chordpro-head-title">{{ title }}</span>
        <span v-if="charts.length > 1" class="titan-chordpro-version-chip">
          <button type="button" data-chart-switch class="titan-chordpro-head-chip" aria-label="Versão" @click="chartOpen = !chartOpen">
            <span class="titan-chordpro-chart-switch-label">{{ chartLabel }}</span>
          </button>
          <div v-if="chartOpen" class="titan-chordpro-chart-menu titan-chordpro-version-menu" role="dialog" aria-label="Versão">
            <button v-for="c in charts" :key="c.id" type="button" :data-chart-option="c.id" class="titan-chordpro-version-row" @click="chartOpen = false; emit('select-chart', c.id)">{{ c.label }}</button>
          </div>
        </span>
        <span class="titan-chordpro-head-sub">{{ variant === 'phone' ? phoneSub : nextChip }}</span>
      </span>
    </button>
    <span v-else-if="variant === 'phone'" class="titan-chordpro-head-id">
      <span class="titan-chordpro-head-name">
        <span data-chart-title class="titan-chordpro-head-title">{{ title }}</span>
        <span class="titan-chordpro-head-sub">{{ phoneSub }}</span>
      </span>
    </span>
    <div v-else class="titan-chordpro-head-id">
      <span class="titan-chordpro-head-name">
        <span data-chart-title class="titan-chordpro-head-title">{{ title }}</span>
        <span v-if="subtitle" class="titan-chordpro-head-sub">{{ subtitle }}</span>
      </span>
    </div>

    <TitanChordproChip
      v-if="metaTime"
      data-head-time
      class="titan-chordpro-head-chip"
      size="time"
      static
      :on="true"
      :title="`Compasso ${metaTime}`"
    >{{ metaTime }}</TitanChordproChip>

    <template v-if="variant === 'phone'">
      <button
        v-if="hasKey"
        data-tone
        class="titan-chordpro-head-chip"
        aria-label="Tom e capotraste"
        title="Tom e capotraste"
        :style="{ background: hasReset ? 'var(--chord-fill)' : 'var(--chord-soft)' }"
        style="flex:none;display:flex;align-items:center;gap:5px;height:28px;padding:0 8px;border:1px solid var(--chord-edge);border-radius:9px;color:var(--chord);cursor:pointer;font-family:inherit;"
        @click="emit('open-tone')"
      >
        <span style="font-size:7.5px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);font-weight:700;">Tom</span>
        <span style="font-family:'Space Mono',monospace;font-size:13px;font-weight:700;line-height:1;">{{ toneLabel }}</span>
        <TitanChordproIcon name="chevronDown" :size="10" />
      </button>
      <button
        v-if="canWinScreen"
        data-fs
        :aria-label="fsTitle"
        :title="fsTitle"
        :style="{ width: '28px', height: '28px', background: fs ? 'var(--sel)' : 'transparent', border: `1px solid ${fs ? 'var(--sel-line)' : 'transparent'}` }"
        style="flex:none;display:flex;align-items:center;justify-content:center;border-radius:9px;color:var(--text);cursor:pointer;"
        @click="emit('toggle-fs')"
      ><TitanChordproIcon name="maximize2" :size="14" /></button>
    </template>

    <template v-else>
      <div v-if="metaTempo || metaDuration" class="titan-chordpro-head-meta">
        <span v-if="metaTempo">{{ metaTempo }} BPM</span>
        <span v-if="metaDuration">{{ metaDuration }}</span>
      </div>
      <div v-if="hasKey" :ref="(el) => emit('bind-capo', el)" style="position:relative;flex:none;">
        <div class="titan-chordpro-keypill titan-chordpro-head-chip">
          <button data-transpose-down aria-label="Baixar meio tom" title="Baixar meio tom (−)" style="width:34px;height:26px;border:0;border-radius:7px;background:transparent;color:var(--chord);font-size:15px;line-height:1;cursor:pointer;" @click="emit('shift', -1)">−</button>
          <div style="display:flex;flex-direction:column;align-items:center;gap:1px;padding:0 5px;">
            <span style="display:flex;align-items:baseline;gap:5px;">
              <span style="font-size:7.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Tom</span>
              <span data-display-key style="font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:var(--chord);line-height:1;">{{ playingKey }}</span>
            </span>
            <span v-if="songKeyCaption" data-tone-shift style="font-size:9.5px;font-weight:600;color:var(--muted);line-height:1.2;">{{ songKeyCaption }}</span>
          </div>
          <button data-transpose-up aria-label="Subir meio tom" title="Subir meio tom (+)" style="width:34px;height:26px;border:0;border-radius:7px;background:transparent;color:var(--chord);font-size:15px;line-height:1;cursor:pointer;" @click="emit('shift', 1)">+</button>
          <span class="titan-chordpro-keypill-split" aria-hidden="true" />
          <button data-capo title="Capotraste (C)" :style="{ background: hasCapo ? 'var(--chord-fill)' : 'transparent' }" style="display:flex;align-items:center;gap:4px;height:26px;padding:0 8px;border:0;border-radius:7px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:600;color:var(--chord);line-height:1;" @click="capoOpen = !capoOpen">
            {{ capoBtnLabel }}<TitanChordproIcon name="chevronDown" :size="11" :style="{ transform: capoOpen ? 'rotate(180deg)' : 'rotate(0deg)', opacity: '0.75', transition: 'transform .18s ease' }" />
          </button>
          <button v-if="hasReset" title="Voltar ao tom original" style="height:26px;padding:0 8px;margin-left:2px;border:0;border-radius:7px;background:var(--chord-fill);color:var(--chord);font-size:11px;font-weight:600;cursor:pointer;" @click="emit('reset-tone')">Original</button>
        </div>
        <div v-if="capoOpen" class="titan-chordpro-veil-2" style="position:absolute;top:calc(100% + 8px);right:0;z-index:22;width:250px;padding:13px;border-radius:15px;display:flex;flex-direction:column;gap:11px;animation:titan-chordpro-rise .18s ease-out;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span class="titan-chordpro-modal-kicker">Capotraste</span>
            <TitanChordproIconButton icon="x" density="bar" muted aria-label="Fechar" @click="capoOpen = false" />
          </div>
          <div style="display:flex;align-items:center;gap:7px;">
            <button aria-label="Capo abaixo" style="width:34px;height:32px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--text);font-size:16px;line-height:1;cursor:pointer;" @click="emit('capo-nudge', -1)">−</button>
            <div style="flex:1;text-align:center;font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:var(--chord);">{{ capoLabel }}</div>
            <button aria-label="Capo acima" style="width:34px;height:32px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--text);font-size:16px;line-height:1;cursor:pointer;" @click="emit('capo-nudge', 1)">+</button>
          </div>
          <div v-if="capoShapes.length" data-capo-hint class="titan-chordpro-capo-hint">
            <span v-for="(s, i) in capoShapes" :key="`${s}-${i}`" class="titan-chordpro-capo-chip" data-capo-chip>{{ s }}</span>
          </div>
          <div v-else data-capo-hint class="titan-chordpro-capo-hint--text" style="font-size:11.5px;">{{ capoHint }}</div>
          <TitanChordproSwitchRow
            data-dual
            :on="mapOn"
            :disabled="!hasCapo"
            title="Modo dual"
            :hint="hasCapo ? (mapOn ? 'Duas cifras na mesma linha: quem está com capo e quem não está.' : 'Desligado, a cifra vira as formas do capo — quem toca sozinho.') : 'Liga com o capotraste: duas cifras, ou só as formas.'"
            @click="hasCapo && emit('toggle-map')"
          />
          <button
            :disabled="!hasCapo"
            :style="{ opacity: hasCapo ? '1' : '0.4', cursor: hasCapo ? 'pointer' : 'default' }"
            style="height:30px;border:0;border-radius:9px;background:var(--chord-fill);color:var(--chord);font-size:12px;font-weight:600;"
            @click="hasCapo && emit('capo-zero')"
          >Tirar o capo</button>
        </div>
      </div>
      <button
        v-if="canWinScreen"
        data-fs
        :aria-label="fsTitle"
        :title="`${fsTitle} (F)`"
        :style="{ width: '30px', height: '30px', background: fs ? 'var(--sel)' : 'transparent', border: `1px solid ${fs ? 'var(--sel-line)' : 'transparent'}` }"
        style="flex:none;display:flex;align-items:center;justify-content:center;border-radius:9px;color:var(--text);cursor:pointer;"
        @click="emit('toggle-fs')"
      ><TitanChordproIcon name="maximize2" :size="14" /></button>
    </template>
  </div>
</template>
