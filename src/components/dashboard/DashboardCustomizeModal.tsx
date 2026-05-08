/**
 * DashboardCustomizeModal.tsx
 * Modal de personalização: escolha de widgets visíveis e modo resumido/completo.
 * Persiste em localStorage:
 *   - dashboard_widgets_v2: lista de widget IDs ativos
 *   - dashboard_view_mode_v1: 'compact' | 'full'
 */
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

export type WidgetId =
  | 'smart_summary'
  | 'month_end_estimate'
  | 'prev_comparison'
  | 'annual_overview'
  | 'evolution_chart'
  | 'expense_category'
  | 'income_category'
  | 'future_bills'
  | 'fixed_accounts'
  | 'top_expenses'
  | 'smart_alerts'
  | 'recent_transactions'

export type ViewMode = 'compact' | 'full'

export const WIDGET_LABELS: Record<WidgetId, string> = {
  smart_summary:         'Resumo inteligente',
  month_end_estimate:    'Estimativa de fechamento',
  prev_comparison:       'Comparativo mês anterior',
  annual_overview:       'Visão anual',
  evolution_chart:       'Evolução mensal (gráfico)',
  expense_category:      'Despesas por categoria',
  income_category:       'Receitas por categoria',
  future_bills:          'Contas futuras',
  fixed_accounts:        'Contas fixas',
  top_expenses:          'Maiores gastos',
  smart_alerts:          'Alertas inteligentes',
  recent_transactions:   'Últimos lançamentos',
}

export const WIDGETS_KEY  = 'dashboard_widgets_v2'
export const VIEW_MODE_KEY = 'dashboard_view_mode_v1'

export const DEFAULT_WIDGETS: WidgetId[] = [
  'smart_summary',
  'smart_alerts',
  'expense_category',
  'evolution_chart',
  'future_bills',
  'fixed_accounts',
  'recent_transactions',
]

// Widgets que aparecem também no modo compacto
export const COMPACT_WIDGETS: WidgetId[] = [
  'smart_summary',
  'smart_alerts',
  'expense_category',
  'recent_transactions',
]

interface Props {
  open: boolean
  onClose: () => void
  activeWidgets: WidgetId[]
  onChangeWidgets: (ids: WidgetId[]) => void
  viewMode: ViewMode
  onChangeViewMode: (mode: ViewMode) => void
}

export function DashboardCustomizeModal({
  open,
  onClose,
  activeWidgets,
  onChangeWidgets,
  viewMode,
  onChangeViewMode,
}: Props) {
  const toggle = (id: WidgetId) => {
    const next = activeWidgets.includes(id)
      ? activeWidgets.filter((w) => w !== id)
      : [...activeWidgets, id]
    onChangeWidgets(next)
  }

  const allIds = Object.keys(WIDGET_LABELS) as WidgetId[]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Personalizar dashboard"
      size="sm"
      footer={<Button onClick={onClose}>Concluído</Button>}
    >
      <div className="flex flex-col gap-4">
        {/* Modo de visualização */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Visualização</p>
          <div className="grid grid-cols-2 gap-2">
            {(['compact', 'full'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onChangeViewMode(mode)}
                className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${
                  viewMode === mode
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {mode === 'compact' ? '⚡ Resumida' : '📊 Completa'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {viewMode === 'compact'
              ? 'Modo resumido: exibe os blocos principais apenas.'
              : 'Modo completo: exibe todos os blocos ativados abaixo.'}
          </p>
        </div>

        {/* Blocos */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Blocos de informação</p>
          <div className="flex flex-col gap-1">
            {allIds.map((id) => (
              <label
                key={id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-sm text-slate-700 dark:text-slate-300">{WIDGET_LABELS[id]}</span>
                <input
                  type="checkbox"
                  checked={activeWidgets.includes(id)}
                  onChange={() => toggle(id)}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={() => onChangeWidgets(DEFAULT_WIDGETS)}
          className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline text-center"
        >
          Restaurar padrões
        </button>
      </div>
    </Modal>
  )
}
