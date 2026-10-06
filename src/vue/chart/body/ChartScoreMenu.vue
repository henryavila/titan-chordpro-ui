<script setup lang="ts">
import ScoreOptionsMenu from '../ScoreOptionsMenu.vue'
import type { ScoreHost } from './score-host'

defineProps<{
  label: string
  host?: ScoreHost
  text: string
  resolveScore?: (src: string) => string
  canEdit?: boolean
  canDelete?: boolean
}>()

const emit = defineEmits<{
  editScore: []
  remove: []
  readSong: []
}>()
</script>

<template>
  <ScoreOptionsMenu
    :label="label"
    :view="host?.view ?? 'tab'"
    :tab-available="host?.tabAvailable ?? false"
    :rhythm="host?.rhythm ?? 'default'"
    :note-names="!!host?.noteNamesOn"
    :zoom="host?.zoom ?? 0"
    :zoom-label="host?.zoomLabel ?? '110%'"
    :downloading="!!host?.downloading"
    :text="text"
    :resolve-score="resolveScore"
    :get-bytes="() => host?.fileBytes ?? null"
    :file-type="host?.fileType"
    :can-edit="!!canEdit"
    :can-delete="!!canDelete"
    @view="view => { if (host) host.view = view }"
    @rhythm="value => host?.setRhythm(value)"
    @notes="value => host?.setNoteNames(value)"
    @zoom="value => { if (host) host.zoom = value }"
    @adjust="emit('editScore')"
    @remove="emit('remove')"
    @read-song="emit('readSong')"
  />
</template>
