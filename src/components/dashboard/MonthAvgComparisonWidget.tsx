/**
 * MonthAvgComparisonWidget.tsx
 * Compara o mês atual com a média dos últimos 3 meses.
 */
import { BarChart3, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import type { Transaction } from '../../types'
import { buildCatTypeMap, getMonthSummary } from '../../utils/dashboardInsights'
import type { Category } from '../../types'

interface Props {
  currentTransactions: Transaction[]
  yearTransactions: Transaction[]
  categories: Category[]
  month: number
  year: number
}

function avg3months(yearTransactions: Transaction[], categories: Category[], currentMonth: number, currentYear: number) {
  const catTypeMap = buildCatTypeMap(categories)
  const totals: { incTotal: number; expTotal: number }[] = []

  for (let i = 1; i <= 3; i++) {
    let m = currentMonth - i
    let y = currentYear
    if (m <= 0) { m += 12; y -= 1 }
    const txs = yearTransactions.filter((t) => {
      const [ty, tm] = t.chargeDate.split('-').map(Number)
      return ty === y && tm === m
    })
    const s = getMonthSummary(txs, catTypeMap)
    totals.push({ incTotal: s.incTotal, expTotal: s.expTotal })
  }

  const count = totals.length
  if (count === 0) return { avgInc: 0, avgExp: 0, hasData: false }
  return {
    avgInc: totals.reduce((s, t) => s + t.incTotal, 0) / count,
    avgExp: totals.reduce((s, t) => s + t.expTotal, 0) / count,
    hasData: totals.some((t) => t.incTotal > 0 || t.expTotal > 0),
  }
}

function Trend({ current, avg }: { current: number; avg: number }) {
  if (avg === 0) return <Minus className="w-4 h-4 text-slate-400" />
  const diff = ((current - avg) / avg) * 100
  if (Math.abs(diff) < 1) return <Minus className="w-4 h-4 text-slate-400" />
  if (diff > 0) return <TrendingUp className="w-4 h-4 text-rose-500" />
  return <TrendingDown className="w-4 h-4 text-emerald-500" />
}

export function MonthAvgComparisonWidget({ currentTransactions, yearTransactions, categories, month, year }: Props) {
  const catTypeMap = buildCatTypeMap(categories)
  const current = getMonthSummary(currentTransactions, catTypeMap)
  const { avgInc, avgExp, hasData } = avg3months(yearTransactions, categories, month, year)

  if (!hasData) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Mês Atual vs Média 3 Meses</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Receitas */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Receitas</p>
            <Trend current={current.incTotal} avg={avgInc} />
          </div>
          <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(current.incTotal)}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Média: {formatCurrency(avgInc)}</p>
        </div>

        {/* Despesas */}
        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Despesas</p>
            <Trend current={current.expTotal} avg={avgExp} />
          </div>
          <p className="text-base font-bold text-rose-700 dark:text-rose-400">{formatCurrency(current.expTotal)}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Média: {formatCurrency(avgExp)}</p>
        </div>
      </div>

      {/* Barras visuais */}
      {avgExp > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Despesas: atual vs média</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 w-10 text-right shrink-0">Atual</span>
            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (current.expTotal / Math.max(current.expTotal, avgExp)) * 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 w-10 text-right shrink-0">Média</span>
            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-slate-400 dark:bg-slate-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (avgExp / Math.max(current.expTotal, avgExp)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
