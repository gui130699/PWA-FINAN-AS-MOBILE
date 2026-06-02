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
  putCategory,
  getCategoryByLocalId,
  putFixedAccount,
  getFixedAccountByLocalId,
  putInstallmentGroup,
  getInstallmentGroupByLocalId,
  putQuickEntryDraft,
  getQuickEntryDraftByLocalId,
} from './offlineDb'
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  addCategory,
  updateCategory,
  deleteCategory,
  addFixedAccount,
  updateFixedAccount,
  deleteFixedAccount,
  createInstallmentGroup,
  deleteInstallmentGroup,
  getInstallmentGroups as fsGetInstallmentGroups,
  addQuickEntryDraft as fsAddQuickEntryDraft,
  updateQuickEntryDraft as fsUpdateQuickEntryDraft,
  deleteQuickEntryDraft as fsDeleteQuickEntryDraft,
} from '../services/firestore'
import type { Transaction, Category, FixedAccount, QuickEntryDraft } from '../types'

export { getPendingCount }

async function processItem(item: SyncQueueItem): Promise<void> {
  await updateQueueItem(item.id, { status: 'syncing' })

  try {
    // ─── Transactions ──────────────────────────────────────────────────────
    if (item.collection === 'transactions') {
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
        await deleteLocalRecord('transactions_cache', item.localId)
        await removeQueueItem(item.id)
      }
      return
    }

    // ─── Categories ────────────────────────────────────────────────────────
    if (item.collection === 'categories') {
      if (item.action === 'create') {
        const local = await getCategoryByLocalId(item.localId)
        if (local?.deleted) {
          // Criado e deletado offline antes de sincronizar: cancela
          await deleteLocalRecord('categories_cache', item.localId)
          await removeQueueItem(item.id)
          return
        }
        const payload = item.payload as Omit<Category, 'id' | 'createdAt' | 'updatedAt'>
        const serverId = await addCategory(item.uid, payload)
        if (local) {
          await putCategory({
            ...local,
            serverId,
            syncStatus: 'synced',
            lastModifiedAt: new Date().toISOString(),
          })
        }
        await removeQueueItem(item.id)
      } else if (item.action === 'update') {
        const targetId = item.serverId ?? item.localId
        const payload = item.payload as Partial<Category>
        await updateCategory(item.uid, targetId, payload)
        const local = await getCategoryByLocalId(item.localId)
        if (local) {
          await putCategory({
            ...local,
            syncStatus: 'synced',
            lastModifiedAt: new Date().toISOString(),
          })
        }
        await removeQueueItem(item.id)
      } else if (item.action === 'delete') {
        if (item.serverId) {
          await deleteCategory(item.uid, item.serverId)
        }
        await deleteLocalRecord('categories_cache', item.localId)
        await removeQueueItem(item.id)
      }
      return
    }

    // ─── Fixed Accounts ────────────────────────────────────────────────────
    if (item.collection === 'fixedAccounts') {
      if (item.action === 'create') {
        const local = await getFixedAccountByLocalId(item.localId)
        if (local?.deleted) {
          await deleteLocalRecord('fixed_accounts_cache', item.localId)
          await removeQueueItem(item.id)
          return
        }
        const payload = item.payload as Omit<FixedAccount, 'id' | 'createdAt' | 'updatedAt'>
        const serverId = await addFixedAccount(item.uid, payload)
        if (local) {
          await putFixedAccount({
            ...local,
            serverId,
            syncStatus: 'synced',
            lastModifiedAt: new Date().toISOString(),
          })
        }
        await removeQueueItem(item.id)
      } else if (item.action === 'update') {
        const targetId = item.serverId ?? item.localId
        const payload = item.payload as Partial<FixedAccount>
        await updateFixedAccount(item.uid, targetId, payload)
        const local = await getFixedAccountByLocalId(item.localId)
        if (local) {
          await putFixedAccount({
            ...local,
            syncStatus: 'synced',
            lastModifiedAt: new Date().toISOString(),
          })
        }
        await removeQueueItem(item.id)
      } else if (item.action === 'delete') {
        if (item.serverId) {
          await deleteFixedAccount(item.uid, item.serverId)
        }
        await deleteLocalRecord('fixed_accounts_cache', item.localId)
        await removeQueueItem(item.id)
      }
      return
    }

    // ─── Installment Groups ────────────────────────────────────────────────
    if (item.collection === 'installmentGroups') {
      if (item.action === 'create') {
        const local = await getInstallmentGroupByLocalId(item.localId)
        if (local?.deleted) {
          // Grupo marcado como deleted antes de sincronizar: limpa parcelas temporárias e cancela
          for (let i = 1; i <= (local.totalInstallments ?? 0); i++) {
            await deleteLocalRecord('transactions_cache', `${local.localId}_inst_${i}`)
          }
          await deleteLocalRecord('installment_groups_cache', item.localId)
          await removeQueueItem(item.id)
          return
        }
        const payload = item.payload as Parameters<typeof createInstallmentGroup>[1]
        const serverId = await createInstallmentGroup(item.uid, payload)
        if (local) {
          // Tenta buscar grupo atualizado do Firestore para obter stats reais
          let updatedGroup = { ...local, serverId, syncStatus: 'synced' as const, lastModifiedAt: new Date().toISOString() }
          try {
            const freshGroups = await fsGetInstallmentGroups(item.uid)
            const fresh = freshGroups.find((g) => g.id === serverId)
            if (fresh) {
              updatedGroup = {
                ...local,
                serverId: fresh.id,
                syncStatus: 'synced' as const,
                lastModifiedAt: new Date().toISOString(),
                description: fresh.description,
                categoryId: fresh.categoryId,
                categoryName: fresh.categoryName,
                totalValue: fresh.totalValue,
                installmentValue: fresh.installmentValue,
                totalInstallments: fresh.totalInstallments,
                firstInstallmentDate: fresh.firstInstallmentDate,
                lastInstallmentDate: fresh.lastInstallmentDate,
                paidInstallments: fresh.paidInstallments,
                pendingInstallments: fresh.pendingInstallments,
                paidValue: fresh.paidValue,
                remainingValue: fresh.remainingValue,
                status: fresh.status as typeof local.status,
                transactionNature: fresh.transactionNature as typeof local.transactionNature,
              }
            }
          } catch { /* usa dados locais com serverId */ }
          await putInstallmentGroup(updatedGroup)

          // Remove as parcelas offline temporárias (serão recarregadas do Firestore via financeSync)
          for (let i = 1; i <= local.totalInstallments; i++) {
            await deleteLocalRecord('transactions_cache', `${local.localId}_inst_${i}`)
          }
        }
        await removeQueueItem(item.id)
      } else if (item.action === 'update') {
        // Atualizações de grupo geralmente são feitas via transações; apenas remove da fila
        await removeQueueItem(item.id)
      } else if (item.action === 'delete') {
        if (item.serverId) {
          await deleteInstallmentGroup(item.uid, item.serverId)
        }
        await deleteLocalRecord('installment_groups_cache', item.localId)
        await removeQueueItem(item.id)
      }
      return
    }

    // ─── Quick Entry Drafts ────────────────────────────────────────────────
    if (item.collection === 'quickEntryDrafts') {
      if (item.action === 'create') {
        const local = await getQuickEntryDraftByLocalId(item.localId)
        if (local?.deleted) {
          await deleteLocalRecord('quick_entry_drafts_cache', item.localId)
          await removeQueueItem(item.id)
          return
        }
        const payload = item.payload as Omit<QuickEntryDraft, 'id' | 'createdAt' | 'updatedAt'>
        const serverId = await fsAddQuickEntryDraft(item.uid, payload)
        if (local) {
          await putQuickEntryDraft({
            ...local,
            serverId,
            syncStatus: 'synced',
            lastModifiedAt: new Date().toISOString(),
          })
        }
        await removeQueueItem(item.id)
      } else if (item.action === 'update') {
        const targetId = item.serverId ?? item.localId
        const payload = item.payload as Partial<QuickEntryDraft>
        await fsUpdateQuickEntryDraft(item.uid, targetId, payload)
        const local = await getQuickEntryDraftByLocalId(item.localId)
        if (local) {
          await putQuickEntryDraft({
            ...local,
            syncStatus: 'synced',
            lastModifiedAt: new Date().toISOString(),
          })
        }
        await removeQueueItem(item.id)
      } else if (item.action === 'delete') {
        if (item.serverId) {
          await fsDeleteQuickEntryDraft(item.uid, item.serverId)
        }
        await deleteLocalRecord('quick_entry_drafts_cache', item.localId)
        await removeQueueItem(item.id)
      }
      return
    }

    // Coleção desconhecida — remove da fila sem processar
    await removeQueueItem(item.id)

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

