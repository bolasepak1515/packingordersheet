// Minimal IndexedDB-backed async storage used by the React Query persister so
// the cache survives browser refreshes (F5) for near-instant data restoration.

const DB_NAME = 'packingordersheet-cache'
const STORE_NAME = 'queries'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB is not available'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'))
  })
}

function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('indexedDB request failed'))
  })
}

export const idbStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const db = await openDb()
      const tx = db.transaction(STORE_NAME, 'readonly')
      const value = await promisifyRequest(tx.objectStore(STORE_NAME).get(key) as IDBRequest<string | undefined>)
      return value ?? null
    } catch {
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await openDb()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      await promisifyRequest(tx.objectStore(STORE_NAME).put(value, key) as IDBRequest<IDBValidKey>)
    } catch {
      // Non-fatal: cache persistence is best-effort.
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const db = await openDb()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      await promisifyRequest(tx.objectStore(STORE_NAME).delete(key) as IDBRequest<undefined>)
    } catch {
      // Non-fatal.
    }
  },
}
