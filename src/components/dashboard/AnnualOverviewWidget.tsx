/** AnnualOverviewWidget.tsx — Visão anual e média mensal */
import type { AnnualSummary } from '../../utils/dashboardInsights'
import { DashboardWidgetCard, StatRow, EmptyState } from './DashboardWidgetCard'
import { formatCurrency } from '../../utils/formatters'

interface Props {
  annual: AnnualSummary
  year: number
}

export function AnnualOverviewWidget({ annual, year }: Props) {
  if (annual.monthsWithData === 0) {
    return (
      <DashboardWidgetCard title={`Visão anual ${year}`} collapsible>
        <EmptyState message={`Sem dados para ${year}.`} />
      </DashboardWidgetCard>
    )
  }

  return (
    <DashboardWidgetCard
      title={`Visão anual ${year}`}
      subtitle={`Baseado em ${annual.monthsWithData} mês${annual.monthsWithData > 1 ? 'es' : ''}`}
      collapsible
    >
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        <StatRow label="Total de receitas no ano" value={formatCurrency(annual.totalIncome)} valueClass="text-emerald-600 dark:text-emerald-400" />
        <StatRow label="Total de despesas no ano" value={formatCurrency(annual.totalExpense)} valueClass="text-red-500 dark:text-red-400" />
        <StatRow
          label="Saldo acumulado do ano"
          value={formatCurrency(annual.totalBalance)}
          valueClass={annual.totalBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}
        />
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mt-4 mb-2">Médias mensais</p>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        <StatRow label="Receitas" value={formatCurrency(annual.avgMonthlyIncome)} valueClass="text-emerald-600 dark:text-emerald-400" />
        <StatRow label="Despesas" value={formatCurrency(annual.avgMonthlyExpense)} valueClass="text-red-500 dark:text-red-400" />
        <StatRow
          label="Sobra mensal"
          value={formatCurrency(annual.avgMonthlyBalance)}
          valueClass={annual.avgMonthlyBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}
        />
      </div>

      {(annual.bestIncomeMonth || annual.bestExpenseMonth || annual.bestBalanceMonth) && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mt-4 mb-2">Destaques</p>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {annual.bestIncomeMonth && (
              <StatRow
                label="Mês com maior receita"
                value={annual.bestIncomeMonth.label}
                sub={formatCurrency(annual.bestIncomeMonth.incTotal)}
              />
            )}
            {annual.bestExpenseMonth && (
              <StatRow
                label="Mês com maior despesa"
                value={annual.bestExpenseMonth.label}
                sub={formatCurrency(annual.bestExpenseMonth.expTotal)}
              />
            )}
            {annual.bestBalanceMonth && (
              <StatRow
                label="Melhor mês"
                value={annual.bestBalanceMonth.label}
                sub={formatCurrency(annual.bestBalanceMonth.balance)}
              />
            )}
          </div>
        </>
      )}

      {annual.avgMonthlyBalance > 0 && annual.monthsWithData >= 2 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Nos últimos {annual.monthsWithData} meses, sua média de sobra mensal foi {' '}
          <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(annual.avgMonthlyBalance)}</strong>.
        </p>
      )}
    </DashboardWidgetCard>
  )
}
