/** SmartSummary.tsx — Resumo inteligente do mês com frases contextuais */
import type { MonthSummary } from '../../utils/dashboardInsights'
import { DashboardWidgetCard, StatRow } from './DashboardWidgetCard'
import { formatCurrency } from '../../utils/formatters'
import { TrendingUp, TrendingDown, Info } from 'lucide-react'

interface Props {
  summary: MonthSummary
}

export function SmartSummary({ summary }: Props) {
  const { incTotal, incPaid, incPending, expTotal, expPaid, expPending, saldoAtual, saldoPrevisto, percentCompromised } = summary

  // Mensagem contextual principal
  let mainMsg = ''
  let mainLevel: 'positive' | 'warning' | 'negative' = 'positive'

  if (saldoPrevisto < 0) {
    mainMsg = `Seu saldo previsto está negativo em ${formatCurrency(Math.abs(saldoPrevisto))}. Atenção!`
    mainLevel = 'negative'
  } else if (percentCompromised > 90) {
    mainMsg = `Você já comprometeu ${percentCompromised}% das receitas previstas deste mês.`
    mainLevel = 'warning'
  } else if (saldoPrevisto > 0) {
    mainMsg = `Seu saldo previsto do mês é positivo em ${formatCurrency(saldoPrevisto)}.`
    mainLevel = 'positive'
  } else {
    mainMsg = 'Receitas e despesas estão equilibradas neste mês.'
    mainLevel = 'warning'
  }

  const msgColors = {
    positive: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
    warning:  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
    negative: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',
  }

  return (
    <DashboardWidgetCard
      title="Resumo inteligente"
      subtitle="Visão geral do mês"
      collapsible
    >
      {/* Mensagem contextual */}
      <div className={`flex items-start gap-2 text-xs px-3 py-2.5 rounded-xl border mb-4 ${msgColors[mainLevel]}`}>
        {mainLevel === 'positive' ? (
          <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />
        ) : mainLevel === 'negative' ? (
          <TrendingDown className="w-4 h-4 shrink-0 mt-0.5" />
        ) : (
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
        )}
        <span>{mainMsg}</span>
      </div>

      {/* Stats */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        <StatRow label="Receitas previstas" value={formatCurrency(incTotal)} />
        <StatRow label="Receitas recebidas" value={formatCurrency(incPaid)} valueClass="text-emerald-600 dark:text-emerald-400" />
        <StatRow label="A receber" value={formatCurrency(incPending)} />
        <StatRow label="Despesas previstas" value={formatCurrency(expTotal)} />
        <StatRow label="Despesas pagas" value={formatCurrency(expPaid)} valueClass="text-red-500 dark:text-red-400" />
        <StatRow label="Despesas pendentes" value={formatCurrency(expPending)} />
        <StatRow
          label="Saldo atual"
          value={formatCurrency(saldoAtual)}
          valueClass={saldoAtual >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}
        />
        <StatRow
          label="Saldo previsto"
          value={formatCurrency(saldoPrevisto)}
          valueClass={saldoPrevisto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}
        />
      </div>

      {/* Barra de comprometimento */}
      {incTotal > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Comprometimento do mês</span>
            <span className={`text-xs font-bold ${percentCompromised > 90 ? 'text-red-500' : percentCompromised > 70 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {percentCompromised}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${
                percentCompromised > 90 ? 'bg-red-500' :
                percentCompromised > 70 ? 'bg-amber-500' :
                'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(percentCompromised, 100)}%` }}
            />
          </div>
          {expPending > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Ainda existem <strong>{formatCurrency(expPending)}</strong> em despesas pendentes.
            </p>
          )}
        </div>
      )}
    </DashboardWidgetCard>
  )
}
