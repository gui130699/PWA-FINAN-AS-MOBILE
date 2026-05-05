/**
 * syncService.ts — Serviço de sincronização de operações pendentes com o Firestore.
 *
 * Processos:
 * - Lê a sync_queue do IndexedDB
 * - Para cada item pendente, tenta enviar ao Firestore
 * - Em caso de sucesso: marca como synced no cache local, remove da fila
 * - Em caso de falha: incrementa attempts, salva mensagem de erro
 */

import type { SyncQueueItem } from '../types/offline'
import {
  getPendingQueue,
  getPendingCount,
  updateQueueItem,
  removeQueueItem,
  putTransaction,
  getTransactionByLocalId,
  deleteLocalRecord,
} from './offlineDb'
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from '../services/firestore'
import type { Transaction } from '../types'

export { getPendingCount }

async function processItem(item: SyncQueueItem): Promise<void> {
  await updateQueueItem(item.id, { status: 'syncing' })

  try {
    if (item.collection !== 'transactions') {
      // Outras coleções são gerenciadas pela persistência nativa do Firestore
      await removeQueueItem(item.id)
      return
    }

    if (item.action === 'create') {
      const payload = item.payload as Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
      const serverId = await addTransaction(item.uid, payload)
      const local = await getTransactionByLocalId(item.localId)
      if (local) {
        await putTransaction({
          ...local,
          serverId,
          syncStatus: 'synced',
          lastModifiedAt: new Date().toISOString(),
        })
      }
      await removeQueueItem(item.id)
    } else if (item.action === 'update') {
      const targetId = item.serverId ?? item.localId
      const payload = item.payload as Partial<Transaction>
      await updateTransaction(item.uid, targetId, payload)
      const local = await getTransactionByLocalId(item.localId)
      if (local) {
        await putTransaction({
          ...local,
          syncStatus: 'synced',
          lastModifiedAt: new Date().toISOString(),
        })
      }
      await removeQueueItem(item.id)
    } else if (item.action === 'delete') {
      if (item.serverId) {
        await deleteTransaction(item.uid, item.serverId)
      }
      // Limpar o registro do cache local
      await deleteLocalRecord('transactions_cache', item.localId)
      await removeQueueItem(item.id)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    await updateQueueItem(item.id, {
      status: 'error',
      errorMessage: msg,
      attempts: item.attempts + 1,
    })
    throw err
  }
}

export async function syncPendingChanges(uid: string): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 }

  const queue = await getPendingQueue(uid)
  if (queue.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  for (const item of queue) {
    try {
      await processItem(item)
      synced++
    } catch {
      failed++
    }
  }

  return { synced, failed }
}

export async function retryFailedChanges(uid: string): Promise<{ synced: number; failed: number }> {
  return syncPendingChanges(uid)
}
