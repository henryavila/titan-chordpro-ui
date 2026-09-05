<script setup lang="ts">
import type { OpCard } from '../use/useOverlay'

defineProps<{
  compact: boolean
  mineLabel: string
  ops: OpCard[]
  fixTuneLabel: string
  canSuggest: boolean
  revertAllLabel: string
  revertAllDanger: boolean
}>()
const emit = defineEmits<{
  close: []
  revert: [id: string]
  fixTune: []
  suggest: []
  revertAll: []
}>()
</script>

<template>
  <!-- Every adjustment on its own, revertable on its own: a personal version
       that cannot be undone piece by piece is a fork, not a personalisation. -->
  <div class="cpv-sheet" :class="{ 'is-compact': compact }" style="z-index:37;">
    <div class="cpv-scrim" style="backdrop-filter:blur(5px);" @click="emit('close')" />
    <div
      class="cpv-dialog cpv-veil-2"
      role="dialog"
      aria-modal="true"
      aria-label="Minha versão"
      data-my-panel
      style="max-width:470px;max-height:min(600px,86%);overflow-y:auto;padding:15px;gap:9px;"
    >
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">{{ mineLabel }}</span>
        <button class="cpv-ghost" aria-label="Fechar" style="width:26px;height:26px;border-radius:8px;color:var(--muted);font-size:15px;" @click="emit('close')">×</button>
      </div>

      <div
        v-for="op in ops"
        :key="op.id"
        data-my-op
        style="display:flex;align-items:flex-start;gap:10px;padding:10px 11px;border:1px solid var(--line-soft);border-radius:13px;background:var(--surface);"
      >
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;">
          <span style="font-size:12.5px;font-weight:600;color:var(--text);">{{ op.label }}</span>
          <span v-if="op.from" class="cpv-op-line" style="color:var(--muted);">{{ op.from }}</span>
          <span v-if="op.to" class="cpv-op-line" style="color:var(--chord);">{{ op.to }}</span>
          <span v-if="op.note" style="font-size:10.5px;color:var(--muted);">{{ op.note }}</span>
        </span>
        <button
          data-revert
          title="Voltar este trecho ao original"
          style="flex:none;height:30px;padding:0 10px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--text);font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;"
          @click="emit('revert', op.id)"
        >Reverter</button>
      </div>

      <button
        data-fix-tune
        style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:transparent;color:var(--text);font-family:inherit;font-size:12.5px;font-weight:600;text-align:left;cursor:pointer;"
        @click="emit('fixTune')"
      >{{ fixTuneLabel }}</button>

      <button
        v-if="canSuggest"
        data-suggest
        style="display:flex;align-items:center;justify-content:center;width:100%;min-height:44px;border:1px solid var(--chord-edge);border-radius:12px;background:var(--chord-soft);color:var(--chord);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;"
        @click="emit('suggest')"
      >Sugerir alteração ao responsável</button>

      <button
        data-revert-all
        class="cpv-surface-btn"
        :style="{ color: revertAllDanger ? 'var(--danger)' : 'var(--text)' }"
        style="display:flex;align-items:center;justify-content:center;width:100%;min-height:40px;border:0;border-radius:12px;font-size:12.5px;"
        @click="emit('revertAll')"
      >{{ revertAllLabel }}</button>
    </div>
  </div>
</template>
