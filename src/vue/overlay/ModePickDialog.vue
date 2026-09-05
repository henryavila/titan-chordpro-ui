<script setup lang="ts">
const emit = defineEmits<{ close: []; local: []; content: [] }>()
</script>

<template>
  <!-- Two saves that look alike and are not: the phone, or everyone's chart. -->
  <div class="cpv-sheet" style="z-index:38;">
    <div class="cpv-scrim" @click="emit('close')" />
    <div class="cpv-dialog cpv-veil-2" role="dialog" aria-modal="true" aria-label="Como editar" style="max-width:430px;gap:9px;">
      <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Como editar</span>

      <button
        data-mode-local
        style="display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:100%;padding:13px 14px;border:1px solid var(--chord-edge);border-radius:14px;background:var(--chord-soft);color:var(--text);font-family:inherit;text-align:left;cursor:pointer;"
        @click="emit('local')"
      >
        <span style="font-size:14.5px;font-weight:700;">Só para mim</span>
        <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Fica salvo neste celular. Dá para voltar ao original quando quiser.</span>
      </button>

      <button
        data-mode-content
        style="display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:100%;padding:13px 14px;border:1px solid var(--danger);border-radius:14px;background:var(--danger-soft);color:var(--text);font-family:inherit;text-align:left;cursor:pointer;"
        @click="emit('content')"
      >
        <span style="font-size:14.5px;font-weight:700;color:var(--danger);">Para todos</span>
        <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Altera a cifra do sistema — todos os músicos passam a ler assim. Salvar já vale.</span>
      </button>

      <button
        class="cpv-ghost"
        style="align-self:flex-end;height:34px;padding:0 12px;border-radius:10px;color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:600;"
        @click="emit('close')"
      >Cancelar</button>
    </div>
  </div>
</template>
