import { useState } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, Clock } from 'lucide-react'
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
import { createInstallmentGroup } from '../services/firestore'
import type { Transaction, TransactionType, TransactionStatus } from '../types'

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

  const { transactions, loading, update, remove, reload } = useTransactions(month, year)
  const { categories } = useCategories()

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

  const handleTogglePaid = async (t: Transaction) => {
    try {
      await update(t.id, { status: t.status === 'paid' ? 'pending' : 'paid' })
      toast.success(t.status === 'paid' ? 'Marcado como pendente' : 'Marcado como pago')
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <MonthSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditItem(null); setModalOpen(true) }}>
          Lançar
        </Button>
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
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => handleTogglePaid(t)}
                  className={`shrink-0 transition-colors ${
                    t.status === 'paid'
                      ? 'text-emerald-500'
                      : 'text-slate-300 hover:text-emerald-400'
                  }`}
                >
                  {t.status === 'paid' ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <Clock className="w-6 h-6" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.categoryName} · {t.chargeDate.split('-').reverse().join('/')}
                    {t.type === 'fixed' && ' · Fixa'}
                    {t.type === 'installment' && ` · ${t.installmentNumber}/${t.totalInstallments}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(t.value)}</p>
                </div>
                {t.type === 'normal' && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => { setEditItem(t); setModalOpen(true) }}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(t.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
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

  // Installment specific
  const [installments, setInstallments] = useState('2')
  const [firstDate, setFirstDate] = useState('')
  const [valueMode, setValueMode] = useState<'total' | 'each'>('total')

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
  }

  useState(() => {
    if (open) {
      if (editItem) {
        setDescription(editItem.description)
        setValueStr(formatCurrencyInput(String(Math.round(editItem.value * 100))))
        setCategoryId(editItem.categoryId)
        setChargeDate(editItem.chargeDate)
        setLaunchDate(editItem.launchDate ?? todayISO())
        setStatus(editItem.status)
        setType(editItem.type)
      } else {
        resetForm()
      }
    }
  })

  // Re-initialize when open changes
  const [initialized, setInitialized] = useState(false)
  if (open && !initialized) {
    setInitialized(true)
    if (editItem) {
      setTimeout(() => {
        setDescription(editItem.description)
        setValueStr(formatCurrencyInput(String(Math.round(editItem.value * 100))))
        setCategoryId(editItem.categoryId)
        setChargeDate(editItem.chargeDate)
        setLaunchDate(editItem.launchDate ?? todayISO())
        setStatus(editItem.status)
        setType(editItem.type)
      }, 0)
    } else {
      setTimeout(() => resetForm(), 0)
    }
  }
  if (!open && initialized) setInitialized(false)

  const selectedCat = categories.find((c) => c.id === categoryId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) { toast.error('Informe a descrição'); return }
    const value = parseCurrencyInput(valueStr)
    if (value <= 0) { toast.error('Valor deve ser maior que zero'); return }
    if (!categoryId) { toast.error('Selecione a categoria'); return }
    if (!chargeDate && type !== 'installment') { toast.error('Informe a data de cobrança'); return }
    if (!user) return

    setLoading(true)
    try {
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
        if (!chargeDate) { toast.error('Informe a data da primeira cobrança'); return }
        const { addFixedAccount, generateFixedAccountsForMonth } = await import('../services/firestore')
        const day = parseInt(chargeDate.split('-')[2])
        await addFixedAccount(user.uid, {
          description,
          value,
          categoryId,
          categoryName: selectedCat?.name ?? '',
          chargeDay: day,
          active: true,
        })
        await generateFixedAccountsForMonth(user.uid, defaultMonth, defaultYear)
        toast.success('Conta fixa cadastrada!')
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
        }
        if (editItem) {
          const { updateTransaction } = await import('../services/firestore')
          await updateTransaction(user.uid, editItem.id, payload)
          toast.success('Lançamento atualizado!')
        } else {
          const { addTransaction } = await import('../services/firestore')
          await addTransaction(user.uid, payload)
          toast.success('Lançamento criado!')
        }
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
          {categories.map((c) => (
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

        {type === 'fixed' && (
          <Input
            label="Data da primeira cobrança"
            type="date"
            value={chargeDate}
            onChange={(e) => setChargeDate(e.target.value)}
          />
        )}

        {type === 'installment' && (
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
