/**
 * UrgentBillsWidget.tsx
 * Lista as 5 contas pendentes mais urgentes: vencidas primeiro, depois hoje, depois próximas 7 dias.
 */
import { AlertCircle, Clock, CalendarClock } from 'lucide-react'
import { formatCurrency, formatDate, todayISO } from '../../utils/formatters'
import type { Transaction } from '../../types'

interface Props {
  transactions: Transaction[]
}

function getUrgentBills(txs: Transaction[]): Transaction[] {
  const d7 = new Date()
  d7.setDate(d7.getDate() + 7)
  const d7iso = d7.toISOString().slice(0, 10)

  return txs
    .filter((t) => t.status === 'pending' && t.chargeDate <= d7iso)
    .sort((a, b) => a.chargeDate.localeCompare(b.chargeDate))
    .slice(0, 5)
}

export function UrgentBillsWidget({ transactions }: Props) {
  const today = todayISO()
  const urgent = getUrgentBills(transactions)

  if (urgent.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Contas Urgentes</h3>
        <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
          {urgent.length}
        </span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {urgent.map((t) => {
          const isOverdue = t.chargeDate < today
          const isToday = t.chargeDate === today
          return (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isOverdue ? 'bg-red-100 dark:bg-red-900/30' : isToday ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                {isOverdue
                  ? <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  : isToday
                    ? <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    : <CalendarClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.categoryName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(t.value)}</p>
                <p className={`text-[10px] font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : isToday ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {isOverdue ? '⚠ Atrasada' : isToday ? 'Hoje' : formatDate(t.chargeDate)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
