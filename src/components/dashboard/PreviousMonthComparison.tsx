/** PreviousMonthComparison.tsx — Comparativo com o mês anterior */
import type { MonthComparison } from '../../utils/dashboardInsights'
import { DashboardWidgetCard, PctBadge, EmptyState } from './DashboardWidgetCard'
import { formatCurrency } from '../../utils/formatters'

interface Props {
  comparison: MonthComparison
  hasPrevData: boolean
}

export function PreviousMonthComparison({ comparison, hasPrevData }: Props) {
  if (!hasPrevData) {
    return (
      <DashboardWidgetCard title="Comparativo com mês anterior" collapsible>
        <EmptyState message="Sem dados do mês anterior para comparar." />
      </DashboardWidgetCard>
    )
  }

  const { expDiff, incDiff, balanceDiff, expPctChange, incPctChange, balancePctChange,
          currentExpTotal, prevExpTotal, currentIncTotal, prevIncTotal,
          currentBalance, prevBalance } = comparison

  return (
    <DashboardWidgetCard
      title="Comparativo com mês anterior"
      subtitle="Variação de receitas, despesas e saldo"
      collapsible
    >
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {/* Despesas */}
        <div className="py-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Despesas</span>
            <PctBadge pct={expPctChange !== null ? expPctChange : null} />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Anterior: {formatCurrency(prevExpTotal)}</span>
            <span>→</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(currentExpTotal)}</span>
          </div>
          {expDiff !== 0 && (
            <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
              {expDiff > 0
                ? `Você gastou ${formatCurrency(expDiff)} a mais que no mês anterior.`
                : `Você gastou ${formatCurrency(Math.abs(expDiff))} a menos que no mês anterior.`}
            </p>
          )}
        </div>

        {/* Receitas */}
        <div className="py-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Receitas</span>
            <PctBadge pct={incPctChange !== null ? -incPctChange : null} />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Anterior: {formatCurrency(prevIncTotal)}</span>
            <span>→</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(currentIncTotal)}</span>
          </div>
          {incDiff !== 0 && (
            <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
              {incDiff > 0
                ? `Receitas aumentaram ${formatCurrency(incDiff)} em relação ao mês anterior.`
                : `Receitas caíram ${formatCurrency(Math.abs(incDiff))} em relação ao mês anterior.`}
            </p>
          )}
        </div>

        {/* Saldo */}
        <div className="py-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Saldo</span>
            <PctBadge pct={balancePctChange !== null ? balancePctChange : null} />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Anterior: {formatCurrency(prevBalance)}</span>
            <span>→</span>
            <span className={`font-semibold ${currentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {formatCurrency(currentBalance)}
            </span>
          </div>
          {balanceDiff !== 0 && (
            <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
              {balanceDiff > 0
                ? `Sua sobra melhorou ${formatCurrency(balanceDiff)} em relação ao mês anterior.`
                : `Sua sobra piorou ${formatCurrency(Math.abs(balanceDiff))} em relação ao mês anterior.`}
            </p>
          )}
        </div>
      </div>
    </DashboardWidgetCard>
  )
}
