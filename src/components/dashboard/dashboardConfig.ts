/**
 * dashboardConfig.ts
 * Tipos e constantes compartilhadas do dashboard.
 * Separado de DashboardCustomizeModal.tsx para compatibilidade com react-refresh.
 */

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
  | 'free_balance'
  | 'urgent_bills'
  | 'monthly_avg_comparison'

export type ViewMode = 'compact' | 'full'
export type CategoryDisplayMode = 'all' | 'top5'

export const WIDGET_LABELS: Record<WidgetId, string> = {
  smart_summary:              'Resumo inteligente',
  month_end_estimate:         'Estimativa de fechamento',
  prev_comparison:            'Comparativo mês anterior',
  annual_overview:            'Visão anual',
  evolution_chart:            'Evolução mensal (gráfico)',
  expense_category:           'Despesas por categoria',
  income_category:            'Receitas por categoria',
  fixed_accounts:             'Contas fixas',
  top_expenses:               'Maiores gastos',
  smart_alerts:               'Alertas inteligentes',
  recent_transactions:        'Últimos lançamentos',
  free_balance:               'Saldo livre',
  urgent_bills:               'Contas urgentes',
  monthly_avg_comparison:     'Comparação com média 3 meses',
}

export const WIDGETS_KEY  = 'dashboard_widgets_v2'
export const VIEW_MODE_KEY = 'dashboard_view_mode_v1'
export const CATEGORY_DISPLAY_MODE_KEY = 'dashboard_category_display_mode_v1'
export const DEFAULT_CATEGORY_DISPLAY_MODE: CategoryDisplayMode = 'all'

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
