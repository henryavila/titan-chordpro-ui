<script setup lang="ts">
import CpvIcon from '../icon/CpvIcon.vue'

defineProps<{
  nextTitle: string
  bottom: string
}>()

const emit = defineEmits<{ next: []; dismiss: [] }>()
</script>

<template>
  <div
    :style="{ bottom }"
    style="position:absolute;left:0;right:0;z-index:15;display:flex;justify-content:center;padding:0 12px;pointer-events:none;"
  >
    <div
      class="cpv-veil-2"
      data-end-offer
      style="pointer-events:auto;display:flex;align-items:center;gap:12px;max-width:420px;padding:9px 10px 9px 15px;border-radius:16px;border:1px solid var(--chord-edge);box-shadow:var(--shadow);animation:cpv-rise .2s ease-out;"
    >
      <span style="min-width:0;display:flex;flex-direction:column;gap:2px;">
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Fim da música</span>
        <span style="font-size:13px;font-weight:600;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ nextTitle }}</span>
      </span>
      <button
        data-end-next
        style="flex:none;height:40px;padding:0 15px;border:0;border-radius:12px;background:var(--chord);color:var(--chord-ink);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;"
        @click="emit('next')"
      >Próxima</button>
      <button
        class="cpv-ghost"
        aria-label="Ficar nesta música"
        title="Ficar nesta música"
        style="flex:none;width:34px;height:34px;color:var(--muted);font-size:16px;"
        @click="emit('dismiss')"
      ><CpvIcon name="x" :size="16" /></button>
    </div>
  </div>
</template>
