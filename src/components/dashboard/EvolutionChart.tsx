/** EvolutionChart.tsx — Gráfico de evolução mensal (receitas, despesas, saldo) */
import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import type { MonthlyPoint } from '../../utils/dashboardInsights'
import { DashboardWidgetCard, EmptyState } from './DashboardWidgetCard'
import { formatCurrency } from '../../utils/formatters'

type Range = 3 | 6 | 12

interface Props {
  allPoints: MonthlyPoint[]
}

const RANGE_LABELS: Record<Range, string> = {
  3:  'Últimos 3 meses',
  6:  'Últimos 6 meses',
  12: 'Últimos 12 meses',
}

export function EvolutionChart({ allPoints }: Props) {
  const [range, setRange] = useState<Range>(6)

  const points = allPoints.slice(-range)

  const data = points.map((p) => ({
    name: p.label,
    Receitas: p.incTotal,
    Despesas: p.expTotal,
    Saldo: p.balance,
  }))

  const formatYAxis = (value: number) =>
    new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

  return (
    <DashboardWidgetCard
      title="Evolução mensal"
      subtitle="Receitas, despesas e saldo por mês"
      collapsible
      headerExtra={
        <div className="flex gap-1">
          {([3, 6, 12] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                range === r
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {r}m
            </button>
          ))}
        </div>
      }
    >
      {data.length === 0 ? (
        <EmptyState message="Sem dados suficientes para o período." />
      ) : (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{RANGE_LABELS[range]}</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barSize={data.length > 6 ? 10 : 16}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-700" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-slate-500 dark:text-slate-400"
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-slate-500 dark:text-slate-400"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(val) => [formatCurrency(Number(val)), '']}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                  fontSize: '12px',
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Saldo"    fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </DashboardWidgetCard>
  )
}
