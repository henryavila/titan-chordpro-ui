import { B64 as coverB64 } from './default-cover-b64'
import { B64 as slidesB64 } from './default-slides-b64'

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Ministério Tons mountain still — cover when the host does not pass one. */
export const DEFAULT_COVER_JPEG = fromB64(coverB64)

/** Ministério Tons night sky — every lyric slide unless the host overrides. */
export const DEFAULT_SLIDES_JPEG = fromB64(slidesB64)
