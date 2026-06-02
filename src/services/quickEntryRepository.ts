/**
 * quickEntryRepository.ts — Camada offline-first para QuickEntryDraft.
 *
 * Segue o mesmo padrão de categoriesRepository.ts e financeRepository.ts.
 * Online: Firestore + IndexedDB (synced). Offline: IndexedDB + sync_queue.
 */

import { Timestamp } from 'firebase/firestore'
import type { QuickEntryDraft, Transaction } from '../types'
import type { LocalQuickEntryDraft, SyncQueueItem } from '../types/offline'
import {
  getQuickEntryDrafts as fsGetAll,
  getPendingQuickEntryDrafts as fsGetPending,
  addQuickEntryDraft as fsAdd,
  updateQuickEntryDraft as fsUpdate,
  deleteQuickEntryDraft as fsDelete,
} from './firestore'
import { addTransactionOfflineFirst } from './financeRepository'
import {
  putQuickEntryDraft,
  getQuickEntryDraftsByUid,
  getPendingQuickEntryDrafts as dbGetPending,
  getQuickEntryDraftByLocalId,
  getQuickEntryDraftByServerId,
  softDeleteQuickEntryDraft,
  addQueueItem,
  deleteLocalRecord,
} from '../offline/offlineDb'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genId(): string {
  return `local_qe_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function draftToLocal(draft: QuickEntryDraft, uid: string, existingLocalId?: string): LocalQuickEntryDraft {
  return {
    localId: existingLocalId ?? draft.id,
    serverId: draft.id,
    uid,
    syncStatus: 'synced',
    lastModifiedAt: new Date().toISOString(),
    deleted: false,
    source: draft.source,
    messageType: draft.messageType,
    rawText: draft.rawText,
    transcript: draft.transcript ?? null,
    parsedValue: draft.parsedValue ?? null,
    parsedPlace: draft.parsedPlace ?? null,
    parsedDescription: draft.parsedDescription ?? null,
    parsedDate: draft.parsedDate ?? null,
    suggestedCategoryId: draft.suggestedCategoryId ?? null,
    suggestedCategoryName: draft.suggestedCategoryName ?? null,
    transactionNature: draft.transactionNature,
    status: draft.status,
    confidence: draft.confidence,
    missingFields: draft.missingFields,
    transactionId: draft.transactionId ?? null,
    errorMessage: draft.errorMessage ?? null,
    createdAt: draft.createdAt instanceof Timestamp
      ? draft.createdAt.toDate().toISOString()
      : new Date().toISOString(),
    updatedAt: draft.updatedAt instanceof Timestamp
      ? draft.updatedAt.toDate().toISOString()
      : new Date().toISOString(),
  }
}

function localToDraft(local: LocalQuickEntryDraft): QuickEntryDraft {
  return {
    id: local.serverId ?? local.localId,
    source: local.source as QuickEntryDraft['source'],
    messageType: local.messageType as QuickEntryDraft['messageType'],
    rawText: local.rawText,
    transcript: local.transcript,
    parsedValue: local.parsedValue,
    parsedPlace: local.parsedPlace,
    parsedDescription: local.parsedDescription,
    parsedDate: local.parsedDate,
    suggestedCategoryId: local.suggestedCategoryId,
    suggestedCategoryName: local.suggestedCategoryName,
    transactionNature: local.transactionNature as QuickEntryDraft['transactionNature'],
    status: local.status as QuickEntryDraft['status'],
    confidence: local.confidence,
    missingFields: local.missingFields,
    transactionId: local.transactionId,
    errorMessage: local.errorMessage,
    createdAt: Timestamp.fromDate(new Date(local.createdAt)),
    updatedAt: Timestamp.fromDate(new Date(local.updatedAt)),
  }
}

async function upsertFromServer(uid: string, draft: QuickEntryDraft): Promise<void> {
  const existing = await getQuickEntryDraftByServerId(uid, draft.id)
  if (existing) {
    if (existing.syncStatus !== 'pending') {
      await putQuickEntryDraft({ ...draftToLocal(draft, uid), localId: existing.localId })
    }
  } else {
    await putQuickEntryDraft(draftToLocal(draft, uid))
  }
}

// ─── Leitura ─────────────────────────────────────────────────────────────────

export async function getQuickEntryDraftsOfflineFirst(uid: string): Promise<QuickEntryDraft[]> {
  if (navigator.onLine) {
    try {
      const drafts = await fsGetAll(uid)
      await Promise.all(drafts.map((d) => upsertFromServer(uid, d)))
    } catch { /* rede falhou, usa cache */ }
  }
  const locals = await getQuickEntryDraftsByUid(uid)
  return locals.map(localToDraft)
}

export async function getPendingQuickEntryDraftsOfflineFirst(uid: string): Promise<QuickEntryDraft[]> {
  if (navigator.onLine) {
    try {
      const drafts = await fsGetPending(uid)
      await Promise.all(drafts.map((d) => upsertFromServer(uid, d)))
    } catch { /* usa cache */ }
  }
  const locals = await dbGetPending(uid)
  return locals.map(localToDraft)
}

// ─── Criação ─────────────────────────────────────────────────────────────────

export async function addQuickEntryDraftOfflineFirst(
  uid: string,
  data: Omit<QuickEntryDraft, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  if (navigator.onLine) {
    try {
      const id = await fsAdd(uid, data)
      const now = new Date().toISOString()
      await putQuickEntryDraft({
        localId: id,
        serverId: id,
        uid,
        syncStatus: 'synced',
        lastModifiedAt: now,
        deleted: false,
        source: data.source,
        messageType: data.messageType,
        rawText: data.rawText,
        transcript: data.transcript ?? null,
        parsedValue: data.parsedValue ?? null,
        parsedPlace: data.parsedPlace ?? null,
        parsedDescription: data.parsedDescription ?? null,
        parsedDate: data.parsedDate ?? null,
        suggestedCategoryId: data.suggestedCategoryId ?? null,
        suggestedCategoryName: data.suggestedCategoryName ?? null,
        transactionNature: data.transactionNature,
        status: data.status,
        confidence: data.confidence,
        missingFields: data.missingFields,
        transactionId: data.transactionId ?? null,
        errorMessage: data.errorMessage ?? null,
        createdAt: now,
        updatedAt: now,
      })
      return id
    } catch { /* cai para offline */ }
  }

  const localId = genId()
  const now = new Date().toISOString()
  await putQuickEntryDraft({
    localId,
    serverId: undefined,
    uid,
    syncStatus: 'pending',
    lastModifiedAt: now,
    deleted: false,
    source: data.source,
    messageType: data.messageType,
    rawText: data.rawText,
    transcript: data.transcript ?? null,
    parsedValue: data.parsedValue ?? null,
    parsedPlace: data.parsedPlace ?? null,
    parsedDescription: data.parsedDescription ?? null,
    parsedDate: data.parsedDate ?? null,
    suggestedCategoryId: data.suggestedCategoryId ?? null,
    suggestedCategoryName: data.suggestedCategoryName ?? null,
    transactionNature: data.transactionNature,
    status: data.status,
    confidence: data.confidence,
    missingFields: data.missingFields,
    transactionId: data.transactionId ?? null,
    errorMessage: data.errorMessage ?? null,
    createdAt: now,
    updatedAt: now,
  })

  const queueItem: SyncQueueItem = {
    id: genId(),
    uid,
    collection: 'quickEntryDrafts',
    action: 'create',
    localId,
    payload: data,
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    status: 'pending',
  }
  await addQueueItem(queueItem)
  window.dispatchEvent(new CustomEvent('financeQueueChanged', { detail: { uid } }))
  return localId
}

// ─── Atualização ─────────────────────────────────────────────────────────────

export async function updateQuickEntryDraftOfflineFirst(
  uid: string,
  id: string,
  data: Partial<QuickEntryDraft>,
): Promise<void> {
  if (navigator.onLine) {
    try {
      await fsUpdate(uid, id, data)
      const existing =
        (await getQuickEntryDraftByServerId(uid, id)) ??
        (await getQuickEntryDraftByLocalId(id))
      if (existing) {
        await putQuickEntryDraft({
          ...existing,
          ...buildPatch(data),
          syncStatus: 'synced',
          lastModifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
      return
    } catch { /* cai para offline */ }
  }

  const existing =
    (await getQuickEntryDraftByServerId(uid, id)) ??
    (await getQuickEntryDraftByLocalId(id))
  if (!existing) return

  const now = new Date().toISOString()
  await putQuickEntryDraft({
    ...existing,
    ...buildPatch(data),
    syncStatus: 'pending',
    lastModifiedAt: now,
    updatedAt: now,
  })

  await addQueueItem({
    id: genId(),
    uid,
    collection: 'quickEntryDrafts',
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

/** Extrai apenas campos primitivos/simples para patch local (evita Timestamp). */
function buildPatch(data: Partial<QuickEntryDraft>): Partial<LocalQuickEntryDraft> {
  const patch: Partial<LocalQuickEntryDraft> = {}
  if (data.status !== undefined) patch.status = data.status
  if (data.transactionNature !== undefined) patch.transactionNature = data.transactionNature
  if (data.transactionId !== undefined) patch.transactionId = data.transactionId ?? null
  if (data.errorMessage !== undefined) patch.errorMessage = data.errorMessage ?? null
  if (data.parsedValue !== undefined) patch.parsedValue = data.parsedValue ?? null
  if (data.parsedDescription !== undefined) patch.parsedDescription = data.parsedDescription ?? null
  if (data.parsedDate !== undefined) patch.parsedDate = data.parsedDate ?? null
  if (data.suggestedCategoryId !== undefined) patch.suggestedCategoryId = data.suggestedCategoryId ?? null
  if (data.suggestedCategoryName !== undefined) patch.suggestedCategoryName = data.suggestedCategoryName ?? null
  if (data.confidence !== undefined) patch.confidence = data.confidence
  if (data.missingFields !== undefined) patch.missingFields = data.missingFields
  return patch
}

// ─── Ignorar ─────────────────────────────────────────────────────────────────

export async function ignoreQuickEntryDraftOfflineFirst(uid: string, id: string): Promise<void> {
  await updateQuickEntryDraftOfflineFirst(uid, id, { status: 'ignored' })
}

// ─── Excluir (físico) ────────────────────────────────────────────────────────

export async function deleteQuickEntryDraftOfflineFirst(uid: string, id: string): Promise<void> {
  if (navigator.onLine) {
    try {
      await fsDelete(uid, id)
      const existing =
        (await getQuickEntryDraftByServerId(uid, id)) ??
        (await getQuickEntryDraftByLocalId(id))
      if (existing) await deleteLocalRecord('quick_entry_drafts_cache', existing.localId)
      return
    } catch { /* cai para offline */ }
  }

  const existing =
    (await getQuickEntryDraftByServerId(uid, id)) ??
    (await getQuickEntryDraftByLocalId(id))
  if (!existing) return

  await softDeleteQuickEntryDraft(existing.localId)
  const now = new Date().toISOString()
  await addQueueItem({
    id: genId(),
    uid,
    collection: 'quickEntryDrafts',
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

// ─── Converter para Transaction ───────────────────────────────────────────────

export async function convertQuickEntryDraftToTransactionOfflineFirst(
  uid: string,
  draftId: string,
  transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  // Validações obrigatórias
  if (!transactionData.value || transactionData.value <= 0) {
    throw new Error('Valor inválido ou zero.')
  }
  if (!transactionData.description?.trim()) {
    throw new Error('Descrição obrigatória.')
  }
  if (!transactionData.categoryId) {
    throw new Error('Categoria obrigatória.')
  }
  if (!transactionData.categoryName) {
    throw new Error('Nome da categoria ausente.')
  }
  if (!transactionData.launchDate) {
    throw new Error('Data de lançamento obrigatória.')
  }
  if (!transactionData.chargeDate) {
    throw new Error('Data de vencimento obrigatória.')
  }

  // Criar a Transaction usando o fluxo offline-first existente
  const transactionId = await addTransactionOfflineFirst(uid, {
    ...transactionData,
    type: 'normal',
  })

  // Atualizar o draft como convertido
  await updateQuickEntryDraftOfflineFirst(uid, draftId, {
    status: 'converted',
    transactionId,
  })

  return transactionId
}
