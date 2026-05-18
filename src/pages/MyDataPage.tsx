/**
 * MyDataPage.tsx — Backup e restauração completa dos dados do usuário.
 *
 * Funcionalidades:
 * - Exportar backup completo em JSON (categories, transactions, fixedAccounts, installmentGroups)
 * - Importar backup JSON com validação básica e confirmação
 * - Versão/schemaVersion no arquivo de backup
 * - Estratégia: atualizar se ID já existe, criar se não existe
 */

import { useState } from 'react'
import { Download, Upload, AlertTriangle, CheckCircle, Database } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { PageLoader } from '../components/ui/Loading'
import { toast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../utils/errorUtils'
import {
  getCategories,
  getFixedAccounts,
  getInstallmentGroups,
  addCategory,
  updateCategory,
  addFixedAccount,
  updateFixedAccount,
  addTransaction,
  updateTransaction,
} from '../services/firestore'
import {
  getDocs,
  collection,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Category, Transaction, FixedAccount, InstallmentGroup } from '../types'

const BACKUP_SCHEMA_VERSION = 1

interface BackupFile {
  schemaVersion: number
  exportedAt: string
  uid: string
  data: {
    categories: Category[]
    transactions: Transaction[]
    fixedAccounts: FixedAccount[]
    installmentGroups: InstallmentGroup[]
  }
}

async function getAllTransactions(uid: string): Promise<Transaction[]> {
  const snap = await getDocs(collection(db, `users/${uid}/transactions`))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction))
}

function toExportable(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'object' && 'toDate' in (obj as object) && typeof (obj as { toDate: () => Date }).toDate === 'function') {
    return (obj as { toDate: () => Date }).toDate().toISOString()
  }
  if (Array.isArray(obj)) return obj.map(toExportable)
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, toExportable(v)])
    )
  }
  return obj
}

export function MyDataPage() {
  const { user } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null)
  const [importStats, setImportStats] = useState<{ created: number; updated: number } | null>(null)

  const handleExport = async () => {
    if (!user) return
    setExporting(true)
    try {
      const [categories, transactions, fixedAccounts, installmentGroups] = await Promise.all([
        getCategories(user.uid),
        getAllTransactions(user.uid),
        getFixedAccounts(user.uid),
        getInstallmentGroups(user.uid),
      ])

      const backup: BackupFile = {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        uid: user.uid,
        data: { categories, transactions, fixedAccounts, installmentGroups },
      }

      const json = JSON.stringify(toExportable(backup), null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
      a.download = `backup-financeiro-${date}.json`
      a.click()
      URL.revokeObjectURL(url)

      toast.success(`Backup exportado com sucesso! ${categories.length} categorias, ${transactions.length} transações, ${fixedAccounts.length} contas fixas, ${installmentGroups.length} parcelamentos.`)
    } catch (err) {
      toast.error(`Erro ao exportar: ${getErrorMessage(err)}`)
    } finally {
      setExporting(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as BackupFile
        if (!validateBackup(parsed)) {
          toast.error('Arquivo de backup inválido ou incompatível.')
          return
        }
        setPendingBackup(parsed)
        setImportConfirmOpen(true)
      } catch {
        toast.error('Não foi possível ler o arquivo. Verifique se é um JSON válido.')
      }
    }
    reader.readAsText(file)
    // Reset input para permitir reimportar o mesmo arquivo
    e.target.value = ''
  }

  function validateBackup(data: unknown): data is BackupFile {
    if (!data || typeof data !== 'object') return false
    const b = data as BackupFile
    if (b.schemaVersion !== BACKUP_SCHEMA_VERSION) return false
    if (!b.data || typeof b.data !== 'object') return false
    if (!Array.isArray(b.data.categories)) return false
    if (!Array.isArray(b.data.transactions)) return false
    if (!Array.isArray(b.data.fixedAccounts)) return false
    if (!Array.isArray(b.data.installmentGroups)) return false
    return true
  }

  const handleImport = async () => {
    if (!user || !pendingBackup) return
    setImporting(true)
    setImportConfirmOpen(false)
    let created = 0
    let updated = 0

    try {
      // ── Categorias ────────────────────────────────────────────────────────
      const existingCats = await getCategories(user.uid)
      const existingCatIds = new Set(existingCats.map((c) => c.id))
      for (const cat of pendingBackup.data.categories) {
        const { id, ...fields } = cat
        if (existingCatIds.has(id)) {
          await updateCategory(user.uid, id, fields)
          updated++
        } else {
          await addCategory(user.uid, fields)
          created++
        }
      }

      // ── Contas Fixas ──────────────────────────────────────────────────────
      const existingFixed = await getFixedAccounts(user.uid)
      const existingFixedIds = new Set(existingFixed.map((f) => f.id))
      for (const fa of pendingBackup.data.fixedAccounts) {
        const { id, ...fields } = fa
        if (existingFixedIds.has(id)) {
          await updateFixedAccount(user.uid, id, fields)
          updated++
        } else {
          await addFixedAccount(user.uid, fields)
          created++
        }
      }

      // ── Transações ────────────────────────────────────────────────────────
      const existingTxsSnap = await getDocs(collection(db, `users/${user.uid}/transactions`))
      const existingTxIds = new Set(existingTxsSnap.docs.map((d) => d.id))
      for (const tx of pendingBackup.data.transactions) {
        const { id, ...fields } = tx
        if (existingTxIds.has(id)) {
          await updateTransaction(user.uid, id, fields)
          updated++
        } else {
          await addTransaction(user.uid, fields)
          created++
        }
      }

      setImportStats({ created, updated })
      toast.success(`Importação concluída! ${created} itens criados, ${updated} atualizados.`)
    } catch (err) {
      toast.error(`Erro na importação: ${getErrorMessage(err)}`)
    } finally {
      setImporting(false)
      setPendingBackup(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Meus Dados</h1>
      </div>

      {/* Exportar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Exportar backup</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Baixa um arquivo JSON com todos os seus dados: categorias, lançamentos, contas fixas e parcelamentos.
            </p>
          </div>
        </div>
        <Button
          onClick={handleExport}
          loading={exporting}
          icon={<Download className="w-4 h-4" />}
          className="w-full"
        >
          {exporting ? 'Exportando...' : 'Exportar backup JSON'}
        </Button>
      </div>

      {/* Importar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Importar backup</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Restaura dados a partir de um arquivo de backup JSON exportado anteriormente.
              Se um item com o mesmo ID já existir, ele será atualizado.
            </p>
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            A importação <strong>não apaga dados existentes</strong>. Apenas adiciona novos ou atualiza os que já existem.
          </p>
        </div>
        <label className="w-full">
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
            disabled={importing}
          />
          <span
            className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
              importing
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Importando...' : 'Selecionar arquivo JSON'}
          </span>
        </label>

        {importing && <PageLoader />}

        {importStats && !importing && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Última importação: <strong>{importStats.created}</strong> criados, <strong>{importStats.updated}</strong> atualizados.
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">O que é incluído no backup?</h3>
        <ul className="text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-1.5">
          <li>✅ Categorias</li>
          <li>✅ Todos os lançamentos (transações)</li>
          <li>✅ Contas fixas</li>
          <li>✅ Grupos de parcelamento</li>
        </ul>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
          O arquivo de backup inclui versão (schemaVersion: {BACKUP_SCHEMA_VERSION}) para garantir compatibilidade futura.
        </p>
      </div>

      {/* Modal de confirmação */}
      <Modal
        open={importConfirmOpen}
        onClose={() => { setImportConfirmOpen(false); setPendingBackup(null) }}
        title="Confirmar importação"
        size="sm"
        footer={
          <div className="flex gap-2 w-full">
            <Button
              variant="secondary"
              onClick={() => { setImportConfirmOpen(false); setPendingBackup(null) }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button onClick={handleImport} className="flex-1">
              Confirmar importação
            </Button>
          </div>
        }
      >
        {pendingBackup && (
          <div className="flex flex-col gap-3">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-sm flex flex-col gap-1.5">
              <p className="text-slate-600 dark:text-slate-300">
                <strong>Exportado em:</strong> {new Date(pendingBackup.exportedAt).toLocaleString('pt-BR')}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                <strong>Categorias:</strong> {pendingBackup.data.categories.length}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                <strong>Lançamentos:</strong> {pendingBackup.data.transactions.length}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                <strong>Contas fixas:</strong> {pendingBackup.data.fixedAccounts.length}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                <strong>Parcelamentos:</strong> {pendingBackup.data.installmentGroups.length}
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Os dados existentes com o mesmo ID serão atualizados. Novos dados serão adicionados.
                Esta operação não pode ser desfeita facilmente.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
