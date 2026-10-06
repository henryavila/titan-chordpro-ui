<script setup lang="ts">
const props = defineProps<{
  narrow: boolean
  host: (el: Element | null) => void
  empty: boolean
  emptyHint: string
  vexReady: boolean
  imported: number | null
  showSrc: boolean
  source: string
}>()

function onHost(el: unknown) {
  props.host(el instanceof Element ? el : null)
}
</script>

<template>
  <section class="titan-chordpro-edp-stage" :style="{ minHeight: narrow ? '210px' : '0' }">
    <div class="titan-chordpro-edp-paper">
      <div :ref="onHost" style="min-height:140px;" />
      <p v-if="empty" class="titan-chordpro-edp-empty">{{ emptyHint }}</p>
      <p v-else-if="!vexReady" class="titan-chordpro-edp-empty">
        O desenho da pauta precisa da biblioteca VexFlow — a partitura continua sendo salva na cifra.
      </p>
    </div>

    <div v-if="imported" class="titan-chordpro-edp-imported">
      <span>TAB em texto importada: {{ imported }} notas lidas como semínimas. O texto não trazia ritmo — ajuste a figura de cada nota antes de salvar.</span>
    </div>

    <div v-if="showSrc" class="titan-chordpro-edp-src">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <span class="titan-chordpro-edp-kicker">Como fica salvo na cifra</span>
        <span style="flex:1;height:1px;background:var(--line-soft);" />
        <span class="titan-chordpro-edp-meta">extensão ChordPro</span>
      </div>
      <pre>{{ source }}</pre>
    </div>
  </section>
</template>
