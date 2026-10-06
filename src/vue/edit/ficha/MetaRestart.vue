<script setup lang="ts">
import { ref } from 'vue'
import TitanChordproActionButton from '../../ui/TitanChordproActionButton.vue'

const emit = defineEmits<{ restart: [] }>()

/** Two-step gate: first click reveals confirm; only confirm emits `restart`. */
const ask = ref(false)
</script>

<template>
  <div data-meta-restart-box class="titan-chordpro-meta-restart">
    <template v-if="!ask">
      <span class="titan-chordpro-modal-kicker">Nova cifra</span>
      <button
        type="button"
        data-meta-restart
        style="align-self:flex-start;min-height:36px;padding:0;border:0;background:transparent;color:var(--text);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;text-decoration:underline;text-underline-offset:3px;"
        @click="ask = true"
      >Começar de novo</button>
      <span style="font-size:11px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Importe outra música ou comece em branco.</span>
    </template>
    <div
      v-else
      data-meta-restart-confirm-panel
      style="display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:12px;background:var(--canvas);border:1px solid var(--danger);"
    >
      <span style="font-size:12.5px;font-weight:700;color:var(--text);">Substituir esta cifra?</span>
      <span style="font-size:12px;line-height:1.45;color:var(--muted);text-wrap:pretty;">
        Abre Nova cifra para importar do Cifra Club ou começar do zero. Ao concluir, esta cifra é substituída. Cancelar Nova cifra mantém o que está aqui.
      </span>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <TitanChordproActionButton data-meta-restart-confirm tone="danger" size="md" @click="ask = false; emit('restart')">Sim, abrir Nova cifra</TitanChordproActionButton>
        <TitanChordproActionButton data-meta-restart-cancel tone="ghost" @click="ask = false">Cancelar</TitanChordproActionButton>
      </div>
    </div>
  </div>
</template>
