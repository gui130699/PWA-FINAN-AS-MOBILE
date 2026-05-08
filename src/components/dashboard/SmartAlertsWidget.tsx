/** SmartAlertsWidget.tsx — Alertas inteligentes baseados em regras */
import type { SmartAlert } from '../../utils/dashboardInsights'
import { DashboardWidgetCard, EmptyState } from './DashboardWidgetCard'
import { AlertTriangle, Info } from 'lucide-react'

interface Props {
  alerts: SmartAlert[]
}

const LEVEL_CONFIG = {
  danger: {
    containerClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    iconClass: 'text-red-500 dark:text-red-400',
    textClass: 'text-red-700 dark:text-red-300',
    Icon: AlertTriangle,
  },
  warning: {
    containerClass: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    iconClass: 'text-amber-500 dark:text-amber-400',
    textClass: 'text-amber-700 dark:text-amber-300',
    Icon: AlertTriangle,
  },
  info: {
    containerClass: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    iconClass: 'text-blue-500 dark:text-blue-400',
    textClass: 'text-blue-700 dark:text-blue-300',
    Icon: Info,
  },
}

export function SmartAlertsWidget({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <DashboardWidgetCard title="Alertas inteligentes" collapsible>
        <EmptyState message="Nenhum alerta para este mês. Tudo certo!" />
      </DashboardWidgetCard>
    )
  }

  // Ordenar: danger > warning > info
  const sorted = [...alerts].sort((a, b) => {
    const order = { danger: 0, warning: 1, info: 2 }
    return order[a.level] - order[b.level]
  })

  return (
    <DashboardWidgetCard
      title="Alertas inteligentes"
      subtitle={`${alerts.length} alerta${alerts.length > 1 ? 's' : ''} encontrado${alerts.length > 1 ? 's' : ''}`}
      collapsible
    >
      <div className="flex flex-col gap-2">
        {sorted.map((alert) => {
          const config = LEVEL_CONFIG[alert.level]
          const Icon = config.Icon
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs ${config.containerClass}`}
            >
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${config.iconClass}`} />
              <span className={config.textClass}>{alert.message}</span>
            </div>
          )
        })}
      </div>
    </DashboardWidgetCard>
  )
}
