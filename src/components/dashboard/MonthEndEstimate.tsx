/** MonthEndEstimate.tsx — Estimativa de fechamento do mês */
import type { MonthEndEstimate as MonthEndEstimateData } from '../../utils/dashboardInsights'
import { DashboardWidgetCard, StatRow } from './DashboardWidgetCard'
import { formatCurrency } from '../../utils/formatters'
import { Calculator } from 'lucide-react'

interface Props {
  estimate: MonthEndEstimateData
  month: number
  year: number
}

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function MonthEndEstimateWidget({ estimate, month, year }: Props) {
  const { avgDailyExpense, estimatedTotal, projectedBalance, daysElapsed, daysRemaining, daysInMonth } = estimate

  const isCurrentMonth = (() => {
    const today = new Date()
    return month === today.getMonth() + 1 && year === today.getFullYear()
  })()

  if (!isCurrentMonth) {
    return null // Mostrar apenas para o mês atual
  }

  return (
    <DashboardWidgetCard
      title="Estimativa de fechamento"
      subtitle={`${MONTH_NAMES[month - 1]} ${year}`}
      collapsible
    >
      <div className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-xl border mb-4 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300">
        <Calculator className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          {avgDailyExpense > 0
            ? `Com base na sua média diária de gastos, o mês pode fechar com ${
                projectedBalance >= 0 ? 'sobra de ' : 'déficit de '
              }${formatCurrency(Math.abs(projectedBalance))}.`
            : 'Ainda sem dados suficientes para estimar.'}
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        <StatRow label="Dias decorridos" value={`${daysElapsed} de ${daysInMonth}`} />
        <StatRow label="Dias restantes" value={String(daysRemaining)} />
        <StatRow label="Média diária de gastos" value={formatCurrency(avgDailyExpense)} />
        <StatRow
          label="Estimativa total de despesas"
          value={formatCurrency(estimatedTotal)}
          valueClass="text-red-500 dark:text-red-400"
        />
        <StatRow
          label="Saldo projetado"
          value={formatCurrency(projectedBalance)}
          valueClass={projectedBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}
        />
      </div>

      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">
        * Estimativa baseada na média diária de despesas pagas + despesas pendentes já lançadas.
      </p>
    </DashboardWidgetCard>
  )
}
