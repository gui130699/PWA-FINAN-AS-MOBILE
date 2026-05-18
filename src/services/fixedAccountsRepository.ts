/**
 * fixedAccountsRepository.ts — Camada offline-first para contas fixas.
 */

import { Timestamp } from 'firebase/firestore'
import type { FixedAccount } from '../types'
import type { LocalFixedAccount, SyncQueueItem } from '../types/offline'
import {
  getFixedAccounts as fsGetFixedAccounts,
  addFixedAccount as fsAdd,
  updateFixedAccount as fsUpdate,
  deleteFixedAccount as fsDelete,
  generateFixedAccountsForMonth as fsGenerate,
} from './firestore'
import {
  putFixedAccount,
  getFixedAccounts as dbGetFixedAccounts,
  getFixedAccountByLocalId,
  getFixedAccountByServerId,
  softDeleteFixedAccount,
  addQueueItem,
  deleteLocalRecord,
} from '../offline/offlineDb'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return `local_fa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function faToLocal(a: FixedAccount, uid: string): LocalFixedAccount {
  return {
    localId: a.id,
    serverId: a.id,
    uid,
    syncStatus: 'synced',
    lastModifiedAt: new Date().toISOString(),
    deleted: false,
    description: a.description,
    value: a.value,
    categoryId: a.categoryId,
    categoryName: a.categoryName,
    chargeDay: a.chargeDay,
    startMonth: a.startMonth,
    startYear: a.startYear,
    active: a.active,
    recurrenceType: a.recurrenceType,
    weekDay: a.weekDay,
    transactionNature: a.transactionNature,
    createdAt:
      a.createdAt instanceof Timestamp
        ? a.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    updatedAt:
      a.updatedAt instanceof Timestamp
        ? a.updatedAt.toDate().toISOString()
        : new Date().toISOString(),
  }
}

function localToFa(local: LocalFixedAccount): FixedAccount {
  return {
    id: local.serverId ?? local.localId,
    description: local.description,
    value: local.value,
    categoryId: local.categoryId,
    categoryName: local.categoryName,
    chargeDay: local.chargeDay,
    startMonth: local.startMonth,
    startYear: local.startYear,
    active: local.active,
    recurrenceType: local.recurrenceType as FixedAccount['recurrenceType'],
    weekDay: local.weekDay,
    transactionNature: local.transactionNature as FixedAccount['transactionNature'],
    createdAt: Timestamp.fromDate(new Date(local.createdAt)),
    updatedAt: Timestamp.fromDate(new Date(local.updatedAt)),
  }
}

async function upsertFromServer(uid: string, a: FixedAccount): Promise<void> {
  const existing = await getFixedAccountByServerId(uid, a.id)
  if (existing) {
    if (existing.syncStatus !== 'pending') {
      await putFixedAccount({ ...faToLocal(a, uid), localId: existing.localId })
    }
  } else {
    await putFixedAccount(faToLocal(a, uid))
  }
}

// ─── API Pública ──────────────────────────────────────────────────────────────

export async function getFixedAccountsOfflineFirst(uid: string): Promise<FixedAccount[]> {
  if (navigator.onLine) {
    try {
      const accounts = await fsGetFixedAccounts(uid)
      await Promise.all(accounts.map((a) => upsertFromServer(uid, a)))
      const locals = await dbGetFixedAccounts(uid)
      const pendingOnly = locals.filter((r) => !r.serverId && r.syncStatus === 'pending')
      const serverIds = new Set(accounts.map((a) => a.id))
      const editedOffline = locals.filter(
        (r) => r.serverId && r.syncStatus === 'pending' && serverIds.has(r.serverId),
      )
      const result: FixedAccount[] = accounts
        .filter((a) => !editedOffline.some((e) => e.serverId === a.id))
        .map((a) => a)
      for (const e of editedOffline) result.push(localToFa(e))
      for (const p of pendingOnly) result.push(localToFa(p))
      return result
    } catch {
      // Cai para cache
    }
  }
  const locals = await dbGetFixedAccounts(uid)
  return locals.map(localToFa)
}

export async function addFixedAccountOfflineFirst(
  uid: string,
  data: Omit<FixedAccount, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  if (navigator.onLine) {
    try {
      const id = await fsAdd(uid, data)
      await putFixedAccount(
        faToLocal({ id, ...data, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }, uid),
      )
      return id
    } catch { /* cai para offline */ }
  }
  const localId = genId()
  const now = new Date().toISOString()
  await putFixedAccount({
    localId,
    serverId: undefined,
    uid,
    syncStatus: 'pending',
    lastModifiedAt: now,
    deleted: false,
    description: data.description,
    value: data.value,
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    chargeDay: data.chargeDay,
    startMonth: data.startMonth,
    startYear: data.startYear,
    active: data.active,
    recurrenceType: data.recurrenceType,
    weekDay: data.weekDay,
    transactionNature: data.transactionNature,
    createdAt: now,
    updatedAt: now,
  })
  const queueItem: SyncQueueItem = {
    id: genId(),
    uid,
    collection: 'fixedAccounts',
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

export async function updateFixedAccountOfflineFirst(
  uid: string,
  id: string,
  data: Partial<FixedAccount>,
): Promise<void> {
  if (navigator.onLine) {
    try {
      await fsUpdate(uid, id, data)
      const existing = await getFixedAccountByServerId(uid, id) ?? await getFixedAccountByLocalId(id)
      if (existing) {
        await putFixedAccount({
          ...existing,
          ...Object.fromEntries(
            Object.entries(data).filter(([k]) => k !== 'id' && k !== 'createdAt'),
          ) as Partial<LocalFixedAccount>,
          syncStatus: 'synced',
          lastModifiedAt: new Date().toISOString(),
        })
      }
      return
    } catch { /* cai para offline */ }
  }
  const existing = await getFixedAccountByServerId(uid, id) ?? await getFixedAccountByLocalId(id)
  if (!existing) return
  const now = new Date().toISOString()
  await putFixedAccount({
    ...existing,
    ...Object.fromEntries(
      Object.entries(data).filter(([k]) => k !== 'id' && k !== 'createdAt'),
    ) as Partial<LocalFixedAccount>,
    syncStatus: 'pending',
    lastModifiedAt: now,
    updatedAt: now,
  })
  await addQueueItem({
    id: genId(),
    uid,
    collection: 'fixedAccounts',
    action: 'update',
    localId: existing.localId,
    serverId: existing.serverId,
    payload: data,
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    status: 'pending',
  })
}

export async function deleteFixedAccountOfflineFirst(uid: string, id: string): Promise<void> {
  if (navigator.onLine) {
    try {
      await fsDelete(uid, id)
      const existing = await getFixedAccountByServerId(uid, id) ?? await getFixedAccountByLocalId(id)
      if (existing) {
        await deleteLocalRecord('fixed_accounts_cache', existing.localId)
      }
      return
    } catch { /* cai para offline */ }
  }
  const existing = await getFixedAccountByServerId(uid, id) ?? await getFixedAccountByLocalId(id)
  if (!existing) return
  await softDeleteFixedAccount(existing.localId)
  const now = new Date().toISOString()
  await addQueueItem({
    id: genId(),
    uid,
    collection: 'fixedAccounts',
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

/** Gera lançamentos do mês — apenas disponível online. */
export async function generateFixedAccountsForMonthOfflineFirst(
  uid: string,
  month: number,
  year: number,
): Promise<{ created: number; skipped: number }> {
  if (!navigator.onLine) return { created: 0, skipped: 0 }
  return fsGenerate(uid, month, year)
}
