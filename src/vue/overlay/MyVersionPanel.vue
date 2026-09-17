<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { Suggestion } from '@henryavila/titan-chordpro-ui'
import type { OpCard } from '../use/useOverlay'
import CpvIcon from '../icon/CpvIcon.vue'

const props = defineProps<{
  compact: boolean
  mineLabel: string
  ops: OpCard[]
  fixTuneLabel: string
  canSuggest: boolean
  suggestLabel: string
  actorName: string
  nameError?: boolean
  sentSuggestions?: Suggestion[]
  revertAllLabel: string
  revertAllDanger: boolean
}>()
const emit = defineEmits<{
  close: []
  revert: [id: string]
  fixTune: []
  suggest: []
  revertAll: []
  'update:actorName': [value: string]
}>()

const nameInput = ref<HTMLInputElement | null>(null)
watch(
  () => props.nameError,
  (on) => {
    if (on) void nextTick(() => nameInput.value?.focus())
  },
)

function statusLabel(s: Suggestion): string {
  const st = s.status ?? 'pending'
  if (st === 'accepted') return 'aceita'
  if (st === 'refused') return 'recusada'
  if (st === 'partial') return 'parcial'
  return 'pendente'
}
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
        <button class="cpv-ghost" aria-label="Fechar" style="width:26px;height:26px;border-radius:8px;color:var(--muted);" @click="emit('close')"><CpvIcon name="x" :size="14" /></button>
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

      <label
        v-if="canSuggest"
        data-suggest-who
        :style="{
          borderColor: nameError ? 'var(--danger)' : 'var(--line-soft)',
          background: nameError ? 'var(--danger-soft)' : 'var(--surface)',
        }"
        style="display:flex;flex-direction:column;gap:6px;width:100%;padding:10px 11px;border:1px solid var(--line-soft);border-radius:12px;"
      >
        <span
          :style="{ color: nameError ? 'var(--danger)' : 'var(--muted)' }"
          style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;"
        >Seu nome</span>
        <input
          ref="nameInput"
          data-suggest-name
          :value="actorName"
          type="text"
          autocomplete="name"
          placeholder="Como o responsável deve te ver"
          :aria-invalid="nameError ? 'true' : 'false'"
          :aria-describedby="nameError ? 'cpv-suggest-name-err' : undefined"
          :style="{ borderColor: nameError ? 'var(--danger)' : 'var(--line)' }"
          style="width:100%;height:36px;padding:0 10px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--text);font-family:inherit;font-size:13px;"
          @input="emit('update:actorName', ($event.target as HTMLInputElement).value)"
        />
        <span
          v-if="nameError"
          id="cpv-suggest-name-err"
          data-suggest-name-error
          role="alert"
          style="font-size:12px;font-weight:600;color:var(--danger);line-height:1.35;"
        >O nome é obrigatório para enviar</span>
      </label>
      <button
        v-if="canSuggest"
        data-suggest
        style="display:flex;align-items:center;justify-content:center;width:100%;min-height:44px;border:1px solid var(--chord-edge);border-radius:12px;background:var(--chord-soft);color:var(--chord);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;"
        @click="emit('suggest')"
      >{{ suggestLabel }}</button>

      <div
        v-if="sentSuggestions?.length"
        data-my-sugs
        style="display:flex;flex-direction:column;gap:6px;padding-top:4px;"
      >
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Sugestões enviadas</span>
        <div
          v-for="s in sentSuggestions"
          :key="s.id"
          data-my-sug
          style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border:1px solid var(--line-soft);border-radius:12px;background:var(--surface);"
        >
          <span style="font-size:12px;font-weight:600;color:var(--text);">{{ new Date(s.at).toLocaleDateString('pt-BR') }} · {{ s.ops.length + (s.resolvedOps?.length ?? 0) }} ajuste(s)</span>
          <span data-my-sug-status style="font-size:11px;font-weight:700;color:var(--chord);text-transform:uppercase;">{{ statusLabel(s) }}</span>
        </div>
      </div>

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
