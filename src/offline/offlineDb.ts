/**
 * offlineDb.ts — Banco local IndexedDB para estratégia offline-first.
 *
 * Stores:
 *  - transactions_cache       (espelho do Firestore + pendentes)
 *  - categories_cache         (espelho de categorias + pendentes)
 *  - fixed_accounts_cache     (espelho de contas fixas + pendentes)
 *  - installment_groups_cache (espelho de grupos de parcelamento + pendentes)
 *  - sync_queue               (fila de operações pendentes)
 */

import type {
  LocalTransaction,
  LocalCategory,
  LocalFixedAccount,
  LocalInstallmentGroup,
  SyncQueueItem,
} from '../types/offline'

const DB_NAME = 'finance_offline_db'
const DB_VERSION = 2

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
        s.createIndex('by_serverId', 'serverId')
        s.createIndex('by_syncStatus', 'syncStatus')
      }

      if (!db.objectStoreNames.contains('fixed_accounts_cache')) {
        const s = db.createObjectStore('fixed_accounts_cache', { keyPath: 'localId' })
        s.createIndex('by_uid', 'uid')
        s.createIndex('by_serverId', 'serverId')
        s.createIndex('by_syncStatus', 'syncStatus')
      }

      if (!db.objectStoreNames.contains('installment_groups_cache')) {
        const s = db.createObjectStore('installment_groups_cache', { keyPath: 'localId' })
        s.createIndex('by_uid', 'uid')
        s.createIndex('by_serverId', 'serverId')
        s.createIndex('by_syncStatus', 'syncStatus')
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

// ─── Categories ───────────────────────────────────────────────────────────────

export async function putCategory(record: LocalCategory): Promise<void> {
  const db = await openOfflineDb()
  const tx = db.transaction('categories_cache', 'readwrite')
  await idbReq(tx.objectStore('categories_cache').put(record))
}

export async function getCategories(uid: string): Promise<LocalCategory[]> {
  const db = await openOfflineDb()
  const tx = db.transaction('categories_cache', 'readonly')
  const all = (await idbReq(tx.objectStore('categories_cache').index('by_uid').getAll(uid))) as LocalCategory[]
  return all.filter((r) => !r.deleted)
}

export async function getCategoryByLocalId(localId: string): Promise<LocalCategory | undefined> {
  const db = await openOfflineDb()
  const tx = db.transaction('categories_cache', 'readonly')
  const result = await idbReq(tx.objectStore('categories_cache').get(localId))
  return result as LocalCategory | undefined
}

export async function getCategoryByServerId(uid: string, serverId: string): Promise<LocalCategory | undefined> {
  const db = await openOfflineDb()
  const tx = db.transaction('categories_cache', 'readonly')
  const index = tx.objectStore('categories_cache').index('by_serverId')
  const results = (await idbReq(index.getAll(serverId))) as LocalCategory[]
  return results.find((r) => r.uid === uid)
}

export async function softDeleteCategory(localId: string): Promise<void> {
  const existing = await getCategoryByLocalId(localId)
  if (!existing) return
  await putCategory({
    ...existing,
    deleted: true,
    syncStatus: 'pending',
    lastModifiedAt: new Date().toISOString(),
  })
}

// ─── Fixed Accounts ───────────────────────────────────────────────────────────

export async function putFixedAccount(record: LocalFixedAccount): Promise<void> {
  const db = await openOfflineDb()
  const tx = db.transaction('fixed_accounts_cache', 'readwrite')
  await idbReq(tx.objectStore('fixed_accounts_cache').put(record))
}

export async function getFixedAccounts(uid: string): Promise<LocalFixedAccount[]> {
  const db = await openOfflineDb()
  const tx = db.transaction('fixed_accounts_cache', 'readonly')
  const all = (await idbReq(tx.objectStore('fixed_accounts_cache').index('by_uid').getAll(uid))) as LocalFixedAccount[]
  return all.filter((r) => !r.deleted)
}

export async function getFixedAccountByLocalId(localId: string): Promise<LocalFixedAccount | undefined> {
  const db = await openOfflineDb()
  const tx = db.transaction('fixed_accounts_cache', 'readonly')
  const result = await idbReq(tx.objectStore('fixed_accounts_cache').get(localId))
  return result as LocalFixedAccount | undefined
}

export async function getFixedAccountByServerId(uid: string, serverId: string): Promise<LocalFixedAccount | undefined> {
  const db = await openOfflineDb()
  const tx = db.transaction('fixed_accounts_cache', 'readonly')
  const index = tx.objectStore('fixed_accounts_cache').index('by_serverId')
  const results = (await idbReq(index.getAll(serverId))) as LocalFixedAccount[]
  return results.find((r) => r.uid === uid)
}

export async function softDeleteFixedAccount(localId: string): Promise<void> {
  const existing = await getFixedAccountByLocalId(localId)
  if (!existing) return
  await putFixedAccount({
    ...existing,
    deleted: true,
    syncStatus: 'pending',
    lastModifiedAt: new Date().toISOString(),
  })
}

// ─── Installment Groups ───────────────────────────────────────────────────────

export async function putInstallmentGroup(record: LocalInstallmentGroup): Promise<void> {
  const db = await openOfflineDb()
  const tx = db.transaction('installment_groups_cache', 'readwrite')
  await idbReq(tx.objectStore('installment_groups_cache').put(record))
}

export async function getInstallmentGroups(uid: string): Promise<LocalInstallmentGroup[]> {
  const db = await openOfflineDb()
  const tx = db.transaction('installment_groups_cache', 'readonly')
  const all = (await idbReq(tx.objectStore('installment_groups_cache').index('by_uid').getAll(uid))) as LocalInstallmentGroup[]
  return all.filter((r) => !r.deleted)
}

export async function getInstallmentGroupByLocalId(localId: string): Promise<LocalInstallmentGroup | undefined> {
  const db = await openOfflineDb()
  const tx = db.transaction('installment_groups_cache', 'readonly')
  const result = await idbReq(tx.objectStore('installment_groups_cache').get(localId))
  return result as LocalInstallmentGroup | undefined
}

export async function getInstallmentGroupByServerId(uid: string, serverId: string): Promise<LocalInstallmentGroup | undefined> {
  const db = await openOfflineDb()
  const tx = db.transaction('installment_groups_cache', 'readonly')
  const index = tx.objectStore('installment_groups_cache').index('by_serverId')
  const results = (await idbReq(index.getAll(serverId))) as LocalInstallmentGroup[]
  return results.find((r) => r.uid === uid)
}

export async function softDeleteInstallmentGroup(localId: string): Promise<void> {
  const existing = await getInstallmentGroupByLocalId(localId)
  if (!existing) return
  await putInstallmentGroup({
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

// ─── Transactions extra queries ───────────────────────────────────────────────

/** Retorna transações locais de um grupo de parcelamento (para UI offline). */
export async function getTransactionsByInstallmentGroupId(
  uid: string,
  groupId: string,
): Promise<LocalTransaction[]> {
  const db = await openOfflineDb()
  const tx = db.transaction('transactions_cache', 'readonly')
  const all = (await idbReq(tx.objectStore('transactions_cache').index('by_uid').getAll(uid))) as LocalTransaction[]
  return all.filter((r) => !r.deleted && r.installmentGroupId === groupId)
}

/** Retorna transações locais por intervalo de data de cobrança (para relatórios offline). */
export async function getTransactionsByDateRange(
  uid: string,
  startDate: string,
  endDate: string,
): Promise<LocalTransaction[]> {
  const db = await openOfflineDb()
  const tx = db.transaction('transactions_cache', 'readonly')
  const all = (await idbReq(tx.objectStore('transactions_cache').index('by_uid').getAll(uid))) as LocalTransaction[]
  return all.filter(
    (r) => !r.deleted && r.chargeDate >= startDate && r.chargeDate <= endDate,
  )
}

