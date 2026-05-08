/** FutureBillsWidget.tsx — Contas futuras com agrupamento por vencimento */
import { useState } from 'react'
import { ChevronDown, ChevronUp, CalendarClock, CalendarCheck2, Clock } from 'lucide-react'
import type { FutureBillsResult, FutureBill } from '../../utils/dashboardInsights'
import { DashboardWidgetCard, EmptyState } from './DashboardWidgetCard'
import { formatCurrency, formatDate } from '../../utils/formatters'

interface GroupProps {
  title: string
  bills: FutureBill[]
  icon: React.ReactNode
  colorClass: string
  headerClass: string
  badgeClass: string
}

function BillGroup({ title, bills, icon, colorClass, headerClass, badgeClass }: GroupProps) {
  const [open, setOpen] = useState(false)
  if (bills.length === 0) return null
  const total = bills.reduce((s, b) => s + b.transaction.value, 0)
  return (
    <div className={`rounded-xl border-2 overflow-hidden ${colorClass}`}>
      <button
        className={`w-full flex items-center gap-2 px-3 py-2.5 ${headerClass} transition-colors`}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        <span className="flex-1 text-xs font-semibold text-left">{title}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
          {bills.length} · {formatCurrency(total)}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
      </button>
      {open && (
        <div className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
          {bills.map((b) => (
            <div key={b.transaction.id} className="flex items-center gap-2 px-3 py-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: b.nature === 'income' ? '#22c55e' : '#ef4444' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{b.transaction.description}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{b.transaction.categoryName} · {formatDate(b.transaction.chargeDate)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(b.transaction.value)}</p>
                <span className={`text-[9px] ${b.nature === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  {b.nature === 'income' ? 'Receita' : 'Despesa'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  futureBills: FutureBillsResult
}

export function FutureBillsWidget({ futureBills }: Props) {
  const { dueToday, dueIn7, dueIn15, dueIn30, totalExpensePending } = futureBills
  const hasAny = dueToday.length + dueIn7.length + dueIn15.length + dueIn30.length > 0

  return (
    <DashboardWidgetCard
      title="Contas futuras"
      subtitle="Vencimentos dos próximos 30 dias"
      collapsible
    >
      {totalExpensePending > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Você tem <strong className="text-red-500 dark:text-red-400">{formatCurrency(totalExpensePending)}</strong> em despesas pendentes no mês.
        </p>
      )}

      {!hasAny ? (
        <EmptyState message="Nenhuma conta vencendo nos próximos 30 dias." />
      ) : (
        <div className="flex flex-col gap-2">
          <BillGroup
            title="Vencem hoje"
            bills={dueToday}
            icon={<CalendarCheck2 className="w-3.5 h-3.5" />}
            colorClass="border-amber-400 dark:border-amber-600"
            headerClass="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
            badgeClass="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
          />
          <BillGroup
            title="Próximos 7 dias"
            bills={dueIn7}
            icon={<Clock className="w-3.5 h-3.5" />}
            colorClass="border-blue-400 dark:border-blue-600"
            headerClass="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
            badgeClass="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
          />
          <BillGroup
            title="8 a 15 dias"
            bills={dueIn15}
            icon={<CalendarClock className="w-3.5 h-3.5" />}
            colorClass="border-slate-300 dark:border-slate-600"
            headerClass="bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300"
            badgeClass="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
          />
          <BillGroup
            title="16 a 30 dias"
            bills={dueIn30}
            icon={<CalendarClock className="w-3.5 h-3.5" />}
            colorClass="border-slate-200 dark:border-slate-700"
            headerClass="bg-slate-50 dark:bg-slate-700/30 text-slate-600 dark:text-slate-400"
            badgeClass="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
          />
        </div>
      )}
    </DashboardWidgetCard>
  )
}
