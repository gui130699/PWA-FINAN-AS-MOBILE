import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Calendar, CalendarRange, ArrowDownToLine, Banknote } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import { MonthSelector } from '../components/ui/MonthSelector'
import { PageLoader, EmptyState } from '../components/ui/Loading'
import { toast } from '../components/ui/Toast'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, currentMonthYear, todayISO } from '../utils/formatters'
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

export function TransactionsPage() {
  const { month: cm, year: cy } = currentMonthYear()
  const [month, setMonth] = useState(cm)
  const [year, setYear] = useState(cy)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all')
  const [filterCat, setFilterCat] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
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

  const { transactions, loading, update, remove, reload } = useTransactions(month, year)
  const { categories } = useCategories()
  const { user } = useAuth()

  const catTypeMap = useMemo(() => {
    const m = new Map<string, string>()
    categories.forEach((c) => m.set(c.id, c.type))
    return m
  }, [categories])

  function getTxNature(t: Transaction): TransactionNature {
    if (t.transactionNature) return t.transactionNature
    return catTypeMap.get(t.categoryId) === 'income' ? 'income' : 'expense'
  }

  const filtered = transactions.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterCat && t.categoryId !== filterCat) return false
    return true
  })

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
      const { balance } = await bringPreviousMonthBalance(user.uid, month, year, balanceCatId, cat.name)
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      const signal = balance >= 0 ? '+' : ''
      toast.success(`Saldo de ${String(prevMonth).padStart(2, '0')}/${prevYear}: ${signal}${formatCurrency(balance)} lançado`)
      reload()
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          <Button
            variant="secondary"
            icon={<Banknote className="w-4 h-4" />}
            onClick={() => setBalanceOpen(true)}
            size="sm"
            title="Trazer saldo do mês anterior"
          >
            <span className="hidden sm:inline">Saldo ant.</span>
          </Button>
          <Button
            variant="secondary"
            icon={<ArrowDownToLine className="w-4 h-4" />}
            onClick={() => setCopyPrevOpen(true)}
            loading={copyPrevLoading}
            size="sm"
            title="Trazer lançamentos pendentes do mês anterior"
          >
            <span className="hidden sm:inline">Mês ant.</span>
          </Button>
          <Button
            variant="secondary"
            icon={<Calendar className="w-4 h-4" />}
            onClick={handleGenerate}
            loading={genLoading}
            size="sm"
            title="Gerar mês"
          >
            <span className="hidden sm:inline">Gerar mês</span>
          </Button>
          <Button
            variant="secondary"
            icon={<CalendarRange className="w-4 h-4" />}
            onClick={() => setGenYearOpen(true)}
            size="sm"
            title="Gerar ano"
          >
            <span className="hidden sm:inline">Gerar ano</span>
          </Button>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setEditItem(null); setModalOpen(true) }}>
            Lançar
          </Button>
        </div>
      </div>

      {/* Filters */}
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
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todas categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

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
            {filtered.map((t) => (
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
                    {t.type === 'fixed' && ' · Fixa'}
                    {t.type === 'installment' && ` · ${t.installmentNumber}/${t.totalInstallments}`}
                  </p>
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
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <button
                    onClick={() => { setEditItem(t); setModalOpen(true) }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(t.id)}
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
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: filtered.reduce((s, t) => s + t.value, 0), color: 'text-slate-900 dark:text-white' },
            { label: 'Pago', value: filtered.filter((t) => t.status === 'paid').reduce((s, t) => s + t.value, 0), color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Pendente', value: filtered.filter((t) => t.status === 'pending').reduce((s, t) => s + t.value, 0), color: 'text-amber-600 dark:text-amber-400' },
          ].map((item) => (
            <div key={item.label} className="bg-white dark:bg-slate-800 rounded-2xl p-3 text-center border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className={`text-sm font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
            </div>
          ))}
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
        onDone={() => { setGenYearOpen(false); reload() }}
      />
    </div>
  )
}

// ─── Transaction Modal ────────────────────────────────────────────────────────
interface TransactionModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editItem: Transaction | null
  categories: any[]
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

  const resetForm = () => {
    setType('normal')
    setDescription('')
    setValueStr('')
    setCategoryId(categories[0]?.id ?? '')
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

  // Initialize form when modal opens (only once per open event)
  const [initialized, setInitialized] = useState(false)
  if (open && !initialized) {
    setInitialized(true)
    if (editItem) {
      setDescription(editItem.description)
      setValueStr(formatCurrencyInput(String(Math.round(editItem.value * 100))))
      setCategoryId(editItem.categoryId)
      setChargeDate(editItem.chargeDate)
      setLaunchDate(editItem.launchDate ?? todayISO())
      setStatus(editItem.status)
      setType(editItem.type)
      setTransactionNature(editItem.transactionNature ?? 'expense')
      setApplyToFuture(false)
    } else {
      resetForm()
    }
  }
  if (!open && initialized) setInitialized(false)

  const selectedCat = categories.find((c: any) => c.id === categoryId)
  // Se categoria tem tipo definido (income/expense), usa automaticamente; se 'both', usa o estado
  const effectiveNature: TransactionNature = selectedCat?.type === 'income' ? 'income'
    : selectedCat?.type === 'expense' ? 'expense'
    : transactionNature

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
          transactionNature: effectiveNature,
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
          transactionNature: effectiveNature,
        }
        const { addTransaction } = await import('../services/firestore')
        await addTransaction(user.uid, payload)
        toast.success('Lançamento criado!')
      }
      onSaved()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar')
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

        <Select
          label="Categoria"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Selecione</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        {/* Natureza — só visível quando categoria é 'both' */}
        {selectedCat?.type === 'both' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Natureza</label>
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTransactionNature(n)}
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
        )}

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
function GenYearModal({ open, onClose, uid, onDone }: { open: boolean; onClose: () => void; uid: string; onDone: () => void }) {
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear + i)
  const [selected, setSelected] = useState<number[]>([currentYear])
  const [loading, setLoading] = useState(false)

  const toggle = (y: number) =>
    setSelected((prev) => prev.includes(y) ? prev.filter((x) => x !== y) : [...prev, y])

  const handleConfirm = async () => {
    if (!uid || selected.length === 0) return
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
