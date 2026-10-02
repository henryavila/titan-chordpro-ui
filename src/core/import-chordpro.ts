/**
 * Bringing a chart in: recognise what was pasted or opened, and give back
 * ChordPro. Three origins — a URL, a file, text — all land here; the UI only
 * shows the result.
 *
 * This is the **explicit** path, the one a person starts and sees the outcome
 * of ("converted from OnSong", "already ChordPro"). It is not the same job as
 * `onsong.ts`, which normalises silently inside `parse()` for a host that hands
 * over OnSong as its `source`. That one has to stay conservative because it
 * runs on everything; this one may do more — chorus directives, tabs, section
 * names in Portuguese. `tests/core/import-chordpro.test.ts` pins the two
 * together on the case they share, so they cannot drift apart unnoticed.
 */

export { isChord, isChordLine, fromPlain, fromOnSong, toPlain } from './import/plain'
export {
  META_KEYS,
  canonicalMetaKey,
  readMeta,
  readStrumPatterns,
  writeStrumPatterns,
  writeMeta,
  MISSING_LABEL,
  missingOf,
  chartBody,
  type MetaKey,
  type ChartMeta,
} from './import/meta'
export {
  detectKeyRewrite,
  rewriteToKey,
  type KeyRewriteOffer,
  type RewriteToKeyResult,
} from './import/key-rewrite'
export {
  titleFromUrl,
  SUPPORTED_HOSTS,
  hostOk,
  looksLikeCifraClubHtml,
  fromCifraClubHtml,
  youtubeWatchUrl,
  youtubeEmbedUrl,
  applyCcStrumChoice,
  trazerCcStrumChoice,
  proposeCifraClubEnrich,
  enrichMetaFromCifraClubHtml,
  applyCifraClubEnrich,
  type CifraClubPage,
  type EnrichConflict,
  type EnrichYoutube,
  type EnrichStrumConflict,
  type CcStrumChoice,
  type EnrichProposal,
} from './import/cifraclub'
export { detect, convert, type ImportFormat, type ImportResult } from './import/convert'
