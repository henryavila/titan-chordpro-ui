<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { writeScoreReference, type ScoreAttachment, type ScoreReference } from '@henryavila/titan-chordpro-ui'
import ExternalScore from '../chart/ExternalScore.vue'

const props = defineProps<{
  previous: ScoreReference | null
  proposed: ScoreReference | null
  attachment?: ScoreAttachment
  resolveScore?: (src: string) => string
}>()

const previewUrl = ref('')
function release() { if (previewUrl.value) URL.revokeObjectURL(previewUrl.value); previewUrl.value = '' }
watch(() => props.attachment, (asset) => {
  release()
  if (!asset?.base64) return
  try {
    const binary = atob(asset.base64)
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    previewUrl.value = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: asset.contentType || 'application/octet-stream' }))
  } catch { previewUrl.value = '' }
}, { immediate: true })
onUnmounted(release)

function describe(ref: ScoreReference): string {
  const file = ref.src.split(/[/?#]/).filter(Boolean).at(-1) || ref.src
  return `${ref.name || 'Solo'} · ${file} · faixa ${ref.track} · ${ref.end === ref.start ? `compasso ${ref.start}` : `compassos ${ref.start}–${ref.end ?? 'fim'}`}`
}
function resolve(src: string): string {
  return src === props.attachment?.src && previewUrl.value ? previewUrl.value : props.resolveScore?.(src) ?? src
}
const changed = computed(() => props.previous && props.proposed && writeScoreReference(props.previous) !== writeScoreReference(props.proposed))
</script>

<template>
  <div class="titan-chordpro-score-review" data-q-score-review>
    <section v-if="previous" data-q-score-before>
      <strong>Antes</strong><p>{{ describe(previous) }}</p>
      <ExternalScore :text="writeScoreReference(previous)" :resolve-score="resolve" block-gap="0" preview />
    </section>
    <section v-if="proposed" data-q-score-after>
      <strong>{{ previous ? 'Depois' : 'Trecho sugerido' }}</strong><p>{{ describe(proposed) }}</p>
      <ExternalScore v-if="changed || !previous" :text="writeScoreReference(proposed)" :resolve-score="resolve" block-gap="0" preview />
    </section>
    <span v-if="attachment" data-q-score-file>Arquivo anexado: {{ attachment.filename }}</span>
  </div>
</template>

<style scoped>
.titan-chordpro-score-review { display:grid; gap:10px; min-width:0; width:100%; }
.titan-chordpro-score-review section { min-width:0; padding:10px; border:1px solid var(--line-soft); border-radius:10px; }
.titan-chordpro-score-review strong { color:var(--text); font-size:12px; }
.titan-chordpro-score-review p, .titan-chordpro-score-review span { color:var(--muted); font-size:11px; overflow-wrap:anywhere; }
</style>
