export type {
  BlockMarks,
  BlockMusic,
  CapoChordPair,
  CapoLegend,
  ChartBlock,
  ChartBlockBody,
  ChartRow,
  ChartSeg,
  TitanChordproLine,
  TitanChordproSection,
  TitanChordproDocument,
  Lens,
  LineSpan,
  ParseIssue,
  SectionKind,
  SongBlockExtras,
  TabStave,
  TabToken,
  ThemeId,
  TitanChordproAction,
  TitanChordproController,
  TitanChordproState,
} from './types'

export type { ChartStore } from './storage'
export {
  OFFLINE_CIFRACLUB_HINT,
  OFFLINE_LABEL,
  OFFLINE_SUGGEST_TOAST,
  resolveOnline,
} from './online'
export {
  STORE_KEYS,
  browserStore,
  memoryStore,
  overlayKey,
  readJson as readStoredJson,
  writeJson as writeStoredJson,
} from './storage'
export {
  readUserPreferences,
  updateUserPreferences,
  notationKey,
  notationBlockIds,
  readNotationPreferences,
  writeNotationPreferences,
} from './preferences'
export type { UserPreferences, NotationChoice, NotationPreferences } from './preferences'

export { parse, normalizeSource, setKey, transpose } from './parse'
export { parseDefineDirective, serializeDefine, writeDefines } from './define'
export type { ChordDefine, DefineDirective, DefineInstrument, DefineResult } from './define'
export { parseChordToken } from './parse-chord'
export type { ChordParseClass, ChordTokenMiss, ChordTokenParse, ChordTokenResult } from './parse-chord'
export { resolveDiagram } from './resolve-diagram'
export type {
  DiagramHit,
  DiagramInstrument,
  DiagramMiss,
  DiagramResolve,
  DiagramVoicing,
  PianoInversion,
  PianoTone,
  ResolveDiagramOpts,
} from './resolve-diagram'
export { drawDiagram } from './diagram-draw'
export type { DiagramDraw, DrawDiagramOpts, FretDot, FretDraw, PianoDraw } from './diagram-draw'
export { renderHtml, isParseFatal } from './render-html'
export { listThemes, resolveTheme, assertTheme, themeCssVars, accentVars, listAccents, THEME_VARS, cssVarsString } from './themes'
export type { AccentId, AccentProp } from './themes'
export { buildChoFilename, buildPdfFilename, buildSljaFilename, buildPpsxFilename, buildScoreFilename } from './filenames'
export { lyricsForSlides, lyricsText, exportLyrics } from './lyrics-for-slides'
export type { SlideSourceLine, ChartLyrics } from './lyrics-for-slides'
export { exportCho, exportChoFile, patchMeta } from './export-cho'
export type { ExportChoOptions } from './export-cho'
export { EXPORT_MIME, textExportedFile } from './exported-file'
export type { ExportedFile, ExportKind } from './exported-file'
export { calcScrollSpeed, adjustScrollSpeed, adjustScrollMultiplier } from './scroll'
export {
  ANCHOR_RAMP,
  ANCHOR_RATIO,
  anchorPx,
  pxAtScroll,
  scrollAtPx,
  barsAtPx,
  beatsPerBar,
  buildTimeline,
  clockOf,
  contentOrigin,
  etaSec,
  formatEta,
  durationFromYoutubeHtml,
  formatDurationFromSec,
  hasSongDuration,
  isPlayedLine,
  lineBeats,
  marksPerBeat,
  maskDurationMmSs,
  normalizeDurationMmSs,
  playheadAtScroll,
  pxAtBars,
  runSec,
  scrollAtPlayhead,
  sheetBpm,
  songDurationSec,
} from './timeline'
export type { Timeline, TimelineBlock, TimelineOpts, TimelineSeg } from './timeline'
export { createTitanChordproController } from './controller'
export { createSourceSession } from './source-session'
export type { SourceSession, SourceChangeReason } from './source-session'
export {
  layoutChart,
  layoutChartFull,
  buildTab,
  editTypeScale,
  typeScale,
  maxPlainChars,
  markTight,
} from './layout'
export type { ChartLayout, LayoutOpts } from './layout'
export { readingWords } from './reading-words'
export type { ReadingCell, ReadingWord } from './reading-words'
export {
  absorbInto,
  absorbedOp,
  applyOps,
  checkUpdate,
  diffOps,
  hasRun,
  hashText,
  isTuneOp,
  lcsHunks,
  opCtxNote,
  opLabel,
  overlaid,
  strumReviewFromOp,
  scoreReviewFromOp,
  scoreReviewsFromOp,
  proposedScoreSources,
  diffStrumPattern,
  slotsLookSame,
  tuneText,
} from './overlay'
export type {
  ApplyResult,
  Hunk,
  Overlay,
  OverlayOp,
  ReadingCtx,
  ResolvedOp,
  StrumReview,
  ScoreAttachment,
  StrumSlotMark,
  Suggestion,
  SuggestionStatus,
  TextOp,
  TuneOp,
  UpdateItem,
  UpdatePlan,
} from './overlay'
export {
  addChord,
  blockLabel,
  blockSpan,
  copyHarmony,
  deleteBlock,
  duplicateBlock,
  groupAfter,
  hideBlock,
  insertAt,
  insertBlock,
  insertImage,
  insertSnippet,
  lastChordName,
  markCtx,
  moveBlock,
  anchorWords,
  moveChord,
  pasteHarmony,
  playedColumns,
  removeChord,
  renameChord,
  rowJoin,
  rowParts,
  setBlockCapo,
  setComment,
  setLyric,
  shiftBlock,
  shiftLabel,
  toggleBlockDual,
  unhideBlock,
  writeMarks,
} from './block-edit'
export type {
  AnchorCell,
  AnchorChar,
  AnchorWord,
  BlockSpan,
  BlockWrite,
  ChordRef,
  Harmony,
  HarmonyRow,
  InsertKind,
  MarkCtx,
  PlayedCol,
  RowParts,
} from './block-edit'
export {
  BEATS,
  DEFAULT_META,
  DEMO,
  DURS,
  DUR_OF,
  NAMES,
  PT,
  STR_LBL,
  STR_MIDI,
  beatsOf,
  beatsPerBar as scoreBeatsPerBar,
  keyOf,
  layout as scoreLayout,
  parseScore,
  serialize as serializeScore,
  tabOf,
  toTab,
} from './score'
export type { Dur, LayoutItem, ParsedScore, ScoreMeta, ScoreNote, TabPos } from './score'
export { lintSource } from './lint'
export type { LintResult } from './lint'
export { transposeToken, usesFlats, keyIndex, keyRootOf, nashvilleToken, semitoneDelta, signedSemitoneDelta, formatToneShift, transposeTextChords } from './transpose'
export { looksLikeOnSong, normalizeOnSong } from './onsong'
export {
  applyCcStrumChoice,
  applyCifraClubEnrich,
  chartBody,
  convert,
  detect,
  detectKeyRewrite,
  enrichMetaFromCifraClubHtml,
  fromCifraClubHtml,
  fromOnSong,
  fromPlain,
  hostOk,
  isChord,
  isChordLine,
  looksLikeCifraClubHtml,
  META_KEYS,
  MISSING_LABEL,
  missingOf,
  proposeCifraClubEnrich,
  readMeta,
  readStrumPatterns,
  rewriteToKey,
  SUPPORTED_HOSTS,
  titleFromUrl,
  toPlain,
  trazerCcStrumChoice,
  writeMeta,
  writeStrumPatterns,
  youtubeEmbedUrl,
  youtubeWatchUrl,
} from './import-chordpro'
export {
  AUDIO_ART_DEFAULT_PX,
  AUDIO_ART_MEDIA_PX,
  AUDIO_KIND_LABEL,
  AUDIO_KINDS,
  audioArtOf,
  audioArtistOf,
  resolveRehearsalArt,
  audioKindsOf,
  audioTracksOf,
  audioUrlOf,
  rehearsalAudioUrls,
  defaultAudioKind,
  displaySongTitle,
  formatAudioClock,
  playableAudioUrl,
  setAudioArt,
  setAudioUrl,
  setRehearsalAudio,
} from './audio-url'
export type { AudioArt, AudioKind, AudioTracks, RehearsalAudioPatch } from './audio-url'
export {
  AUDIO_CACHE_MAX_BYTES,
  AUDIO_CACHE_MAX_FILE,
  evictToFit,
  shouldCacheFile,
} from './audio-cache'
export type { AudioCacheEntry } from './audio-cache'
export type {
  CcStrumChoice,
  ChartMeta,
  CifraClubPage,
  EnrichConflict,
  EnrichProposal,
  EnrichStrumConflict,
  EnrichYoutube,
  ImportFormat,
  ImportResult,
  KeyRewriteOffer,
  MetaKey,
  RewriteToKeyResult,
} from './import-chordpro'
export {
  formatTitanStrumSet,
  metaFromStrumSet,
  parseTitanStrumSet,
} from './strum-multi'
export type { StrumPatternSet } from './strum-multi'
export {
  beatsInMeter,
  decodeStrumPat,
  densityFromGrid,
  dirAtOffset,
  emptyPattern,
  emptySlot,
  encodeStrumPat,
  findAnchorIndex,
  formatTitanStrum,
  gridFromDensity,
  hasStrumAnchor,
  inferSixEightPulse,
  isCompleteStrumPattern,
  isEmptySlot,
  isLegalStrumPattern,
  listSlotChoices,
  meterFromTimeSignature,
  oppositeDir,
  parseTitanStrum,
  patternFromCc,
  repairStrumPattern,
  requiredDir,
  resizePattern,
  setSlot,
  setSlotCascading,
  slotEquals,
  slotFromCcCode,
  slotsFromCcPattern,
} from './strum'
export type {
  EmptyPatternOpts,
  SixEightPulse,
  StrumContact,
  StrumDensity,
  StrumDir,
  StrumEssence,
  StrumPattern,
  StrumSlot,
} from './strum'
export { applyStrumPreset, draftStrumPreset, listStrumPresets } from './strum-presets'
export type { SaveStrumPresetPayload, StrumPreset } from './strum-presets'

export { isInlineScore, isScoreReference, readScoreReference, writeScoreReference, scoreAutoScale, isTabRhythm } from './score-reference'
export type { ScoreReference, TabRhythm } from './score-reference'
