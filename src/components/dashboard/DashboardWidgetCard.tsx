/** DashboardWidgetCard.tsx — Container padrão para blocos da dashboard */
import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface Props {
  title: string
  subtitle?: string
  children: ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  headerExtra?: ReactNode
  className?: string
}

export function DashboardWidgetCard({
  title,
  subtitle,
  children,
  collapsible = false,
  defaultOpen = true,
  headerExtra,
  className = '',
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden ${className}`}>
      <div
        className={`flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        {headerExtra && <div onClick={(e) => e.stopPropagation()}>{headerExtra}</div>}
        {collapsible && (
          <span className="text-slate-400 shrink-0">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        )}
      </div>
      {(!collapsible || open) && (
        <div className="p-4">{children}</div>
      )}
    </div>
  )
}

/** Linha de stat compacta usada internamente */
export function StatRow({
  label,
  value,
  valueClass = '',
  sub,
}: {
  label: string
  value: string
  valueClass?: string
  sub?: string
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-600 dark:text-slate-400 truncate pr-2">{label}</span>
      <div className="text-right shrink-0">
        <span className={`text-sm font-semibold text-slate-900 dark:text-slate-100 ${valueClass}`}>{value}</span>
        {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}

/** Badge de variação percentual */
export function PctBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null
  const positive = pct >= 0
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
      positive
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      {positive ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  )
}

/** Mensagem de "sem dados" */
export function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-4">{message}</p>
  )
}
