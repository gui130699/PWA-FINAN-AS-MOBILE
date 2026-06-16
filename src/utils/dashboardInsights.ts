/**
 * dashboardInsights.ts
 * Funções de cálculo e análise para a Dashboard financeira inteligente.
 * Não muta arrays originais. Não depende de Firebase.
 */

import type { Transaction, Category, TransactionNature } from '../types'
import { todayISO } from './formatters'

// ─── Helpers de natureza ─────────────────────────────────────────────────────

export function buildCatTypeMap(categories: Category[]): Map<string, string> {
  const m = new Map<string, string>()
  categories.forEach((c) => m.set(c.id, c.type))
  return m
}

export function getTransactionNature(
  t: Transaction,
  catTypeMap: Map<string, string>
): TransactionNature {
  if (t.transactionNature) return t.transactionNature
  const ct = catTypeMap.get(t.categoryId)
  return ct === 'income' ? 'income' : 'expense'
}

// ─── Resumo do mês ────────────────────────────────────────────────────────────

export interface MonthSummary {
  incTotal: number
  incPaid: number
  incPending: number
  expTotal: number
  expPaid: number
  expPending: number
  saldoAtual: number     // incPaid - expPaid
  saldoPrevisto: number  // incTotal - expTotal
  expFixed: number
  incFixed: number
  expInst: number
  incInst: number
  percentCompromised: number  // expTotal / incTotal * 100
}

export function getMonthSummary(
  transactions: Transaction[],
  catTypeMap: Map<string, string>
): MonthSummary {
  const inc = transactions.filter((t) => getTransactionNature(t, catTypeMap) === 'income')
  const exp = transactions.filter((t) => getTransactionNature(t, catTypeMap) === 'expense')

  const incTotal = inc.reduce((s, t) => s + t.value, 0)
  const incPaid  = inc.filter((t) => t.status === 'paid').reduce((s, t) => s + t.value, 0)
  const expTotal = exp.reduce((s, t) => s + t.value, 0)
  const expPaid  = exp.filter((t) => t.status === 'paid').reduce((s, t) => s + t.value, 0)

  return {
    incTotal,
    incPaid,
    incPending: incTotal - incPaid,
    expTotal,
    expPaid,
    expPending: expTotal - expPaid,
    saldoAtual: incPaid - expPaid,
    saldoPrevisto: incTotal - expTotal,
    expFixed: exp.filter((t) => t.type === 'fixed').reduce((s, t) => s + t.value, 0),
    incFixed: inc.filter((t) => t.type === 'fixed').reduce((s, t) => s + t.value, 0),
    expInst:  exp.filter((t) => t.type === 'installment').reduce((s, t) => s + t.value, 0),
    incInst:  inc.filter((t) => t.type === 'installment').reduce((s, t) => s + t.value, 0),
    percentCompromised: incTotal > 0 ? Math.round((expTotal / incTotal) * 100) : 0,
  }
}

// ─── Estimativa de fechamento do mês ─────────────────────────────────────────

export interface MonthEndEstimate {
  avgDailyExpense: number     // média diária de despesas pagas até hoje
  estimatedTotal: number      // projeção até fim do mês
  projectedBalance: number    // incTotal - estimatedTotal
  daysElapsed: number
  daysRemaining: number
  daysInMonth: number
}

export function estimateMonthEnd(
  transactions: Transaction[],
  catTypeMap: Map<string, string>,
  selectedMonth: number,
  selectedYear: number
): MonthEndEstimate {
  const today = todayISO()
  const todayDate = new Date(today)
  const currentMonth = todayDate.getMonth() + 1
  const currentYear  = todayDate.getFullYear()

  const isCurrentMonth = selectedMonth === currentMonth && selectedYear === currentYear

  const daysInMonthCount = new Date(selectedYear, selectedMonth, 0).getDate()

  let daysElapsed: number
  if (isCurrentMonth) {
    daysElapsed = todayDate.getDate()
  } else if (
    selectedYear < currentYear ||
    (selectedYear === currentYear && selectedMonth < currentMonth)
  ) {
    daysElapsed = daysInMonthCount
  } else {
    daysElapsed = 0
  }

  const daysRemaining = Math.max(0, daysInMonthCount - daysElapsed)

  const exp = transactions.filter((t) => getTransactionNature(t, catTypeMap) === 'expense')
  const inc = transactions.filter((t) => getTransactionNature(t, catTypeMap) === 'income')

  // Apenas despesas pagas até hoje (para calcular média diária real)
  const expPaidUntilToday = exp
    .filter((t) => t.status === 'paid' && t.chargeDate <= today)
    .reduce((s, t) => s + t.value, 0)

  const avgDailyExpense = daysElapsed > 0 ? expPaidUntilToday / daysElapsed : 0

  // Despesas pendentes já lançadas
  const expPending = exp.filter((t) => t.status === 'pending').reduce((s, t) => s + t.value, 0)
  const expPaid    = exp.filter((t) => t.status === 'paid').reduce((s, t) => s + t.value, 0)

  // Estimativa: despesas pagas + despesas pendentes lançadas + projeção pelos dias restantes (somente normal)
  const normalPendingNotLaunched = isCurrentMonth
    ? avgDailyExpense * daysRemaining * 0.3  // fator conservador para gastos não lançados
    : 0
  const estimatedTotal = expPaid + expPending + normalPendingNotLaunched

  const incTotal = inc.reduce((s, t) => s + t.value, 0)

  return {
    avgDailyExpense,
    estimatedTotal,
    projectedBalance: incTotal - estimatedTotal,
    daysElapsed,
    daysRemaining,
    daysInMonth: daysInMonthCount,
  }
}

// ─── Comparativo com mês anterior ─────────────────────────────────────────────

export interface MonthComparison {
  currentExpTotal: number
  prevExpTotal: number
  currentIncTotal: number
  prevIncTotal: number
  currentBalance: number
  prevBalance: number
  expDiff: number
  incDiff: number
  balanceDiff: number
  expPctChange: number | null
  incPctChange: number | null
  balancePctChange: number | null
}

export function compareWithPreviousMonth(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[],
  catTypeMap: Map<string, string>
): MonthComparison {
  const summarize = (txs: Transaction[]) => {
    const inc = txs.filter((t) => getTransactionNature(t, catTypeMap) === 'income')
    const exp = txs.filter((t) => getTransactionNature(t, catTypeMap) === 'expense')
    const incTotal = inc.reduce((s, t) => s + t.value, 0)
    const expTotal = exp.reduce((s, t) => s + t.value, 0)
    return { incTotal, expTotal, balance: incTotal - expTotal }
  }

  const curr = summarize(currentTransactions)
  const prev = summarize(previousTransactions)

  const pct = (curr: number, prev: number): number | null => {
    if (prev === 0) return null
    return Math.round(((curr - prev) / prev) * 100)
  }

  return {
    currentExpTotal: curr.expTotal,
    prevExpTotal: prev.expTotal,
    currentIncTotal: curr.incTotal,
    prevIncTotal: prev.incTotal,
    currentBalance: curr.balance,
    prevBalance: prev.balance,
    expDiff: curr.expTotal - prev.expTotal,
    incDiff: curr.incTotal - prev.incTotal,
    balanceDiff: curr.balance - prev.balance,
    expPctChange: pct(curr.expTotal, prev.expTotal),
    incPctChange: pct(curr.incTotal, prev.incTotal),
    balancePctChange: pct(curr.balance, prev.balance),
  }
}

// ─── Média mensal / visão de períodos ─────────────────────────────────────────

export interface MonthlyPoint {
  label: string   // "Jan/2026"
  month: number
  year: number
  incTotal: number
  expTotal: number
  balance: number
}

export interface PeriodAverage {
  avgIncome: number
  avgExpense: number
  avgBalance: number
  bestMonth: MonthlyPoint | null
  worstMonth: MonthlyPoint | null
  points: MonthlyPoint[]
}

export function getMonthlyEvolution(
  transactions: Transaction[],
  catTypeMap: Map<string, string>
): MonthlyPoint[] {
  // Agrupa por mês/ano
  const map = new Map<string, MonthlyPoint>()

  for (const t of transactions) {
    const key = `${t.year}-${String(t.month).padStart(2, '0')}`
    if (!map.has(key)) {
      map.set(key, {
        label: `${MONTH_ABBR[t.month - 1]}/${t.year}`,
        month: t.month,
        year: t.year,
        incTotal: 0,
        expTotal: 0,
        balance: 0,
      })
    }
    const p = map.get(key)!
    if (getTransactionNature(t, catTypeMap) === 'income') {
      p.incTotal += t.value
    } else {
      p.expTotal += t.value
    }
    p.balance = p.incTotal - p.expTotal
  }

  return Array.from(map.values()).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  )
}

export function getPeriodAverage(points: MonthlyPoint[]): PeriodAverage {
  if (points.length === 0) {
    return { avgIncome: 0, avgExpense: 0, avgBalance: 0, bestMonth: null, worstMonth: null, points: [] }
  }
  const sum = points.reduce(
    (acc, p) => ({ inc: acc.inc + p.incTotal, exp: acc.exp + p.expTotal, bal: acc.bal + p.balance }),
    { inc: 0, exp: 0, bal: 0 }
  )
  const n = points.length
  const sorted = [...points].sort((a, b) => b.balance - a.balance)
  return {
    avgIncome:  sum.inc / n,
    avgExpense: sum.exp / n,
    avgBalance: sum.bal / n,
    bestMonth:  sorted[0] ?? null,
    worstMonth: sorted[sorted.length - 1] ?? null,
    points,
  }
}

// ─── Visão anual ──────────────────────────────────────────────────────────────

export interface AnnualSummary {
  totalIncome: number
  totalExpense: number
  totalBalance: number
  avgMonthlyIncome: number
  avgMonthlyExpense: number
  avgMonthlyBalance: number
  bestIncomeMonth: MonthlyPoint | null
  bestExpenseMonth: MonthlyPoint | null  // maior despesa
  bestBalanceMonth: MonthlyPoint | null
  monthsWithData: number
  points: MonthlyPoint[]
}

export function getAnnualSummary(
  transactions: Transaction[],
  catTypeMap: Map<string, string>
): AnnualSummary {
  const points = getMonthlyEvolution(transactions, catTypeMap)
  if (points.length === 0) {
    return {
      totalIncome: 0, totalExpense: 0, totalBalance: 0,
      avgMonthlyIncome: 0, avgMonthlyExpense: 0, avgMonthlyBalance: 0,
      bestIncomeMonth: null, bestExpenseMonth: null, bestBalanceMonth: null,
      monthsWithData: 0, points: [],
    }
  }
  const n = points.length
  const totals = points.reduce(
    (acc, p) => ({ inc: acc.inc + p.incTotal, exp: acc.exp + p.expTotal, bal: acc.bal + p.balance }),
    { inc: 0, exp: 0, bal: 0 }
  )
  const sortedByInc = [...points].sort((a, b) => b.incTotal - a.incTotal)
  const sortedByExp = [...points].sort((a, b) => b.expTotal - a.expTotal)
  const sortedByBal = [...points].sort((a, b) => b.balance - a.balance)

  return {
    totalIncome: totals.inc,
    totalExpense: totals.exp,
    totalBalance: totals.bal,
    avgMonthlyIncome:   totals.inc / n,
    avgMonthlyExpense:  totals.exp / n,
    avgMonthlyBalance:  totals.bal / n,
    bestIncomeMonth:  sortedByInc[0] ?? null,
    bestExpenseMonth: sortedByExp[0] ?? null,
    bestBalanceMonth: sortedByBal[0] ?? null,
    monthsWithData: n,
    points,
  }
}

// ─── Ranking de categorias ───────────────────────────────────────────────────

export interface CategoryRankItem {
  name: string
  value: number
  percent: number
  color: string
}

export function getCategoryRanking(
  transactions: Transaction[],
  catTypeMap: Map<string, string>,
  nature: TransactionNature,
  top?: number
): CategoryRankItem[] {
  const filtered = transactions.filter((t) => getTransactionNature(t, catTypeMap) === nature)
  const total = filtered.reduce((s, t) => s + t.value, 0)

  const map = new Map<string, number>()
  for (const t of filtered) {
    const key = t.categoryName || 'Sem categoria'
    map.set(key, (map.get(key) ?? 0) + t.value)
  }

  const items = Array.from(map.entries())
    .map(([name, value]) => ({
      name,
      value,
      percent: total > 0 ? Math.round((value / total) * 100) : 0,
      color: stringToColor(name),
    }))
    .sort((a, b) => b.value - a.value)

  return typeof top === 'number' ? items.slice(0, top) : items
}

// ─── Top transações ───────────────────────────────────────────────────────────

export function getTopTransactions(
  transactions: Transaction[],
  catTypeMap: Map<string, string>,
  nature: TransactionNature,
  top = 5
): Transaction[] {
  return transactions
    .filter((t) => getTransactionNature(t, catTypeMap) === nature)
    .sort((a, b) => b.value - a.value)
    .slice(0, top)
}

// ─── Contas futuras ───────────────────────────────────────────────────────────

export interface FutureBill {
  transaction: Transaction
  nature: TransactionNature
  daysUntilDue: number
}

export interface FutureBillsResult {
  dueToday: FutureBill[]
  dueIn7:   FutureBill[]
  dueIn15:  FutureBill[]
  dueIn30:  FutureBill[]
  overdue:  FutureBill[]
  totalExpensePending: number
  totalIncomePending: number
}

export function getFutureBills(
  transactions: Transaction[],
  catTypeMap: Map<string, string>
): FutureBillsResult {
  const today = todayISO()
  const todayDate = new Date(today)

  const addDays = (n: number) => {
    const d = new Date(todayDate)
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }

  const d7  = addDays(7)
  const d15 = addDays(15)
  const d30 = addDays(30)

  const pending = transactions.filter((t) => t.status === 'pending')

  const toBill = (t: Transaction): FutureBill => {
    const due = new Date(t.chargeDate)
    const diff = Math.round((due.getTime() - todayDate.getTime()) / 86400000)
    return { transaction: t, nature: getTransactionNature(t, catTypeMap), daysUntilDue: diff }
  }

  const overdue   = pending.filter((t) => t.chargeDate < today).map(toBill)
  const dueToday  = pending.filter((t) => t.chargeDate === today).map(toBill)
  const dueIn7    = pending.filter((t) => t.chargeDate > today && t.chargeDate <= d7).map(toBill)
  const dueIn15   = pending.filter((t) => t.chargeDate > d7  && t.chargeDate <= d15).map(toBill)
  const dueIn30   = pending.filter((t) => t.chargeDate > d15 && t.chargeDate <= d30).map(toBill)

  const totalExpensePending = pending
    .filter((t) => getTransactionNature(t, catTypeMap) === 'expense')
    .reduce((s, t) => s + t.value, 0)

  const totalIncomePending = pending
    .filter((t) => getTransactionNature(t, catTypeMap) === 'income')
    .reduce((s, t) => s + t.value, 0)

  return { dueToday, dueIn7, dueIn15, dueIn30, overdue, totalExpensePending, totalIncomePending }
}

// ─── Contas fixas ─────────────────────────────────────────────────────────────

export interface FixedSummary {
  totalFixed: number
  paidFixed: number
  pendingFixed: number
  pctOfExpenses: number   // % das despesas totais que são fixas
  count: number
  paidCount: number
  pendingCount: number
}

export function getFixedSummary(
  transactions: Transaction[],
  catTypeMap: Map<string, string>
): FixedSummary {
  const exp = transactions.filter((t) => getTransactionNature(t, catTypeMap) === 'expense')
  const expFixed = exp.filter((t) => t.type === 'fixed')
  const expTotal = exp.reduce((s, t) => s + t.value, 0)
  const totalFixed   = expFixed.reduce((s, t) => s + t.value, 0)
  const paidFixed    = expFixed.filter((t) => t.status === 'paid').reduce((s, t) => s + t.value, 0)

  return {
    totalFixed,
    paidFixed,
    pendingFixed: totalFixed - paidFixed,
    pctOfExpenses: expTotal > 0 ? Math.round((totalFixed / expTotal) * 100) : 0,
    count:        expFixed.length,
    paidCount:    expFixed.filter((t) => t.status === 'paid').length,
    pendingCount: expFixed.filter((t) => t.status === 'pending').length,
  }
}

// ─── Parcelas futuras ─────────────────────────────────────────────────────────

export interface InstallmentSummary {
  pendingThisMonth: number
  totalPendingInstallments: number
  countOpen: number
  largestInstallment: Transaction | null
}

export function getInstallmentSummary(
  currentMonthTransactions: Transaction[],
  allTransactions: Transaction[],
  catTypeMap: Map<string, string>
): InstallmentSummary {
  const instCurrent = currentMonthTransactions.filter(
    (t) => t.type === 'installment' && getTransactionNature(t, catTypeMap) === 'expense'
  )
  const pendingThisMonth = instCurrent
    .filter((t) => t.status === 'pending')
    .reduce((s, t) => s + t.value, 0)

  const allPendingInst = allTransactions.filter(
    (t) =>
      t.type === 'installment' &&
      t.status === 'pending' &&
      getTransactionNature(t, catTypeMap) === 'expense'
  )
  const totalPendingInstallments = allPendingInst.reduce((s, t) => s + t.value, 0)
  const countOpen = new Set(allPendingInst.map((t) => t.installmentGroupId).filter(Boolean)).size
  const largestInstallment =
    allPendingInst.length > 0
      ? allPendingInst.reduce((max, t) => (t.value > max.value ? t : max), allPendingInst[0])
      : null

  return { pendingThisMonth, totalPendingInstallments, countOpen, largestInstallment }
}

// ─── Alertas inteligentes ─────────────────────────────────────────────────────

export interface SmartAlert {
  id: string
  level: 'danger' | 'warning' | 'info'
  message: string
}

export function getSmartAlerts(
  summary: MonthSummary,
  fixedSummary: FixedSummary,
  futureBills: FutureBillsResult,
  comparison: MonthComparison | null,
  transactions: Transaction[],
  catTypeMap: Map<string, string>
): SmartAlert[] {
  const alerts: SmartAlert[] = []
  const today = todayISO()

  // Despesas pendentes acima do saldo atual
  if (summary.expPending > 0 && summary.saldoAtual < summary.expPending) {
    alerts.push({
      id: 'exp_pending_gt_balance',
      level: 'danger',
      message: `Há despesas pendentes que superam seu saldo atual. Faltam pagar ${fmtCurrency(summary.expPending)}.`,
    })
  }

  // Saldo previsto negativo
  if (summary.saldoPrevisto < 0) {
    alerts.push({
      id: 'negative_forecast',
      level: 'danger',
      message: `Seu saldo previsto está negativo em ${fmtCurrency(Math.abs(summary.saldoPrevisto))}.`,
    })
  }

  // Contas vencidas
  const overdueExp = transactions.filter(
    (t) => t.status === 'pending' && t.chargeDate < today &&
    getTransactionNature(t, catTypeMap) === 'expense'
  )
  if (overdueExp.length > 0) {
    const total = overdueExp.reduce((s, t) => s + t.value, 0)
    alerts.push({
      id: 'overdue_expenses',
      level: 'danger',
      message: `Existem ${overdueExp.length} despesa(s) vencida(s) no valor de ${fmtCurrency(total)}.`,
    })
  }

  // Contas fixas representam > 60% das despesas
  if (fixedSummary.pctOfExpenses > 60) {
    alerts.push({
      id: 'fixed_high_pct',
      level: 'warning',
      message: `Contas fixas representam ${fixedSummary.pctOfExpenses}% das suas despesas do mês.`,
    })
  }

  // Despesas subiram > 20% em relação ao mês anterior
  if (comparison && comparison.expPctChange !== null && comparison.expPctChange > 20) {
    alerts.push({
      id: 'exp_increase',
      level: 'warning',
      message: `Suas despesas subiram ${comparison.expPctChange}% em relação ao mês anterior.`,
    })
  }

  // Muitas contas vencendo em 7 dias
  if (futureBills.dueIn7.length >= 3) {
    const total = futureBills.dueIn7.reduce((s, b) => s + b.transaction.value, 0)
    alerts.push({
      id: 'many_due_soon',
      level: 'warning',
      message: `Há ${futureBills.dueIn7.length} contas vencendo nos próximos 7 dias (${fmtCurrency(total)}).`,
    })
  }

  // Mais comprometido do que o previsto
  if (summary.percentCompromised > 90) {
    alerts.push({
      id: 'high_commitment',
      level: 'warning',
      message: `Você já comprometeu ${summary.percentCompromised}% das receitas previstas deste mês.`,
    })
  }

  // Receitas caíram > 10%
  if (comparison && comparison.incPctChange !== null && comparison.incPctChange < -10) {
    alerts.push({
      id: 'inc_decrease',
      level: 'info',
      message: `Suas receitas caíram ${Math.abs(comparison.incPctChange)}% em relação ao mês anterior.`,
    })
  }

  // Maior categoria de gastos
  const topCategory = getCategoryRanking(transactions, catTypeMap, 'expense', 1)[0]
  if (topCategory && topCategory.percent >= 30) {
    alerts.push({
      id: 'top_category',
      level: 'info',
      message: `Sua maior categoria de gastos é "${topCategory.name}" com ${topCategory.percent}% das despesas.`,
    })
  }

  // Deduplica por id (não deve ocorrer, mas por segurança)
  const seen = new Set<string>()
  return alerts.filter((a) => {
    if (seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })
}

// ─── Utilitários internos ─────────────────────────────────────────────────────

const MONTH_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#0ea5e9','#3b82f6']
  return colors[Math.abs(hash) % colors.length]
}
