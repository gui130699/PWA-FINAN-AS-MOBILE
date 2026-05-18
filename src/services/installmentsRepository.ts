/**
 * installmentsRepository.ts — Camada offline-first para parcelamentos.
 */

import { Timestamp } from 'firebase/firestore'
import type { InstallmentGroup, Transaction } from '../types'
import type { LocalInstallmentGroup, SyncQueueItem } from '../types/offline'
import {
  getInstallmentGroups as fsGetGroups,
  createInstallmentGroup as fsCreate,
  deleteInstallmentGroup as fsDelete,
  getInstallmentTransactions as fsGetTransactions,
} from './firestore'
import {
  putInstallmentGroup,
  getInstallmentGroups as dbGetGroups,
  getInstallmentGroupByLocalId,
  getInstallmentGroupByServerId,
  softDeleteInstallmentGroup,
  addQueueItem,
  deleteLocalRecord,
} from '../offline/offlineDb'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return `local_ig_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function igToLocal(g: InstallmentGroup, uid: string): LocalInstallmentGroup {
  return {
    localId: g.id,
    serverId: g.id,
    uid,
    syncStatus: 'synced',
    lastModifiedAt: new Date().toISOString(),
    deleted: false,
    description: g.description,
    categoryId: g.categoryId,
    categoryName: g.categoryName,
    totalValue: g.totalValue,
    installmentValue: g.installmentValue,
    totalInstallments: g.totalInstallments,
    firstInstallmentDate: g.firstInstallmentDate,
    lastInstallmentDate: g.lastInstallmentDate,
    paidInstallments: g.paidInstallments,
    pendingInstallments: g.pendingInstallments,
    paidValue: g.paidValue,
    remainingValue: g.remainingValue,
    status: g.status,
    transactionNature: g.transactionNature,
    createdAt:
      g.createdAt instanceof Timestamp
        ? g.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    updatedAt:
      g.updatedAt instanceof Timestamp
        ? g.updatedAt.toDate().toISOString()
        : new Date().toISOString(),
  }
}

function localToIg(local: LocalInstallmentGroup): InstallmentGroup {
  return {
    id: local.serverId ?? local.localId,
    description: local.description,
    categoryId: local.categoryId,
    categoryName: local.categoryName,
    totalValue: local.totalValue,
    installmentValue: local.installmentValue,
    totalInstallments: local.totalInstallments,
    firstInstallmentDate: local.firstInstallmentDate,
    lastInstallmentDate: local.lastInstallmentDate,
    paidInstallments: local.paidInstallments,
    pendingInstallments: local.pendingInstallments,
    paidValue: local.paidValue,
    remainingValue: local.remainingValue,
    status: local.status as InstallmentGroup['status'],
    transactionNature: local.transactionNature as InstallmentGroup['transactionNature'],
    createdAt: Timestamp.fromDate(new Date(local.createdAt)),
    updatedAt: Timestamp.fromDate(new Date(local.updatedAt)),
  }
}

async function upsertFromServer(uid: string, g: InstallmentGroup): Promise<void> {
  const existing = await getInstallmentGroupByServerId(uid, g.id)
  if (existing) {
    if (existing.syncStatus !== 'pending') {
      await putInstallmentGroup({ ...igToLocal(g, uid), localId: existing.localId })
    }
  } else {
    await putInstallmentGroup(igToLocal(g, uid))
  }
}

// ─── API Pública ──────────────────────────────────────────────────────────────

export async function getInstallmentGroupsOfflineFirst(uid: string): Promise<InstallmentGroup[]> {
  if (navigator.onLine) {
    try {
      const groups = await fsGetGroups(uid)
      await Promise.all(groups.map((g) => upsertFromServer(uid, g)))
      const locals = await dbGetGroups(uid)
      const pendingOnly = locals.filter((r) => !r.serverId && r.syncStatus === 'pending')
      const serverIds = new Set(groups.map((g) => g.id))
      const editedOffline = locals.filter(
        (r) => r.serverId && r.syncStatus === 'pending' && serverIds.has(r.serverId),
      )
      const result: InstallmentGroup[] = groups
        .filter((g) => !editedOffline.some((e) => e.serverId === g.id))
        .map((g) => g)
      for (const e of editedOffline) result.push(localToIg(e))
      for (const p of pendingOnly) result.push(localToIg(p))
      return result
    } catch {
      // Cai para cache
    }
  }
  const locals = await dbGetGroups(uid)
  return locals.map(localToIg)
}

export async function createInstallmentGroupOfflineFirst(
  uid: string,
  data: Parameters<typeof fsCreate>[1],
): Promise<string> {
  if (navigator.onLine) {
    try {
      const id = await fsCreate(uid, data)
      // Recarrega o grupo criado do Firestore para pegar stats
      const { getInstallmentGroups: fsGet } = await import('./firestore')
      const groups = await fsGet(uid)
      const created = groups.find((g) => g.id === id)
      if (created) await putInstallmentGroup(igToLocal(created, uid))
      return id
    } catch { /* cai para offline */ }
  }
  // Modo offline: cria entrada local sem parcelas (será sincronizado)
  const localId = genId()
  const now = new Date().toISOString()
  const lastDate = data.firstInstallmentDate // simplificado offline
  await putInstallmentGroup({
    localId,
    serverId: undefined,
    uid,
    syncStatus: 'pending',
    lastModifiedAt: now,
    deleted: false,
    description: data.description,
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    totalValue: data.totalValue,
    installmentValue: data.installmentValue,
    totalInstallments: data.totalInstallments,
    firstInstallmentDate: data.firstInstallmentDate,
    lastInstallmentDate: lastDate,
    paidInstallments: 0,
    pendingInstallments: data.totalInstallments,
    paidValue: 0,
    remainingValue: data.totalValue,
    status: 'ongoing',
    transactionNature: data.transactionNature,
    createdAt: now,
    updatedAt: now,
  })
  const queueItem: SyncQueueItem = {
    id: genId(),
    uid,
    collection: 'installmentGroups',
    action: 'create',
    localId,
    payload: data,
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    status: 'pending',
  }
  await addQueueItem(queueItem)
  return localId
}

export async function deleteInstallmentGroupOfflineFirst(uid: string, groupId: string): Promise<void> {
  if (navigator.onLine) {
    try {
      await fsDelete(uid, groupId)
      const existing =
        await getInstallmentGroupByServerId(uid, groupId) ??
        await getInstallmentGroupByLocalId(groupId)
      if (existing) {
        await deleteLocalRecord('installment_groups_cache', existing.localId)
      }
      return
    } catch { /* cai para offline */ }
  }
  const existing =
    await getInstallmentGroupByServerId(uid, groupId) ??
    await getInstallmentGroupByLocalId(groupId)
  if (!existing) return
  await softDeleteInstallmentGroup(existing.localId)
  const now = new Date().toISOString()
  await addQueueItem({
    id: genId(),
    uid,
    collection: 'installmentGroups',
    action: 'delete',
    localId: existing.localId,
    serverId: existing.serverId,
    payload: null,
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    status: 'pending',
  })
}

/** Busca parcelas de um grupo — apenas online. */
export async function getInstallmentTransactionsOfflineFirst(
  uid: string,
  groupId: string,
): Promise<Transaction[]> {
  if (!navigator.onLine) return []
  return fsGetTransactions(uid, groupId)
}
