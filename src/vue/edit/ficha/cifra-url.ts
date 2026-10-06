import {
  hostOk,
  OFFLINE_CIFRACLUB_HINT,
  OFFLINE_CIFRACLUB_LINE,
  OFFLINE_LABEL,
} from '@henryavila/titan-chordpro-ui'

/** enrich: Completar com Cifra Club. bring: Trazer do Cifra Club. */
export type CifraVoice = 'enrich' | 'bring'

export type CifraGate =
  | { ok: true; url: string }
  | { ok: false; message: string; hint: string }

export function offlineCifraBlock(voice: CifraVoice): { message: string; hint: string } {
  if (voice === 'bring') return { message: OFFLINE_LABEL, hint: OFFLINE_CIFRACLUB_HINT }
  return { message: OFFLINE_CIFRACLUB_LINE, hint: '' }
}

export function cifraReadFailed(voice: CifraVoice): { message: string; hint: string } {
  if (voice === 'bring') {
    return {
      message: 'Não deu para ler essa cifra no Cifra Club',
      hint: 'Confira o endereço, ou use Arquivo ou Texto.',
    }
  }
  return { message: 'Não deu para ler essa página no Cifra Club', hint: '' }
}

/** Refuse a Cifra Club address before any fetch. Copy stays per voice. */
export function gateCifraUrl(
  raw: string,
  opts: { voice: CifraVoice; online: boolean; canFetch: boolean },
): CifraGate {
  const url = raw.trim()
  if (!url) {
    if (opts.voice === 'bring') {
      return {
        ok: false,
        message: 'Cole o endereço do Cifra Club',
        hint: 'Exemplo: https://www.cifraclub.com.br/ministerio-jovem/meu-farol/',
      }
    }
    return { ok: false, message: 'Cole o endereço do Cifra Club', hint: '' }
  }
  if (!hostOk(url)) {
    if (opts.voice === 'bring') {
      return {
        ok: false,
        message: 'Só o Cifra Club',
        hint: 'Cole um endereço de cifraclub.com.br. Arquivo ou Texto aceitam cifra de outro lugar.',
      }
    }
    return { ok: false, message: 'Só cifraclub.com.br', hint: '' }
  }
  if (!opts.online) return { ok: false, ...offlineCifraBlock(opts.voice) }
  if (!opts.canFetch) {
    if (opts.voice === 'bring') {
      return {
        ok: false,
        message: 'Buscar no Cifra Club não está disponível',
        hint: 'A página precisa ser buscada pelo servidor do site. Use Arquivo ou Texto.',
      }
    }
    return { ok: false, message: 'Buscar no Cifra Club não está disponível neste site', hint: '' }
  }
  return { ok: true, url }
}

export type CifraPaste = { url: string; message: string; hint: string; fetch: boolean }

/**
 * A pasted Cifra Club address replaces the field.
 * Anything else stays a normal paste. Offline explains and does not fetch.
 */
export function readCifraPaste(
  e: ClipboardEvent,
  opts: { voice: CifraVoice; online: boolean; canFetch: boolean },
): CifraPaste | null {
  const t = (e.clipboardData?.getData('text') ?? '').trim()
  if (!hostOk(t)) return null
  e.preventDefault()
  if (!opts.online) return { url: t, ...offlineCifraBlock(opts.voice), fetch: false }
  if (!opts.canFetch) return { url: t, message: '', hint: '', fetch: false }
  return { url: t, message: '', hint: '', fetch: true }
}
