/**
 * Demo stand-in for the host's image store. The package never keeps the bytes:
 * `uploadImage` writes here, and `resolveImage` reads the URL back.
 */
const DB = 'titan-chordpro-demo'
const STORE = 'score-images'
type StoredMedia = { bytes: ArrayBuffer; type: string }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function persistScoreImage(ref: string, blob: Blob): Promise<void> {
  // Store structured-cloneable bytes rather than a browser-managed Blob/File
  // backing store (which WebKit can reject). Older Blob entries remain readable.
  const media: StoredMedia = { bytes: await blob.arrayBuffer(), type: blob.type }
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(media, ref)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}

export async function loadScoreImages(): Promise<Array<{ ref: string; blob: Blob }>> {
  if (typeof indexedDB === 'undefined') return []
  const db = await openDb()
  const rows = await new Promise<Array<{ ref: string; blob: Blob }>>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.getAll()
    const keys = store.getAllKeys()
    tx.oncomplete = () => {
      const blobs = (req.result ?? []) as Array<Blob | StoredMedia>
      const ids = (keys.result ?? []) as string[]
      resolve(ids.flatMap((ref, i) => {
        const stored = blobs[i]
        if (!stored) return []
        const blob = stored instanceof Blob ? stored : new Blob([stored.bytes], { type: stored.type })
        return [{ ref, blob }]
      }))
    }
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return rows
}

/** Direct lookup used by suggestion attachments and the offline bundle. */
export async function loadScoreImage(ref: string): Promise<{ bytes: Uint8Array; contentType?: string } | null> {
  if (typeof indexedDB === 'undefined') return null
  const db = await openDb()
  try {
    const stored = await new Promise<Blob | StoredMedia | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).get(ref)
      request.onsuccess = () => resolve(request.result as Blob | StoredMedia | undefined)
      request.onerror = () => reject(request.error)
    })
    if (!stored) return null
    if (stored instanceof Blob) return { bytes: new Uint8Array(await stored.arrayBuffer()), contentType: stored.type || undefined }
    return { bytes: new Uint8Array(stored.bytes), contentType: stored.type || undefined }
  } finally { db.close() }
}
