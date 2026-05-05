/**
 * offlineDb.ts — Banco local IndexedDB para estratégia offline-first.
 *
 * Stores:
 *  - transactions_cache   (espelho do Firestore + pendentes)
 *  - categories_cache     (reserved para uso futuro)
 *  - fixed_accounts_cache (reserved para uso futuro)
 *  - installment_groups_cache (reserved para uso futuro)
 *  - sync_queue           (fila de operações pendentes)
 */

import type { LocalTransaction, SyncQueueItem } from '../types/offline'

const DB_NAME = 'finance_offline_db'
const DB_VERSION = 1

let _db: IDBDatabase | null = null

export async function openOfflineDb(): Promise<IDBDatabase> {
  if (_db) return _db
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains('transactions_cache')) {
        const s = db.createObjectStore('transactions_cache', { keyPath: 'localId' })
        s.createIndex('by_uid', 'uid')
        s.createIndex('by_uid_month_year', ['uid', 'month', 'year'])
        s.createIndex('by_serverId', 'serverId')
        s.createIndex('by_syncStatus', 'syncStatus')
      }

      if (!db.objectStoreNames.contains('categories_cache')) {
        const s = db.createObjectStore('categories_cache', { keyPath: 'localId' })
        s.createIndex('by_uid', 'uid')
      }

      if (!db.objectStoreNames.contains('fixed_accounts_cache')) {
        const s = db.createObjectStore('fixed_accounts_cache', { keyPath: 'localId' })
        s.createIndex('by_uid', 'uid')
      }

      if (!db.objectStoreNames.contains('installment_groups_cache')) {
        const s = db.createObjectStore('installment_groups_cache', { keyPath: 'localId' })
        s.createIndex('by_uid', 'uid')
      }

      if (!db.objectStoreNames.contains('sync_queue')) {
        const s = db.createObjectStore('sync_queue', { keyPath: 'id' })
        s.createIndex('by_uid', 'uid')
        s.createIndex('by_uid_status', ['uid', 'status'])
        s.createIndex('by_createdAt', 'createdAt')
      }
    }

    request.onsuccess = (event) => {
      _db = (event.target as IDBOpenDBRequest).result
      resolve(_db)
    }

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error)
    }
  })
}

function idbReq<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

// ─── Generic ──────────────────────────────────────────────────────────────────

export async function putLocalRecord(
  storeName: string,
  record: Record<string, unknown>,
): Promise<void> {
  const db = await openOfflineDb()
  const tx = db.transaction(storeName, 'readwrite')
  await idbReq(tx.objectStore(storeName).put(record))
}

export async function getLocalRecords(
  storeName: string,
  uid: string,
): Promise<Record<string, unknown>[]> {
  const db = await openOfflineDb()
  const tx = db.transaction(storeName, 'readonly')
  return idbReq(tx.objectStore(storeName).index('by_uid').getAll(uid))
}

export async function deleteLocalRecord(storeName: string, key: string): Promise<void> {
  const db = await openOfflineDb()
  const tx = db.transaction(storeName, 'readwrite')
  await idbReq(tx.objectStore(storeName).delete(key))
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function putTransaction(record: LocalTransaction): Promise<void> {
  const db = await openOfflineDb()
  const tx = db.transaction('transactions_cache', 'readwrite')
  await idbReq(tx.objectStore('transactions_cache').put(record))
}

export async function getTransactionsByMonth(
  uid: string,
  month: number,
  year: number,
): Promise<LocalTransaction[]> {
  const db = await openOfflineDb()
  const tx = db.transaction('transactions_cache', 'readonly')
  const index = tx.objectStore('transactions_cache').index('by_uid_month_year')
  const all = (await idbReq(index.getAll(IDBKeyRange.only([uid, month, year])))) as LocalTransaction[]
  return all.filter((r) => !r.deleted)
}

export async function getTransactionByLocalId(localId: string): Promise<LocalTransaction | undefined> {
  const db = await openOfflineDb()
  const tx = db.transaction('transactions_cache', 'readonly')
  const result = await idbReq(tx.objectStore('transactions_cache').get(localId))
  return result as LocalTransaction | undefined
}

export async function getTransactionByServerId(
  uid: string,
  serverId: string,
): Promise<LocalTransaction | undefined> {
  const db = await openOfflineDb()
  const tx = db.transaction('transactions_cache', 'readonly')
  const index = tx.objectStore('transactions_cache').index('by_serverId')
  const results = (await idbReq(index.getAll(serverId))) as LocalTransaction[]
  return results.find((r) => r.uid === uid)
}

export async function softDeleteTransaction(localId: string): Promise<void> {
  const existing = await getTransactionByLocalId(localId)
  if (!existing) return
  await putTransaction({
    ...existing,
    deleted: true,
    syncStatus: 'pending',
    lastModifiedAt: new Date().toISOString(),
  })
}

// ─── Sync Queue ───────────────────────────────────────────────────────────────

export async function addQueueItem(item: SyncQueueItem): Promise<void> {
  const db = await openOfflineDb()
  const tx = db.transaction('sync_queue', 'readwrite')
  await idbReq(tx.objectStore('sync_queue').put(item))
}

export async function getPendingQueue(uid: string): Promise<SyncQueueItem[]> {
  const db = await openOfflineDb()
  const tx = db.transaction('sync_queue', 'readonly')
  const index = tx.objectStore('sync_queue').index('by_uid_status')
  const pending = (await idbReq(index.getAll([uid, 'pending']))) as SyncQueueItem[]
  const errored = (await idbReq(index.getAll([uid, 'error']))) as SyncQueueItem[]
  return [...pending, ...errored].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function updateQueueItem(id: string, patch: Partial<SyncQueueItem>): Promise<void> {
  const db = await openOfflineDb()
  const tx = db.transaction('sync_queue', 'readwrite')
  const store = tx.objectStore('sync_queue')
  const existing = (await idbReq(store.get(id))) as SyncQueueItem | undefined
  if (!existing) return
  await idbReq(store.put({ ...existing, ...patch, updatedAt: new Date().toISOString() }))
}

export async function removeQueueItem(id: string): Promise<void> {
  const db = await openOfflineDb()
  const tx = db.transaction('sync_queue', 'readwrite')
  await idbReq(tx.objectStore('sync_queue').delete(id))
}

export async function getPendingCount(uid: string): Promise<number> {
  const items = await getPendingQueue(uid)
  return items.length
}
