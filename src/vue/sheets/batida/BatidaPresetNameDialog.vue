<script setup lang="ts">
import { ref } from 'vue'

const name = defineModel<string>({ required: true })

defineProps<{
  error: string
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()

const input = ref<HTMLInputElement | null>(null)

function focus() {
  input.value?.focus()
}

function select() {
  input.value?.select()
}

defineExpose({ focus, select })
</script>

<template>
  <div
    class="titan-chordpro-sheet"
    style="z-index:32;"
    data-batida-preset-name-dialog
  >
    <div class="titan-chordpro-scrim" data-batida-preset-name-scrim @click="emit('cancel')" />
    <div
      class="titan-chordpro-dialog titan-chordpro-veil-2"
      role="dialog"
      aria-modal="true"
      aria-label="Salvar como preset"
      style="max-width:380px;gap:12px;"
    >
      <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Salvar como preset</span>
      <p style="margin:0;font-size:13px;line-height:1.45;color:var(--muted);">
        O nome fica no catálogo do sistema. A batida atual é enviada para o host gravar.
      </p>
      <label style="display:flex;flex-direction:column;gap:6px;">
        <span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);font-weight:700;">Nome</span>
        <input
          ref="input"
          v-model="name"
          data-batida-preset-name
          type="text"
          maxlength="80"
          autocomplete="off"
          style="height:42px;border-radius:12px;border:1px solid var(--line);background:var(--canvas,var(--surface));color:var(--text);padding:0 12px;font:inherit;font-size:14px;font-weight:600;"
          @keydown.enter.prevent="emit('confirm')"
          @keydown.escape.prevent="emit('cancel')"
        />
      </label>
      <span
        v-if="error"
        data-batida-preset-name-err
        style="font-size:12px;color:var(--danger);"
      >{{ error }}</span>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:2px;">
        <button
          type="button"
          class="titan-chordpro-ghost"
          data-batida-preset-name-cancel
          style="height:38px;padding:0 14px;border-radius:11px;color:var(--muted);font-size:13px;font-weight:600;"
          @click="emit('cancel')"
        >Cancelar</button>
        <button
          type="button"
          data-batida-preset-name-ok
          style="height:38px;padding:0 16px;border-radius:11px;border:0;background:var(--chord);color:var(--chord-ink);font:inherit;font-size:13px;font-weight:700;cursor:pointer;"
          @click="emit('confirm')"
        >Salvar preset</button>
      </div>
    </div>
  </div>
</template>
