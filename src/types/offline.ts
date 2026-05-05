// Tipos para o sistema de sincronização offline-first

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error'

export type SyncAction = 'create' | 'update' | 'delete'

export type SyncCollection =
  | 'transactions'
  | 'categories'
  | 'fixedAccounts'
  | 'installmentGroups'

export interface SyncQueueItem {
  id: string
  uid: string
  collection: SyncCollection
  action: SyncAction
  localId: string
  serverId?: string
  payload: unknown
  createdAt: string
  updatedAt: string
  attempts: number
  status: SyncStatus
  errorMessage?: string
  uniqueKey?: string
}

/**
 * Transação armazenada no IndexedDB local.
 * Usa strings ISO para datas (não Timestamp do Firestore).
 */
export interface LocalTransaction {
  localId: string
  serverId?: string
  uid: string
  syncStatus: SyncStatus
  lastModifiedAt: string
  deleted?: boolean
  // campos espelhados de Transaction
  description: string
  value: number
  categoryId: string
  categoryName: string
  launchDate: string
  chargeDate: string
  month: number
  year: number
  status: string
  type: string
  transactionNature?: string
  systemTag?: string
  fixedAccountId?: string
  installmentGroupId?: string
  installmentNumber?: number
  totalInstallments?: number
  createdAt: string
  updatedAt: string
}
