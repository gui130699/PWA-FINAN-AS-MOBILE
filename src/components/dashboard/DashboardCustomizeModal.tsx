/**
 * DashboardCustomizeModal.tsx
 * Modal de personalização: cards principais + widgets visíveis + modo resumido/completo.
 * Persiste em localStorage:
 *   - dashboard_visible_v1:  lista de CardId visíveis
 *   - dashboard_widgets_v2:  lista de WidgetId ativos
 *   - dashboard_view_mode_v1: 'compact' | 'full'
 */
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

// ─── Cards principais ────────────────────────────────────────────────────────

export type CardId =
  | 'exp_total' | 'exp_paid' | 'exp_pending' | 'exp_fixed' | 'exp_inst'
  | 'inc_paid' | 'inc_pending' | 'saldo_atual' | 'saldo_previsto' | 'inc_fixed' | 'inc_inst'

export const CARD_STORAGE_KEY = 'dashboard_visible_v1'

export const CARD_LABELS: Record<CardId, { label: string; description: string }> = {
  exp_total:      { label: 'Total de despesas',     description: 'Soma de todas as despesas do mês.' },
  exp_paid:       { label: 'Despesas pagas',         description: 'Despesas com status pago.' },
  exp_pending:    { label: 'Despesas pendentes',     description: 'Despesas ainda não pagas.' },
  exp_fixed:      { label: 'Despesas fixas',         description: 'Despesas geradas por contas fixas.' },
  exp_inst:       { label: 'Despesas parceladas',    description: 'Despesas de parcelamentos.' },
  inc_paid:       { label: 'Receitas recebidas',     description: 'Receitas com status pago.' },
  inc_pending:    { label: 'Receitas a receber',     description: 'Receitas ainda não recebidas.' },
  saldo_atual:    { label: 'Saldo atual',            description: 'Receitas recebidas menos despesas pagas.' },
  saldo_previsto: { label: 'Saldo previsto',         description: 'Receitas totais menos despesas totais.' },
  inc_fixed:      { label: 'Receitas fixas',         description: 'Receitas geradas por contas fixas.' },
  inc_inst:       { label: 'Receitas parceladas',    description: 'Receitas de parcelamentos.' },
}

export const DEFAULT_VISIBLE_CARDS: CardId[] = [
  'exp_total', 'exp_paid', 'exp_pending', 'exp_fixed', 'exp_inst',
  'inc_paid', 'inc_pending', 'saldo_atual', 'saldo_previsto', 'inc_fixed', 'inc_inst',
]

// ─── Widgets ─────────────────────────────────────────────────────────────────

export type WidgetId =
  | 'smart_summary'
  | 'month_end_estimate'
  | 'prev_comparison'
  | 'annual_overview'
  | 'evolution_chart'
  | 'expense_category'
  | 'income_category'
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

// ─── Modal ───────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  // widgets
  activeWidgets: WidgetId[]
  onChangeWidgets: (ids: WidgetId[]) => void
  viewMode: ViewMode
  onChangeViewMode: (mode: ViewMode) => void
  // cards principais
  visibleCards: CardId[]
  onChangeVisibleCards: (ids: CardId[]) => void
}

const ALL_CARD_IDS = Object.keys(CARD_LABELS) as CardId[]
const ALL_WIDGET_IDS = Object.keys(WIDGET_LABELS) as WidgetId[]

export function DashboardCustomizeModal({
  open,
  onClose,
  activeWidgets,
  onChangeWidgets,
  viewMode,
  onChangeViewMode,
  visibleCards,
  onChangeVisibleCards,
}: Props) {
  const toggleWidget = (id: WidgetId) => {
    onChangeWidgets(
      activeWidgets.includes(id)
        ? activeWidgets.filter((w) => w !== id)
        : [...activeWidgets, id],
    )
  }

  const toggleCard = (id: CardId) => {
    onChangeVisibleCards(
      visibleCards.includes(id)
        ? visibleCards.filter((c) => c !== id)
        : [...visibleCards, id],
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Personalizar dashboard"
      size="sm"
      footer={<Button onClick={onClose}>Concluído</Button>}
    >
      <div className="flex flex-col gap-5">

        {/* ── Visualização ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            Visualização
          </p>
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

        {/* ── Cards principais ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Cards principais
            </p>
            <button
              onClick={() => onChangeVisibleCards(DEFAULT_VISIBLE_CARDS)}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              Selecionar todos
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Escolha quais indicadores aparecem no topo da tela inicial.
          </p>
          {visibleCards.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 mb-2">
              Todos os cards estão ocultos. Use "Selecionar todos" para restaurá-los.
            </p>
          )}
          <div className="flex flex-col gap-1">
            {ALL_CARD_IDS.map((id) => {
              const { label, description } = CARD_LABELS[id]
              return (
                <label
                  key={id}
                  className="flex items-start justify-between px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{label}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={visibleCards.includes(id)}
                    onChange={() => toggleCard(id)}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer mt-0.5 shrink-0"
                  />
                </label>
              )
            })}
          </div>
        </div>

        {/* ── Blocos do Dashboard ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Blocos do dashboard
            </p>
            <button
              onClick={() => onChangeWidgets(DEFAULT_WIDGETS)}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              Restaurar padrões
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Escolha quais análises e gráficos aparecem abaixo dos cards.
          </p>
          <div className="flex flex-col gap-1">
            {ALL_WIDGET_IDS.map((id) => (
              <label
                key={id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-sm text-slate-700 dark:text-slate-300">{WIDGET_LABELS[id]}</span>
                <input
                  type="checkbox"
                  checked={activeWidgets.includes(id)}
                  onChange={() => toggleWidget(id)}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>

      </div>
    </Modal>
  )
}
