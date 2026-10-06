import TitanChordpro from './TitanChordpro.vue'

export { TitanChordpro }
export default TitanChordpro
export type {
  TitanChordproEmits,
  TitanChordproProps,
  EditMode,
  ImageChoice,
  Lens,
  NoteNameFormat,
  ModesProp,
  RehearsalFocus,
  SlideImage,
  SuggestionStatus,
  TitanChordproCapabilities,
  WriteMode,
} from './public'
export { resolveEditMode } from './public'
export { fillAudioCache, matchAudio, putAudio } from './use/audio-cache'
