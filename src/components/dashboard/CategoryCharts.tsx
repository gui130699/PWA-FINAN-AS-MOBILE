/** CategoryCharts.tsx — Gráficos de despesas e receitas por categoria */
import { useState } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { CategoryRankItem } from '../../utils/dashboardInsights'
import { DashboardWidgetCard, EmptyState } from './DashboardWidgetCard'
import { formatCurrency } from '../../utils/formatters'

type ChartMode = 'pie' | 'bar'

interface CategoryChartProps {
  title: string
  subtitle?: string
  items: CategoryRankItem[]
}

function CategoryChart({ title, subtitle, items }: CategoryChartProps) {
  const [mode, setMode] = useState<ChartMode>('pie')
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? items : items.slice(0, 5)

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
      headerExtra={
        <div className="flex gap-1">
          {(['pie', 'bar'] as ChartMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                mode === m
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {m === 'pie' ? 'Pizza' : 'Barras'}
            </button>
          ))}
        </div>
      }
    >
      {mode === 'pie' ? (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={displayed}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
            >
              {displayed.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val) => [formatCurrency(Number(val)), '']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
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
      )}

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

      {items.length > 5 && (
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

export function ExpenseCategoryChart({ items }: { items: CategoryRankItem[] }) {
  return (
    <CategoryChart
      title="Despesas por categoria"
      subtitle="Top categorias do mês"
      items={items}
    />
  )
}

export function IncomeCategoryChart({ items }: { items: CategoryRankItem[] }) {
  if (items.length === 0) return null
  return (
    <CategoryChart
      title="Receitas por categoria"
      subtitle="Distribuição das receitas"
      items={items}
    />
  )
}
