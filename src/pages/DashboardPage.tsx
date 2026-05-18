import { useState, useMemo } from 'react'
import {
  TrendingDown,
  CheckCircle,
  Clock,
  RefreshCw,
  CreditCard,
  RotateCcw,
  Trash2,
  AlertTriangle,
  CalendarClock,
  CalendarCheck2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  LayoutDashboard,
} from 'lucide-react'
import { StatCard } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { MonthSelector } from '../components/ui/MonthSelector'
import { PageLoader } from '../components/ui/Loading'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { usePWAUpdate } from '../hooks/usePWAUpdate'
import { useDashboardData } from '../hooks/useDashboardData'
import { currentMonthYear, formatCurrency, formatDate, todayISO } from '../utils/formatters'
import { APP_VERSION, formatBuildDate } from '../lib/version'
import type { Transaction, TransactionNature } from '../types'

// Insights helpers
import {
  buildCatTypeMap,
  getTransactionNature,
  getMonthSummary,
  estimateMonthEnd,
  compareWithPreviousMonth,
  getMonthlyEvolution,
  getAnnualSummary,
  getCategoryRanking,
  getTopTransactions,
  getFutureBills,
  getFixedSummary,
  getSmartAlerts,
  stringToColor,
} from '../utils/dashboardInsights'

// Dashboard components
import { SmartSummary } from '../components/dashboard/SmartSummary'
import { MonthEndEstimateWidget } from '../components/dashboard/MonthEndEstimate'
import { PreviousMonthComparison } from '../components/dashboard/PreviousMonthComparison'
import { AnnualOverviewWidget } from '../components/dashboard/AnnualOverviewWidget'
import { EvolutionChart } from '../components/dashboard/EvolutionChart'
import { ExpenseCategoryChart, IncomeCategoryChart } from '../components/dashboard/CategoryCharts'
import { FixedAccountsWidget } from '../components/dashboard/FixedAccountsWidget'
import { TopExpensesWidget } from '../components/dashboard/TopExpensesWidget'
import { SmartAlertsWidget } from '../components/dashboard/SmartAlertsWidget'
import { FreeBalanceWidget } from '../components/dashboard/FreeBalanceWidget'
import { UrgentBillsWidget } from '../components/dashboard/UrgentBillsWidget'
import { MonthAvgComparisonWidget } from '../components/dashboard/MonthAvgComparisonWidget'
import {
  DashboardCustomizeModal,
  WIDGETS_KEY,
  VIEW_MODE_KEY,
  DEFAULT_WIDGETS,
  COMPACT_WIDGETS,
  CARD_STORAGE_KEY,
  DEFAULT_VISIBLE_CARDS,
  type WidgetId,
  type ViewMode,
  type CardId,
} from '../components/dashboard/DashboardCustomizeModal'



export function DashboardPage() {
  const { month: cm, year: cy } = currentMonthYear()
  const [month, setMonth] = useState(cm)
  const [year, setYear] = useState(cy)

  const { transactions, loading } = useTransactions(month, year)
  const { categories } = useCategories()
  const { isChecking, checkForUpdate, clearAllCaches } = usePWAUpdate()
  const { yearTransactions, prevMonthTransactions } = useDashboardData(month, year)

  const [visibleCards, setVisibleCards] = useState<CardId[]>(() => {
    try {
      const s = localStorage.getItem(CARD_STORAGE_KEY)
      if (s) {
        const saved = JSON.parse(s) as CardId[]
        // Compatibilidade: adiciona novos IDs padrão que ainda não existiam na config salva
        const merged = [...saved]
        for (const id of DEFAULT_VISIBLE_CARDS) {
          if (!merged.includes(id) && !merged.includes(id)) {
            // Novo card adicionado em versão posterior — adiciona por padrão
          }
        }
        return merged
      }
    } catch { /* ignore */ }
    return DEFAULT_VISIBLE_CARDS
  })
  const [activeWidgets, setActiveWidgets] = useState<WidgetId[]>(() => {
    try { const s = localStorage.getItem(WIDGETS_KEY); if (s) return JSON.parse(s) as WidgetId[] } catch { /* ignore */ }
    return DEFAULT_WIDGETS
  })
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { const s = localStorage.getItem(VIEW_MODE_KEY); if (s === 'compact' || s === 'full') return s } catch { /* ignore */ }
    return 'full'
  })
  const [editMode, setEditMode] = useState(false)
  const [cardModal, setCardModal] = useState<{ title: string; items: Transaction[] } | null>(null)

  const handleChangeWidgets = (ids: WidgetId[]) => { setActiveWidgets(ids); localStorage.setItem(WIDGETS_KEY, JSON.stringify(ids)) }
  const handleChangeViewMode = (mode: ViewMode) => { setViewMode(mode); localStorage.setItem(VIEW_MODE_KEY, mode) }
  const handleChangeVisibleCards = (ids: CardId[]) => { setVisibleCards(ids); localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(ids)) }

  const catTypeMap = useMemo(() => buildCatTypeMap(categories), [categories])
  function getNature(t: Transaction): TransactionNature { return getTransactionNature(t, catTypeMap) }

  const summary = useMemo(() => getMonthSummary(transactions, catTypeMap), [transactions, catTypeMap])

  const alerts = useMemo(() => {
    const today = todayISO()
    const d7 = new Date(); d7.setDate(d7.getDate() + 7)
    const d7iso = d7.toISOString().slice(0, 10)
    const pending = transactions.filter((t) => t.status === 'pending')
    return {
      overdue:  pending.filter((t) => t.chargeDate < today),
      dueToday: pending.filter((t) => t.chargeDate === today),
      upcoming: pending.filter((t) => t.chargeDate > today && t.chargeDate <= d7iso),
    }
  }, [transactions])

  const estimate       = useMemo(() => estimateMonthEnd(transactions, catTypeMap, month, year), [transactions, catTypeMap, month, year])
  const comparison     = useMemo(() => compareWithPreviousMonth(transactions, prevMonthTransactions, catTypeMap), [transactions, prevMonthTransactions, catTypeMap])
  const hasPrevData    = prevMonthTransactions.length > 0
  const annualSummary  = useMemo(() => getAnnualSummary(yearTransactions, catTypeMap), [yearTransactions, catTypeMap])
  const evolutionPoints = useMemo(() => getMonthlyEvolution(yearTransactions, catTypeMap), [yearTransactions, catTypeMap])
  const expCategoryItems = useMemo(() => getCategoryRanking(transactions, catTypeMap, 'expense'), [transactions, catTypeMap])
  const incCategoryItems = useMemo(() => getCategoryRanking(transactions, catTypeMap, 'income'), [transactions, catTypeMap])
  const topExpenses    = useMemo(() => getTopTransactions(transactions, catTypeMap, 'expense', 5), [transactions, catTypeMap])
  const futureBills    = useMemo(() => getFutureBills(transactions, catTypeMap), [transactions, catTypeMap])
  const fixedSummary   = useMemo(() => getFixedSummary(transactions, catTypeMap), [transactions, catTypeMap])
  const smartAlerts    = useMemo(() => getSmartAlerts(summary, fixedSummary, futureBills, hasPrevData ? comparison : null, transactions, catTypeMap), [summary, fixedSummary, futureBills, comparison, hasPrevData, transactions, catTypeMap])

  const stats = summary
  const expCards = [
    { id: 'exp_total'   as CardId, label: 'Total',      value: formatCurrency(stats.expTotal),   icon: <TrendingDown className="w-5 h-5" />, color: 'bg-gradient-to-br from-indigo-500 to-indigo-700' },
    { id: 'exp_paid'    as CardId, label: 'Pagas',      value: formatCurrency(stats.expPaid),    icon: <CheckCircle className="w-5 h-5" />,  color: 'bg-gradient-to-br from-emerald-500 to-emerald-700' },
    { id: 'exp_pending' as CardId, label: 'Pendentes',  value: formatCurrency(stats.expPending), icon: <Clock className="w-5 h-5" />,        color: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    { id: 'exp_fixed'   as CardId, label: 'Fixas',      value: formatCurrency(stats.expFixed),   icon: <RefreshCw className="w-5 h-5" />,    color: 'bg-gradient-to-br from-blue-500 to-blue-700' },
    { id: 'exp_inst'    as CardId, label: 'Parceladas', value: formatCurrency(stats.expInst),    icon: <CreditCard className="w-5 h-5" />,   color: 'bg-gradient-to-br from-purple-500 to-purple-700' },
  ]
  const incCards = [
    { id: 'inc_paid'       as CardId, label: 'Recebidas',      value: formatCurrency(stats.incPaid),       icon: <CheckCircle className="w-5 h-5" />,  color: 'bg-gradient-to-br from-teal-500 to-teal-700' },
    { id: 'inc_pending'    as CardId, label: 'A receber',      value: formatCurrency(stats.incPending),    icon: <Clock className="w-5 h-5" />,        color: 'bg-gradient-to-br from-lime-500 to-lime-700' },
    { id: 'saldo_atual'    as CardId, label: 'Saldo atual',    value: formatCurrency(stats.saldoAtual),    icon: <TrendingDown className="w-5 h-5" />, color: stats.saldoAtual >= 0 ? 'bg-gradient-to-br from-green-500 to-green-700' : 'bg-gradient-to-br from-red-500 to-red-700' },
    { id: 'saldo_previsto' as CardId, label: 'Saldo previsto', value: formatCurrency(stats.saldoPrevisto), icon: <TrendingDown className="w-5 h-5" />, color: stats.saldoPrevisto >= 0 ? 'bg-gradient-to-br from-sky-500 to-sky-700' : 'bg-gradient-to-br from-orange-500 to-orange-700' },
    { id: 'inc_fixed'      as CardId, label: 'Fixas',          value: formatCurrency(stats.incFixed),      icon: <RefreshCw className="w-5 h-5" />,    color: 'bg-gradient-to-br from-cyan-500 to-cyan-700' },
    { id: 'inc_inst'       as CardId, label: 'Parceladas',     value: formatCurrency(stats.incInst),       icon: <CreditCard className="w-5 h-5" />,   color: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-700' },
  ]

  function openCardModal(id: CardId, title: string) {
    const inc = transactions.filter((t) => getNature(t) === 'income')
    const exp = transactions.filter((t) => getNature(t) === 'expense')
    let items: Transaction[] = []
    switch (id) {
      case 'exp_total':      items = exp; break
      case 'exp_paid':       items = exp.filter((t) => t.status === 'paid'); break
      case 'exp_pending':    items = exp.filter((t) => t.status === 'pending'); break
      case 'exp_fixed':      items = exp.filter((t) => t.type === 'fixed'); break
      case 'exp_inst':       items = exp.filter((t) => t.type === 'installment'); break
      case 'inc_paid':       items = inc.filter((t) => t.status === 'paid'); break
      case 'inc_pending':    items = inc.filter((t) => t.status === 'pending'); break
      case 'saldo_atual':    items = transactions.filter((t) => t.status === 'paid'); break
      case 'saldo_previsto': items = [...transactions]; break
      case 'inc_fixed':      items = inc.filter((t) => t.type === 'fixed'); break
      case 'inc_inst':       items = inc.filter((t) => t.type === 'installment'); break
    }
    setCardModal({ title, items: items.sort((a, b) => a.chargeDate.localeCompare(b.chargeDate)) })
  }

  const isVisible = (id: WidgetId): boolean => {
    if (!activeWidgets.includes(id)) return false
    if (viewMode === 'compact') return COMPACT_WIDGETS.includes(id)
    return true
  }

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <MonthSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => handleChangeViewMode(viewMode === 'compact' ? 'full' : 'compact')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${viewMode === 'compact' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{viewMode === 'compact' ? 'Resumida' : 'Completa'}</span>
          </button>
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Personalizar</span>
          </button>
        </div>
      </div>

      {/* Cards Despesas */}
      {expCards.some((c) => visibleCards.includes(c.id)) && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-0.5">Despesas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {expCards.filter((c) => visibleCards.includes(c.id)).map((c, i, arr) => (
              <div key={c.id} className={i === arr.length - 1 && arr.length % 2 !== 0 ? 'col-span-2 sm:col-span-1' : ''}>
                <StatCard label={c.label} value={c.value} icon={c.icon} color={c.color} onClick={() => openCardModal(c.id, `Despesas — ${c.label}`)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards Receitas & Saldo */}
      {incCards.some((c) => visibleCards.includes(c.id)) && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-0.5">Receitas &amp; Saldo</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {incCards.filter((c) => visibleCards.includes(c.id)).map((c, i, arr) => (
              <div key={c.id} className={i === arr.length - 1 && arr.length % 2 !== 0 ? 'col-span-2 sm:col-span-1' : ''}>
                <StatCard label={c.label} value={c.value} icon={c.icon} color={c.color} onClick={() => openCardModal(c.id, c.label)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts Panel */}
      {(alerts.overdue.length > 0 || alerts.dueToday.length > 0 || alerts.upcoming.length > 0) && (
        <div className="flex flex-col gap-2">
          {alerts.overdue.length > 0 && <AlertGroup icon={<AlertTriangle className="w-4 h-4" />} label="Contas atrasadas" count={alerts.overdue.length} total={alerts.overdue.reduce((s, t) => s + t.value, 0)} items={alerts.overdue} colorClass="border-red-400 dark:border-red-600" headerClass="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" badgeClass="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" />}
          {alerts.dueToday.length > 0 && <AlertGroup icon={<CalendarCheck2 className="w-4 h-4" />} label="Vencem hoje" count={alerts.dueToday.length} total={alerts.dueToday.reduce((s, t) => s + t.value, 0)} items={alerts.dueToday} colorClass="border-amber-400 dark:border-amber-600" headerClass="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" badgeClass="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" />}
          {alerts.upcoming.length > 0 && <AlertGroup icon={<CalendarClock className="w-4 h-4" />} label="A vencer (proximos 7 dias)" count={alerts.upcoming.length} total={alerts.upcoming.reduce((s, t) => s + t.value, 0)} items={alerts.upcoming} colorClass="border-blue-400 dark:border-blue-600" headerClass="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" badgeClass="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400" />}
        </div>
      )}

      {isVisible('smart_alerts') && <SmartAlertsWidget alerts={smartAlerts} />}
      {isVisible('free_balance') && <FreeBalanceWidget summary={summary} />}
      {isVisible('urgent_bills') && <UrgentBillsWidget transactions={transactions} />}
      {isVisible('monthly_avg_comparison') && <MonthAvgComparisonWidget currentTransactions={transactions} yearTransactions={yearTransactions} categories={categories} month={month} year={year} />}
      {isVisible('smart_summary') && <SmartSummary summary={summary} />}
      {isVisible('month_end_estimate') && <MonthEndEstimateWidget estimate={estimate} month={month} year={year} />}
      {isVisible('prev_comparison') && <PreviousMonthComparison comparison={comparison} hasPrevData={hasPrevData} />}
      {isVisible('top_expenses') && <TopExpensesWidget topTransactions={topExpenses} />}
      {isVisible('fixed_accounts') && <FixedAccountsWidget fixedSummary={fixedSummary} />}
      {isVisible('expense_category') && <ExpenseCategoryChart items={expCategoryItems} />}
      {isVisible('income_category') && <IncomeCategoryChart items={incCategoryItems} />}
      {isVisible('evolution_chart') && evolutionPoints.length > 0 && <EvolutionChart allPoints={evolutionPoints} />}
      {isVisible('annual_overview') && <AnnualOverviewWidget annual={annualSummary} year={year} />}

      {isVisible('recent_transactions') && transactions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Ultimos lancamentos</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {transactions.slice(0, 8).map((t) => <TransactionRow key={t.id} transaction={t} />)}
          </div>
        </div>
      )}

      <DashboardCustomizeModal open={editMode} onClose={() => setEditMode(false)} activeWidgets={activeWidgets} onChangeWidgets={handleChangeWidgets} viewMode={viewMode} onChangeViewMode={handleChangeViewMode} visibleCards={visibleCards} onChangeVisibleCards={handleChangeVisibleCards} />

      <Modal open={cardModal !== null} onClose={() => setCardModal(null)} title={cardModal?.title ?? ''} size="md" footer={<Button onClick={() => setCardModal(null)}>Fechar</Button>}>
        {cardModal && (
          cardModal.items.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-6">Nenhum lancamento</p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {cardModal.items.length} {cardModal.items.length === 1 ? 'lancamento' : 'lancamentos'} · {formatCurrency(cardModal.items.reduce((s, t) => s + t.value, 0))}
              </p>
              <div className="flex flex-col max-h-[55vh] overflow-y-auto -mx-4 px-4 divide-y divide-slate-100 dark:divide-slate-700">
                {cardModal.items.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stringToColor(t.categoryName) }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.categoryName} · {formatDate(t.chargeDate)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(t.value)}</p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${t.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                        {t.status === 'paid' ? 'Pago' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </Modal>

      <div className="lg:hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Controle Financeiro</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Build: {formatBuildDate(APP_VERSION)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={checkForUpdate} disabled={isChecking} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50">
            <RotateCcw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Verificando...' : 'Verificar atualizacao'}
          </button>
          <button onClick={clearAllCaches} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
            Limpar cache
          </button>
        </div>
      </div>
    </div>
  )
}

function TransactionRow({ transaction: t }: { transaction: Transaction }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stringToColor(t.categoryName) }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t.categoryName}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(t.value)}</p>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${t.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
          {t.status === 'paid' ? 'Pago' : 'Pendente'}
        </span>
      </div>
    </div>
  )
}

interface AlertGroupProps {
  icon: React.ReactNode; label: string; count: number; total: number
  items: Transaction[]; colorClass: string; headerClass: string; badgeClass: string
}

function AlertGroup({ icon, label, count, total, items, colorClass, headerClass, badgeClass }: AlertGroupProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded-2xl border-2 overflow-hidden bg-white dark:bg-slate-800 shadow-sm ${colorClass}`}>
      <button className={`w-full flex items-center gap-2 px-4 py-3 ${headerClass} transition-colors`} onClick={() => setOpen((v) => !v)}>
        {icon}
        <span className="flex-1 text-sm font-semibold text-left">{label}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>{count} {count === 1 ? 'conta' : 'contas'} · {formatCurrency(total)}</span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>
      {open && (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {items.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stringToColor(t.categoryName) }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.categoryName} · {formatDate(t.chargeDate)}</p>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 shrink-0">{formatCurrency(t.value)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
