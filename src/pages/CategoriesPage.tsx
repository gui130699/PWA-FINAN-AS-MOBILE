import { useState } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import { PageLoader, EmptyState } from '../components/ui/Loading'
import { toast } from '../components/ui/Toast'
import { useCategories } from '../hooks/useCategories'
import type { Category, CategoryType } from '../types'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#64748b', '#78716c',
]

const TYPE_LABELS: Record<CategoryType, string> = {
  expense: 'Despesa',
  income: 'Receita',
  both: 'Ambos',
}

export function CategoriesPage() {
  const { categories, loading, add, update, remove } = useCategories()
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Category | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [delLoading, setDelLoading] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return
    setDelLoading(true)
    try {
      await remove(deleteId)
      toast.success('Categoria excluída')
    } catch {
      toast.error('Erro ao excluir')
    } finally {
      setDelLoading(false)
      setDeleteId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-slate-900 dark:text-white text-lg hidden lg:block">Categorias</h1>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditItem(null); setModalOpen(true) }}>
          Nova categoria
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Tag className="w-16 h-16" />}
          title="Nenhuma categoria"
          description="Crie categorias para organizar seus lançamentos"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-xl shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{TYPE_LABELS[c.type]}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => { setEditItem(c); setModalOpen(true) }}
                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteId(c.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setModalOpen(false)}
        editItem={editItem}
        onAdd={add}
        onUpdate={update}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Excluir categoria"
        message="Deseja excluir esta categoria? Os lançamentos existentes não serão afetados."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={delLoading}
      />
    </div>
  )
}

// ─── Category Modal ──────────────────────────────────────────────────────────
interface CategoryModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editItem: Category | null
  onAdd: (data: any) => Promise<void>
  onUpdate: (id: string, data: any) => Promise<void>
}

function CategoryModal({ open, onClose, onSaved, editItem, onAdd, onUpdate }: CategoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [type, setType] = useState<CategoryType>('expense')

  const [initialized, setInitialized] = useState(false)
  if (open && !initialized) {
    setInitialized(true)
    setTimeout(() => {
      if (editItem) {
        setName(editItem.name)
        setColor(editItem.color)
        setType(editItem.type)
      } else {
        setName('')
        setColor(PRESET_COLORS[0])
        setType('expense')
      }
    }, 0)
  }
  if (!open && initialized) setInitialized(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Informe o nome'); return }
    setLoading(true)
    try {
      if (editItem) {
        await onUpdate(editItem.id, { name, color, type })
        toast.success('Categoria atualizada')
      } else {
        await onAdd({ name, color, type })
        toast.success('Categoria criada')
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
      title={editItem ? 'Editar categoria' : 'Nova categoria'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" form="cat-form" loading={loading}>Salvar</Button>
        </>
      }
    >
      <form id="cat-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Alimentação" />
        
        <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value as CategoryType)}>
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
          <option value="both">Ambos</option>
        </Select>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cor</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-xl transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Personalizada:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-600"
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}

import React from 'react'
