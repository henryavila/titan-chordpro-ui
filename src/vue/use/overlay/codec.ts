export function toBase64(bytes: Uint8Array): string {
  let encoded = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    encoded += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(encoded)
}

export function fromBase64(text: string): Uint8Array {
  const binary = atob(text)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

export function scoreFilename(src: string): string {
  const name = src.split(/[/?#]/).filter(Boolean).at(-1) || 'solo.gp'
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}
