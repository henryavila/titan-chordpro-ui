import type { jsPDF } from 'jspdf'
import { SORA_REGULAR, SORA_SEMIBOLD, SPACE_MONO_BOLD, SPACE_MONO_REGULAR } from './font-data'

export const SANS = 'Sora'
export const MONO = 'SpaceMono'

/** Registers the product faces on this document. Safe to call once per `jsPDF`. */
export function registerPdfFonts(doc: jsPDF): void {
  doc.addFileToVFS('Sora-Regular.ttf', SORA_REGULAR)
  doc.addFont('Sora-Regular.ttf', SANS, 'normal')
  doc.addFileToVFS('Sora-SemiBold.ttf', SORA_SEMIBOLD)
  doc.addFont('Sora-SemiBold.ttf', SANS, 'bold')
  doc.addFileToVFS('SpaceMono-Regular.ttf', SPACE_MONO_REGULAR)
  doc.addFont('SpaceMono-Regular.ttf', MONO, 'normal')
  doc.addFileToVFS('SpaceMono-Bold.ttf', SPACE_MONO_BOLD)
  doc.addFont('SpaceMono-Bold.ttf', MONO, 'bold')
}
