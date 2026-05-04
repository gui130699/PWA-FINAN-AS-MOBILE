import { useState, useMemo } from 'react'
import { FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { PageLoader } from '../components/ui/Loading'
import { useAuth } from '../contexts/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { formatCurrency, currentMonthYear } from '../utils/formatters'
import { getTransactionsByRange } from '../services/firestore'
import type { Transaction, TransactionNature } from '../types'

function getNature(t: Transaction, catTypeMap: Map<string, string>): TransactionNature {
  if (t.transactionNature) return t.transactionNature
  const ct = catTypeMap.get(t.categoryId)
  if (ct === 'income') return 'income'
  return 'expense'
}

type ViewMode = 'resumido' | 'detalhado'

export function ReportsPage() {
  const { month: cm, year: cy } = currentMonthYear()

  const firstDay = `${cy}-${String(cm).padStart(2, '0')}-01`
  const lastDay = `${cy}-${String(cm).padStart(2, '0')}-${new Date(cy, cm, 0).getDate()}`

  const [startDate, setStartDate] = useState(firstDay)
  const [endDate, setEndDate] = useState(lastDay)
  const [viewMode, setViewMode] = useState<ViewMode>('resumido')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const { user } = useAuth()
  const { categories } = useCategories()

  const catTypeMap = useMemo(() => {
    const m = new Map<string, string>()
    categories.forEach((c) => m.set(c.id, c.type))
    return m
  }, [categories])

  const handleSearch = async () => {
    if (!user || !startDate || !endDate) return
    if (startDate > endDate) { return }
    setLoading(true)
    try {
      const data = await getTransactionsByRange(user.uid, startDate, endDate)
      setTransactions(data)
      setSearched(true)
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  // Agrupar por mês/ano
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of transactions) {
      const key = `${t.year}-${String(t.month).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [transactions])

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    let incomePaid = 0
    let expensePaid = 0
    for (const t of transactions) {
      const n = getNature(t, catTypeMap)
      if (n === 'income') {
        income += t.value
        if (t.status === 'paid') incomePaid += t.value
      } else {
        expense += t.value
        if (t.status === 'paid') expensePaid += t.value
      }
    }
    return { income, expense, incomePaid, expensePaid, balance: incomePaid - expensePaid }
  }, [transactions, catTypeMap])

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Relatórios</h1>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data inicial"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Data final"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
            {(['resumido', 'detalhado'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                  viewMode === v
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button onClick={handleSearch} loading={loading} className="flex-1">
            Buscar
          </Button>
        </div>
      </div>

      {loading && <PageLoader />}

      {!loading && searched && (
        <>
          {/* Resumo geral */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: 'Receitas', value: totals.income, color: 'text-emerald-600 dark:text-emerald-400', icon: TrendingUp },
              { label: 'Despesas', value: totals.expense, color: 'text-red-500 dark:text-red-400', icon: TrendingDown },
              { label: 'Saldo (pago)', value: totals.balance, color: totals.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400', icon: Minus },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                </div>
                <p className={`text-base font-bold ${color}`}>{formatCurrency(Math.abs(value))}</p>
              </div>
            ))}
          </div>

          {transactions.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">Nenhum lançamento no período.</p>
          ) : viewMode === 'resumido' ? (
            <ResumoView grouped={grouped} catTypeMap={catTypeMap} />
          ) : (
            <DetalhadoView grouped={grouped} catTypeMap={catTypeMap} />
          )}
        </>
      )}
    </div>
  )
}

// ─── Resumido: totais por mês ─────────────────────────────────────────────────
function ResumoView({ grouped, catTypeMap }: { grouped: [string, Transaction[]][]; catTypeMap: Map<string, string> }) {
  return (
    <div className="flex flex-col gap-3">
      {grouped.map(([key, txs]) => {
        const [year, month] = key.split('-')
        let income = 0, expense = 0, paid = 0, pending = 0
        for (const t of txs) {
          const n = getNature(t, catTypeMap)
          if (n === 'income') income += t.value
          else expense += t.value
          if (t.status === 'paid') paid += t.value
          else pending += t.value
        }
        const balance = income - expense
        return (
          <div key={key} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {month}/{year} · {txs.length} lançamento{txs.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Receitas</span><span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(income)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Despesas</span><span className="font-semibold text-red-500 dark:text-red-400">{formatCurrency(expense)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Pago</span><span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(paid)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Pendente</span><span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(pending)}</span></div>
              <div className="col-span-2 border-t border-slate-100 dark:border-slate-700 pt-2 flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Saldo</span>
                <span className={`font-bold ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>{formatCurrency(balance)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Detalhado: lista por mês ─────────────────────────────────────────────────
function DetalhadoView({ grouped, catTypeMap }: { grouped: [string, Transaction[]][]; catTypeMap: Map<string, string> }) {
  return (
    <div className="flex flex-col gap-4">
      {grouped.map(([key, txs]) => {
        const [year, month] = key.split('-')
        return (
          <div key={key} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{month}/{year} · {txs.length} lançamento{txs.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {txs.map((t) => {
                const n = getNature(t, catTypeMap)
                return (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-2.5">
                    <span className={`text-xs font-bold w-1.5 h-1.5 rounded-full shrink-0 ${n === 'income' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {t.categoryName} · {t.chargeDate.split('-').reverse().join('/')}
                        {t.status === 'paid' ? ' · Pago' : ' · Pendente'}
                      </p>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${n === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {n === 'income' ? '+' : ''}{formatCurrency(t.value)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
