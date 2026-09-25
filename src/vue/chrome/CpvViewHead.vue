<script setup lang="ts">
import { ref } from 'vue'
import CpvIcon from '../icon/CpvIcon.vue'
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
  rewrite: []
  'capo-nudge': [n: number]
  'toggle-map': []
  'capo-zero': []
  'bind-capo': [el: unknown]
  'select-chart': [id: string]
}>()

function pickChart(id: string) {
  chartOpen.value = false
  emit('select-chart', id)
}
</script>

<template>
  <div
    class="cpv-hit cpv-veil cpv-head"
    :class="[variant === 'phone' ? 'is-phone' : 'is-wide', hitClass]"
    data-cpv-head
    :style="variant === 'wide' ? { '--cpv-page-max': pageMax } : undefined"
  >
    <button
      v-if="setlistOn"
      data-setlist-open
      class="cpv-head-id"
      title="Abrir a lista do ensaio"
      @click="emit('open-setlist')"
    >
      <span class="cpv-head-pos cpv-head-chip">{{ posLabel }}</span>
      <span class="cpv-head-name">
        <span data-chart-title class="cpv-head-title">{{ title }}</span>
        <span class="cpv-head-sub">{{ variant === 'phone' ? phoneSub : nextChip }}</span>
      </span>
    </button>
    <span v-else-if="variant === 'phone'" class="cpv-head-id">
      <span class="cpv-head-name">
        <span data-chart-title class="cpv-head-title">{{ title }}</span>
        <span class="cpv-head-sub">{{ phoneSub }}</span>
      </span>
    </span>
    <div v-else class="cpv-head-id">
      <span class="cpv-head-name">
        <span data-chart-title class="cpv-head-title">{{ title }}</span>
        <span v-if="subtitle" class="cpv-head-sub">{{ subtitle }}</span>
      </span>
    </div>

    <div v-if="charts.length > 1" style="position:relative;flex:none;">
      <button
        type="button"
        data-chart-switch
        class="cpv-head-chip"
        aria-label="Cifra"
        title="Cifra"
        :aria-expanded="chartOpen"
        aria-haspopup="listbox"
        style="flex:none;display:flex;align-items:center;gap:5px;height:28px;padding:0 8px;border:1px solid var(--chord-edge);border-radius:9px;color:var(--chord);cursor:pointer;font-family:inherit;"
        @click="chartOpen = !chartOpen"
      >
        <span style="font-size:7.5px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);font-weight:700;">Cifra</span>
        <span style="font-family:'Space Mono',monospace;font-size:13px;font-weight:700;line-height:1;">{{ chartLabel }}</span>
        <CpvIcon name="chevronDown" :size="10" />
      </button>
      <div
        v-if="chartOpen"
        class="cpv-veil-2"
        role="listbox"
        aria-label="Cifra"
        style="position:absolute;top:calc(100% + 8px);left:0;z-index:22;min-width:max(100%, 140px);padding:6px;border-radius:12px;display:flex;flex-direction:column;gap:2px;animation:cpv-rise .18s ease-out;"
      >
        <button
          v-for="c in charts"
          :key="c.id"
          type="button"
          role="option"
          :data-chart-option="c.id"
          :aria-selected="c.id === chartId"
          :style="{
            background: c.id === chartId ? 'var(--chord-fill)' : 'transparent',
            color: 'var(--chord)',
          }"
          style="display:block;width:100%;text-align:left;height:30px;padding:0 10px;border:0;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;"
          @click="pickChart(c.id)"
        >{{ c.label }}</button>
      </div>
    </div>

    <template v-if="variant === 'phone'">
      <button
        v-if="hasKey"
        data-tone
        class="cpv-head-chip"
        aria-label="Tom e capotraste"
        title="Tom e capotraste"
        :style="{ background: hasReset ? 'var(--chord-fill)' : 'var(--chord-soft)' }"
        style="flex:none;display:flex;align-items:center;gap:5px;height:28px;padding:0 8px;border:1px solid var(--chord-edge);border-radius:9px;color:var(--chord);cursor:pointer;font-family:inherit;"
        @click="emit('open-tone')"
      >
        <span style="font-size:7.5px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);font-weight:700;">Tom</span>
        <span style="font-family:'Space Mono',monospace;font-size:13px;font-weight:700;line-height:1;">{{ toneLabel }}</span>
        <CpvIcon name="chevronDown" :size="10" />
      </button>
      <button
        v-if="canWinScreen"
        data-fs
        :aria-label="fsTitle"
        :title="fsTitle"
        :style="{ width: '28px', height: '28px', background: fs ? 'var(--sel)' : 'transparent', border: `1px solid ${fs ? 'var(--sel-line)' : 'transparent'}` }"
        style="flex:none;display:flex;align-items:center;justify-content:center;border-radius:9px;color:var(--text);cursor:pointer;"
        @click="emit('toggle-fs')"
      ><CpvIcon name="maximize2" :size="14" /></button>
    </template>

    <template v-else>
      <div v-if="metaTempo || metaTime || metaDuration" class="cpv-head-meta">
        <span v-if="metaTempo">{{ metaTempo }} BPM</span>
        <span v-if="metaTime">{{ metaTime }}</span>
        <span v-if="metaDuration">{{ metaDuration }}</span>
      </div>
      <div v-if="hasKey" :ref="(el) => emit('bind-capo', el)" style="position:relative;flex:none;">
        <div class="cpv-keypill cpv-head-chip">
          <button data-transpose-down aria-label="Baixar meio tom" title="Baixar meio tom (−)" style="width:34px;height:26px;border:0;border-radius:7px;background:transparent;color:var(--chord);font-size:15px;line-height:1;cursor:pointer;" @click="emit('shift', -1)">−</button>
          <div style="display:flex;flex-direction:column;align-items:center;gap:1px;padding:0 5px;">
            <span style="display:flex;align-items:baseline;gap:5px;">
              <span style="font-size:7.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Tom</span>
              <span data-display-key style="font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:var(--chord);line-height:1;">{{ playingKey }}</span>
            </span>
            <span v-if="songKeyCaption" data-tone-shift style="font-size:9.5px;font-weight:600;color:var(--muted);line-height:1.2;">{{ songKeyCaption }}</span>
          </div>
          <button data-transpose-up aria-label="Subir meio tom" title="Subir meio tom (+)" style="width:34px;height:26px;border:0;border-radius:7px;background:transparent;color:var(--chord);font-size:15px;line-height:1;cursor:pointer;" @click="emit('shift', 1)">+</button>
          <span class="cpv-keypill-split" aria-hidden="true" />
          <button data-capo title="Capotraste (C)" :style="{ background: hasCapo ? 'var(--chord-fill)' : 'transparent' }" style="display:flex;align-items:center;gap:4px;height:26px;padding:0 8px;border:0;border-radius:7px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:600;color:var(--chord);line-height:1;" @click="capoOpen = !capoOpen">
            {{ capoBtnLabel }}<CpvIcon name="chevronDown" :size="11" :style="{ transform: capoOpen ? 'rotate(180deg)' : 'rotate(0deg)', opacity: '0.75', transition: 'transform .18s ease' }" />
          </button>
          <button v-if="hasReset" title="Voltar ao tom original, sem capo" style="height:26px;padding:0 8px;margin-left:2px;border:0;border-radius:7px;background:var(--chord-fill);color:var(--chord);font-size:11px;font-weight:600;cursor:pointer;" @click="emit('reset-tone')">Original</button>
          <button
            v-if="canRewrite"
            data-rewrite-go
            title="Reescrever os acordes no tom declarado"
            style="height:26px;padding:0 8px;margin-left:2px;border:0;border-radius:7px;background:var(--chord-fill);color:var(--chord);font-size:11px;font-weight:600;cursor:pointer;"
            @click="emit('rewrite')"
          >Reescrever em {{ metaKey }}</button>
        </div>
        <div v-if="capoOpen" class="cpv-veil-2" style="position:absolute;top:calc(100% + 8px);right:0;z-index:22;width:250px;padding:13px;border-radius:15px;display:flex;flex-direction:column;gap:11px;animation:cpv-rise .18s ease-out;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Capotraste</span>
            <button class="cpv-ghost" aria-label="Fechar" style="width:24px;height:24px;color:var(--muted);" @click="capoOpen = false"><CpvIcon name="x" :size="14" /></button>
          </div>
          <div style="display:flex;align-items:center;gap:7px;">
            <button aria-label="Capo abaixo" style="width:34px;height:32px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--text);font-size:16px;line-height:1;cursor:pointer;" @click="emit('capo-nudge', -1)">−</button>
            <div style="flex:1;text-align:center;font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:var(--chord);">{{ capoLabel }}</div>
            <button aria-label="Capo acima" style="width:34px;height:32px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--text);font-size:16px;line-height:1;cursor:pointer;" @click="emit('capo-nudge', 1)">+</button>
          </div>
          <div v-if="capoShapes.length" data-capo-hint class="cpv-capo-hint">
            <span v-for="(s, i) in capoShapes" :key="`${s}-${i}`" class="cpv-capo-chip" data-capo-chip>{{ s }}</span>
          </div>
          <div v-else data-capo-hint class="cpv-capo-hint--text" style="font-size:11.5px;">{{ capoHint }}</div>
          <button
            data-dual
            role="switch"
            :aria-checked="mapOn"
            :disabled="!hasCapo"
            :style="{
              border: `1px solid ${hasCapo && twin ? 'var(--chord-edge)' : 'var(--line)'}`,
              background: hasCapo && twin ? 'var(--chord-soft)' : 'transparent',
              opacity: hasCapo ? '1' : '0.45',
              cursor: hasCapo ? 'pointer' : 'default',
            }"
            style="display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border-radius:12px;color:var(--text);font-family:inherit;text-align:left;"
            @click="hasCapo && emit('toggle-map')"
          >
            <span :style="{ background: hasCapo && twin ? 'var(--chord)' : 'var(--line)' }" style="flex:none;width:30px;height:18px;border-radius:9px;position:relative;">
              <span :style="{ left: hasCapo && twin ? '14px' : '2px', background: hasCapo && twin ? 'var(--chord-ink)' : 'var(--muted)' }" style="position:absolute;top:2px;width:14px;height:14px;border-radius:50%;transition:left .16s ease;" />
            </span>
            <span style="display:flex;flex-direction:column;gap:2px;min-width:0;">
              <span style="font-size:12.5px;font-weight:600;">Modo dual</span>
              <span style="font-size:11px;line-height:1.4;color:var(--muted);text-wrap:pretty;min-height:30px;">{{ hasCapo ? (mapOn ? 'Duas cifras na mesma linha: quem está com capo e quem não está.' : 'Desligado, a cifra vira as formas do capo — quem toca sozinho.') : 'Liga com o capotraste: duas cifras, ou só as formas.' }}</span>
            </span>
          </button>
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
      ><CpvIcon name="maximize2" :size="14" /></button>
    </template>
  </div>
</template>
