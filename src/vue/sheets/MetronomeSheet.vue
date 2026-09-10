<script setup lang="ts">
import { computed } from 'vue'

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
}>()
const emit = defineEmits<{
  close: []
  toggle: []
  bpm: [delta: number]
  resetBpm: []
  tap: []
  toggleSound: []
  togglePulseHead: []
  toggleFollow: []
  toggleCountIn: []
}>()

const beats = computed(() =>
  Array.from({ length: props.bar }, (_, i) => {
    const live = props.running && props.beat === i
    const accent = i === 0
    return {
      n: String(i + 1),
      size: accent ? '13px' : '9px',
      bg: live ? 'var(--chord)' : 'transparent',
      edge: live ? 'var(--chord)' : accent ? 'var(--chord-edge)' : 'var(--line)',
      scale: live ? (accent ? 'scale(1.5)' : 'scale(1.35)') : 'scale(1)',
      num: live ? 'var(--chord)' : 'var(--muted)',
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
    ? 'Sem efeito: a cifra inteira cabe na tela, não há rolagem para entrar.'
    : props.follow
      ? 'Um compasso de click antes da cifra começar a andar.'
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
  <div style="position:absolute;inset:0;z-index:26;pointer-events:none;">
    <div
      class="cpv-veil-2"
      role="dialog"
      aria-label="Metrônomo"
      :style="geom"
      style="pointer-events:auto;position:absolute;overflow-y:auto;display:flex;flex-direction:column;gap:13px;animation:cpv-rise .2s ease-out;"
    >
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Metrônomo</span>
        <button class="cpv-ghost" aria-label="Fechar" style="width:26px;height:26px;color:var(--muted);font-size:15px;" @click="emit('close')">×</button>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <button class="cpv-met-step" aria-label="−5 BPM" style="font-family:'Space Mono',monospace;font-size:11px;font-weight:700;color:var(--muted);" @click="emit('bpm', -5)">−5</button>
        <button class="cpv-met-step" aria-label="−1 BPM" style="font-size:16px;line-height:1;" @click="emit('bpm', -1)">−</button>
        <span style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;">
          <span data-bpm style="font-family:'Space Mono',monospace;font-size:30px;font-weight:700;color:var(--text);line-height:1;font-variant-numeric:tabular-nums;">{{ bpm }}</span>
          <span style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">BPM</span>
        </span>
        <button class="cpv-met-step" aria-label="+1 BPM" style="font-size:16px;line-height:1;" @click="emit('bpm', 1)">+</button>
        <button class="cpv-met-step" aria-label="+5 BPM" style="font-family:'Space Mono',monospace;font-size:11px;font-weight:700;color:var(--muted);" @click="emit('bpm', 5)">+5</button>
      </div>

      <button
        data-met-tap
        class="cpv-met-tap"
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
          <span
            :class="running ? 'cpv-icon-stop' : 'cpv-icon-play'"
            :style="{ width: running ? '13px' : '12px', height: '13px', marginLeft: running ? '0' : '2px' }"
            style="flex:none;"
            aria-hidden="true"
          />{{ runLabel }}
        </button>
        <span style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;min-width:74px;">
          <span style="font-family:'Space Mono',monospace;font-size:13px;font-weight:700;color:var(--text);">{{ time || `${bar}/4` }}</span>
          <span style="font-size:9.5px;color:var(--muted);">{{ time ? 'compasso da cifra' : `sem {time} — assumindo ${bar}/4` }}</span>
        </span>
      </div>

      <button class="cpv-met-switch" data-met-sound @click="emit('toggleSound')">
        <span :style="{ background: sound ? 'var(--chord)' : 'var(--line)' }" style="flex:none;width:30px;height:18px;border-radius:9px;position:relative;">
          <span :style="{ left: sound ? '14px' : '2px', background: sound ? 'var(--chord-ink)' : 'var(--muted)' }" style="position:absolute;top:2px;width:14px;height:14px;border-radius:50%;transition:left .16s ease;" />
        </span>
        <span style="display:flex;flex-direction:column;gap:3px;">
          <span style="font-size:13px;font-weight:600;">{{ sound ? 'Click ligado' : 'Só pulso visual' }}</span>
          <span style="font-size:11.5px;line-height:1.45;color:var(--muted);">Bip agudo no 1, mais grave nas outras batidas.</span>
        </span>
      </button>

      <button class="cpv-met-switch" @click="emit('toggleFollow')">
        <span :style="{ background: follow ? 'var(--chord)' : 'var(--line)' }" style="flex:none;width:30px;height:18px;border-radius:9px;position:relative;">
          <span :style="{ left: follow ? '14px' : '2px', background: follow ? 'var(--chord-ink)' : 'var(--muted)' }" style="position:absolute;top:2px;width:14px;height:14px;border-radius:50%;transition:left .16s ease;" />
        </span>
        <span style="display:flex;flex-direction:column;gap:3px;">
          <span style="font-size:13px;font-weight:600;">{{ follow ? 'Rolagem vinculada' : 'Rolagem independente' }}</span>
          <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">{{ follow ? 'Iniciar aqui começa a auto-rolagem; parar qualquer um dos dois para os dois.' : 'O click roda sozinho, sem mexer na rolagem.' }}</span>
        </span>
      </button>

      <button class="cpv-met-switch" data-met-head @click="emit('togglePulseHead')">
        <span :style="{ background: pulseHead ? 'var(--chord)' : 'var(--line)' }" style="flex:none;width:30px;height:18px;border-radius:9px;position:relative;">
          <span :style="{ left: pulseHead ? '14px' : '2px', background: pulseHead ? 'var(--chord-ink)' : 'var(--muted)' }" style="position:absolute;top:2px;width:14px;height:14px;border-radius:50%;transition:left .16s ease;" />
        </span>
        <span style="display:flex;flex-direction:column;gap:3px;">
          <span style="font-size:13px;font-weight:600;">{{ pulseHead ? 'Faixa do título' : 'Faixa quieta' }}</span>
          <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">No 1 a faixa vira tinta e o título inverte. Nos outros, a cor do tema. Rolar não liga isto.</span>
        </span>
      </button>

      <button class="cpv-met-switch" data-met-countin-switch @click="emit('toggleCountIn')">
        <span :style="{ background: countInOn ? 'var(--chord)' : 'var(--line)' }" style="flex:none;width:30px;height:18px;border-radius:9px;position:relative;">
          <span :style="{ left: countInOn ? '14px' : '2px', background: countInOn ? 'var(--chord-ink)' : 'var(--muted)' }" style="position:absolute;top:2px;width:14px;height:14px;border-radius:50%;transition:left .16s ease;" />
        </span>
        <span style="display:flex;flex-direction:column;gap:3px;">
          <span style="font-size:13px;font-weight:600;">{{ countInOn ? 'Contagem de entrada' : 'Sai direto' }}</span>
          <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">{{ countInNote }}</span>
        </span>
      </button>

      <div v-if="!overridden && chartBpm" style="display:flex;align-items:center;gap:7px;font-size:11px;color:var(--muted);">
        <span style="width:5px;height:5px;border-radius:50%;background:var(--chord);" /><span>Andamento vindo da cifra ({{ chartBpm }} BPM).</span>
      </div>
      <button
        v-if="overridden"
        style="display:flex;align-items:center;justify-content:center;height:30px;border:0;border-radius:9px;background:var(--surface);color:var(--muted);font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;"
        @click="emit('resetBpm')"
      >
        Voltar ao andamento da cifra ({{ chartBpm ? `${chartBpm} BPM` : '—' }})
      </button>
    </div>
  </div>
</template>
