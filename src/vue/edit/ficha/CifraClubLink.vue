<script setup lang="ts">
import { computed, ref } from 'vue'
import { hostOk, OFFLINE_LABEL, titleFromUrl } from '@henryavila/titan-chordpro-ui'
import TitanChordproActionButton from '../../ui/TitanChordproActionButton.vue'
import { gateCifraUrl, readCifraPaste, type CifraVoice } from './cifra-url'

/**
 * The Cifra Club address both fichas ask for.
 * enrich completes an open chart; bring imports a new one.
 * The chrome differs; the gate, the paste, and the offline mark do not.
 */
const props = defineProps<{
  voice: CifraVoice
  url: string
  busy: boolean
  online: boolean
  canFetch: boolean
  /** enrich: the line under the field when the gate refused. */
  blockingError?: string
}>()

const emit = defineEmits<{
  'update:url': [url: string]
  blocked: [message: string, hint: string]
  go: [url: string]
}>()

const inputEl = ref<HTMLInputElement | null>(null)
const showOffline = computed(() => props.canFetch && !props.online)
const guess = computed(() => {
  if (props.voice !== 'bring') return null
  const u = props.url.trim()
  if (!hostOk(u)) return null
  const g = titleFromUrl(u)
  return g.title ? g : null
})

function onInput(e: Event) {
  emit('update:url', (e.target as HTMLInputElement).value)
}

function onPaste(e: ClipboardEvent) {
  const next = readCifraPaste(e, { voice: props.voice, online: props.online, canFetch: props.canFetch })
  if (!next) return
  emit('update:url', next.url)
  emit('blocked', next.message, next.hint)
  if (next.fetch) emit('go', next.url)
}

function onSubmit() {
  const gate = gateCifraUrl(props.url, { voice: props.voice, online: props.online, canFetch: props.canFetch })
  if (!gate.ok) {
    emit('blocked', gate.message, gate.hint)
    return
  }
  emit('blocked', '', '')
  emit('go', gate.url)
}

defineExpose({
  focus() {
    inputEl.value?.focus()
  },
})
</script>

<template>
  <template v-if="voice === 'enrich'">
    <div style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Cifra Club</span>
      <span style="font-size:13px;font-weight:700;letter-spacing:-0.02em;">Completar com Cifra Club</span>
      <span v-if="canFetch && online" style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Traz batida, YouTube e o que faltar — sem substituir a cifra.</span>
      <span v-else-if="showOffline" data-offline-hint style="font-size:12px;font-weight:700;color:var(--muted);">{{ OFFLINE_LABEL }}</span>
    </div>

    <template v-if="!canFetch">
      <span data-meta-enrich-unavailable style="font-size:12px;line-height:1.45;color:var(--muted);">A busca não está disponível neste app.</span>
    </template>
    <template v-else>
      <div style="display:flex;gap:8px;align-items:stretch;">
        <input
          ref="inputEl"
          :value="url"
          type="url"
          data-meta-enrich-url
          placeholder="cifraclub.com.br/artista/musica"
          spellcheck="false"
          :disabled="busy"
          class="titan-chordpro-meta-url"
          @input="onInput"
          @paste="onPaste"
          @keydown.enter.prevent="onSubmit"
        >
        <TitanChordproActionButton
          data-meta-enrich-fetch
          size="md"
          style="flex:none"
          :disabled="busy"
          @click="onSubmit"
        >{{ busy ? 'Buscando…' : 'Buscar' }}</TitanChordproActionButton>
      </div>
    </template>

    <span v-if="blockingError" data-meta-enrich-error style="font-size:12px;line-height:1.45;color:var(--danger);">{{ blockingError }}</span>
  </template>

  <div
    v-else
    style="display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:16px;background:color-mix(in srgb, var(--chord) 12%, var(--canvas));border:1px solid var(--chord-edge);"
  >
    <input
      ref="inputEl"
      :value="url"
      type="url"
      placeholder="cifraclub.com.br/artista/musica"
      aria-label="Endereço no Cifra Club"
      spellcheck="false"
      data-nova-url
      :disabled="busy"
      style="width:100%;height:48px;padding:0 14px;border:1px solid var(--line);border-radius:13px;background:var(--canvas);color:var(--text);font-family:inherit;font-size:14.5px;"
      @input="onInput"
      @keydown.enter.prevent="onSubmit"
      @paste="onPaste"
    >
    <span v-if="guess" style="font-size:12.5px;line-height:1.4;font-weight:600;">
      {{ guess.title }}<span v-if="guess.subtitle" style="font-weight:500;color:var(--muted);"> · {{ guess.subtitle }}</span>
    </span>
    <span v-else style="font-size:11.5px;line-height:1.45;color:var(--muted);">Só Cifra Club — cole o endereço da página da cifra.</span>
    <span
      v-if="showOffline"
      data-offline-hint
      style="font-size:12px;font-weight:700;color:var(--muted);"
    >{{ OFFLINE_LABEL }}</span>
    <div
      v-if="!canFetch"
      role="status"
      style="display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--line-soft);"
    >
      <span style="font-size:12.5px;font-weight:700;">Buscar no Cifra Club não está disponível</span>
      <span style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">A página precisa ser buscada pelo servidor do site. Use Arquivo ou Texto.</span>
    </div>
    <TitanChordproActionButton block data-nova-url-go :disabled="busy || !canFetch" @click="onSubmit">
      <span v-if="busy" class="titan-chordpro-spin" style="width:14px;height:14px;" />{{ busy ? 'Buscando…' : 'Buscar cifra' }}
    </TitanChordproActionButton>
  </div>
</template>
