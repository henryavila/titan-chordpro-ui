/**
 * Demo stand-in for the host's image store. The package never keeps the bytes:
 * `uploadImage` writes here, and `resolveImage` reads the URL back.
 */
const DB = 'titan-chordpro-demo'
const STORE = 'score-images'

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
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, ref)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
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
      const blobs = (req.result ?? []) as Blob[]
      const ids = (keys.result ?? []) as string[]
      resolve(ids.map((ref, i) => ({ ref, blob: blobs[i] as Blob })).filter((r) => r.blob))
    }
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return rows
}
