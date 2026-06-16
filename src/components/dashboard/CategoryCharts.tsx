/** CategoryCharts.tsx — Gráficos de despesas e receitas por categoria */
import { useState } from 'react'
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts'
import type { CategoryRankItem } from '../../utils/dashboardInsights'
import type { CategoryDisplayMode } from './dashboardConfig'
import { DashboardWidgetCard, EmptyState } from './DashboardWidgetCard'
import { formatCurrency } from '../../utils/formatters'

interface CategoryChartProps {
  title: string
  subtitle?: string
  items: CategoryRankItem[]
  displayMode: CategoryDisplayMode
}

const COMPACT_CATEGORY_LIMIT = 5

function CategoryChart({ title, subtitle, items, displayMode }: CategoryChartProps) {
  const [showAll, setShowAll] = useState(false)
  const expanded = displayMode === 'all' || showAll
  const displayed = expanded ? items : items.slice(0, COMPACT_CATEGORY_LIMIT)

  if (items.length === 0) {
    return (
      <DashboardWidgetCard title={title} collapsible>
        <EmptyState message="Sem dados para exibir." />
      </DashboardWidgetCard>
    )
  }

  const barData = displayed.map((i) => ({ name: i.name, Valor: i.value, color: i.color }))

  return (
    <DashboardWidgetCard
      title={title}
      subtitle={subtitle}
      collapsible
    >
      <ResponsiveContainer width="100%" height={Math.max(200, displayed.length * 38)}>
          <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-slate-100 dark:text-slate-700" />
            <XAxis
              type="number"
              tickFormatter={(v: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)}
              tick={{ fontSize: 10, fill: 'currentColor' }}
              className="text-slate-500 dark:text-slate-400"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fontSize: 10, fill: 'currentColor' }}
              className="text-slate-500 dark:text-slate-400"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(val) => [formatCurrency(Number(val)), 'Valor']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', fontSize: 12 }}
            />
            <Bar dataKey="Valor" radius={[0, 4, 4, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
      </ResponsiveContainer>

      {/* Lista compacta com % */}
      <div className="mt-3 space-y-1.5">
        {displayed.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">{item.name}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{item.percent}%</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>

      {displayMode === 'top5' && items.length > COMPACT_CATEGORY_LIMIT && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline w-full text-center"
        >
          {showAll ? 'Ver menos' : `Ver todas (${items.length})`}
        </button>
      )}
    </DashboardWidgetCard>
  )
}

export function ExpenseCategoryChart({ items, displayMode }: { items: CategoryRankItem[]; displayMode: CategoryDisplayMode }) {
  return (
    <CategoryChart
      key={`expense-${displayMode}`}
      title="Despesas por categoria"
      subtitle={displayMode === 'all' ? 'Todas as categorias do mes' : 'Top 5 categorias do mes'}
      items={items}
      displayMode={displayMode}
    />
  )
}

export function IncomeCategoryChart({ items, displayMode }: { items: CategoryRankItem[]; displayMode: CategoryDisplayMode }) {
  if (items.length === 0) return null
  return (
    <CategoryChart
      key={`income-${displayMode}`}
      title="Receitas por categoria"
      subtitle={displayMode === 'all' ? 'Todas as categorias do mes' : 'Top 5 categorias do mes'}
      items={items}
      displayMode={displayMode}
    />
  )
}
