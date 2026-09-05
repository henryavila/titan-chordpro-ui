<script setup lang="ts">
import type { UpdCard } from '../use/useOverlay'

defineProps<{ compact: boolean; items: UpdCard[] }>()
const emit = defineEmits<{ toggle: [id: string]; keep: []; adopt: [] }>()
</script>

<template>
  <!-- No scrim click and no ×: until the reader decides, they keep reading the
       version they knew — the dialog is the decision, not an interruption. -->
  <div class="cpv-sheet" :class="{ 'is-compact': compact }" style="z-index:39;">
    <div class="cpv-scrim" />
    <div
      class="cpv-dialog cpv-veil-2"
      role="dialog"
      aria-modal="true"
      aria-label="Esta cifra foi atualizada"
      data-upd-dlg
      style="max-width:520px;max-height:min(640px,88%);overflow-y:auto;gap:10px;"
    >
      <span style="font-size:15px;font-weight:700;color:var(--text);">Esta cifra foi atualizada</span>
      <span style="font-size:12px;line-height:1.5;color:var(--muted);text-wrap:pretty;">Escolha o que manter dos seus ajustes. Enquanto não decidir, você continua lendo a versão que conhecia.</span>

      <button
        v-for="it in items"
        :key="it.id"
        data-upd-item
        :aria-pressed="it.on"
        style="display:flex;align-items:flex-start;gap:10px;width:100%;padding:11px;border:1px solid var(--line-soft);border-radius:13px;background:var(--surface);color:var(--text);font-family:inherit;text-align:left;cursor:pointer;"
        @click="emit('toggle', it.id)"
      >
        <span
          :style="{
            borderColor: it.on ? 'var(--chord)' : 'var(--line)',
            background: it.on ? 'var(--chord)' : 'transparent',
            color: it.on ? 'var(--chord-ink)' : 'transparent',
          }"
          style="flex:none;width:18px;height:18px;margin-top:1px;border-radius:5px;border:1.5px solid;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;"
        >{{ it.on ? '✓' : '' }}</span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;">
          <span style="font-size:12.5px;font-weight:600;">{{ it.label }}</span>
          <span v-if="it.why" style="font-size:10.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">{{ it.why }}</span>
          <span v-if="it.conflict" style="display:flex;flex-wrap:wrap;gap:6px;">
            <span style="flex:1 1 150px;min-width:0;display:flex;flex-direction:column;gap:3px;padding:7px 8px;border-radius:10px;border:1px solid var(--chord-edge);background:var(--chord-soft);">
              <span style="font-size:9px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;color:var(--chord);">minha versão</span>
              <span class="cpv-op-line" style="color:var(--text);white-space:normal;">{{ it.mine }}</span>
            </span>
            <span style="flex:1 1 150px;min-width:0;display:flex;flex-direction:column;gap:3px;padding:7px 8px;border-radius:10px;border:1px solid var(--line);background:transparent;">
              <span style="font-size:9px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;color:var(--muted);">versão nova</span>
              <span class="cpv-op-line" style="color:var(--text);white-space:normal;">{{ it.theirs }}</span>
            </span>
          </span>
        </span>
      </button>

      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;padding-top:2px;">
        <button
          data-upd-adopt
          style="height:38px;padding:0 13px;border:1px solid var(--line);border-radius:11px;background:transparent;color:var(--text);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;"
          @click="emit('adopt')"
        >Adotar a versão nova</button>
        <button
          data-upd-keep
          style="height:38px;padding:0 15px;border:0;border-radius:11px;background:var(--pill);color:var(--pill-ink);font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;"
          @click="emit('keep')"
        >Manter os marcados</button>
      </div>
    </div>
  </div>
</template>
