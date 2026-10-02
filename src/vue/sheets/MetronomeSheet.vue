<script setup lang="ts">
import { computed } from 'vue'
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import TitanChordproDialogShell from '../ui/TitanChordproDialogShell.vue'
import TitanChordproSeg from '../ui/TitanChordproSeg.vue'
import {
  softClickFromPrefs,
  sourceFromPrefs,
  type SoundSource,
} from '../use/rehearsal-audio'

const props = defineProps<{
  compact: boolean
  running: boolean
  beat: number
  bpm: number
  bar: number
  /** `{tempo:}` of the chart, when it has one. */
  chartBpm: number | null
  /** True while the reader is overriding the chart tempo. */
  overridden: boolean
  sound: boolean
  /** Title strip paints the beat — off until this panel turns it on. */
  pulseHead: boolean
  follow: boolean
  /** One bar of click before the chart starts moving. */
  countInOn: boolean
  scrolling: boolean
  /** False when the chart fits the frame and has no scroll to offer. */
  scrollable: boolean
  /** Taps registered in the current tempo measurement. */
  tapCount: number
  time: string | undefined
  /** Chart has a `{x_titan_strum:}` pattern — guitar one-shots can follow the strip. */
  hasStrum?: boolean
  /** Opt-in acoustic strum sound synced to the batida grid. */
  strumSound?: boolean
}>()
const emit = defineEmits<{
  close: []
  toggle: []
  bpm: [delta: number]
  resetBpm: []
  tap: []
  /** Set rehearsal sound source (maps to metSound / metStrumSound). */
  setSource: [source: SoundSource, softClick: boolean]
  togglePulseHead: []
  toggleFollow: []
  toggleCountIn: []
}>()

const source = computed(() =>
  sourceFromPrefs(props.sound, !!props.strumSound, !!props.hasStrum),
)
const softClick = computed(() =>
  softClickFromPrefs(props.sound, !!props.strumSound, !!props.hasStrum),
)

function pickSource(next: SoundSource) {
  emit('setSource', next, next === 'batida' ? softClick.value : false)
}

function toggleSoftClick() {
  if (source.value !== 'batida') return
  emit('setSource', 'batida', !softClick.value)
}

const beats = computed(() =>
  Array.from({ length: props.bar }, (_, i) => {
    const live = props.running && props.beat === i
    const accent = i === 0
    // Beat 1 is ink; 2–3–4 wear the theme.
    const liveFill = accent ? 'var(--downbeat)' : 'var(--chord)'
    const liveInk = accent ? 'var(--downbeat)' : 'var(--chord)'
    return {
      n: String(i + 1),
      size: accent ? '13px' : '9px',
      bg: live ? liveFill : 'transparent',
      edge: live ? liveFill : accent ? 'var(--downbeat)' : 'var(--line)',
      scale: live ? (accent ? 'scale(1.5)' : 'scale(1.35)') : 'scale(1)',
      num: live ? liveInk : 'var(--muted)',
      weight: accent ? '700' : '500',
    }
  }),
)

// The panel's main action cannot be an empty outline: stopped it is solid and
// inviting; running it becomes the pill that stops it.
const runLabel = computed(() =>
  props.running
    ? 'Parar'
    : props.follow && props.scrollable && !props.scrolling
      ? 'Iniciar com a rolagem'
      : 'Iniciar',
)

/**
 * Ink for the run button. The design file pairs `--pill` with `--text` here,
 * which is white on white in the dark theme; `--pill-ink` is what that surface
 * takes everywhere else in the system, the scroll button included.
 */
const runInk = computed(() => (props.running ? 'var(--pill-ink)' : 'var(--chord-ink)'))

/**
 * Tapping says a tempo the way a musician holds it. It takes two taps to
 * describe an interval, so the button asks for the second one by name rather
 * than sitting there looking broken after the first.
 */
const tapLabel = computed(() =>
  props.tapCount === 0
    ? 'Bater o andamento'
    : props.tapCount === 1
      ? 'De novo, no tempo da música'
      : `${props.tapCount} toques`,
)

/** With the scroll independent there is nothing for the count-in to lead into. */
const countInNote = computed(() =>
  !props.scrollable
    ? 'Sem efeito: a cifra precisa de {duration:} e de papel para rolar.'
    : props.follow
      ? source.value === 'batida'
        ? 'Um compasso de entrada (click/visual) — a batida só entra com a cifra.'
        : 'Um compasso de click antes da cifra começar a andar.'
      : 'Sem efeito enquanto a rolagem estiver independente.',
)

const geom = computed(() =>
  props.compact
    ? {
        left: '0',
        right: '0',
        bottom: '0',
        width: 'auto',
        maxHeight: '76%',
        padding: '16px 14px calc(16px + env(safe-area-inset-bottom))',
        borderRadius: '20px 20px 0 0',
      }
    : {
        left: 'auto',
        right: '16px',
        bottom: '96px',
        width: 'min(300px,calc(100% - 32px))',
        maxHeight: '70%',
        padding: '14px',
        borderRadius: '17px',
      },
)
</script>

<template>
  <!-- No scrim: the click runs while the chart is being read. -->
  <TitanChordproDialogShell
    variant="anchor"
    :compact="compact"
    :z="26"
    label="Metrônomo"
    kicker="Metrônomo"
    :panel-style="geom"
    @close="emit('close')"
  >

      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <button class="titan-chordpro-met-step" aria-label="−5 BPM" style="font-family:'Space Mono',monospace;font-size:11px;font-weight:700;color:var(--muted);" @click="emit('bpm', -5)">−5</button>
        <button class="titan-chordpro-met-step" aria-label="−1 BPM" style="font-size:16px;line-height:1;" @click="emit('bpm', -1)">−</button>
        <span style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;">
          <span data-bpm style="font-family:'Space Mono',monospace;font-size:30px;font-weight:700;color:var(--text);line-height:1;font-variant-numeric:tabular-nums;">{{ bpm }}</span>
          <span style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">BPM</span>
        </span>
        <button class="titan-chordpro-met-step" aria-label="+1 BPM" style="font-size:16px;line-height:1;" @click="emit('bpm', 1)">+</button>
        <button class="titan-chordpro-met-step" aria-label="+5 BPM" style="font-family:'Space Mono',monospace;font-size:11px;font-weight:700;color:var(--muted);" @click="emit('bpm', 5)">+5</button>
      </div>

      <button
        data-met-tap
        class="titan-chordpro-met-tap"
        :style="{ height: compact ? '44px' : '38px', borderColor: tapCount > 1 ? 'var(--chord-edge)' : 'var(--line)', color: tapCount > 1 ? 'var(--chord)' : 'var(--text)' }"
        @click="emit('tap')"
      >
        <span :style="{ borderColor: 'currentColor', transform: tapCount ? 'scale(1.25)' : 'scale(1)' }" style="flex:none;width:11px;height:11px;border-radius:50%;border:1.5px solid;transition:transform .12s ease-out;" aria-hidden="true" />{{ tapLabel }}
      </button>

      <div style="display:flex;align-items:center;justify-content:center;gap:9px;min-height:26px;">
        <span v-for="b in beats" :key="b.n" style="display:flex;flex-direction:column;align-items:center;gap:4px;width:22px;">
          <span
            :style="{ width: b.size, height: b.size, borderColor: b.edge, background: b.bg, transform: b.scale }"
            style="border-radius:50%;border:1.5px solid;transition:transform .07s ease-out,background .07s linear,border-color .07s linear;"
          />
          <span :style="{ color: b.num, fontWeight: b.weight }" style="font-family:'Space Mono',monospace;font-size:9px;transition:color .07s linear;">{{ b.n }}</span>
        </span>
      </div>

      <div style="display:flex;align-items:center;gap:8px;">
        <button
          data-met-run
          :style="{
            height: compact ? '48px' : '40px',
            background: running ? 'var(--pill)' : 'var(--chord)',
            color: runInk,
            boxShadow: running ? 'none' : '0 1px 0 rgba(255,255,255,0.14) inset',
          }"
          style="flex:1;display:flex;align-items:center;justify-content:center;gap:9px;border-radius:12px;border:0;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;"
          @click="emit('toggle')"
        >
          <TitanChordproIcon :name="running ? 'square' : 'play'" :size="14" />{{ runLabel }}
        </button>
        <span style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;min-width:74px;">
          <span style="font-family:'Space Mono',monospace;font-size:13px;font-weight:700;color:var(--text);">{{ time || `${bar}/4` }}</span>
          <span style="font-size:9.5px;color:var(--muted);">{{ time ? 'compasso da cifra' : `sem {time} — assumindo ${bar}/4` }}</span>
        </span>
      </div>

      <div data-met-sound style="display:flex;flex-direction:column;gap:8px;">
        <span class="titan-chordpro-modal-kicker">Fonte do ensaio</span>
        <TitanChordproSeg
          label="Fonte do ensaio"
          :value="source"
          :options="hasStrum
            ? [
                { value: 'mute', label: 'Mudo', attrs: { 'data-met-source': 'mute' } },
                { value: 'click', label: 'Click', attrs: { 'data-met-source': 'click' } },
                { value: 'batida', label: 'Batida', attrs: { 'data-met-source': 'batida' } },
              ]
            : [
                { value: 'mute', label: 'Mudo', attrs: { 'data-met-source': 'mute' } },
                { value: 'click', label: 'Click', attrs: { 'data-met-source': 'click' } },
              ]"
          @pick="pickSource($event as 'mute' | 'click' | 'batida')"
        />
        <p style="margin:0;font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">
          <template v-if="source === 'mute'">Só pulso visual — sem bip nem guitarra.</template>
          <template v-else-if="source === 'click'">Bip agudo no 1, mais grave nas outras batidas.</template>
          <template v-else>One-shots da batida no grid. O botão Rolar fora deste painel fica sem som.</template>
        </p>
        <button
          v-if="hasStrum && source === 'batida'"
          class="titan-chordpro-met-switch"
          data-met-soft-click
          type="button"
          role="switch"
          :aria-checked="softClick ? 'true' : 'false'"
          @click="toggleSoftClick"
        >
          <span class="titan-chordpro-switch" :class="{ 'is-on': softClick }"><span class="titan-chordpro-switch-thumb" /></span>
          <span style="display:flex;flex-direction:column;gap:3px;">
            <span style="font-size:13px;font-weight:600;">Click suave de reforço</span>
            <span style="font-size:11.5px;line-height:1.45;color:var(--muted);">Mantém o bip por baixo da batida.</span>
          </span>
        </button>
      </div>

      <button class="titan-chordpro-met-switch" data-met-follow role="switch" :aria-checked="follow ? 'true' : 'false'" @click="emit('toggleFollow')">
        <span class="titan-chordpro-switch" :class="{ 'is-on': follow }"><span class="titan-chordpro-switch-thumb" /></span>
        <span style="display:flex;flex-direction:column;gap:3px;">
          <span style="font-size:13px;font-weight:600;">{{ follow ? 'Rolagem vinculada' : 'Rolagem independente' }}</span>
          <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">{{ follow ? 'Iniciar aqui começa a auto-rolagem; parar qualquer um dos dois para os dois.' : 'O click roda sozinho, sem mexer na rolagem.' }}</span>
        </span>
      </button>

      <button class="titan-chordpro-met-switch" data-met-head role="switch" :aria-checked="pulseHead ? 'true' : 'false'" @click="emit('togglePulseHead')">
        <span class="titan-chordpro-switch" :class="{ 'is-on': pulseHead }"><span class="titan-chordpro-switch-thumb" /></span>
        <span style="display:flex;flex-direction:column;gap:3px;">
          <span style="font-size:13px;font-weight:600;">{{ pulseHead ? 'Faixa do título' : 'Faixa quieta' }}</span>
          <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Acende no tempo e apaga no contratempo. No 1 inverte; nos outros, a cor do tema. Rolar não liga isto.</span>
        </span>
      </button>

      <button class="titan-chordpro-met-switch" data-met-countin-switch role="switch" :aria-checked="countInOn ? 'true' : 'false'" @click="emit('toggleCountIn')">
        <span class="titan-chordpro-switch" :class="{ 'is-on': countInOn }"><span class="titan-chordpro-switch-thumb" /></span>
        <span style="display:flex;flex-direction:column;gap:3px;">
          <span style="font-size:13px;font-weight:600;">{{ countInOn ? 'Contagem de entrada' : 'Sai direto' }}</span>
          <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">{{ countInNote }}</span>
        </span>
      </button>

      <button
        data-met-reset
        :disabled="!overridden"
        :style="{ opacity: overridden ? '1' : '0.45', cursor: overridden ? 'pointer' : 'default' }"
        style="display:flex;align-items:center;justify-content:center;height:30px;border:0;border-radius:9px;background:var(--surface);color:var(--muted);font-family:inherit;font-size:11.5px;font-weight:600;"
        @click="overridden && $emit('resetBpm')"
      >
        Voltar ao andamento da cifra ({{ chartBpm ? `${chartBpm} BPM` : '—' }})
      </button>
  </TitanChordproDialogShell>
</template>
