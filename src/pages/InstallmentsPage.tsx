import { useState } from 'react'
import { ChevronRight, Trash2, CheckCircle, Clock, AlertTriangle, CreditCard, CheckSquare, XSquare } from 'lucide-react'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { PageLoader, EmptyState } from '../components/ui/Loading'
import { toast } from '../components/ui/Toast'
import { useInstallments } from '../hooks/useInstallments'
import { formatCurrency, formatDate } from '../utils/formatters'
import { settleAllInstallments, deleteFuturePendingInstallments } from '../services/firestore'
import { useAuth } from '../contexts/AuthContext'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { getErrorMessage } from '../utils/errorUtils'
import type { InstallmentGroup, Transaction } from '../types'

const statusConfig = {
  ongoing: { label: 'Em andamento', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  paid_off: { label: 'Quitada', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  late: { label: 'Atrasada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
}

export function InstallmentsPage() {
  const { groups, loading, remove, getTransactions, payInstallment, reload } = useInstallments()
  const { user } = useAuth()
  const { isOnline } = useOnlineStatus()
  const [selectedGroup, setSelectedGroup] = useState<InstallmentGroup | null>(null)
  const [groupTransactions, setGroupTransactions] = useState<Transaction[]>([])
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InstallmentGroup | null>(null)
  const [delLoading, setDelLoading] = useState(false)
  const [settleLoading, setSettleLoading] = useState(false)

  const handleOpenDetail = async (group: InstallmentGroup) => {
    setSelectedGroup(group)
    setDetailLoading(true)
    setDetailOpen(true)
    try {
      const txs = await getTransactions(group.id)
      setGroupTransactions(txs)
    } catch {
      toast.error('Erro ao carregar parcelas')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDelLoading(true)
    try {
      await remove(deleteTarget.id)
      toast.success('Parcelamento excluído')
    } catch {
      toast.error('Erro ao excluir')
    } finally {
      setDelLoading(false)
      setDeleteTarget(null)
    }
  }

  const handleDeleteFuturePending = async () => {
    if (!deleteTarget || !user) return
    if (!isOnline) {
      toast.error('Esta ação precisa de internet para garantir a segurança dos dados.')
      return
    }
    setDelLoading(true)
    try {
      const { deleted } = await deleteFuturePendingInstallments(user.uid, deleteTarget.id)
      await reload()
      toast.success(`${deleted} parcela(s) futura(s) pendente(s) removida(s)`)
      setDeleteTarget(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao excluir parcelas'))
    } finally {
      setDelLoading(false)
    }
  }

  const handleSettleAll = async (group: InstallmentGroup) => {
    if (!user) return
    if (!isOnline) {
      toast.error('Esta ação precisa de internet para garantir a segurança dos dados.')
      return
    }
    setSettleLoading(true)
    try {
      const { settled } = await settleAllInstallments(user.uid, group.id)
      await reload()
      if (settled === 0) {
        toast.info('Não há parcelas pendentes para quitar')
      } else {
        toast.success(`${settled} parcela(s) quitada(s)!`)
      }
      // Atualiza lista de transações no modal se estiver aberto
      if (detailOpen && selectedGroup?.id === group.id) {
        const txs = await getTransactions(group.id)
        setGroupTransactions(txs)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao quitar parcelas'))
    } finally {
      setSettleLoading(false)
    }
  }

  const handlePayInstallment = async (transaction: Transaction) => {
    if (!selectedGroup) return
    if (!isOnline) {
      toast.error('Esta ação precisa de internet para garantir a segurança dos dados.')
      return
    }
    try {
      await payInstallment(transaction.id)
      const txs = await getTransactions(selectedGroup.id)
      setGroupTransactions(txs)
      toast.success('Parcela marcada como paga')
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-bold text-slate-900 dark:text-white text-lg hidden lg:block">Contas Parceladas</h1>

      {loading ? (
        <PageLoader />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="w-16 h-16" />}
          title="Nenhum parcelamento"
          description="Crie lançamentos parcelados na aba Lançamentos"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => {
            const s = statusConfig[g.status]
            const Icon = s.icon
            const progress = g.totalInstallments > 0 ? (g.paidInstallments / g.totalInstallments) * 100 : 0

            return (
              <div
                key={g.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                <button
                  className="w-full text-left p-4 flex items-center gap-3"
                  onClick={() => handleOpenDetail(g)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{g.description}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${s.color}`}>
                        <Icon className="w-3 h-3" />
                        {s.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{g.categoryName}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {/* Stats row */}
                <div className="px-4 pb-3 flex gap-4 text-xs flex-wrap">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Total</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(g.totalValue)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Parcela</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(g.installmentValue)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Pagas</span>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">{g.paidInstallments}/{g.totalInstallments}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Restante</span>
                    <p className="font-semibold text-red-500">{formatCurrency(g.remainingValue)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mx-4 mb-3 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Actions */}
                <div className="px-4 pb-3 flex justify-end gap-1">
                  {g.status !== 'paid_off' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSettleAll(g) }}
                      disabled={settleLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
                      title="Quitar todas as parcelas pendentes"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Quitar tudo
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(g) }}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedGroup?.description ?? 'Parcelas'}
        size="lg"
      >
        {detailLoading ? (
          <PageLoader />
        ) : (
          <div className="flex flex-col gap-3">
            {selectedGroup && (
              <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div><span className="text-slate-500">Valor total</span><p className="font-semibold">{formatCurrency(selectedGroup.totalValue)}</p></div>
                <div><span className="text-slate-500">Por parcela</span><p className="font-semibold">{formatCurrency(selectedGroup.installmentValue)}</p></div>
                <div><span className="text-slate-500">Primeira</span><p className="font-semibold">{formatDate(selectedGroup.firstInstallmentDate)}</p></div>
                <div><span className="text-slate-500">Última</span><p className="font-semibold">{formatDate(selectedGroup.lastInstallmentDate)}</p></div>
                <div><span className="text-slate-500">Pago</span><p className="font-semibold text-emerald-600">{formatCurrency(selectedGroup.paidValue)}</p></div>
                <div><span className="text-slate-500">Restante</span><p className="font-semibold text-red-500">{formatCurrency(selectedGroup.remainingValue)}</p></div>
              </div>
            )}
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {groupTransactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <span
                    className={`text-xs font-bold w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      t.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {t.installmentNumber}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(t.chargeDate)}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 shrink-0">{formatCurrency(t.value)}</p>
                  {t.status === 'pending' && (
                    <button
                      onClick={() => handlePayInstallment(t)}
                      className="p-2 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors shrink-0"
                      title="Marcar como pago"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                  {t.status === 'paid' && (
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={false}
        title=""
        message=""
        onConfirm={() => {}}
        onCancel={() => {}}
      />

      {/* Modal de exclusão com opções */}
      <Modal
        open={!!deleteTarget}
        onClose={() => !delLoading && setDeleteTarget(null)}
        title="Excluir parcelamento"
        size="sm"
        footer={
          <div className="flex gap-2 w-full flex-col sm:flex-row">
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={delLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={handleDeleteFuturePending}
              loading={delLoading}
              className="flex-1 !border-amber-300 dark:!border-amber-700 !text-amber-600 dark:!text-amber-400 hover:!bg-amber-50 dark:hover:!bg-amber-900/20"
            >
              <XSquare className="w-4 h-4 mr-1" />
              Só futuras pendentes
            </Button>
            <Button
              onClick={handleDelete}
              loading={delLoading}
              className="flex-1 !bg-red-600 hover:!bg-red-700"
            >
              Excluir tudo
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Como deseja excluir <strong>{deleteTarget?.description}</strong>?
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
              <p className="font-medium mb-0.5 text-amber-700 dark:text-amber-400">Só futuras pendentes</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Remove apenas as parcelas a partir de hoje com status pendente. As pagas são mantidas. O grupo continua existindo.</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
              <p className="font-medium mb-0.5 text-red-700 dark:text-red-400">Excluir tudo</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Remove o grupo e todas as parcelas (pagas e pendentes). Esta ação não pode ser desfeita.</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
