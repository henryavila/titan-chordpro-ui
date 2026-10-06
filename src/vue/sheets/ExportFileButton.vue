<script setup lang="ts">
withDefaults(
  defineProps<{
    id: string
    ext: string
    label: string
    hint?: string
    busy?: boolean
    disabled?: boolean
  }>(),
  { busy: false, disabled: false },
)
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    :data-export="id"
    class="titan-chordpro-surface-btn"
    type="button"
    :disabled="disabled"
    style="width:100%;display:flex;align-items:center;gap:12px;text-align:left;"
    @click="$emit('click')"
  >
    <span style="font-family:'Space Mono',monospace;font-size:10.5px;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:3px 6px;">{{ ext }}</span>
    <span>
      {{ label }}
      <small v-if="hint" style="display:block;color:var(--muted);font-weight:400">{{ hint }}</small>
    </span>
    <span style="flex:1;" />
    <span v-if="busy" style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;color:var(--muted);">
      <span class="titan-chordpro-spin" style="width:14px;height:14px;" />gerando…
    </span>
  </button>
</template>
