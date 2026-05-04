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
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  const ref = await addDoc(col(uid, 'fixedAccounts'), { ...clean, createdAt: now(), updatedAt: now() })
  return ref.id
}

export async function updateFixedAccount(uid: string, id: string, data: Partial<FixedAccount>): Promise<void> {
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  await updateDoc(doc(db, `users/${uid}/fixedAccounts/${id}`), { ...clean, updatedAt: now() })
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

/**
 * Retorna todas as datas (YYYY-MM-DD) do mês/ano que caem no weekDay especificado.
 * weekDay: 0=Dom, 1=Seg, ..., 6=Sáb
 */
export function getDatesForWeekDayInMonth(month: number, year: number, weekDay: number): string[] {
  const dates: string[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    if (date.getDay() === weekDay) {
      const m = String(month).padStart(2, '0')
      const dd = String(d).padStart(2, '0')
      dates.push(`${year}-${m}-${dd}`)
    }
  }
  return dates
}

export async function generateFixedAccountsForMonth(
  uid: string,
  month: number,
  year: number
): Promise<{ created: number; skipped: number }> {
  const accounts = await getFixedAccounts(uid)
  const activeAccounts = accounts.filter((a) => {
    if (!a.active) return false
    if (!a.startYear || !a.startMonth) return true
    if (year > a.startYear) return true
    if (year === a.startYear && month >= a.startMonth) return true
    return false
  })

  // Busca lançamentos fixos já existentes no mês para evitar duplicatas
  const existing = await getDocs(
    query(
      col(uid, 'transactions'),
      where('month', '==', month),
      where('year', '==', year),
      where('type', '==', 'fixed')
    )
  )

  // Para mensais: controle por fixedAccountId
  const existingMonthlyIds = new Set<string>()
  // Para semanais: controle por fixedAccountId|chargeDate
  const existingWeeklyKeys = new Set<string>()
  for (const d of existing.docs) {
    const data = d.data()
    if (data.fixedAccountId) {
      existingMonthlyIds.add(data.fixedAccountId)
      if (data.chargeDate) {
        existingWeeklyKeys.add(`${data.fixedAccountId}|${data.chargeDate}`)
      }
    }
  }

  const batch = writeBatch(db)
  let created = 0
  let skipped = 0
  const launchDate = new Date().toISOString().slice(0, 10)

  for (const account of activeAccounts) {
    const isWeekly = account.recurrenceType === 'weekly'

    if (!isWeekly) {
      // ── Conta mensal (comportamento original) ──
      if (existingMonthlyIds.has(account.id)) {
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
        launchDate,
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
    } else {
      // ── Conta semanal ──
      const wd = account.weekDay ?? 0
      const dates = getDatesForWeekDayInMonth(month, year, wd)
      for (const chargeDate of dates) {
        const key = `${account.id}|${chargeDate}`
        if (existingWeeklyKeys.has(key)) {
          skipped++
          continue
        }
        const ref = doc(col(uid, 'transactions'))
        batch.set(ref, {
          description: account.description,
          value: account.value,
          categoryId: account.categoryId,
          categoryName: account.categoryName,
          launchDate,
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
    }
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

// ─── Generate for Year ──────────────────────────────────────────────────────
/**
 * Gera lançamentos de contas fixas para um ou mais anos completos (jan→dez).
 */
export async function generateFixedAccountsForYear(
  uid: string,
  years: number[]
): Promise<{ created: number; skipped: number }> {
  let totalCreated = 0
  let totalSkipped = 0
  for (const year of years) {
    for (let m = 1; m <= 12; m++) {
      const { created, skipped } = await generateFixedAccountsForMonth(uid, m, year)
      totalCreated += created
      totalSkipped += skipped
    }
  }
  return { created: totalCreated, skipped: totalSkipped }
}

// ─── Copy pending from previous month ────────────────────────────────────────
/**
 * Copia lançamentos normais pendentes do mês anterior para o mês alvo.
 * Ignora lançamentos do tipo 'fixed' e 'installment'.
 * Evita duplicatas por (description|categoryId).
 */
export async function copyPendingFromPreviousMonth(
  uid: string,
  targetMonth: number,
  targetYear: number
): Promise<{ copied: number; skipped: number }> {
  let prevMonth = targetMonth - 1
  let prevYear = targetYear
  if (prevMonth === 0) { prevMonth = 12; prevYear-- }

  const [prevSnap, existingSnap] = await Promise.all([
    getDocs(query(col(uid, 'transactions'), where('month', '==', prevMonth), where('year', '==', prevYear), where('status', '==', 'pending'), where('type', '==', 'normal'))),
    getDocs(query(col(uid, 'transactions'), where('month', '==', targetMonth), where('year', '==', targetYear))),
  ])

  const existingKeys = new Set<string>()
  for (const d of existingSnap.docs) {
    const data = d.data()
    existingKeys.add(`${data.description}|${data.categoryId}`)
  }

  const batch = writeBatch(db)
  let copied = 0
  let skipped = 0
  const mm = String(targetMonth).padStart(2, '0')
  const launchDate = new Date().toISOString().slice(0, 10)

  for (const d of prevSnap.docs) {
    const data = d.data()
    const key = `${data.description}|${data.categoryId}`
    if (existingKeys.has(key)) { skipped++; continue }

    const day = data.chargeDate?.split('-')[2] ?? '01'
    const chargeDate = `${targetYear}-${mm}-${day}`

    const ref = doc(col(uid, 'transactions'))
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = data as Record<string, unknown>
    batch.set(ref, {
      ...rest,
      chargeDate,
      month: targetMonth,
      year: targetYear,
      launchDate,
      status: 'pending',
      createdAt: now(),
      updatedAt: now(),
    })
    copied++
  }

  if (copied > 0) await batch.commit()
  return { copied, skipped }
}

// ─── Bring previous month balance ─────────────────────────────────────────────
/**
 * Calcula o saldo do mês anterior (receitas pagas − despesas pagas),
 * cria um lançamento "Saldo anterior (MM/AAAA)" no mês alvo e retorna o saldo.
 * Requer categoryId e categoryName para o lançamento de saldo.
 */
export async function bringPreviousMonthBalance(
  uid: string,
  targetMonth: number,
  targetYear: number,
  balanceCategoryId: string,
  balanceCategoryName: string
): Promise<{ balance: number }> {
  let prevMonth = targetMonth - 1
  let prevYear = targetYear
  if (prevMonth === 0) { prevMonth = 12; prevYear-- }

  const prevSnap = await getDocs(
    query(col(uid, 'transactions'), where('month', '==', prevMonth), where('year', '==', prevYear), where('status', '==', 'paid'))
  )

  let income = 0
  let expense = 0
  for (const d of prevSnap.docs) {
    const data = d.data()
    const nature: string = data.transactionNature ?? 'expense'
    if (nature === 'income') income += data.value as number
    else expense += data.value as number
  }

  const balance = income - expense
  const mm = String(targetMonth).padStart(2, '0')
  const prevMm = String(prevMonth).padStart(2, '0')
  const chargeDate = `${targetYear}-${mm}-01`
  const launchDate = new Date().toISOString().slice(0, 10)
  const nature = balance >= 0 ? 'income' : 'expense'

  await addDoc(col(uid, 'transactions'), {
    description: `Saldo anterior (${prevMm}/${prevYear})`,
    value: Math.abs(balance),
    categoryId: balanceCategoryId,
    categoryName: balanceCategoryName,
    launchDate,
    chargeDate,
    month: targetMonth,
    year: targetYear,
    status: 'paid',
    type: 'normal',
    transactionNature: nature,
    createdAt: now(),
    updatedAt: now(),
  })

  return { balance }
}

// ─── Installment cascade update ───────────────────────────────────────────────
/**
 * Atualiza value e/ou description de todas as parcelas a partir de installmentNumber.
 * Após atualizar, recalcula as estatísticas do grupo.
 */
export async function updateInstallmentCascade(
  uid: string,
  installmentGroupId: string,
  fromInstallmentNumber: number,
  updates: { value?: number; description?: string }
): Promise<number> {
  const transactions = await getInstallmentTransactions(uid, installmentGroupId)
  const future = transactions.filter(
    (t) => t.installmentNumber !== undefined && t.installmentNumber >= fromInstallmentNumber && t.status === 'pending'
  )

  if (future.length === 0) return 0

  const batch = writeBatch(db)
  for (const t of future) {
    const patch: Record<string, unknown> = { updatedAt: now() }
    if (updates.value !== undefined) patch.value = updates.value
    if (updates.description !== undefined) {
      // Mantém o sufixo "N/Total"
      const suffix = ` ${t.installmentNumber}/${t.totalInstallments}`
      const base = updates.description.replace(/\s+\d+\/\d+$/, '')
      patch.description = `${base}${suffix}`
    }
    batch.update(doc(db, `users/${uid}/transactions/${t.id}`), patch)
  }
  await batch.commit()
  await refreshInstallmentGroupStats(uid, installmentGroupId)
  return future.length
}

// ─── Reports ──────────────────────────────────────────────────────────────────
/**
 * Busca transações entre duas datas (chargeDate >= startDate, chargeDate <= endDate).
 */
export async function getTransactionsByRange(
  uid: string,
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  const snap = await getDocs(
    query(
      col(uid, 'transactions'),
      where('chargeDate', '>=', startDate),
      where('chargeDate', '<=', endDate),
      orderBy('chargeDate')
    )
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction))
}
