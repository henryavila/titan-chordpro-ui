import type { Ref } from 'vue'
import type { ExportedFile } from '@henryavila/titan-chordpro-ui'

export type ExportJob = 'idle' | 'busy' | 'error'

export function downloadExportedFile(file: Pick<ExportedFile, 'filename' | 'bytes' | 'mime'>): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([file.bytes as BlobPart], { type: file.mime }))
  a.download = file.filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/**
 * Busy / error / download for one async file export. Writers stay in their
 * package entry; this only runs the menu job.
 */
export async function runExportJob(opts: {
  state: Ref<ExportJob>
  errorText?: Ref<string>
  produce: () => Promise<ExportedFile>
  onSuccess: () => void
  onError?: (error: unknown) => void
  shouldFail?: boolean
}): Promise<void> {
  if (opts.state.value === 'busy') return
  opts.state.value = 'busy'
  if (opts.errorText) opts.errorText.value = ''
  try {
    if (opts.shouldFail) throw new Error('simulado')
    const file = await opts.produce()
    downloadExportedFile(file)
    opts.state.value = 'idle'
    opts.onSuccess()
  } catch (error) {
    opts.state.value = 'error'
    if (opts.errorText) {
      opts.errorText.value =
        error instanceof Error ? error.message : 'Não foi possível gerar o arquivo. Tente novamente.'
    }
    opts.onError?.(error)
  }
}
