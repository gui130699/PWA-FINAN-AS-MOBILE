/** FixedAccountsWidget.tsx — Resumo de contas fixas do mês */
import type { FixedSummary } from '../../utils/dashboardInsights'
import { DashboardWidgetCard, StatRow, EmptyState } from './DashboardWidgetCard'
import { formatCurrency } from '../../utils/formatters'

interface Props {
  fixedSummary: FixedSummary
}

export function FixedAccountsWidget({ fixedSummary }: Props) {
  const { totalFixed, paidFixed, pendingFixed, pctOfExpenses, count, paidCount, pendingCount } = fixedSummary

  if (count === 0) {
    return (
      <DashboardWidgetCard title="Contas fixas do mês" collapsible>
        <EmptyState message="Nenhuma conta fixa neste mês." />
      </DashboardWidgetCard>
    )
  }

  return (
    <DashboardWidgetCard
      title="Contas fixas do mês"
      subtitle={`${count} conta${count > 1 ? 's' : ''} fixa${count > 1 ? 's' : ''}`}
      collapsible
    >
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        <StatRow label="Total em fixas" value={formatCurrency(totalFixed)} />
        <StatRow label={`Pagas (${paidCount})`} value={formatCurrency(paidFixed)} valueClass="text-emerald-600 dark:text-emerald-400" />
        <StatRow label={`Pendentes (${pendingCount})`} value={formatCurrency(pendingFixed)} valueClass={pendingFixed > 0 ? 'text-amber-600 dark:text-amber-400' : ''} />
      </div>

      {/* Barra de progresso */}
      {totalFixed > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Pagas</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {Math.round((paidFixed / totalFixed) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min((paidFixed / totalFixed) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {pctOfExpenses > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Contas fixas representam <strong>{pctOfExpenses}%</strong> das suas despesas do mês.
        </p>
      )}
    </DashboardWidgetCard>
  )
}
