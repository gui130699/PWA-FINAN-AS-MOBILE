/** TopExpensesWidget.tsx — Maiores gastos do mês */
import type { Transaction } from '../../types'
import { DashboardWidgetCard, EmptyState } from './DashboardWidgetCard'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { stringToColor } from '../../utils/dashboardInsights'

interface Props {
  topTransactions: Transaction[]
}

export function TopExpensesWidget({ topTransactions }: Props) {
  if (topTransactions.length === 0) {
    return (
      <DashboardWidgetCard title="Maiores gastos" collapsible>
        <EmptyState message="Nenhuma despesa neste mês." />
      </DashboardWidgetCard>
    )
  }

  return (
    <DashboardWidgetCard
      title="Maiores gastos"
      subtitle="Top 5 despesas do mês"
      collapsible
    >
      <div className="space-y-2.5">
        {topTransactions.map((t, i) => (
          <div key={t.id} className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-4 shrink-0">
              {i + 1}
            </span>
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: stringToColor(t.categoryName) }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.categoryName} · {formatDate(t.chargeDate)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-red-500 dark:text-red-400">{formatCurrency(t.value)}</p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                t.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {t.status === 'paid' ? 'Pago' : 'Pendente'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </DashboardWidgetCard>
  )
}
