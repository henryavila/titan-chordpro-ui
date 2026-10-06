<script setup lang="ts">
defineProps<{
  label: string
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

<template>
  <div
    class="titan-chordpro-sheet"
    style="z-index:32;"
    data-batida-preset-replace-dialog
  >
    <div class="titan-chordpro-scrim" data-batida-preset-replace-scrim @click="emit('cancel')" />
    <div
      class="titan-chordpro-dialog titan-chordpro-veil-2"
      role="dialog"
      aria-modal="true"
      aria-label="Substituir batida"
      style="max-width:380px;gap:12px;"
    >
      <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Substituir batida</span>
      <p style="margin:0;font-size:13px;line-height:1.45;color:var(--text);">
        A batida atual tem alterações. Substituir pelo preset
        <strong style="color:var(--chord);">{{ label }}</strong>?
      </p>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:2px;">
        <button
          type="button"
          class="titan-chordpro-ghost"
          data-batida-preset-replace-cancel
          style="height:38px;padding:0 14px;border-radius:11px;color:var(--muted);font-size:13px;font-weight:600;"
          @click="emit('cancel')"
        >Manter atual</button>
        <button
          type="button"
          data-batida-preset-replace-ok
          style="height:38px;padding:0 16px;border-radius:11px;border:0;background:var(--chord);color:var(--chord-ink);font:inherit;font-size:13px;font-weight:700;cursor:pointer;"
          @click="emit('confirm')"
        >Substituir</button>
      </div>
    </div>
  </div>
</template>
