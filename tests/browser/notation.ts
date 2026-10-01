import { createApp, h, ref } from 'vue'
import NotationPdfHarness from './NotationPdfHarness.vue'
import ExternalScore from '../../src/vue/chart/ExternalScore.vue'
import ImportScoreDialog from '../../src/vue/edit/ImportScoreDialog.vue'
import { writeScoreReference } from '../../src/core'
import '../../src/vue/titan-chordpro.css'
import gpUrl from '../../fixtures/notation/notes.gp?url'
import gp5Url from '../../fixtures/notation/notes.gp5?url'
import xmlUrl from '../../fixtures/notation/bends.musicxml?url'
import bendsUrl from '../../fixtures/notation/bends.gp?url'
import pianoUrl from '../../fixtures/notation/piano.musicxml?url'
import chordsUrl from '../../fixtures/notation/chords.gp?url'
const params = new URLSearchParams(location.search)
const dark = ref(params.has('dark'))
const noteNameFormat = ref<'letter' | 'solfege'>(params.get('format') === 'solfege' ? 'solfege' : 'letter')
const file = new URLSearchParams(location.search).get('file') || 'notes.gp'
const text = writeScoreReference({ src: ({ 'chords.gp': chordsUrl, 'piano.musicxml': pianoUrl, 'bends.gp': bendsUrl, 'notes.gp': gpUrl, 'notes.gp5': gp5Url, 'bends.musicxml': xmlUrl }[file] || gpUrl), track: 1, start: Number(params.get('start')) || 1, ...(params.has('end') ? { end: Number(params.get('end')) } : {}), ...(file === 'piano.musicxml' ? { end: 2 } : {}) })
const stored = new Map<string, string>()
const uploadScore = async (file: File) => {
  stored.set('stored/solo.gp', URL.createObjectURL(file))
  return { ref: 'stored/solo.gp' }
}
createApp({ render: () => new URLSearchParams(location.search).has('pdf') ? h(NotationPdfHarness) : new URLSearchParams(location.search).has('edit')
  ? h('div', { class: 'titan-chordpro-root', 'data-theme': dark.value ? 'dark' : 'light', style: { height: '100dvh' } }, [h(ImportScoreDialog, { text: params.has('new') ? undefined : text, theme: dark.value ? 'dark' : 'light', uploadScore, resolveScore: (src: string) => stored.get(src) ?? src, onSave: (value: string) => { document.body.dataset.saved = value } })])
  : h('div', { style: {
    '--text': dark.value ? '#EAECF2' : '#13161d', '--muted': dark.value ? '#9ca5b8' : '#737b88',
    '--chord': dark.value ? '#84DFA6' : '#17713c', '--canvas': dark.value ? '#171b24' : '#ffffff',
    background: dark.value ? '#171b24' : '#ffffff', color: dark.value ? '#EAECF2' : '#13161d', minHeight: '100vh',
  } }, [h('button', { id: 'toggle-theme', onClick: () => { dark.value = !dark.value } }, 'Tema'),
    h('button', { id: 'toggle-format', onClick: () => { noteNameFormat.value = noteNameFormat.value === 'letter' ? 'solfege' : 'letter' } }, 'Formato'),
    h(ExternalScore, { text, blockGap: '16px', theme: dark.value ? 'dark' : 'light', noteNameFormat: noteNameFormat.value })]) }).mount('#app')
