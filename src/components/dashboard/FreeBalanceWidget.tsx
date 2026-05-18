/**
 * FreeBalanceWidget.tsx
 * Mostra o saldo livre = receitas previstas - todas as despesas (pagas + pendentes).
 * Destaca em vermelho quando negativo.
 */
import { Wallet, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import type { MonthSummary } from '../../utils/dashboardInsights'

interface Props {
  summary: MonthSummary
}

export function FreeBalanceWidget({ summary }: Props) {
  const freeBalance = summary.incTotal - summary.expTotal
  const isNegative = freeBalance < 0

  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${isNegative ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
      <div className="flex items-center gap-2">
        <Wallet className={`w-5 h-5 ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Saldo Livre</h3>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={`text-2xl font-bold ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatCurrency(freeBalance)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Receitas previstas − Todas as despesas</p>
        </div>
        {isNegative
          ? <TrendingDown className="w-8 h-8 text-red-400 dark:text-red-600 shrink-0" />
          : <TrendingUp className="w-8 h-8 text-emerald-400 dark:text-emerald-600 shrink-0" />
        }
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2">
          <p className="text-slate-500 dark:text-slate-400">Receitas previstas</p>
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">{formatCurrency(summary.incTotal)}</p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2">
          <p className="text-slate-500 dark:text-slate-400">Total despesas</p>
          <p className="font-semibold text-rose-700 dark:text-rose-400">{formatCurrency(summary.expTotal)}</p>
        </div>
      </div>

      {isNegative && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-xl px-3 py-2 font-medium">
          ⚠️ Atenção: suas despesas superam as receitas previstas este mês.
        </p>
      )}
    </div>
  )
}
