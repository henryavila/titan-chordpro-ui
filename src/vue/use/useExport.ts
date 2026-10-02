import { computed, ref } from 'vue'
import {
  AUDIO_ART_DEFAULT_PX,
  audioArtOf,
  audioTracksOf,
  buildPdfFilename,
  buildPpsxFilename,
  buildSljaFilename,
  EXPORT_MIME,
  exportCho,
  exportChoFile,
  isScoreReference,
  layoutChartFull,
  parse,
  transpose,
  type AccentProp,
  type AudioArt,
  type TabRhythm,
} from '@henryavila/titan-chordpro-ui'
import type { BundleExtra } from '@henryavila/titan-chordpro-ui/bundle'
import type { SlideImage } from '../public'
import { downloadExportedFile, runExportJob, type ExportJob } from '../export/run-export'
import defaultArt from '../assets/audio-ref-default.jpg'

export type UseExportOpts = {
  /** Reader's chart, or the official one when export asks for it. */
  source: () => string
  semitones: () => number
  capo: () => number
  /** Raw `{title:}` — callers apply `??` or `||` the way each export already did. */
  title: () => string | undefined
  key: () => string | null
  personal: () => boolean
  accent: () => AccentProp | undefined
  pdfShouldFail: () => boolean | undefined
  slidesShouldFail: () => boolean | undefined
  ppsxShouldFail: () => boolean | undefined
  resolveScore: () => ((src: string) => string) | undefined
  resolveImage: () => ((src: string) => string) | undefined
  loadBundleAsset: () =>
    | ((reference: string, kind: 'score' | 'image' | 'audio') => Promise<{ bytes: Uint8Array; contentType?: string; filename?: string }>)
    | undefined
  defaultAudioArt: () => AudioArt | null | undefined
  coverImage: () => SlideImage | undefined
  slidesImage: () => SlideImage | undefined
  tabRhythm: () => TabRhythm | undefined
  toast: (msg: string) => void
}

async function imageBytes(input: SlideImage | undefined): Promise<Uint8Array | undefined> {
  if (!input) return undefined
  if (input instanceof Uint8Array) return input
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  return new Uint8Array(await input.arrayBuffer())
}

/** Cho, PDF, slides, PowerPoint and the full zip. The menu ref is `sheet`. */
export function useExport(opts: UseExportOpts) {
  const sheet = ref(false)
  const pdf = ref<ExportJob>('idle')
  const slides = ref<ExportJob>('idle')
  const ppsx = ref<ExportJob>('idle')
  const bundleBusy = ref(false)
  const bundleError = ref('')
  const pdfExportError = ref('')

  function view() {
    return transpose(parse(opts.source()), opts.semitones())
  }

  const exportHasNotation = computed(() =>
    layoutChartFull(parse(opts.source())).blocks.some((b) => b.kind === 'score' && isScoreReference(b.text)),
  )

  function doExportCho() {
    const mark = opts.personal() ? '# versão pessoal — não é a cifra oficial da equipe\n' : ''
    downloadExportedFile(
      exportChoFile(opts.source(), {
        semitones: opts.semitones(),
        capo: opts.capo(),
        title: opts.title() ?? 'cifra',
        key: opts.key(),
        preamble: mark,
      }),
    )
    sheet.value = false
    opts.toast('Arquivo .cho baixado')
  }

  async function doExportBundle() {
    if (bundleBusy.value) return
    bundleBusy.value = true
    bundleError.value = ''
    const source = exportCho(opts.source(), { semitones: opts.semitones(), capo: opts.capo() })
    const personal = opts.personal()
    const title = opts.title() || 'cifra'
    const key = opts.key()
    const resolveScore = opts.resolveScore()
    const resolveImage = opts.resolveImage()
    const loadBundleAsset = opts.loadBundleAsset()
    const hostArt = opts.defaultAudioArt()
    const cover = opts.coverImage()
    const background = opts.slidesImage()
    try {
      const { exportChartBundle } = await import('@henryavila/titan-chordpro-ui/bundle')
      const extras: BundleExtra[] = []
      const tracks = audioTracksOf(source)
      if ((tracks.sung || tracks.playback) && !audioArtOf(source)) {
        const art = hostArt
        extras.push({
          role: 'audio-cover',
          reference: art?.url ?? defaultArt,
          width: art?.width ?? AUDIO_ART_DEFAULT_PX,
          height: art?.height ?? AUDIO_ART_DEFAULT_PX,
        })
      }
      const { DEFAULT_COVER_JPEG, DEFAULT_SLIDES_JPEG } = await import('@henryavila/titan-chordpro-ui/slides')
      extras.push({ role: 'slide-cover', data: { bytes: await imageBytes(cover) ?? DEFAULT_COVER_JPEG } })
      extras.push({ role: 'slide-background', data: { bytes: await imageBytes(background) ?? DEFAULT_SLIDES_JPEG } })
      const file = await exportChartBundle(source, {
        personal,
        title,
        key,
        extras,
        onlineReferences: 'provenance',
        loadAsset: async (ref, kind) => {
          if (loadBundleAsset && ref !== defaultArt) return loadBundleAsset(ref, kind)
          const resolved = ref === defaultArt
            ? ref
            : kind === 'score'
              ? resolveScore?.(ref) ?? ref
              : kind === 'image'
                ? resolveImage!(ref)
                : ref
          const url = new URL(resolved, document.baseURI)
          if (!['http:', 'https:', 'blob:', 'data:'].includes(url.protocol)) throw new Error('Endereço inválido')
          const abort = new AbortController()
          const timer = setTimeout(() => abort.abort(), 60000)
          try {
            const response = await fetch(url.href, { signal: abort.signal })
            if (!response.ok) throw new Error('Arquivo indisponível')
            return { bytes: new Uint8Array(await response.arrayBuffer()), contentType: response.headers.get('content-type') ?? undefined }
          } finally {
            clearTimeout(timer)
          }
        },
      })
      downloadExportedFile(file)
      sheet.value = false
      opts.toast('Cifra completa baixada')
    } catch (error) {
      bundleError.value = error instanceof Error ? error.message : 'Não foi possível gerar a cifra completa. Tente novamente.'
    } finally {
      bundleBusy.value = false
    }
  }

  async function doExportPdf(notation: 'tab' | 'score' | 'none' = 'score') {
    const title = opts.title() ?? 'cifra'
    await runExportJob({
      state: pdf,
      errorText: pdfExportError,
      shouldFail: opts.pdfShouldFail(),
      produce: async () => {
        const { renderPdf } = await import('@henryavila/titan-chordpro-ui/pdf')
        const bytes = await renderPdf(view(), {
          notation,
          renderNotation: async (text, mode) => {
            const { renderPdfNotation } = await import('../chart/pdf-notation')
            return renderPdfNotation(text, mode, opts.resolveScore(), opts.tabRhythm())
          },
          personal: opts.personal(),
          accent: opts.accent(),
        })
        return {
          bytes,
          filename: buildPdfFilename(title, opts.key()),
          mime: EXPORT_MIME.pdf,
          title,
        }
      },
      onSuccess: () => {
        sheet.value = false
        opts.toast('PDF gerado')
      },
    })
  }

  async function slideImageOpts() {
    return {
      title: opts.title() ?? 'cifra',
      coverImage: await imageBytes(opts.coverImage()),
      slidesImage: await imageBytes(opts.slidesImage()),
    }
  }

  async function doExportSlides() {
    await runExportJob({
      state: slides,
      shouldFail: opts.slidesShouldFail(),
      produce: async () => {
        const { renderSlja } = await import('@henryavila/titan-chordpro-ui/slides')
        const slideOpts = await slideImageOpts()
        return {
          bytes: await renderSlja(view(), slideOpts),
          filename: buildSljaFilename(slideOpts.title),
          mime: EXPORT_MIME.slja,
          title: slideOpts.title,
        }
      },
      onSuccess: () => {
        sheet.value = false
        opts.toast('Slides gerados')
      },
      onError: () => {
        sheet.value = false
      },
    })
  }

  async function doExportPpsx() {
    await runExportJob({
      state: ppsx,
      shouldFail: opts.ppsxShouldFail(),
      produce: async () => {
        const { renderPpsx } = await import('@henryavila/titan-chordpro-ui/slides')
        const slideOpts = await slideImageOpts()
        return {
          bytes: await renderPpsx(view(), slideOpts),
          filename: buildPpsxFilename(slideOpts.title),
          mime: EXPORT_MIME.ppsx,
          title: slideOpts.title,
        }
      },
      onSuccess: () => {
        sheet.value = false
        opts.toast('Apresentação gerada')
      },
      onError: () => {
        sheet.value = false
      },
    })
  }

  const exportAlerts = computed(() => {
    const rows: Array<{ id: string; text: string; retry: () => void; dismiss: () => void }> = []
    if (slides.value === 'error') {
      rows.push({
        id: 'slides',
        text: 'A exportação em slides falhou.',
        retry: () => {
          slides.value = 'idle'
          void doExportSlides()
        },
        dismiss: () => {
          slides.value = 'idle'
        },
      })
    }
    if (ppsx.value === 'error') {
      rows.push({
        id: 'ppsx',
        text: 'A exportação em PowerPoint falhou.',
        retry: () => {
          ppsx.value = 'idle'
          void doExportPpsx()
        },
        dismiss: () => {
          ppsx.value = 'idle'
        },
      })
    }
    if (pdf.value === 'error') {
      rows.push({
        id: 'pdf',
        text: 'A exportação em PDF falhou.',
        retry: () => {
          pdf.value = 'idle'
          void doExportPdf()
        },
        dismiss: () => {
          pdf.value = 'idle'
        },
      })
    }
    return rows
  })

  return {
    sheet,
    pdf,
    slides,
    ppsx,
    bundleBusy,
    bundleError,
    pdfExportError,
    exportHasNotation,
    exportAlerts,
    doExportCho,
    doExportBundle,
    doExportPdf,
    doExportSlides,
    doExportPpsx,
  }
}
