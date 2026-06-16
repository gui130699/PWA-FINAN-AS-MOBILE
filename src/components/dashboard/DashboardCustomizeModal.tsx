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
import {
  type CardId,
  type CategoryDisplayMode,
  type WidgetId,
  type ViewMode,
  CARD_LABELS,
  DEFAULT_CATEGORY_DISPLAY_MODE,
  DEFAULT_VISIBLE_CARDS,
  DEFAULT_WIDGETS,
  WIDGET_LABELS,
} from './dashboardConfig'

// ─── Modal ───────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  // widgets
  activeWidgets: WidgetId[]
  onChangeWidgets: (ids: WidgetId[]) => void
  viewMode: ViewMode
  onChangeViewMode: (mode: ViewMode) => void
  categoryDisplayMode: CategoryDisplayMode
  onChangeCategoryDisplayMode: (mode: CategoryDisplayMode) => void
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
  categoryDisplayMode,
  onChangeCategoryDisplayMode,
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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Graficos por categoria
            </p>
            <button
              onClick={() => onChangeCategoryDisplayMode(DEFAULT_CATEGORY_DISPLAY_MODE)}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              Restaurar padrao
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Escolha se despesas e receitas por categoria abrem completas ou resumidas.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(['all', 'top5'] as CategoryDisplayMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onChangeCategoryDisplayMode(mode)}
                className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${
                  categoryDisplayMode === mode
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {mode === 'all' ? 'Todas' : 'Top 5'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Cards principais ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Cards principais
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onChangeVisibleCards([])}
                className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hover:underline"
              >
                Ocultar todos
              </button>
              <span className="text-[11px] text-slate-300 dark:text-slate-600">|</span>
              <button
                onClick={() => onChangeVisibleCards(DEFAULT_VISIBLE_CARDS)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                Restaurar padrão
              </button>
            </div>
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
