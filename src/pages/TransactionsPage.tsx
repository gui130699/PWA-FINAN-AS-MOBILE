import { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Calendar, CalendarRange, ArrowDownToLine, Banknote, CreditCard } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import { MonthSelector } from '../components/ui/MonthSelector'
import { PageLoader, EmptyState } from '../components/ui/Loading'
import { toast } from '../components/ui/Toast'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { useAuth } from '../contexts/AuthContext'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, currentMonthYear, todayISO } from '../utils/formatters'
import { getErrorMessage } from '../utils/errorUtils'
import {
  createInstallmentGroup,
  generateFixedAccountsForMonth,
  generateFixedAccountsForYear,
  copyPendingFromPreviousMonth,
  updateInstallmentCascade,
  bringPreviousMonthBalance,
} from '../services/firestore'
import type { Transaction, TransactionType, TransactionStatus, RecurrenceType, TransactionNature } from '../types'
import { WEEK_DAY_LABELS } from '../types'

type NatureFilter = 'all' | 'expense' | 'income'

type SortOption =
  | 'chargeDate_asc'
  | 'chargeDate_desc'
  | 'launchDate_desc'
  | 'launchDate_asc'
  | 'description_asc'
  | 'description_desc'
  | 'category_asc'
  | 'category_desc'
  | 'value_asc'
  | 'value_desc'

function sortTransactions(list: Transaction[], sortBy: SortOption): Transaction[] {
  const sorted = [...list]
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'chargeDate_asc':   return a.chargeDate.localeCompare(b.chargeDate)
      case 'chargeDate_desc':  return b.chargeDate.localeCompare(a.chargeDate)
      case 'launchDate_desc':  return b.launchDate.localeCompare(a.launchDate)
      case 'launchDate_asc':   return a.launchDate.localeCompare(b.launchDate)
      case 'description_asc':  return a.description.localeCompare(b.description, 'pt-BR', { sensitivity: 'base' })
      case 'description_desc': return b.description.localeCompare(a.description, 'pt-BR', { sensitivity: 'base' })
      case 'category_asc':     return a.categoryName.localeCompare(b.categoryName, 'pt-BR', { sensitivity: 'base' })
      case 'category_desc':    return b.categoryName.localeCompare(a.categoryName, 'pt-BR', { sensitivity: 'base' })
      case 'value_asc':        return a.value - b.value
      case 'value_desc':       return b.value - a.value
      default:                 return 0
    }
  })
  return sorted
}

function categoryMatchesNature(cat: { type: string }, nature: TransactionNature): boolean {
  return cat.type === nature || cat.type === 'both'
}

function inferNatureFromEdit(
  nature: TransactionNature | undefined,
  categoryId: string,
  categories: { id: string; type: string }[]
): TransactionNature {
  if (nature === 'income' || nature === 'expense') return nature
  const cat = categories.find((c) => c.id === categoryId)
  if (cat?.type === 'income') return 'income'
  if (cat?.type === 'expense') return 'expense'
  return 'expense'
}

export function TransactionsPage() {
  const { month: cm, year: cy } = currentMonthYear()
  const [month, setMonth] = useState(cm)
  const [year, setYear] = useState(cy)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [filterNature, setFilterNature] = useState<NatureFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [delFutureLoading, setDelFutureLoading] = useState(false)
  const [editItem, setEditItem] = useState<Transaction | null>(null)
  const [delLoading, setDelLoading] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [reopenConfirmId, setReopenConfirmId] = useState<string | null>(null)
  const [toggleLoading, setToggleLoading] = useState<string | null>(null)
  const [rotatingId, setRotatingId] = useState<string | null>(null)
  const [genYearOpen, setGenYearOpen] = useState(false)
  const [copyPrevLoading, setCopyPrevLoading] = useState(false)
  const [copyPrevOpen, setCopyPrevOpen] = useState(false)
  const [balanceOpen, setBalanceOpen] = useState(false)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [balanceCatId, setBalanceCatId] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem('transactions-sort-by') as SortOption | null
    return saved ?? 'chargeDate_asc'
  })

  useEffect(() => {
    localStorage.setItem('transactions-sort-by', sortBy)
  }, [sortBy])

  const { transactions, loading, update, remove, reload } = useTransactions(month, year)
  const { categories } = useCategories()
  const { user } = useAuth()
  const { isOnline } = useOnlineStatus()

  const catTypeMap = useMemo(() => {
    const m = new Map<string, string>()
    categories.forEach((c) => m.set(c.id, c.type))
    return m
  }, [categories])

  const getTxNature = useCallback((t: Transaction): TransactionNature => {
    if (t.transactionNature) return t.transactionNature
    return catTypeMap.get(t.categoryId) === 'income' ? 'income' : 'expense'
  }, [catTypeMap])

  const filtered = transactions.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(t.categoryId)) return false
    if (filterNature !== 'all' && getTxNature(t) !== filterNature) return false
    return true
  })

  const ordered = sortTransactions(filtered, sortBy)

  const visibleTotals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const tx of ordered) {
      if (getTxNature(tx) === 'income') income += tx.value
      else expense += tx.value
    }
    return { income, expense, balance: income - expense, count: ordered.length }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordered, catTypeMap])

  const txSummary = useMemo(() => {
    const exp = transactions.filter((t) => getTxNature(t) === 'expense')
    const inc = transactions.filter((t) => getTxNature(t) === 'income')
    return {
      expTotal:   exp.reduce((s, t) => s + t.value, 0),
      expPaid:    exp.filter((t) => t.status === 'paid').reduce((s, t) => s + t.value, 0),
      expPending: exp.filter((t) => t.status === 'pending').reduce((s, t) => s + t.value, 0),
      incTotal:   inc.reduce((s, t) => s + t.value, 0),
      incPaid:    inc.filter((t) => t.status === 'paid').reduce((s, t) => s + t.value, 0),
      incPending: inc.filter((t) => t.status === 'pending').reduce((s, t) => s + t.value, 0),
    }
  }, [transactions, getTxNature])

  const handleDelete = async () => {
    if (!deleteId) return
    setDelLoading(true)
    try {
      await remove(deleteId)
      toast.success('Lançamento excluído')
    } catch {
      toast.error('Erro ao excluir')
    } finally {
      setDelLoading(false)
      setDeleteId(null)
      setDeleteTarget(null)
    }
  }

  const handleDeleteFutures = async () => {
    if (!deleteTarget || !user) return
    setDelFutureLoading(true)
    try {
      const { deleteFutureFixedTransactions, deleteFutureInstallmentTransactions } = await import('../services/firestore')
      if (deleteTarget.type === 'fixed' && deleteTarget.fixedAccountId) {
        const { deleted } = await deleteFutureFixedTransactions(user.uid, deleteTarget.fixedAccountId, deleteTarget.chargeDate)
        if (deleted === 0) toast.info('Nenhum lançamento pendente futuro encontrado.')
        else toast.success(`${deleted} lançamento(s) pendente(s) excluído(s). Pagos não foram excluídos.`)
      } else if (deleteTarget.type === 'installment' && deleteTarget.installmentGroupId) {
        const { deleted } = await deleteFutureInstallmentTransactions(user.uid, deleteTarget.installmentGroupId, deleteTarget.chargeDate)
        if (deleted === 0) toast.info('Nenhuma parcela pendente futura encontrada.')
        else toast.success(`${deleted} parcela(s) pendente(s) excluída(s). Pagas e anteriores não foram excluídas.`)
      }
      reload()
    } catch {
      toast.error('Erro ao excluir lançamentos futuros')
    } finally {
      setDelFutureLoading(false)
      setDeleteTarget(null)
    }
  }

  function requestDelete(t: Transaction) {
    if (t.type === 'normal') {
      setDeleteId(t.id)
    } else {
      setDeleteTarget(t)
    }
  }

  const handleToggleStatus = async (t: Transaction) => {
    // paid → pending requer confirmação
    if (t.status === 'paid') {
      setReopenConfirmId(t.id)
      return
    }
    // pending → paid: direto, sem confirmação
    setRotatingId(t.id)
    setToggleLoading(t.id)
    try {
      await update(t.id, { status: 'paid' })
      toast.success('Pagamento marcado como pago')
    } catch {
      toast.error('Erro ao atualizar')
    } finally {
      setToggleLoading(null)
      setTimeout(() => setRotatingId(null), 400)
    }
  }

  const handleConfirmReopen = async () => {
    if (!reopenConfirmId) return
    setRotatingId(reopenConfirmId)
    setToggleLoading(reopenConfirmId)
    try {
      await update(reopenConfirmId, { status: 'pending' })
      toast.success('Pagamento reaberto')
    } catch {
      toast.error('Erro ao atualizar')
    } finally {
      setToggleLoading(null)
      setReopenConfirmId(null)
      setTimeout(() => setRotatingId(null), 400)
    }
  }

  const handleGenerate = async () => {
    if (!user) return
    if (!isOnline) {
      toast.error('Esta ação precisa de internet para garantir a segurança dos dados.')
      return
    }
    setGenLoading(true)
    try {
      const { created, skipped } = await generateFixedAccountsForMonth(user.uid, month, year)
      toast.success(`${created} conta(s) gerada(s)${skipped > 0 ? `, ${skipped} já existia(m)` : ''}`)
      reload()
    } catch {
      toast.error('Erro ao gerar contas')
    } finally {
      setGenLoading(false)
    }
  }

  const handleCopyPrev = async () => {
    if (!user) return
    if (!isOnline) {
      toast.error('Esta ação precisa de internet para garantir a segurança dos dados.')
      return
    }
    setCopyPrevLoading(true)
    try {
      const { copied, skipped } = await copyPendingFromPreviousMonth(user.uid, month, year)
      toast.success(`${copied} lançamento(s) importado(s)${skipped > 0 ? `, ${skipped} ignorado(s)` : ''}`)
      reload()
    } catch {
      toast.error('Erro ao importar lançamentos')
    } finally {
      setCopyPrevLoading(false)
      setCopyPrevOpen(false)
    }
  }

  const handleBringBalance = async () => {
    if (!user || !balanceCatId) return
    const cat = categories.find((c) => c.id === balanceCatId)
    if (!cat) return
    setBalanceLoading(true)
    try {
      const { balance, created } = await bringPreviousMonthBalance(user.uid, month, year, balanceCatId, cat.name)
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      const signal = balance >= 0 ? '+' : ''
      if (created) {
        toast.success(`Saldo de ${String(prevMonth).padStart(2, '0')}/${prevYear}: ${signal}${formatCurrency(balance)} lançado`)
        reload()
      } else {
        toast.info(`Saldo anterior já havia sido lançado para ${String(month).padStart(2, '0')}/${year}`)
      }
      setBalanceOpen(false)
      setBalanceCatId('')
    } catch {
      toast.error('Erro ao trazer saldo')
    } finally {
      setBalanceLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <MonthSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setEditItem(null); setModalOpen(true) }}>
            Lançar
          </Button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant="secondary"
            icon={<Banknote className="w-4 h-4" />}
            onClick={() => setBalanceOpen(true)}
            size="sm"
            title="Trazer saldo do mês anterior"
          >
            Saldo ant.
          </Button>
          <Button
            variant="secondary"
            icon={<ArrowDownToLine className="w-4 h-4" />}
            onClick={() => setCopyPrevOpen(true)}
            loading={copyPrevLoading}
            size="sm"
            title="Trazer lançamentos pendentes do mês anterior"
          >
            Mês ant.
          </Button>
          <Button
            variant="secondary"
            icon={<Calendar className="w-4 h-4" />}
            onClick={handleGenerate}
            loading={genLoading}
            size="sm"
            title="Gerar mês"
          >
            Gerar mês
          </Button>
          <Button
            variant="secondary"
            icon={<CalendarRange className="w-4 h-4" />}
            onClick={() => setGenYearOpen(true)}
            size="sm"
            title="Gerar ano"
          >
            Gerar ano
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'pending', 'paid'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendentes' : 'Pagos'}
            </button>
          ))}
          {(['all', 'expense', 'income'] as const).map((n) => (
            <button
              key={n}
              onClick={() => setFilterNature(n)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterNature === n
                  ? n === 'income' ? 'bg-emerald-600 text-white' : n === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {n === 'all' ? 'Todos tipos' : n === 'expense' ? '↓ Despesas' : '↑ Receitas'}
            </button>
          ))}
          <button
            onClick={() => setCatModalOpen(true)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategoryIds.length > 0
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {selectedCategoryIds.length === 0
              ? 'Categorias'
              : selectedCategoryIds.length === 1
              ? (categories.find((c) => c.id === selectedCategoryIds[0])?.name ?? '1 categoria')
              : `${selectedCategoryIds.length} categorias`}
          </button>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="w-full px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="chargeDate_asc">Vencimento: mais próximo</option>
          <option value="chargeDate_desc">Vencimento: mais distante</option>
          <option value="launchDate_desc">Lançamento: mais recente</option>
          <option value="launchDate_asc">Lançamento: mais antigo</option>
          <option value="description_asc">Nome: A-Z</option>
          <option value="description_desc">Nome: Z-A</option>
          <option value="category_asc">Categoria: A-Z</option>
          <option value="category_desc">Categoria: Z-A</option>
          <option value="value_asc">Valor: menor para maior</option>
          <option value="value_desc">Valor: maior para menor</option>
        </select>
      </div>

      {/* Totalizador dos lançamentos em tela */}
      {!loading && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">Resumo dos lançamentos em tela</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className={`rounded-xl border p-2.5 text-center ${
              visibleTotals.balance >= 0
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20'
            }`}>
              <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-tight mb-0.5">Total em tela</p>
              <p className={`text-sm font-bold leading-tight ${
                visibleTotals.balance >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
              }`}>{formatCurrency(visibleTotals.balance)}</p>
            </div>
            <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-2.5 text-center">
              <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-tight mb-0.5">Despesas em tela</p>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300 leading-tight">{formatCurrency(visibleTotals.expense)}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-2.5 text-center">
              <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-tight mb-0.5">Receitas em tela</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 leading-tight">{formatCurrency(visibleTotals.income)}</p>
            </div>
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-2.5 text-center">
              <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-tight mb-0.5">Itens visíveis</p>
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 leading-tight">{visibleTotals.count} {visibleTotals.count === 1 ? 'lançamento' : 'lançamentos'}</p>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Plus className="w-16 h-16" />}
          title="Nenhum lançamento"
          description="Clique em Lançar para adicionar despesas"
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {ordered.map((t) => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-3">
                <button
                  onClick={() => handleToggleStatus(t)}
                  disabled={rotatingId === t.id}
                  title={t.status === 'paid' ? 'Reabrir pagamento' : 'Marcar como pago'}
                  className={`shrink-0 cursor-pointer transition-all duration-300 ease-in-out active:scale-95 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                    t.status === 'paid'
                      ? 'text-emerald-500 hover:text-emerald-400'
                      : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  <RefreshCw
                    className={`w-5 h-5 transition-transform duration-300 ${
                      rotatingId === t.id ? 'animate-spin' : ''
                    }`}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {t.categoryName} · {t.chargeDate.split('-').reverse().join('/')}
                  </p>
                  {(t.type === 'fixed' || t.type === 'installment') && (
                    <p className="flex items-center gap-1 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 mt-0.5">
                      {t.type === 'fixed' && <><span>🔁</span><span>Fixa</span></>}
                      {t.type === 'installment' && <><CreditCard className="w-3 h-3" /><span>{t.installmentNumber}/{t.totalInstallments}</span></>}
                    </p>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 shrink-0">{formatCurrency(t.value)}</p>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                    t.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                  }`}>
                    {t.status === 'paid' ? 'Pago' : 'Pendente'}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                    getTxNature(t) === 'income'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  }`}>
                    {getTxNature(t) === 'income' ? 'Receita' : 'Despesa'}
                  </span>
                  {t._syncStatus && t._syncStatus !== 'synced' && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                      t._syncStatus === 'pending'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : t._syncStatus === 'syncing'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    }`}>
                      {t._syncStatus === 'pending' ? '⟳ Offline' : t._syncStatus === 'syncing' ? '↑ Sync' : '! Erro'}
                    </span>
                  )}
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <button
                    onClick={() => { setEditItem(t); setModalOpen(true) }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => requestDelete(t)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {transactions.length > 0 && (
        <div className="flex flex-col gap-2">
          {/* Despesas */}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Despesas</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { label: 'Total Despesas',    value: txSummary.expTotal,   bg: 'bg-indigo-50 dark:bg-indigo-900/20',  text: 'text-indigo-700 dark:text-indigo-300' },
              { label: 'Pago Despesas',     value: txSummary.expPaid,    bg: 'bg-rose-50 dark:bg-rose-900/20',      text: 'text-rose-700 dark:text-rose-300' },
              { label: 'Pendente Despesas', value: txSummary.expPending, bg: 'bg-amber-50 dark:bg-amber-900/20',    text: 'text-amber-700 dark:text-amber-300' },
            ] as const).map((item) => (
              <div key={item.label} className={`${item.bg} rounded-xl p-2.5 text-center`}>
                <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight mb-0.5">{item.label}</p>
                <p className={`text-xs sm:text-sm font-bold ${item.text} leading-tight`}>{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
          {/* Entradas */}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-1">Entradas</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { label: 'Total Entradas',      value: txSummary.incTotal,   bg: 'bg-emerald-50 dark:bg-emerald-900/20',  text: 'text-emerald-700 dark:text-emerald-300' },
              { label: 'Entradas Recebidas',  value: txSummary.incPaid,    bg: 'bg-teal-50 dark:bg-teal-900/20',        text: 'text-teal-700 dark:text-teal-300' },
              { label: 'Entradas Pendentes',  value: txSummary.incPending, bg: 'bg-lime-50 dark:bg-lime-900/20',        text: 'text-lime-700 dark:text-lime-300' },
            ] as const).map((item) => (
              <div key={item.label} className={`${item.bg} rounded-xl p-2.5 text-center`}>
                <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight mb-0.5">{item.label}</p>
                <p className={`text-xs sm:text-sm font-bold ${item.text} leading-tight`}>{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={async () => { setModalOpen(false); await reload() }}
        editItem={editItem}
        categories={categories}
        defaultMonth={month}
        defaultYear={year}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Excluir lançamento"
        message="Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={delLoading}
      />

      <ConfirmDialog
        open={!!reopenConfirmId}
        title="Reabrir pagamento"
        message="Deseja reabrir este pagamento?"
        onConfirm={handleConfirmReopen}
        onCancel={() => setReopenConfirmId(null)}
        loading={toggleLoading === reopenConfirmId}
      />

      {/* Modal especial para exclusão de fixas/parceladas */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.type === 'fixed' ? 'Excluir conta fixa' : 'Excluir parcela'}
        footer={
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
        }
        size="sm"
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {deleteTarget?.type === 'fixed'
              ? 'Este lançamento faz parte de uma conta fixa. O que deseja excluir?'
              : 'Este lançamento faz parte de uma compra parcelada. O que deseja excluir?'}
          </p>
          <Button
            variant="secondary"
            onClick={async () => {
              if (!deleteTarget) return
              setDelLoading(true)
              try {
                await remove(deleteTarget.id)
                toast.success('Lançamento excluído')
                reload()
              } catch { toast.error('Erro ao excluir') }
              finally { setDelLoading(false); setDeleteTarget(null) }
            }}
            loading={delLoading}
          >
            Excluir apenas este lançamento
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteFutures}
            loading={delFutureLoading}
          >
            {deleteTarget?.type === 'fixed'
              ? 'Excluir este e todos os pendentes futuros'
              : 'Excluir esta e todas as parcelas pendentes futuras'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={copyPrevOpen}
        title="Trazer lançamentos do mês anterior"
        message={`Copia os lançamentos normais PENDENTES do mês anterior para ${String(month).padStart(2, '0')}/${year}. Lançamentos já existentes serão ignorados. Deseja continuar?`}
        onConfirm={handleCopyPrev}
        onCancel={() => setCopyPrevOpen(false)}
        loading={copyPrevLoading}
      />

      <BringBalanceModal
        open={balanceOpen}
        onClose={() => { setBalanceOpen(false); setBalanceCatId('') }}
        categories={categories.filter((c) => c.type === 'income' || c.type === 'both')}
        catId={balanceCatId}
        onCatChange={setBalanceCatId}
        onConfirm={handleBringBalance}
        loading={balanceLoading}
        month={month}
        year={year}
      />

      <GenYearModal
        open={genYearOpen}
        onClose={() => setGenYearOpen(false)}
        uid={user?.uid ?? ''}
        isOnline={isOnline}
        onDone={() => { setGenYearOpen(false); reload() }}
      />

      <CategoryFilterModal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        categories={categories}
        selectedIds={selectedCategoryIds}
        onChange={setSelectedCategoryIds}
      />
    </div>
  )
}

// ─── Category Filter Modal ────────────────────────────────────────────────────
interface CategoryFilterModalProps {
  open: boolean
  onClose: () => void
  categories: { id: string; name: string; type: string; color?: string }[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

function CategoryFilterModal({ open, onClose, categories, selectedIds, onChange }: CategoryFilterModalProps) {
  const [draft, setDraft] = useState<string[]>(selectedIds)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(selectedIds)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    setDraft((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function handleApply() {
    onChange(draft)
    onClose()
  }

  function handleClear() {
    setDraft([])
    onChange([])
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={() => { onChange(draft); onClose() }}
      title="Filtrar por categorias"
      size="sm"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" onClick={handleClear} className="flex-1">Limpar</Button>
          <Button onClick={handleApply} className="flex-1">Aplicar</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-1 max-h-72 overflow-y-auto -mx-1 px-1">
        <button
          onClick={() => setDraft([])}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left ${
            draft.length === 0
              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
            draft.length === 0
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'border-slate-300 dark:border-slate-600'
          }`}>
            {draft.length === 0 && <span className="text-[10px] font-bold">✓</span>}
          </span>
          Todas as categorias
        </button>
        {categories.map((cat) => {
          const checked = draft.includes(cat.id)
          return (
            <button
              key={cat.id}
              onClick={() => toggle(cat.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                checked
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                checked
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-slate-300 dark:border-slate-600'
              }`}>
                {checked && <span className="text-[10px] font-bold">✓</span>}
              </span>
              {cat.color && (
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              )}
              <span className="truncate">{cat.name}</span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

// ─── Transaction Modal ────────────────────────────────────────────────────────
interface TransactionModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editItem: Transaction | null
  categories: { id: string; name: string; type: string }[]
  defaultMonth: number
  defaultYear: number
}

function TransactionModal({ open, onClose, onSaved, editItem, categories, defaultMonth, defaultYear }: TransactionModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<TransactionType>('normal')
  const [description, setDescription] = useState('')
  const [valueStr, setValueStr] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [chargeDate, setChargeDate] = useState('')
  const [status, setStatus] = useState<TransactionStatus>('pending')
  const [launchDate, setLaunchDate] = useState('')

  // Fixed account specific
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('monthly')
  const [weekDay, setWeekDay] = useState<number>(1)

  // Installment specific
  const [installments, setInstallments] = useState('2')
  const [firstDate, setFirstDate] = useState('')
  const [valueMode, setValueMode] = useState<'total' | 'each'>('total')

  // Nature + cascade
  const [transactionNature, setTransactionNature] = useState<TransactionNature>('expense')
  const [applyToFuture, setApplyToFuture] = useState(false)

  const resetForm = () => {    setType('normal')
    setDescription('')
    setValueStr('')
    setCategoryId('')
    const m = String(defaultMonth).padStart(2, '0')
    setChargeDate(`${defaultYear}-${m}-01`)
    setLaunchDate(todayISO())
    setStatus('pending')
    setInstallments('2')
    setFirstDate(todayISO())
    setValueMode('total')
    setRecurrenceType('monthly')
    setWeekDay(1)
    setTransactionNature('expense')
    setApplyToFuture(false)
  }

  const selectedCat = categories.find((c) => c.id === categoryId)
  const filteredCategories = categories.filter((c) => categoryMatchesNature(c, transactionNature))

  function handleNatureChange(newNature: TransactionNature) {
    setTransactionNature(newNature)
    const cat = categories.find((c) => c.id === categoryId)
    if (cat && !categoryMatchesNature(cat, newNature)) setCategoryId('')
  }

  // Initialize form when modal opens
  useEffect(() => {
    if (!open) return
    if (editItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDescription(editItem.description)
      setValueStr(formatCurrencyInput(String(Math.round(editItem.value * 100))))
      setCategoryId(editItem.categoryId)
      setChargeDate(editItem.chargeDate)
      setLaunchDate(editItem.launchDate ?? todayISO())
      setStatus(editItem.status)
      setType(editItem.type)
      setTransactionNature(inferNatureFromEdit(editItem.transactionNature, editItem.categoryId, categories))
      setApplyToFuture(false)
    } else {
      resetForm()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) { toast.error('Informe a descrição'); return }
    const value = parseCurrencyInput(valueStr)
    if (value <= 0) { toast.error('Valor deve ser maior que zero'); return }
    if (!categoryId) { toast.error('Selecione a categoria'); return }
    if (!chargeDate && type !== 'installment' && !(type === 'fixed' && recurrenceType === 'weekly')) { toast.error('Informe a data de cobrança'); return }
    if (!user) return

    setLoading(true)
    try {
      // Edição: atualiza o lançamento diretamente, independente do tipo
      if (editItem) {
        if (type === 'normal' && !launchDate) { toast.error('Informe a data do lançamento'); return }
        const { month, year } = getMonthYear(chargeDate)
        const { updateTransaction } = await import('../services/firestore')
        await updateTransaction(user.uid, editItem.id, {
          description,
          value,
          categoryId,
          categoryName: selectedCat?.name ?? '',
          chargeDate,
          month,
          year,
          status,
          transactionNature: transactionNature,
          ...(type === 'normal' ? { launchDate } : {}),
        })
        // Cascata de parcelas
        if (type === 'installment' && applyToFuture && editItem.installmentGroupId && editItem.installmentNumber) {
          const updated = await updateInstallmentCascade(user.uid, editItem.installmentGroupId, editItem.installmentNumber, { value, description })
          toast.success(`Lançamento atualizado! ${updated} parcela(s) pendente(s) atualizada(s).`)
        } else {
          toast.success('Lançamento atualizado!')
        }
        onSaved()
        return
      }
      if (type === 'normal' && !launchDate) { toast.error('Informe a data do lançamento'); return }

      if (type === 'installment') {
        if (!firstDate) { toast.error('Informe a data da primeira parcela'); return }
        const n = parseInt(installments)
        if (n < 2) { toast.error('Mínimo 2 parcelas'); return }
        const totalVal = valueMode === 'total' ? value : value * n
        const installVal = valueMode === 'total' ? value / n : value
        await createInstallmentGroup(user.uid, {
          description,
          categoryId,
          categoryName: selectedCat?.name ?? '',
          totalValue: totalVal,
          installmentValue: installVal,
          totalInstallments: n,
          firstInstallmentDate: firstDate,
          transactionNature: transactionNature,
        })
        toast.success('Parcelamento criado!')
      } else if (type === 'fixed') {
        const isWeekly = recurrenceType === 'weekly'
        if (isWeekly) {
          // Conta semanal: não precisa de data, usa dia da semana
          const { addFixedAccount, generateFixedAccountsForMonth } = await import('../services/firestore')
          await addFixedAccount(user.uid, {
            description,
            value,
            categoryId,
            categoryName: selectedCat?.name ?? '',
            chargeDay: 1,
            startMonth: defaultMonth,
            startYear: defaultYear,
            active: true,
            recurrenceType: 'weekly',
            weekDay,
            transactionNature: transactionNature,
          })
          await generateFixedAccountsForMonth(user.uid, defaultMonth, defaultYear)
          toast.success('Conta fixa semanal cadastrada!')
        } else {
          if (!chargeDate) { toast.error('Informe a data da primeira cobran\u00e7a'); return }
          const { addFixedAccount, generateFixedAccountsForMonth } = await import('../services/firestore')
          const [chargeYearStr, chargeMonthStr, chargeDayStr] = chargeDate.split('-')
          const day = parseInt(chargeDayStr)
          const startMonth = parseInt(chargeMonthStr)
          const startYear = parseInt(chargeYearStr)
          await addFixedAccount(user.uid, {
            description,
            value,
            categoryId,
            categoryName: selectedCat?.name ?? '',
            chargeDay: day,
            startMonth,
            startYear,
            active: true,
            recurrenceType: 'monthly',
            transactionNature: transactionNature,
          })
          await generateFixedAccountsForMonth(user.uid, defaultMonth, defaultYear)
          toast.success('Conta fixa cadastrada!')
        }
      } else {
        const { month, year } = getMonthYear(chargeDate)
        const payload = {
          description,
          value,
          categoryId,
          categoryName: selectedCat?.name ?? '',
          launchDate,
          chargeDate,
          month,
          year,
          status,
          type: 'normal' as const,
          transactionNature: transactionNature,
        }
        const { addTransaction } = await import('../services/firestore')
        await addTransaction(user.uid, payload)
        toast.success('Lançamento criado!')
      }
      onSaved()
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erro ao salvar'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editItem ? 'Editar lançamento' : 'Novo lançamento'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" form="transaction-form" loading={loading}>
            {editItem ? 'Salvar' : 'Criar'}
          </Button>
        </>
      }
    >
      <form id="transaction-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!editItem && (
          <div className="flex gap-2">
            {(['normal', 'fixed', 'installment'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  type === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {t === 'normal' ? 'Normal' : t === 'fixed' ? 'Fixa' : 'Parcelada'}
              </button>
            ))}
          </div>
        )}

        <Input
          label="Descrição"
          placeholder="Ex: Conta de luz"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Input
          label="Valor (R$)"
          placeholder="0,00"
          value={valueStr}
          onChange={(e) => setValueStr(formatCurrencyInput(e.target.value))}
          inputMode="numeric"
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo do lançamento</label>
          <div className="flex gap-2">
            {(['expense', 'income'] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleNatureChange(n)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  transactionNature === n
                    ? n === 'income' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {n === 'income' ? '↑ Receita' : '↓ Despesa'}
              </button>
            ))}
          </div>
        </div>

        <Select
          label="Categoria"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Selecione</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        {type === 'normal' && (
          <>
            <Input
              label="Data do lançamento"
              type="date"
              value={launchDate}
              onChange={(e) => setLaunchDate(e.target.value)}
            />
            <Input
              label="Data de cobrança"
              type="date"
              value={chargeDate}
              onChange={(e) => setChargeDate(e.target.value)}
            />
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as TransactionStatus)}>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
            </Select>
          </>
        )}

        {type === 'fixed' && !editItem && (
          <>
            {/* Recorrência */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Recorrência</label>
              <div className="flex gap-2">
                {(['monthly', 'weekly'] as const).map((rt) => (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => setRecurrenceType(rt)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      recurrenceType === rt
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {rt === 'monthly' ? 'Mensal' : 'Semanal'}
                  </button>
                ))}
              </div>
            </div>

            {recurrenceType === 'monthly' ? (
              <Input
                label="Data da primeira cobrança"
                type="date"
                value={chargeDate}
                onChange={(e) => setChargeDate(e.target.value)}
              />
            ) : (
              <Select
                label="Dia da semana"
                value={String(weekDay)}
                onChange={(e) => setWeekDay(parseInt(e.target.value))}
              >
                {Object.entries(WEEK_DAY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </Select>
            )}
          </>
        )}

        {type === 'fixed' && editItem && (
          <>
            <Input
              label="Data de cobrança"
              type="date"
              value={chargeDate}
              onChange={(e) => setChargeDate(e.target.value)}
            />
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as TransactionStatus)}>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
            </Select>
          </>
        )}

        {type === 'installment' && editItem && (
          <>
            <Input
              label="Data de cobrança"
              type="date"
              value={chargeDate}
              onChange={(e) => setChargeDate(e.target.value)}
            />
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as TransactionStatus)}>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
            </Select>
            {editItem.status === 'pending' && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyToFuture}
                  onChange={(e) => setApplyToFuture(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Aplicar valor e descrição às próximas parcelas pendentes
                </span>
              </label>
            )}
          </>
        )}

        {type === 'installment' && !editItem && (
          <>
            <Input
              label="Data da primeira parcela"
              type="date"
              value={firstDate}
              onChange={(e) => setFirstDate(e.target.value)}
            />
            <Input
              label="Quantidade de parcelas"
              type="number"
              min="2"
              max="120"
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">O valor informado é:</label>
              <div className="flex gap-2">
                {(['total', 'each'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setValueMode(m)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      valueMode === m
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {m === 'total' ? 'Valor total' : 'Valor por parcela'}
                  </button>
                ))}
              </div>
              {valueStr && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {valueMode === 'total'
                    ? `${installments}x de ${formatCurrency(parseCurrencyInput(valueStr) / (parseInt(installments) || 1))}`
                    : `Total: ${formatCurrency(parseCurrencyInput(valueStr) * (parseInt(installments) || 1))}`}
                </p>
              )}
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}

function getMonthYear(dateStr: string) {
  const [y, m] = dateStr.split('-').map(Number)
  return { month: m, year: y }
}

// ─── Bring Balance Modal ─────────────────────────────────────────────────────
interface BringBalanceModalProps {
  open: boolean
  onClose: () => void
  categories: { id: string; name: string }[]
  catId: string
  onCatChange: (id: string) => void
  onConfirm: () => void
  loading: boolean
  month: number
  year: number
}

function BringBalanceModal({ open, onClose, categories, catId, onCatChange, onConfirm, loading, month, year }: BringBalanceModalProps) {
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const mmPrev = String(prevMonth).padStart(2, '0')
  const mmTarget = String(month).padStart(2, '0')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Trazer saldo do mês anterior"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={onConfirm} loading={loading} disabled={!catId}>
            Lançar saldo
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Calcula <strong>receitas pagas − despesas pagas</strong> de{' '}
          <strong>{mmPrev}/{prevYear}</strong> e lança o resultado em{' '}
          <strong>{mmTarget}/{year}</strong> como pago.
          <br />
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Saldo positivo → receita &nbsp;·&nbsp; Saldo negativo → despesa
          </span>
        </div>
        <Select
          label="Categoria do lançamento"
          value={catId}
          onChange={(e) => onCatChange(e.target.value)}
        >
          <option value="">Selecione uma categoria…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>
    </Modal>
  )
}

// ─── Gen Year Modal ───────────────────────────────────────────────────────────
function GenYearModal({ open, onClose, uid, isOnline, onDone }: { open: boolean; onClose: () => void; uid: string; isOnline: boolean; onDone: () => void }) {
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear + i)
  const [selected, setSelected] = useState<number[]>([currentYear])
  const [loading, setLoading] = useState(false)

  const toggle = (y: number) =>
    setSelected((prev) => prev.includes(y) ? prev.filter((x) => x !== y) : [...prev, y])

  const handleConfirm = async () => {
    if (!uid || selected.length === 0) return
    if (!isOnline) {
      toast.error('Esta ação precisa de internet para garantir a segurança dos dados.')
      return
    }
    setLoading(true)
    try {
      const { created, skipped } = await generateFixedAccountsForYear(uid, selected)
      toast.success(`${created} conta(s) gerada(s) em ${selected.length} ano(s)${skipped > 0 ? `, ${skipped} já existia(m)` : ''}`)
      onDone()
    } catch {
      toast.error('Erro ao gerar contas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gerar contas fixas por ano"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleConfirm} loading={loading} disabled={selected.length === 0}>
            Gerar {selected.length > 0 ? `(${selected.length} ano${selected.length > 1 ? 's' : ''})` : ''}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        Selecione os anos. Para cada ano, os 12 meses serão gerados (respeitando a data de início de cada conta fixa).
      </p>
      <div className="grid grid-cols-2 gap-2">
        {yearOptions.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => toggle(y)}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              selected.includes(y)
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {y}
          </button>
        ))}
      </div>
    </Modal>
  )
}
