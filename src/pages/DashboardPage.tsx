import { useState, useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
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
} from 'lucide-react'
import { StatCard } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { MonthSelector } from '../components/ui/MonthSelector'
import { PageLoader } from '../components/ui/Loading'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { usePWAUpdate } from '../hooks/usePWAUpdate'
import { currentMonthYear, formatCurrency, formatDate, todayISO } from '../utils/formatters'
import { APP_VERSION, formatBuildDate } from '../lib/version'
import type { Transaction, TransactionNature } from '../types'

const CARD_STORAGE_KEY = 'dashboard_visible_v1'

type CardId =
  | 'exp_total' | 'exp_paid' | 'exp_pending' | 'exp_fixed' | 'exp_inst'
  | 'inc_paid' | 'inc_pending' | 'saldo_atual' | 'saldo_previsto' | 'inc_fixed' | 'inc_inst'

const DEFAULT_VISIBLE: CardId[] = [
  'exp_total', 'exp_paid', 'exp_pending', 'exp_fixed', 'exp_inst',
  'inc_paid', 'inc_pending', 'saldo_atual', 'saldo_previsto', 'inc_fixed', 'inc_inst',
]

export function DashboardPage() {
  const { month: cm, year: cy } = currentMonthYear()
  const [month, setMonth] = useState(cm)
  const [year, setYear] = useState(cy)
  const { transactions, loading } = useTransactions(month, year)
  const { categories } = useCategories()
  const { isChecking, checkForUpdate, clearAllCaches } = usePWAUpdate()

  const catTypeMap = useMemo(() => {
    const m = new Map<string, string>()
    categories.forEach((c) => m.set(c.id, c.type))
    return m
  }, [categories])

  function getN(t: Transaction): TransactionNature {
    if (t.transactionNature) return t.transactionNature
    const ct = catTypeMap.get(t.categoryId)
    return ct === 'income' ? 'income' : 'expense'
  }

  const stats = useMemo(() => {
    const inc = transactions.filter((t) => getN(t) === 'income')
    const exp = transactions.filter((t) => getN(t) === 'expense')
    const expTotal = exp.reduce((s, t) => s + t.value, 0)
    const expPaid = exp.filter((t) => t.status === 'paid').reduce((s, t) => s + t.value, 0)
    const expPending = expTotal - expPaid
    const incTotal = inc.reduce((s, t) => s + t.value, 0)
    const incPaid = inc.filter((t) => t.status === 'paid').reduce((s, t) => s + t.value, 0)
    const saldoAtual = incPaid - expPaid
    const saldoPrevisto = incTotal - expTotal
    const expFixed = exp.filter((t) => t.type === 'fixed').reduce((s, t) => s + t.value, 0)
    const incFixed = inc.filter((t) => t.type === 'fixed').reduce((s, t) => s + t.value, 0)
    const expInst = exp.filter((t) => t.type === 'installment').reduce((s, t) => s + t.value, 0)
    const incInst = inc.filter((t) => t.type === 'installment').reduce((s, t) => s + t.value, 0)
    const incPending = incTotal - incPaid
    return { expTotal, expPaid, expPending, incTotal, incPaid, incPending, saldoAtual, saldoPrevisto, expFixed, incFixed, expInst, incInst }
  }, [transactions, catTypeMap])

  const alerts = useMemo(() => {
    const today = todayISO()
    const d7 = new Date(); d7.setDate(d7.getDate() + 7)
    const d7iso = d7.toISOString().slice(0, 10)
    const pending = transactions.filter((t) => t.status === 'pending')
    const overdue = pending.filter((t) => t.chargeDate < today)
    const dueToday = pending.filter((t) => t.chargeDate === today)
    const upcoming = pending.filter((t) => t.chargeDate > today && t.chargeDate <= d7iso)
    return { overdue, dueToday, upcoming }
  }, [transactions])

  const chartData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>()
    transactions.forEach((t) => {
      const key = t.categoryName || 'Sem categoria'
      if (!map.has(key)) map.set(key, { name: key, value: 0, color: stringToColor(key) })
      map.get(key)!.value += t.value
    })
    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 8)
  }, [transactions])

  const [visibleCards, setVisibleCards] = useState<CardId[]>(() => {
    try {
      const s = localStorage.getItem(CARD_STORAGE_KEY)
      if (s) return JSON.parse(s) as CardId[]
    } catch {}
    return DEFAULT_VISIBLE
  })
  const [editMode, setEditMode] = useState(false)
  const [cardModal, setCardModal] = useState<{ title: string; items: Transaction[] } | null>(null)

  const toggleCard = (id: CardId) => {
    setVisibleCards((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
      localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function openCardModal(id: CardId, title: string) {
    const inc = transactions.filter((t) => getN(t) === 'income')
    const exp = transactions.filter((t) => getN(t) === 'expense')
    let items: Transaction[] = []
    switch (id) {
      case 'exp_total':    items = exp; break
      case 'exp_paid':     items = exp.filter((t) => t.status === 'paid'); break
      case 'exp_pending':  items = exp.filter((t) => t.status === 'pending'); break
      case 'exp_fixed':    items = exp.filter((t) => t.type === 'fixed'); break
      case 'exp_inst':     items = exp.filter((t) => t.type === 'installment'); break
      case 'inc_paid':     items = inc.filter((t) => t.status === 'paid'); break
      case 'inc_pending':  items = inc.filter((t) => t.status === 'pending'); break
      case 'saldo_atual':  items = transactions.filter((t) => t.status === 'paid'); break
      case 'saldo_previsto': items = [...transactions]; break
      case 'inc_fixed':    items = inc.filter((t) => t.type === 'fixed'); break
      case 'inc_inst':     items = inc.filter((t) => t.type === 'installment'); break
    }
    setCardModal({ title, items: items.sort((a, b) => a.chargeDate.localeCompare(b.chargeDate)) })
  }

  const expCards = [
    { id: 'exp_total' as CardId,   label: 'Total',      value: formatCurrency(stats.expTotal),   icon: <TrendingDown className="w-5 h-5" />, color: 'bg-gradient-to-br from-indigo-500 to-indigo-700' },
    { id: 'exp_paid' as CardId,    label: 'Pagas',      value: formatCurrency(stats.expPaid),    icon: <CheckCircle className="w-5 h-5" />, color: 'bg-gradient-to-br from-emerald-500 to-emerald-700' },
    { id: 'exp_pending' as CardId, label: 'Pendentes',  value: formatCurrency(stats.expPending), icon: <Clock className="w-5 h-5" />, color: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    { id: 'exp_fixed' as CardId,   label: 'Fixas',      value: formatCurrency(stats.expFixed),   icon: <RefreshCw className="w-5 h-5" />, color: 'bg-gradient-to-br from-blue-500 to-blue-700' },
    { id: 'exp_inst' as CardId,    label: 'Parceladas', value: formatCurrency(stats.expInst),    icon: <CreditCard className="w-5 h-5" />, color: 'bg-gradient-to-br from-purple-500 to-purple-700' },
  ]

  const incCards = [
    { id: 'inc_paid' as CardId,       label: 'Recebidas',      value: formatCurrency(stats.incPaid),       icon: <CheckCircle className="w-5 h-5" />, color: 'bg-gradient-to-br from-teal-500 to-teal-700' },
    { id: 'inc_pending' as CardId,    label: 'A receber',      value: formatCurrency(stats.incPending),    icon: <Clock className="w-5 h-5" />, color: 'bg-gradient-to-br from-lime-500 to-lime-700' },
    { id: 'saldo_atual' as CardId,    label: 'Saldo atual',    value: formatCurrency(stats.saldoAtual),    icon: <TrendingDown className="w-5 h-5" />, color: stats.saldoAtual >= 0 ? 'bg-gradient-to-br from-green-500 to-green-700' : 'bg-gradient-to-br from-red-500 to-red-700' },
    { id: 'saldo_previsto' as CardId, label: 'Saldo previsto', value: formatCurrency(stats.saldoPrevisto), icon: <TrendingDown className="w-5 h-5" />, color: stats.saldoPrevisto >= 0 ? 'bg-gradient-to-br from-sky-500 to-sky-700' : 'bg-gradient-to-br from-orange-500 to-orange-700' },
    { id: 'inc_fixed' as CardId,      label: 'Fixas',          value: formatCurrency(stats.incFixed),      icon: <RefreshCw className="w-5 h-5" />, color: 'bg-gradient-to-br from-cyan-500 to-cyan-700' },
    { id: 'inc_inst' as CardId,       label: 'Parceladas',     value: formatCurrency(stats.incInst),       icon: <CreditCard className="w-5 h-5" />, color: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-700' },
  ]

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <MonthSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
        <button
          onClick={() => setEditMode(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shrink-0"
          title="Personalizar dashboard"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Personalizar</span>
        </button>
      </div>

      {/* Stats — Despesas */}
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

      {/* Stats — Receitas & Saldo */}
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
          {alerts.overdue.length > 0 && (
            <AlertGroup
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Contas atrasadas"
              count={alerts.overdue.length}
              total={alerts.overdue.reduce((s, t) => s + t.value, 0)}
              items={alerts.overdue}
              colorClass="border-red-400 dark:border-red-600"
              headerClass="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              badgeClass="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
            />
          )}
          {alerts.dueToday.length > 0 && (
            <AlertGroup
              icon={<CalendarCheck2 className="w-4 h-4" />}
              label="Vencem hoje"
              count={alerts.dueToday.length}
              total={alerts.dueToday.reduce((s, t) => s + t.value, 0)}
              items={alerts.dueToday}
              colorClass="border-amber-400 dark:border-amber-600"
              headerClass="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
              badgeClass="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
            />
          )}
          {alerts.upcoming.length > 0 && (
            <AlertGroup
              icon={<CalendarClock className="w-4 h-4" />}
              label="A vencer (próximos 7 dias)"
              count={alerts.upcoming.length}
              total={alerts.upcoming.reduce((s, t) => s + t.value, 0)}
              items={alerts.upcoming}
              colorClass="border-blue-400 dark:border-blue-600"
              headerClass="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
              badgeClass="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
            />
          )}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Por categoria</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) => [formatCurrency(Number(val)), '']}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-700">
          <TrendingDown className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 dark:text-slate-400">Nenhuma despesa lançada neste mês</p>
        </div>
      )}

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Últimos lançamentos</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {transactions.slice(0, 8).map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
          </div>
        </div>
      )}
      {/* Edit Modal */}
      <Modal
        open={editMode}
        onClose={() => setEditMode(false)}
        title="Personalizar dashboard"
        size="sm"
        footer={<Button onClick={() => setEditMode(false)}>Concluído</Button>}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Despesas</p>
            <div className="flex flex-col gap-1">
              {expCards.map((c) => (
                <label key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{c.label}</span>
                  <input
                    type="checkbox"
                    checked={visibleCards.includes(c.id)}
                    onChange={() => toggleCard(c.id)}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Receitas &amp; Saldo</p>
            <div className="flex flex-col gap-1">
              {incCards.map((c) => (
                <label key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{c.label}</span>
                  <input
                    type="checkbox"
                    checked={visibleCards.includes(c.id)}
                    onChange={() => toggleCard(c.id)}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Card Detail Modal */}
      <Modal
        open={cardModal !== null}
        onClose={() => setCardModal(null)}
        title={cardModal?.title ?? ''}
        size="md"
        footer={<Button onClick={() => setCardModal(null)}>Fechar</Button>}
      >
        {cardModal && (
          cardModal.items.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-6">Nenhum lançamento</p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {cardModal.items.length} {cardModal.items.length === 1 ? 'lançamento' : 'lançamentos'} · 
                {formatCurrency(cardModal.items.reduce((s, t) => s + t.value, 0))}
              </p>
              <div className="flex flex-col max-h-[55vh] overflow-y-auto -mx-4 px-4 divide-y divide-slate-100 dark:divide-slate-700">
                {cardModal.items.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stringToColor(t.categoryName) }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.categoryName} · {formatDate(t.chargeDate)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(t.value)}</p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        t.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
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

      {/* Atualização do app — apenas mobile (desktop usa Sidebar) */}
      <div className="lg:hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Controle Financeiro</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Build: {formatBuildDate(APP_VERSION)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={checkForUpdate}
            disabled={isChecking}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Verificando...' : 'Verificar atualiza\u00e7\u00e3o'}
          </button>
          <button
            onClick={clearAllCaches}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar cache
          </button>
        </div>
      </div>    </div>
  )
}

function TransactionRow({ transaction: t }: { transaction: Transaction }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: stringToColor(t.categoryName) }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t.categoryName}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(t.value)}</p>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            t.status === 'paid'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          }`}
        >
          {t.status === 'paid' ? 'Pago' : 'Pendente'}
        </span>
      </div>
    </div>
  )
}

function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6']
  return colors[Math.abs(hash) % colors.length]
}

interface AlertGroupProps {
  icon: React.ReactNode
  label: string
  count: number
  total: number
  items: Transaction[]
  colorClass: string
  headerClass: string
  badgeClass: string
}

function AlertGroup({ icon, label, count, total, items, colorClass, headerClass, badgeClass }: AlertGroupProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded-2xl border-2 overflow-hidden bg-white dark:bg-slate-800 shadow-sm ${colorClass}`}>
      <button
        className={`w-full flex items-center gap-2 px-4 py-3 ${headerClass} transition-colors`}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        <span className="flex-1 text-sm font-semibold text-left">{label}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
          {count} {count === 1 ? 'conta' : 'contas'} · {formatCurrency(total)}
        </span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>
      {open && (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {items.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: stringToColor(t.categoryName) }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.categoryName} · {formatDate(t.chargeDate)}</p>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                {formatCurrency(t.value)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
