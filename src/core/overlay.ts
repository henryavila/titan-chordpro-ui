/**
 * Personal edits over an official chart.
 *
 * Storing the whole text would freeze the chart: a correction made by the
 * person in charge would never reach anyone who personalised it. Each
 * adjustment is instead an operation anchored on the original lines — so it
 * can be reverted one by one, and reapplied on top of a new version.
 */

export {
  hashText,
  isTuneOp,
  type Overlay,
  type OverlayOp,
  type ReadingCtx,
  type ResolvedOp,
  type ScoreAttachment,
  type Suggestion,
  type SuggestionStatus,
  type TextOp,
  type TuneOp,
} from './personal-overlay/model'
export { diffOps, lcsHunks, type Hunk } from './personal-overlay/diff'
export {
  absorbedOp,
  applyOps,
  hasRun,
  reviewProjection,
  type ApplyResult,
  type ReviewProjection,
} from './personal-overlay/apply'
export {
  diffStrumPattern,
  opCtxNote,
  opLabel,
  proposedScoreSources,
  scoreReviewFromOp,
  scoreReviewsFromOp,
  slotsLookSame,
  strumReviewFromOp,
  tuneText,
  type StrumReview,
  type StrumSlotMark,
} from './personal-overlay/review'
export {
  absorbInto,
  checkUpdate,
  overlaid,
  type UpdateItem,
  type UpdatePlan,
} from './personal-overlay/update'
