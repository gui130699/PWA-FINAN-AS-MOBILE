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

export type RecurrenceType = 'monthly' | 'weekly'

export const WEEK_DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
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
  /** 'monthly' (padrão) ou 'weekly'. Ausente em registros antigos = mensal. */
  recurrenceType?: RecurrenceType
  /** 0=Dom, 1=Seg, ..., 6=Sáb. Usado somente quando recurrenceType === 'weekly'. */
  weekDay?: number
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
