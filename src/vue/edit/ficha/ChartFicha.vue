<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  missingOf,
  normalizeDurationMmSs,
  readMeta,
  rewriteToKey,
  writeMeta,
  type ChartMeta,
  type KeyRewriteOffer,
  type MetaKey,
} from '@henryavila/titan-chordpro-ui'
import TitanChordproActionButton from '../../ui/TitanChordproActionButton.vue'
import TitanChordproChartIdentityFields from '../../ui/TitanChordproChartIdentityFields.vue'
import { BLANK_BODY } from './blank-chart'
import FichaGapNotes from './FichaGapNotes.vue'
import type { FichaFrom } from './types'

const props = defineProps<{
  source: string
  meta: ChartMeta
  keyEdit: boolean
  keyRewrite: KeyRewriteOffer | null
  from: FichaFrom
  note: string
  titleSize: string
  columns: string
}>()

const emit = defineEmits<{
  close: []
  back: []
  commit: [source: string]
}>()

const source = ref(props.source)
const meta = ref<ChartMeta>({ ...props.meta })
const keyEdit = ref(props.keyEdit)
const keyRewrite = ref<KeyRewriteOffer | null>(props.keyRewrite)

const durationMissing = computed(() => missingOf(meta.value).includes('duration'))
const goLabel = computed(() =>
  props.from === 'save' ? 'Salvar para todos' : props.from === 'blank' ? 'Abrir editor vazio' : 'Abrir no editor',
)

function setMeta(k: MetaKey, v: string) {
  meta.value = { ...meta.value, [k]: v }
}

function leave() {
  if (props.from === 'blank' || props.from === 'save') emit('close')
  else emit('back')
}

function acceptKeyRewrite() {
  const offer = keyRewrite.value
  if (!offer) return
  const r = rewriteToKey(source.value, offer.declaredKey)
  if (!r?.changed) return
  const user = meta.value
  source.value = r.source
  meta.value = {
    ...readMeta(r.source),
    title: user.title,
    subtitle: user.subtitle,
    tempo: user.tempo,
    time: user.time,
    duration: user.duration,
    x_titan_source: user.x_titan_source,
  }
  keyRewrite.value = null
}

function keepKeyRewrite() {
  keyRewrite.value = null
}

function go() {
  if (durationMissing.value || keyRewrite.value) return
  const next = { ...meta.value, duration: normalizeDurationMmSs(meta.value.duration ?? '') }
  meta.value = next
  const body = source.value.trim() ? source.value : BLANK_BODY
  emit('commit', writeMeta(body, next))
}
</script>

<template>
  <div v-if="note" style="display:flex;align-items:flex-start;gap:9px;padding:11px 13px;border-radius:14px;background:color-mix(in srgb, var(--chord) 12%, var(--canvas));border:1px solid var(--chord-edge);">
    <span style="flex:none;width:7px;height:7px;margin-top:5px;border-radius:50%;background:var(--chord);" />
    <span style="font-size:12px;line-height:1.5;color:var(--text);text-wrap:pretty;">{{ note }}</span>
  </div>

  <div
    v-if="keyRewrite"
    data-nova-key-rewrite
    style="display:flex;flex-direction:column;gap:10px;padding:12px 14px;border-radius:14px;background:var(--chord-soft);border:1px solid var(--chord-edge);"
  >
    <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">Tom declarado e cifras não batem</span>
    <span style="font-size:13px;line-height:1.5;color:var(--text);text-wrap:pretty;">
      Declarado: <strong>{{ keyRewrite.declaredKey }}</strong>.
      Escrito: <strong>{{ keyRewrite.writtenKey }}</strong>.
      Reescrever guarda o original ({{ keyRewrite.declaredKey }}) e continua tocando em {{ keyRewrite.writtenKey }}.
      Quem quiser {{ keyRewrite.declaredKey }} de verdade usa “Voltar ao tom original”.
    </span>
    <span
      v-if="keyRewrite.capo"
      data-nova-key-rewrite-capo
      style="font-size:12px;line-height:1.45;color:var(--muted);"
    >Cifra sugere capo {{ keyRewrite.capo }}. O capo é o seu, no aparelho — começa em 0.</span>
    <div style="display:flex;flex-direction:column;gap:7px;">
      <TitanChordproActionButton
        data-nova-key-rewrite-go
        tone="chord"
        size="md"
        block
        @click="acceptKeyRewrite"
      >Reescrever em {{ keyRewrite.declaredKey }}</TitanChordproActionButton>
      <TitanChordproActionButton
        data-nova-key-rewrite-keep
        tone="ghost"
        size="sm"
        bordered
        block
        @click="keepKeyRewrite"
      >Manter</TitanChordproActionButton>
    </div>
  </div>

  <TitanChordproChartIdentityFields
    :meta="meta"
    missing-edge="chord"
    chip-hook="plain"
    v-model:key-edit="keyEdit"
    :title-size="titleSize"
    :columns="columns"
    :strict="from === 'save'"
    show-source
    duration-hint="Tempo da música, como no YouTube. A rolagem precisa disso."
    @patch="setMeta"
  >
    <template #duration-extra>
      <a
        v-if="meta.x_titan_youtube"
        :href="'https://www.youtube.com/watch?v=' + meta.x_titan_youtube"
        target="_blank"
        rel="noopener noreferrer"
        data-nova-youtube
        style="font-size:11.5px;font-weight:600;color:var(--chord);text-decoration:none;"
      >Abrir no YouTube</a>
    </template>
  </TitanChordproChartIdentityFields>

  <div style="display:flex;flex-direction:column;gap:4px;">
    <FichaGapNotes :meta="meta" soft-tail="Dá para seguir e preencher depois — vai ser pedido de novo ao salvar." />
    <span v-if="keyRewrite" style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">Confirme o tom e o capo acima antes de abrir no editor.</span>
  </div>

  <div style="position:sticky;bottom:0;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0 0;margin-top:4px;background:var(--canvas);border-top:1px solid var(--line-soft);">
    <TitanChordproActionButton tone="ghost" @click="leave">{{ from === 'blank' || from === 'save' ? 'Cancelar' : 'Voltar' }}</TitanChordproActionButton>
    <TitanChordproActionButton data-nova-go :disabled="durationMissing || !!keyRewrite" @click="go">{{ goLabel }}</TitanChordproActionButton>
  </div>
</template>
