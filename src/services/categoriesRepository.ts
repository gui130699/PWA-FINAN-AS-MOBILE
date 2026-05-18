/**
 * categoriesRepository.ts — Camada offline-first para categorias.
 *
 * - Online: lê/escreve direto no Firestore; mantém cache local sincronizado.
 * - Offline: lê/escreve no IndexedDB; enfileira operações para sync posterior.
 */

import { Timestamp } from 'firebase/firestore'
import type { Category } from '../types'
import type { LocalCategory, SyncQueueItem } from '../types/offline'
import {
  getCategories as fsGetCategories,
  addCategory as fsAdd,
  updateCategory as fsUpdate,
  deleteCategory as fsDelete,
} from './firestore'
import {
  putCategory,
  getCategories as dbGetCategories,
  getCategoryByLocalId,
  getCategoryByServerId,
  softDeleteCategory,
  addQueueItem,
} from '../offline/offlineDb'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return `local_cat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function catToLocal(c: Category, uid: string): LocalCategory {
  return {
    localId: c.id,
    serverId: c.id,
    uid,
    syncStatus: 'synced',
    lastModifiedAt: new Date().toISOString(),
    deleted: false,
    name: c.name,
    color: c.color,
    type: c.type,
    createdAt:
      c.createdAt instanceof Timestamp
        ? c.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    updatedAt:
      c.updatedAt instanceof Timestamp
        ? c.updatedAt.toDate().toISOString()
        : new Date().toISOString(),
  }
}

function localToCat(local: LocalCategory): Category {
  return {
    id: local.serverId ?? local.localId,
    name: local.name,
    color: local.color,
    type: local.type as Category['type'],
    createdAt: Timestamp.fromDate(new Date(local.createdAt)),
    updatedAt: Timestamp.fromDate(new Date(local.updatedAt)),
  }
}

async function upsertFromServer(uid: string, c: Category): Promise<void> {
  const existing = await getCategoryByServerId(uid, c.id)
  if (existing) {
    if (existing.syncStatus !== 'pending') {
      await putCategory({ ...catToLocal(c, uid), localId: existing.localId })
    }
  } else {
    await putCategory(catToLocal(c, uid))
  }
}

// ─── API Pública ──────────────────────────────────────────────────────────────

export async function getCategoriesOfflineFirst(uid: string): Promise<Category[]> {
  if (navigator.onLine) {
    try {
      const cats = await fsGetCategories(uid)
      await Promise.all(cats.map((c) => upsertFromServer(uid, c)))
      const locals = await dbGetCategories(uid)
      const pendingOnly = locals.filter((r) => !r.serverId && r.syncStatus === 'pending')
      const serverIds = new Set(cats.map((c) => c.id))
      const editedOffline = locals.filter(
        (r) => r.serverId && r.syncStatus === 'pending' && serverIds.has(r.serverId),
      )
      const result: Category[] = cats
        .filter((c) => !editedOffline.some((e) => e.serverId === c.id))
        .map((c) => c)
      for (const e of editedOffline) result.push(localToCat(e))
      for (const p of pendingOnly) result.push(localToCat(p))
      return result
    } catch {
      // Rede falhou — cai para cache
    }
  }
  const locals = await dbGetCategories(uid)
  return locals.map(localToCat)
}

export async function addCategoryOfflineFirst(
  uid: string,
  data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  if (navigator.onLine) {
    try {
      const id = await fsAdd(uid, data)
      await putCategory(catToLocal({ id, ...data, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }, uid))
      return id
    } catch { /* cai para offline */ }
  }
  const localId = genId()
  const now = new Date().toISOString()
  await putCategory({
    localId,
    serverId: undefined,
    uid,
    syncStatus: 'pending',
    lastModifiedAt: now,
    deleted: false,
    name: data.name,
    color: data.color,
    type: data.type,
    createdAt: now,
    updatedAt: now,
  })
  const queueItem: SyncQueueItem = {
    id: genId(),
    uid,
    collection: 'categories',
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

export async function updateCategoryOfflineFirst(
  uid: string,
  id: string,
  data: Partial<Category>,
): Promise<void> {
  if (navigator.onLine) {
    try {
      await fsUpdate(uid, id, data)
      const existing = await getCategoryByServerId(uid, id) ?? await getCategoryByLocalId(id)
      if (existing) {
        await putCategory({
          ...existing,
          ...Object.fromEntries(
            Object.entries(data).filter(([k]) => k !== 'id' && k !== 'createdAt'),
          ) as Partial<LocalCategory>,
          syncStatus: 'synced',
          lastModifiedAt: new Date().toISOString(),
        })
      }
      return
    } catch { /* cai para offline */ }
  }
  const existing = await getCategoryByServerId(uid, id) ?? await getCategoryByLocalId(id)
  if (!existing) return
  const now = new Date().toISOString()
  await putCategory({
    ...existing,
    ...Object.fromEntries(
      Object.entries(data).filter(([k]) => k !== 'id' && k !== 'createdAt'),
    ) as Partial<LocalCategory>,
    syncStatus: 'pending',
    lastModifiedAt: now,
    updatedAt: now,
  })
  await addQueueItem({
    id: genId(),
    uid,
    collection: 'categories',
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

export async function deleteCategoryOfflineFirst(uid: string, id: string): Promise<void> {
  if (navigator.onLine) {
    try {
      await fsDelete(uid, id)
      const existing = await getCategoryByServerId(uid, id) ?? await getCategoryByLocalId(id)
      if (existing) {
        const { deleteLocalRecord } = await import('../offline/offlineDb')
        await deleteLocalRecord('categories_cache', existing.localId)
      }
      return
    } catch { /* cai para offline */ }
  }
  const existing = await getCategoryByServerId(uid, id) ?? await getCategoryByLocalId(id)
  if (!existing) return
  await softDeleteCategory(existing.localId)
  const now = new Date().toISOString()
  await addQueueItem({
    id: genId(),
    uid,
    collection: 'categories',
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
