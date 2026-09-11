import { buildSljaFilename } from '../core/filenames'
import { lyricsForSlides } from '../core/lyrics-for-slides'
import { parse } from '../core/parse'
import type { ChordProView } from '../core/types'
import { encodeCp1252 } from './cp1252'
import { DEFAULT_COVER_JPEG, DEFAULT_SLIDES_JPEG } from './default-image'
import { planSlides, type SlideLayoutConfig, type SlidePlan } from './layout'
import { zip } from './zip'

export const DEFAULT_LOUVORJA_VERSION = '25.0.17424.39578'
export const COVER_IMAGE_MEMBER = 'imagens\\Capa.jpg'
export const SLIDES_IMAGE_MEMBER = 'imagens\\slides.jpg'

const LETTER_SIZE = 20
const AUX_SIZE = 10
const LETTER_COLOR = '#FFFFFF'
const AUX_COLOR = '#EFB400'
const BACKGROUND = '#000000'
const IMAGE_POSITION = 5

export class NoSlideLyricsError extends Error {
  constructor(message = 'Esta cifra não tem letra para slides.') {
    super(message)
    this.name = 'NoSlideLyricsError'
  }
}

export type SljaOptions = SlideLayoutConfig & {
  title?: string
  titleAux?: string
  coverImage?: Uint8Array
  slidesImage?: Uint8Array
  version?: string
}

export function renderLja(
  slides: readonly SlidePlan[],
  opts: { title: string; titleAux?: string; version?: string },
): Uint8Array {
  const version = opts.version ?? DEFAULT_LOUVORJA_VERSION
  const lines: string[] = [
    '[Geral]',
    `slides=${slides.length + 1}`,
    `versao=${version}`,
    'audio=0',
    '',
  ]
  appendSlide(lines, {
    index: 1,
    type: 'CAPA',
    text: clean(opts.title),
    aux: clean(opts.titleAux ?? ''),
    image: COVER_IMAGE_MEMBER,
  })
  slides.forEach((slide, i) => {
    appendSlide(lines, {
      index: i + 2,
      type: 'LETRA',
      text: slide.lines.map(clean).join('|'),
      aux: clean(slide.auxText),
      image: SLIDES_IMAGE_MEMBER,
    })
  })
  let text = lines.join('\r\n')
  if (!text.endsWith('\r\n')) text += '\r\n'
  return encodeCp1252(text)
}

export type SljaFile = {
  bytes: Uint8Array
  filename: string
  title: string
}

/**
 * Host entry for a “download slides” button that never mounts the viewer.
 * Parse + ZIP; cover/slides images are optional bytes (package default otherwise).
 */
export async function exportSlja(source: string, opts: SljaOptions = {}): Promise<SljaFile> {
  const view = parse(source)
  const title = (opts.title ?? view.meta.title ?? 'Sem título').trim() || 'Sem título'
  const bytes = await renderSlja(view, { ...opts, title })
  return { bytes, filename: buildSljaFilename(title), title }
}

export async function renderSlja(view: ChordProView, opts: SljaOptions = {}): Promise<Uint8Array> {
  const rows = lyricsForSlides(view)
  if (!rows.length) throw new NoSlideLyricsError()
  const slides = planSlides(rows, opts)
  const title = (opts.title ?? view.meta.title ?? 'Sem título').trim() || 'Sem título'
  const lja = renderLja(slides, {
    title,
    titleAux: opts.titleAux,
    version: opts.version,
  })
  const cover = opts.coverImage ?? DEFAULT_COVER_JPEG
  const lyricBg = opts.slidesImage ?? DEFAULT_SLIDES_JPEG
  return zip([
    { name: 'slides.lja', data: lja },
    { name: COVER_IMAGE_MEMBER, data: cover },
    { name: SLIDES_IMAGE_MEMBER, data: lyricBg },
  ])
}

function appendSlide(
  lines: string[],
  slide: { index: number; type: string; text: string; aux: string; image: string },
): void {
  lines.push(
    `[Slide:${slide.index}]`,
    `tipo=${slide.type}`,
    `letra=${slide.text}`,
    'fundo_letra=1',
    `tamanho_letra=${LETTER_SIZE}`,
    `cor_letra=${LETTER_COLOR}`,
    `cor_fundo=${BACKGROUND}`,
  )
  if (slide.aux) lines.push(`letra_aux=${slide.aux}`)
  lines.push(
    `tamanho_letra_aux=${AUX_SIZE}`,
    `cor_letra_aux=${AUX_COLOR}`,
    `imagem=${slide.image}`,
    `imagem_posicao=${IMAGE_POSITION}`,
    'tempo=00:00:00',
    '',
  )
}

function clean(value: string): string {
  return String(value ?? '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
