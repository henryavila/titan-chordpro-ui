<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import type { ImageChoice } from '../use/useBlockEdit'
import CpvIcon from '../icon/CpvIcon.vue'

const props = defineProps<{
  items: ImageChoice[]
  resolveImage: (src: string) => string
  replacing: boolean
  /** Host stores the file and returns the `{image:}` reference. */
  uploadImage?: (file: File) => Promise<{ ref: string }>
}>()

const emit = defineEmits<{ pick: [file: string]; close: [] }>()

const inputEl = ref<HTMLInputElement | null>(null)
const chosen = ref<File | null>(null)
const preview = ref<string | null>(null)
const busy = ref(false)
const error = ref('')

const ACCEPT = /^image\/(png|jpeg|webp|gif)$/i

function clearPreview() {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = null
}

function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!ACCEPT.test(file.type)) {
    error.value = 'Use uma imagem JPG, PNG, WebP ou GIF.'
    chosen.value = null
    clearPreview()
    return
  }
  error.value = ''
  chosen.value = file
  clearPreview()
  preview.value = URL.createObjectURL(file)
}

async function send() {
  const file = chosen.value
  const upload = props.uploadImage
  if (!file || !upload || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const { ref: name } = await upload(file)
    const refName = name.trim()
    if (!refName) throw new Error('empty')
    emit('pick', refName)
  } catch {
    error.value = 'Não foi possível guardar a imagem. Tente de novo.'
    busy.value = false
  }
}

onUnmounted(clearPreview)
</script>

<template>
  <div class="cpv-modal" data-image-picker style="align-items:center;padding:20px;">
    <div class="cpv-scrim" @click="emit('close')" />
    <div
      class="cpv-veil-2 cpv-modal-card"
      role="dialog"
      aria-modal="true"
      aria-label="Imagem da partitura"
      style="max-width:430px;max-height:min(560px,86%);overflow-y:auto;padding:15px;border-radius:18px;"
    >
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span class="cpv-modal-kicker">{{ replacing ? 'Trocar imagem' : 'Imagem da partitura' }}</span>
        <button class="cpv-ghost" aria-label="Fechar" style="width:26px;height:26px;color:var(--muted);" @click="emit('close')"><CpvIcon name="x" :size="14" /></button>
      </div>
      <span style="font-size:11.5px;line-height:1.5;color:var(--muted);text-wrap:pretty;">
        A cifra guarda só o nome. O arquivo fica no app.
      </span>

      <div v-if="uploadImage" class="cpv-image-drop">
        <input
          ref="inputEl"
          class="cpv-image-file"
          data-image-file
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          @change="onFile"
        >
        <button class="cpv-modal-btn" type="button" data-image-browse :disabled="busy" @click="inputEl?.click()">
          Escolher imagem
        </button>
        <img v-if="preview" class="cpv-image-preview" :src="preview" alt="">
        <span v-if="chosen" style="font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ chosen.name }}</span>
        <button
          class="cpv-modal-btn cpv-modal-btn--primary"
          type="button"
          data-image-send
          :disabled="!chosen || busy"
          @click="send"
        >{{ busy ? 'Enviando…' : replacing ? 'Usar esta' : 'Inserir aqui' }}</button>
      </div>

      <p v-if="error" data-image-error style="margin:0;font-size:12.5px;line-height:1.45;color:var(--danger);">{{ error }}</p>

      <template v-if="items.length">
        <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);">Já neste app</span>
        <button
          v-for="p in items"
          :key="p.file"
          class="cpv-picker-item"
          type="button"
          :disabled="busy"
          @click="emit('pick', p.file)"
        >
          <img :src="resolveImage(p.file)" alt="">
          <span style="display:flex;flex-direction:column;gap:3px;min-width:0;">
            <span style="font-size:13px;font-weight:600;">{{ p.label || p.file }}</span>
            <span style="font-family:'Space Mono',monospace;font-size:10.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ p.file }}</span>
          </span>
        </button>
      </template>
      <div v-else-if="!uploadImage" style="font-size:12px;line-height:1.5;color:var(--muted);padding:6px 0;">
        Este app ainda não recebe imagem.
      </div>
    </div>
  </div>
</template>
