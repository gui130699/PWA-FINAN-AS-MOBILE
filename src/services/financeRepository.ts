/**
 * financeRepository.ts — Camada offline-first sobre o firestore.ts.
 *
 * Regras:
 *  - Se online: tenta Firestore diretamente; em sucesso, sincroniza cache local.
 *    Em falha de rede, cai para modo offline.
 *  - Se offline: salva no IndexedDB local e enfileira na sync_queue.
 *    A UI já reflete a mudança imediatamente.
 *
 * Apenas transações estão cobertas nesta primeira versão.
 */

import { Timestamp } from 'firebase/firestore'
import type { Transaction } from '../types'
import type { LocalTransaction, SyncQueueItem } from '../types/offline'
import {
  getTransactions as fsGet,
  addTransaction as fsAdd,
  updateTransaction as fsUpdate,
  deleteTransaction as fsDelete,
} from './firestore'
import {
  putTransaction,
  getTransactionsByMonth,
  getTransactionByLocalId,
  getTransactionByServerId,
  softDeleteTransaction,
  addQueueItem,
  getPendingQueue,
  updateQueueItem,
  removeQueueItem,
  deleteLocalRecord,
} from '../offline/offlineDb'

// ─── Helpers internos ─────────────────────────────────────────────────────────

function genId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function txToLocal(t: Transaction, uid: string): LocalTransaction {
  return {
    localId: t.id,
    serverId: t.id,
    uid,
    syncStatus: 'synced',
    lastModifiedAt: new Date().toISOString(),
    deleted: false,
    description: t.description,
    value: t.value,
    categoryId: t.categoryId,
    categoryName: t.categoryName,
    launchDate: t.launchDate,
    chargeDate: t.chargeDate,
    month: t.month,
    year: t.year,
    status: t.status,
    type: t.type,
    transactionNature: t.transactionNature,
    systemTag: t.systemTag,
    fixedAccountId: t.fixedAccountId,
    installmentGroupId: t.installmentGroupId,
    installmentNumber: t.installmentNumber,
    totalInstallments: t.totalInstallments,
    createdAt:
      t.createdAt instanceof Timestamp
        ? t.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    updatedAt:
      t.updatedAt instanceof Timestamp
        ? t.updatedAt.toDate().toISOString()
        : new Date().toISOString(),
  }
}

function localToTx(local: LocalTransaction): Transaction {
  return {
    id: local.serverId ?? local.localId,
    description: local.description,
    value: local.value,
    categoryId: local.categoryId,
    categoryName: local.categoryName,
    launchDate: local.launchDate,
    chargeDate: local.chargeDate,
    month: local.month,
    year: local.year,
    status: local.status as Transaction['status'],
    type: local.type as Transaction['type'],
    transactionNature: local.transactionNature as Transaction['transactionNature'],
    systemTag: local.systemTag,
    fixedAccountId: local.fixedAccountId,
    installmentGroupId: local.installmentGroupId,
    installmentNumber: local.installmentNumber,
    totalInstallments: local.totalInstallments,
    createdAt: Timestamp.fromDate(new Date(local.createdAt)),
    updatedAt: Timestamp.fromDate(new Date(local.updatedAt)),
    _syncStatus: local.syncStatus,
  }
}

async function findLocal(uid: string, id: string): Promise<LocalTransaction | undefined> {
  // Tenta por localId primeiro (para transações criadas offline)
  const byLocalId = await getTransactionByLocalId(id)
  if (byLocalId?.uid === uid) return byLocalId
  // Depois por serverId (para transações já sincronizadas)
  return getTransactionByServerId(uid, id)
}

function partialToLocal(data: Partial<Transaction>): Partial<LocalTransaction> {
  const r: Partial<LocalTransaction> = {}
  if (data.description !== undefined) r.description = data.description
  if (data.value !== undefined) r.value = data.value
  if (data.categoryId !== undefined) r.categoryId = data.categoryId
  if (data.categoryName !== undefined) r.categoryName = data.categoryName
  if (data.launchDate !== undefined) r.launchDate = data.launchDate
  if (data.chargeDate !== undefined) r.chargeDate = data.chargeDate
  if (data.month !== undefined) r.month = data.month
  if (data.year !== undefined) r.year = data.year
  if (data.status !== undefined) r.status = data.status
  if (data.type !== undefined) r.type = data.type
  if (data.transactionNature !== undefined) r.transactionNature = data.transactionNature
  if (data.systemTag !== undefined) r.systemTag = data.systemTag
  return r
}

function buildLocalFromData(
  localId: string,
  serverId: string | undefined,
  uid: string,
  syncStatus: LocalTransaction['syncStatus'],
  data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
  now: string,
): LocalTransaction {
  return {
    localId,
    serverId,
    uid,
    syncStatus,
    lastModifiedAt: now,
    deleted: false,
    description: data.description,
    value: data.value,
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    launchDate: data.launchDate,
    chargeDate: data.chargeDate,
    month: data.month,
    year: data.year,
    status: data.status,
    type: data.type,
    transactionNature: data.transactionNature,
    systemTag: data.systemTag,
    fixedAccountId: data.fixedAccountId,
    installmentGroupId: data.installmentGroupId,
    installmentNumber: data.installmentNumber,
    totalInstallments: data.totalInstallments,
    createdAt: now,
    updatedAt: now,
  }
}

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Carrega transações do mês.
 * - Online: busca no Firestore, atualiza cache, mescla com pendentes locais.
 * - Offline: lê do cache IndexedDB.
 */
export async function getTransactionsOfflineFirst(
  uid: string,
  month: number,
  year: number,
): Promise<Transaction[]> {
  if (navigator.onLine) {
    try {
      const txs = await fsGet(uid, month, year)
      // Atualiza cache local com dados frescos do Firestore
      await Promise.all(txs.map((t) => putTransaction(txToLocal(t, uid))))
      // Mescla com eventuais registros pendentes locais (criados offline)
      const locals = await getTransactionsByMonth(uid, month, year)
      const pendingOnly = locals.filter((r) => !r.serverId && r.syncStatus === 'pending')
      const merged: Transaction[] = [
        ...txs.map((t) => ({ ...t, _syncStatus: 'synced' as const })),
        ...pendingOnly.map(localToTx),
      ]
      // Deduplicar por id
      const seen = new Set<string>()
      return merged.filter((t) => {
        if (seen.has(t.id)) return false
        seen.add(t.id)
        return true
      })
    } catch {
      // Fallback para cache em caso de erro de rede
    }
  }
  const locals = await getTransactionsByMonth(uid, month, year)
  return locals.map(localToTx)
}

/**
 * Adiciona uma transação.
 * - Online: salva no Firestore + cache como 'synced'.
 * - Offline/erro: salva em cache como 'pending' + enfileira para sync.
 */
export async function addTransactionOfflineFirst(
  uid: string,
  data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const localId = genId()
  const now = new Date().toISOString()

  if (navigator.onLine) {
    try {
      const serverId = await fsAdd(uid, data)
      await putTransaction(buildLocalFromData(localId, serverId, uid, 'synced', data, now))
      return serverId
    } catch {
      // Cai para modo offline
    }
  }

  // Offline: salva localmente e enfileira
  await putTransaction(buildLocalFromData(localId, undefined, uid, 'pending', data, now))
  const qItem: SyncQueueItem = {
    id: genId(),
    uid,
    collection: 'transactions',
    action: 'create',
    localId,
    payload: data,
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    status: 'pending',
  }
  await addQueueItem(qItem)
  return localId
}

/**
 * Atualiza uma transação existente.
 * - Online: atualiza Firestore + cache.
 * - Offline/erro: atualiza cache + enfileira (mescla com item existente na fila).
 */
export async function updateTransactionOfflineFirst(
  uid: string,
  id: string,
  data: Partial<Transaction>,
): Promise<void> {
  const now = new Date().toISOString()
  const local = await findLocal(uid, id)

  if (navigator.onLine) {
    try {
      await fsUpdate(uid, id, data)
      if (local) {
        await putTransaction({
          ...local,
          ...partialToLocal(data),
          syncStatus: 'synced',
          lastModifiedAt: now,
        })
      }
      return
    } catch {
      // Cai para modo offline
    }
  }

  if (local) {
    await putTransaction({
      ...local,
      ...partialToLocal(data),
      syncStatus: 'pending',
      lastModifiedAt: now,
    })
  }

  const queue = await getPendingQueue(uid)
  const existingQ = queue.find((q) => q.localId === (local?.localId ?? id))

  if (existingQ && (existingQ.action === 'create' || existingQ.action === 'update')) {
    // Mescla o update no item existente da fila
    await updateQueueItem(existingQ.id, {
      payload: { ...(existingQ.payload as object), ...data },
      status: 'pending',
      updatedAt: now,
    })
  } else {
    const qItem: SyncQueueItem = {
      id: genId(),
      uid,
      collection: 'transactions',
      action: 'update',
      localId: local?.localId ?? id,
      serverId: local?.serverId ?? (id.startsWith('local_') ? undefined : id),
      payload: data,
      createdAt: now,
      updatedAt: now,
      attempts: 0,
      status: 'pending',
    }
    await addQueueItem(qItem)
  }
}

/**
 * Remove uma transação.
 * - Online: deleta no Firestore + remove do cache.
 * - Offline/erro:
 *   - Se era 'pending create' (nunca chegou ao Firestore): cancela e remove localmente.
 *   - Caso contrário: soft-delete no cache + enfileira delete.
 */
export async function deleteTransactionOfflineFirst(uid: string, id: string): Promise<void> {
  const now = new Date().toISOString()
  const local = await findLocal(uid, id)

  if (navigator.onLine) {
    try {
      await fsDelete(uid, id)
      if (local) {
        await deleteLocalRecord('transactions_cache', local.localId)
      }
      return
    } catch {
      // Cai para modo offline
    }
  }

  if (!local) return

  // Verifica se era um 'create' pendente (nunca chegou ao Firestore)
  const queue = await getPendingQueue(uid)
  const createQ = queue.find((q) => q.localId === local.localId && q.action === 'create')
  if (createQ) {
    // Cancela o create — nunca chegou ao Firestore, apenas remove localmente
    await removeQueueItem(createQ.id)
    await deleteLocalRecord('transactions_cache', local.localId)
    return
  }

  // Soft-delete no cache e enfileira delete para o Firestore
  await softDeleteTransaction(local.localId)
  const qItem: SyncQueueItem = {
    id: genId(),
    uid,
    collection: 'transactions',
    action: 'delete',
    localId: local.localId,
    serverId: local.serverId,
    payload: {},
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    status: 'pending',
  }
  await addQueueItem(qItem)
}
