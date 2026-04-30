import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Category, Transaction, FixedAccount, InstallmentGroup } from '../types'
import { addMonths, getMonthYear } from '../utils/formatters'

// ─── Helpers ────────────────────────────────────────────────────────────────
const col = (uid: string, sub: string) => collection(db, `users/${uid}/${sub}`)

function now() {
  return Timestamp.now()
}

// ─── Categories ─────────────────────────────────────────────────────────────
export async function getCategories(uid: string): Promise<Category[]> {
  const snap = await getDocs(query(col(uid, 'categories'), orderBy('name')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
}

export async function addCategory(uid: string, data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(col(uid, 'categories'), { ...data, createdAt: now(), updatedAt: now() })
  return ref.id
}

export async function updateCategory(uid: string, id: string, data: Partial<Category>): Promise<void> {
  await updateDoc(doc(db, `users/${uid}/categories/${id}`), { ...data, updatedAt: now() })
}

export async function deleteCategory(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, `users/${uid}/categories/${id}`))
}

// ─── Transactions ────────────────────────────────────────────────────────────
export async function getTransactions(uid: string, month: number, year: number): Promise<Transaction[]> {
  const snap = await getDocs(
    query(
      col(uid, 'transactions'),
      where('month', '==', month),
      where('year', '==', year),
      orderBy('chargeDate')
    )
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction))
}

export async function addTransaction(uid: string, data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(col(uid, 'transactions'), { ...data, createdAt: now(), updatedAt: now() })
  return ref.id
}

export async function updateTransaction(uid: string, id: string, data: Partial<Transaction>): Promise<void> {
  await updateDoc(doc(db, `users/${uid}/transactions/${id}`), { ...data, updatedAt: now() })
}

export async function deleteTransaction(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, `users/${uid}/transactions/${id}`))
}

// ─── Fixed Accounts ──────────────────────────────────────────────────────────
export async function getFixedAccounts(uid: string): Promise<FixedAccount[]> {
  const snap = await getDocs(query(col(uid, 'fixedAccounts'), orderBy('description')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FixedAccount))
}

export async function addFixedAccount(uid: string, data: Omit<FixedAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(col(uid, 'fixedAccounts'), { ...data, createdAt: now(), updatedAt: now() })
  return ref.id
}

export async function updateFixedAccount(uid: string, id: string, data: Partial<FixedAccount>): Promise<void> {
  await updateDoc(doc(db, `users/${uid}/fixedAccounts/${id}`), { ...data, updatedAt: now() })
}

export async function deleteFixedAccount(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, `users/${uid}/fixedAccounts/${id}`))
}

/**
 * Atualiza startMonth/startYear de uma conta fixa e remove os lançamentos
 * PENDENTES cujo mês/ano é anterior ao novo período de início.
 * Lançamentos já pagos são mantidos independente da data.
 */
export async function updateFixedAccountStartDate(
  uid: string,
  id: string,
  newStartMonth: number,
  newStartYear: number
): Promise<{ removed: number }> {
  // Atualiza a conta fixa
  await updateDoc(doc(db, `users/${uid}/fixedAccounts/${id}`), {
    startMonth: newStartMonth,
    startYear: newStartYear,
    updatedAt: Timestamp.now(),
  })

  // Busca todos os lançamentos pendentes desta conta fixa
  const snap = await getDocs(
    query(
      col(uid, 'transactions'),
      where('fixedAccountId', '==', id),
      where('status', '==', 'pending')
    )
  )

  const batch = writeBatch(db)
  let removed = 0

  for (const d of snap.docs) {
    const data = d.data()
    const txYear: number = data.year
    const txMonth: number = data.month
    // Remove se o lançamento é anterior ao novo início
    const isBeforeStart =
      txYear < newStartYear || (txYear === newStartYear && txMonth < newStartMonth)
    if (isBeforeStart) {
      batch.delete(d.ref)
      removed++
    }
  }

  if (removed > 0) await batch.commit()
  return { removed }
}

export async function generateFixedAccountsForMonth(
  uid: string,
  month: number,
  year: number
): Promise<{ created: number; skipped: number }> {
  const accounts = await getFixedAccounts(uid)
  const activeAccounts = accounts.filter((a) => {
    if (!a.active) return false
    // Só gera se o mês/ano da tela for >= ao mês/ano do primeiro pagamento
    if (!a.startYear || !a.startMonth) return true // compatibilidade com registros antigos
    if (year > a.startYear) return true
    if (year === a.startYear && month >= a.startMonth) return true
    return false
  })

  // Check existing transactions for this month
  const existing = await getDocs(
    query(
      col(uid, 'transactions'),
      where('month', '==', month),
      where('year', '==', year),
      where('type', '==', 'fixed')
    )
  )
  const existingFixedIds = new Set(existing.docs.map((d) => d.data().fixedAccountId))

  const batch = writeBatch(db)
  let created = 0
  let skipped = 0

  for (const account of activeAccounts) {
    if (existingFixedIds.has(account.id)) {
      skipped++
      continue
    }
    const day = String(account.chargeDay).padStart(2, '0')
    const m = String(month).padStart(2, '0')
    const chargeDate = `${year}-${m}-${day}`

    const ref = doc(col(uid, 'transactions'))
    batch.set(ref, {
      description: account.description,
      value: account.value,
      categoryId: account.categoryId,
      categoryName: account.categoryName,
      launchDate: new Date().toISOString().slice(0, 10),
      chargeDate,
      month,
      year,
      status: 'pending',
      type: 'fixed',
      fixedAccountId: account.id,
      createdAt: now(),
      updatedAt: now(),
    })
    created++
  }

  await batch.commit()
  return { created, skipped }
}

// ─── Installment Groups ──────────────────────────────────────────────────────
export async function getInstallmentGroups(uid: string): Promise<InstallmentGroup[]> {
  const snap = await getDocs(query(col(uid, 'installmentGroups'), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as InstallmentGroup))
}

export async function createInstallmentGroup(
  uid: string,
  data: {
    description: string
    categoryId: string
    categoryName: string
    totalValue: number
    installmentValue: number
    totalInstallments: number
    firstInstallmentDate: string
  }
): Promise<string> {
  const lastDate = addMonths(data.firstInstallmentDate, data.totalInstallments - 1)

  const groupRef = await addDoc(col(uid, 'installmentGroups'), {
    ...data,
    lastInstallmentDate: lastDate,
    paidInstallments: 0,
    pendingInstallments: data.totalInstallments,
    paidValue: 0,
    remainingValue: data.totalValue,
    status: 'ongoing',
    createdAt: now(),
    updatedAt: now(),
  })

  const batch = writeBatch(db)
  for (let i = 0; i < data.totalInstallments; i++) {
    const chargeDate = addMonths(data.firstInstallmentDate, i)
    const { month, year } = getMonthYear(chargeDate)
    const ref = doc(col(uid, 'transactions'))
    batch.set(ref, {
      description: `${data.description} ${i + 1}/${data.totalInstallments}`,
      value: data.installmentValue,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      launchDate: new Date().toISOString().slice(0, 10),
      chargeDate,
      month,
      year,
      status: 'pending',
      type: 'installment',
      installmentGroupId: groupRef.id,
      installmentNumber: i + 1,
      totalInstallments: data.totalInstallments,
      createdAt: now(),
      updatedAt: now(),
    })
  }
  await batch.commit()
  return groupRef.id
}

export async function getInstallmentTransactions(uid: string, groupId: string): Promise<Transaction[]> {
  const snap = await getDocs(
    query(
      col(uid, 'transactions'),
      where('installmentGroupId', '==', groupId),
      orderBy('chargeDate')
    )
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction))
}

export async function refreshInstallmentGroupStats(uid: string, groupId: string): Promise<void> {
  const transactions = await getInstallmentTransactions(uid, groupId)
  const paid = transactions.filter((t) => t.status === 'paid')
  const pending = transactions.filter((t) => t.status === 'pending')
  const paidValue = paid.reduce((s, t) => s + t.value, 0)
  const totalValue = transactions.reduce((s, t) => s + t.value, 0)

  const today = new Date().toISOString().slice(0, 10)
  const hasLate = pending.some((t) => t.chargeDate < today)

  let status: 'ongoing' | 'paid_off' | 'late' = 'ongoing'
  if (pending.length === 0) status = 'paid_off'
  else if (hasLate) status = 'late'

  await updateDoc(doc(db, `users/${uid}/installmentGroups/${groupId}`), {
    paidInstallments: paid.length,
    pendingInstallments: pending.length,
    paidValue,
    remainingValue: totalValue - paidValue,
    status,
    updatedAt: now(),
  })
}

export async function deleteInstallmentGroup(uid: string, groupId: string): Promise<void> {
  const transactions = await getInstallmentTransactions(uid, groupId)
  const batch = writeBatch(db)
  transactions.forEach((t) => {
    batch.delete(doc(db, `users/${uid}/transactions/${t.id}`))
  })
  batch.delete(doc(db, `users/${uid}/installmentGroups/${groupId}`))
  await batch.commit()
}
