import { useState, useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  TrendingDown,
  CheckCircle,
  Clock,
  RefreshCw,
  CreditCard,
} from 'lucide-react'
import { StatCard } from '../components/ui/Card'
import { MonthSelector } from '../components/ui/MonthSelector'
import { PageLoader } from '../components/ui/Loading'
import { useTransactions } from '../hooks/useTransactions'
import { currentMonthYear, formatCurrency } from '../utils/formatters'
import type { Transaction } from '../types'

export function DashboardPage() {
  const { month: cm, year: cy } = currentMonthYear()
  const [month, setMonth] = useState(cm)
  const [year, setYear] = useState(cy)
  const { transactions, loading } = useTransactions(month, year)

  const stats = useMemo(() => {
    const total = transactions.reduce((s, t) => s + t.value, 0)
    const paid = transactions.filter((t) => t.status === 'paid').reduce((s, t) => s + t.value, 0)
    const pending = total - paid
    const fixed = transactions.filter((t) => t.type === 'fixed').reduce((s, t) => s + t.value, 0)
    const installment = transactions.filter((t) => t.type === 'installment').reduce((s, t) => s + t.value, 0)
    return { total, paid, pending, fixed, installment }
  }, [transactions])

  const chartData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>()
    transactions.forEach((t) => {
      const key = t.categoryName || 'Sem categoria'
      if (!map.has(key)) map.set(key, { name: key, value: 0, color: stringToColor(key) })
      map.get(key)!.value += t.value
    })
    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 8)
  }, [transactions])

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white hidden lg:block">Dashboard</h1>
        <MonthSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total do mês"
          value={formatCurrency(stats.total)}
          icon={<TrendingDown className="w-5 h-5" />}
          color="bg-gradient-to-br from-indigo-500 to-indigo-700"
        />
        <StatCard
          label="Total pago"
          value={formatCurrency(stats.paid)}
          icon={<CheckCircle className="w-5 h-5" />}
          color="bg-gradient-to-br from-emerald-500 to-emerald-700"
        />
        <StatCard
          label="Pendente"
          value={formatCurrency(stats.pending)}
          icon={<Clock className="w-5 h-5" />}
          color="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <StatCard
          label="Contas fixas"
          value={formatCurrency(stats.fixed)}
          icon={<RefreshCw className="w-5 h-5" />}
          color="bg-gradient-to-br from-blue-500 to-blue-700"
        />
      </div>

      {/* Parceladas card */}
      {stats.installment > 0 && (
        <div className="grid grid-cols-1">
          <StatCard
            label="Total parceladas"
            value={formatCurrency(stats.installment)}
            icon={<CreditCard className="w-5 h-5" />}
            color="bg-gradient-to-br from-purple-500 to-purple-700"
          />
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Por categoria</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) => [formatCurrency(Number(val)), '']}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-700">
          <TrendingDown className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 dark:text-slate-400">Nenhuma despesa lançada neste mês</p>
        </div>
      )}

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Últimos lançamentos</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {transactions.slice(0, 8).map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TransactionRow({ transaction: t }: { transaction: Transaction }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: stringToColor(t.categoryName) }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t.categoryName}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(t.value)}</p>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            t.status === 'paid'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          }`}
        >
          {t.status === 'paid' ? 'Pago' : 'Pendente'}
        </span>
      </div>
    </div>
  )
}

function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6']
  return colors[Math.abs(hash) % colors.length]
}
