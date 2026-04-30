import { Timestamp } from 'firebase/firestore'

export type TransactionStatus = 'pending' | 'paid'
export type TransactionType = 'normal' | 'fixed' | 'installment'
export type CategoryType = 'expense' | 'income' | 'both'
export type InstallmentStatus = 'ongoing' | 'paid_off' | 'late'

export interface Category {
  id: string
  name: string
  color: string
  type: CategoryType
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Transaction {
  id: string
  description: string
  value: number
  categoryId: string
  categoryName: string
  launchDate: string
  chargeDate: string
  month: number
  year: number
  status: TransactionStatus
  type: TransactionType
  fixedAccountId?: string
  installmentGroupId?: string
  installmentNumber?: number
  totalInstallments?: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface FixedAccount {
  id: string
  description: string
  value: number
  categoryId: string
  categoryName: string
  chargeDay: number
  startMonth: number
  startYear: number
  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface InstallmentGroup {
  id: string
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
  status: InstallmentStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface MonthFilter {
  month: number
  year: number
}
