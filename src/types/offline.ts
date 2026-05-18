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

/**
 * Categoria armazenada no IndexedDB local.
 */
export interface LocalCategory {
  localId: string
  serverId?: string
  uid: string
  syncStatus: SyncStatus
  lastModifiedAt: string
  deleted?: boolean
  name: string
  color: string
  type: string
  createdAt: string
  updatedAt: string
}

/**
 * Conta fixa armazenada no IndexedDB local.
 */
export interface LocalFixedAccount {
  localId: string
  serverId?: string
  uid: string
  syncStatus: SyncStatus
  lastModifiedAt: string
  deleted?: boolean
  description: string
  value: number
  categoryId: string
  categoryName: string
  chargeDay: number
  startMonth: number
  startYear: number
  active: boolean
  recurrenceType?: string
  weekDay?: number
  transactionNature?: string
  createdAt: string
  updatedAt: string
}

/**
 * Grupo de parcelamento armazenado no IndexedDB local.
 */
export interface LocalInstallmentGroup {
  localId: string
  serverId?: string
  uid: string
  syncStatus: SyncStatus
  lastModifiedAt: string
  deleted?: boolean
  description: string
  categoryId: string
  categoryName: string
  totalValue: number
  installmentValue: number
  totalInstallments: number
  firstInstallmentDate: string
  lastInstallmentDate: string
  paidInstallments: number
  pendingInstallments: number
  paidValue: number
  remainingValue: number
  status: string
  transactionNature?: string
  createdAt: string
  updatedAt: string
}

