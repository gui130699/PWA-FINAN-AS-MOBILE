import { useState } from 'react'
import { Plus, Pencil, Trash2, Power, Calendar } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import { PageLoader, EmptyState } from '../components/ui/Loading'
import { toast } from '../components/ui/Toast'
import { useFixedAccounts } from '../hooks/useFixedAccounts'
import { useCategories } from '../hooks/useCategories'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, currentMonthYear } from '../utils/formatters'
import type { FixedAccount } from '../types'

export function FixedAccountsPage() {
  const { accounts, loading, add, update, remove, generate } = useFixedAccounts()
  const { categories } = useCategories()
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<FixedAccount | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [delLoading, setDelLoading] = useState(false)
  const [genLoading, setGenLoading] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return
    setDelLoading(true)
    try {
      await remove(deleteId)
      toast.success('Conta fixa excluída')
    } catch {
      toast.error('Erro ao excluir')
    } finally {
      setDelLoading(false)
      setDeleteId(null)
    }
  }

  const handleToggle = async (account: FixedAccount) => {
    try {
      await update(account.id, { active: !account.active })
      toast.success(account.active ? 'Conta desativada' : 'Conta ativada')
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  const handleGenerate = async () => {
    const { month, year } = currentMonthYear()
    setGenLoading(true)
    try {
      const { created, skipped } = await generate(month, year)
      toast.success(`${created} conta(s) gerada(s)${skipped > 0 ? `, ${skipped} já existia(m)` : ''}`)
    } catch {
      toast.error('Erro ao gerar contas')
    } finally {
      setGenLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-slate-900 dark:text-white text-lg hidden lg:block">Contas Fixas</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<Calendar className="w-4 h-4" />}
            onClick={handleGenerate}
            loading={genLoading}
            size="sm"
          >
            Gerar mês atual
          </Button>
          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={() => { setEditItem(null); setModalOpen(true) }}
            size="sm"
          >
            Nova
          </Button>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={<RefreshCw className="w-16 h-16" />}
          title="Nenhuma conta fixa"
          description="Adicione contas que se repetem todo mês"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((a) => (
            <div
              key={a.id}
              className={`bg-white dark:bg-slate-800 rounded-2xl border p-4 flex items-center gap-3 ${
                a.active
                  ? 'border-slate-200 dark:border-slate-700'
                  : 'border-slate-100 dark:border-slate-800 opacity-60'
              }`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: categories.find((c) => c.id === a.categoryId)?.color + '20' }}
              >
                <RefreshCw
                  className="w-5 h-5"
                  style={{ color: categories.find((c) => c.id === a.categoryId)?.color ?? '#6366f1' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{a.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {a.categoryName} · Dia {a.chargeDay}
                </p>
              </div>
              <div className="text-right shrink-0 mr-2">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(a.value)}</p>
                <span className={`text-[10px] font-medium ${a.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {a.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => handleToggle(a)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    a.active
                      ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                      : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={a.active ? 'Desativar' : 'Ativar'}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setEditItem(a); setModalOpen(true) }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteId(a.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FixedAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setModalOpen(false)}
        editItem={editItem}
        categories={categories}
        onAdd={add}
        onUpdate={update}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Excluir conta fixa"
        message="Deseja excluir esta conta fixa? Os lançamentos já gerados não serão removidos."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={delLoading}
      />
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface FixedAccountModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editItem: FixedAccount | null
  categories: any[]
  onAdd: (data: any) => Promise<void>
  onUpdate: (id: string, data: any) => Promise<void>
}

function FixedAccountModal({ open, onClose, onSaved, editItem, categories, onAdd, onUpdate }: FixedAccountModalProps) {
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState('')
  const [valueStr, setValueStr] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [chargeDay, setChargeDay] = useState('1')

  const [initialized, setInitialized] = useState(false)
  if (open && !initialized) {
    setInitialized(true)
    setTimeout(() => {
      if (editItem) {
        setDescription(editItem.description)
        setValueStr(formatCurrencyInput(String(Math.round(editItem.value * 100))))
        setCategoryId(editItem.categoryId)
        setChargeDay(String(editItem.chargeDay))
      } else {
        setDescription('')
        setValueStr('')
        setCategoryId(categories[0]?.id ?? '')
        setChargeDay('1')
      }
    }, 0)
  }
  if (!open && initialized) setInitialized(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) { toast.error('Informe a descrição'); return }
    const value = parseCurrencyInput(valueStr)
    if (value <= 0) { toast.error('Valor inválido'); return }
    if (!categoryId) { toast.error('Selecione a categoria'); return }
    const day = parseInt(chargeDay)
    if (day < 1 || day > 31) { toast.error('Dia inválido (1-31)'); return }

    setLoading(true)
    try {
      const selectedCat = categories.find((c) => c.id === categoryId)
      const data = {
        description,
        value,
        categoryId,
        categoryName: selectedCat?.name ?? '',
        chargeDay: day,
        active: editItem?.active ?? true,
      }
      if (editItem) {
        await onUpdate(editItem.id, data)
        toast.success('Conta fixa atualizada')
      } else {
        await onAdd(data)
        toast.success('Conta fixa criada')
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
      title={editItem ? 'Editar conta fixa' : 'Nova conta fixa'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" form="fixed-form" loading={loading}>Salvar</Button>
        </>
      }
    >
      <form id="fixed-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Conta de água" />
        <Input label="Valor (R$)" value={valueStr} onChange={(e) => setValueStr(formatCurrencyInput(e.target.value))} inputMode="numeric" placeholder="0,00" />
        <Select label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Selecione</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input label="Dia de cobrança (1-31)" type="number" min="1" max="31" value={chargeDay} onChange={(e) => setChargeDay(e.target.value)} />
      </form>
    </Modal>
  )
}

import React from 'react'
import { RefreshCw } from 'lucide-react'
