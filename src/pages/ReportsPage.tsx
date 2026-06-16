import { useState, useMemo } from 'react'
import { FileText, FileSpreadsheet, Download, WifiOff } from 'lucide-react'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { PageLoader } from '../components/ui/Loading'
import { useAuth } from '../contexts/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { formatCurrency, formatDate, currentMonthYear } from '../utils/formatters'
import { getTransactionsByRange } from '../services/firestore'
import { getTransactionsByDateRange } from '../offline/offlineDb'
import { Timestamp } from 'firebase/firestore'
import { toast } from '../components/ui/Toast'
import type { Transaction, TransactionNature } from '../types'
import type { ExcelRowDetalhado, ExcelRowGastosCategoria, ExcelRowResumido } from '../utils/exportExcel'
import type { PdfRowDetalhado, PdfRowGastosCategoria, PdfRowResumido } from '../utils/exportPdf'

function getNature(t: Transaction, catTypeMap: Map<string, string>): TransactionNature {
  if (t.transactionNature) return t.transactionNature
  const ct = catTypeMap.get(t.categoryId)
  if (ct === 'income') return 'income'
  return 'expense'
}

type ReportMode = 'resumido' | 'detalhado' | 'gastos_categoria'

interface CategoryExpenseReportRow {
  categoryId: string
  categoryName: string
  count: number
  total: number
  paid: number
  pending: number
  percent: number
}

const REPORT_MODES: { id: ReportMode; label: string }[] = [
  { id: 'resumido', label: 'Resumido' },
  { id: 'detalhado', label: 'Detalhado' },
  { id: 'gastos_categoria', label: 'Gastos por categoria' },
]

function buildCategoryExpenseReport(
  transactions: Transaction[],
  catTypeMap: Map<string, string>,
  selectedCategoryIds: string[]
): { rows: CategoryExpenseReportRow[]; transactions: Transaction[]; total: number; paid: number; pending: number } {
  const selected = new Set(selectedCategoryIds)
  const filtered = transactions.filter((t) => {
    if (getNature(t, catTypeMap) !== 'expense') return false
    return selected.size === 0 || selected.has(t.categoryId)
  })
  const total = filtered.reduce((s, t) => s + t.value, 0)
  const paid = filtered.filter((t) => t.status === 'paid').reduce((s, t) => s + t.value, 0)
  const pending = total - paid
  const map = new Map<string, CategoryExpenseReportRow>()

  for (const t of filtered) {
    const key = t.categoryId || `category:${t.categoryName}`
    const current = map.get(key) ?? {
      categoryId: t.categoryId,
      categoryName: t.categoryName || 'Sem categoria',
      count: 0,
      total: 0,
      paid: 0,
      pending: 0,
      percent: 0,
    }
    current.count += 1
    current.total += t.value
    if (t.status === 'paid') current.paid += t.value
    else current.pending += t.value
    map.set(key, current)
  }

  const rows = Array.from(map.values())
    .map((row) => ({
      ...row,
      percent: total > 0 ? Math.round((row.total / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)

  return { rows, transactions: filtered, total, paid, pending }
}

export function ReportsPage() {
  const { month: cm, year: cy } = currentMonthYear()

  const firstDay = `${cy}-${String(cm).padStart(2, '0')}-01`
  const lastDay = `${cy}-${String(cm).padStart(2, '0')}-${new Date(cy, cm, 0).getDate()}`

  const [startDate, setStartDate] = useState(firstDay)
  const [endDate, setEndDate] = useState(lastDay)
  const [reportMode, setReportMode] = useState<ReportMode>('resumido')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [isOfflineData, setIsOfflineData] = useState(false)

  const { user } = useAuth()
  const { categories } = useCategories()
  const { isOnline } = useOnlineStatus()

  const catTypeMap = useMemo(() => {
    const m = new Map<string, string>()
    categories.forEach((c) => m.set(c.id, c.type))
    return m
  }, [categories])

  const expenseCategories = useMemo(
    () => categories
      .filter((c) => c.type === 'expense' || c.type === 'both')
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
    [categories]
  )

  const selectedCategoryLabel = useMemo(() => {
    if (selectedCategoryIds.length === 0) return 'Todas as categorias'
    const names = selectedCategoryIds
      .map((id) => categories.find((c) => c.id === id)?.name)
      .filter((name): name is string => Boolean(name))
    return names.length > 0 ? names.join(', ') : `${selectedCategoryIds.length} categoria(s)`
  }, [categories, selectedCategoryIds])

  const categoryExpenseReport = useMemo(
    () => buildCategoryExpenseReport(transactions, catTypeMap, selectedCategoryIds),
    [transactions, catTypeMap, selectedCategoryIds]
  )

  const hasExportData = reportMode === 'gastos_categoria'
    ? categoryExpenseReport.rows.length > 0
    : transactions.length > 0

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((current) => (
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    ))
  }

  const handleSearch = async () => {
    if (!user || !startDate || !endDate) return
    if (startDate > endDate) { return }
    setLoading(true)
    try {
      if (!isOnline) {
        // Modo offline: usa cache IndexedDB
        const local = await getTransactionsByDateRange(user.uid, startDate, endDate)
        const converted: Transaction[] = local.map((r) => ({
          id: r.serverId ?? r.localId,
          description: r.description,
          value: r.value,
          categoryId: r.categoryId,
          categoryName: r.categoryName,
          launchDate: r.launchDate,
          chargeDate: r.chargeDate,
          month: r.month,
          year: r.year,
          status: r.status as Transaction['status'],
          type: r.type as Transaction['type'],
          transactionNature: r.transactionNature as Transaction['transactionNature'],
          fixedAccountId: r.fixedAccountId,
          installmentGroupId: r.installmentGroupId,
          installmentNumber: r.installmentNumber,
          totalInstallments: r.totalInstallments,
          createdAt: Timestamp.fromDate(new Date(r.createdAt)),
          updatedAt: Timestamp.fromDate(new Date(r.updatedAt)),
        }))
        setTransactions(converted)
        setIsOfflineData(true)
        setSearched(true)
        return
      }
      const data = await getTransactionsByRange(user.uid, startDate, endDate)
      setTransactions(data)
      setIsOfflineData(false)
      setSearched(true)
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  // Agrupar por mês/ano
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of transactions) {
      const key = `${t.year}-${String(t.month).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [transactions])

  const totals = useMemo(() => {
    let incTotal = 0
    let incPaid = 0
    let expTotal = 0
    let expPaid = 0
    for (const t of transactions) {
      const n = getNature(t, catTypeMap)
      if (n === 'income') {
        incTotal += t.value
        if (t.status === 'paid') incPaid += t.value
      } else {
        expTotal += t.value
        if (t.status === 'paid') expPaid += t.value
      }
    }
    return {
      expTotal, expPaid, expPending: expTotal - expPaid,
      incTotal, incPaid, incPending: incTotal - incPaid,
    }
  }, [transactions, catTypeMap])

  const handleExportExcel = async () => {
    if (!hasExportData) { toast.error('Não há dados para exportar.'); return }
    const { exportDetalhadoToExcel, exportGastosCategoriaToExcel, exportResumidoToExcel } = await import('../utils/exportExcel')
    const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
    if (reportMode === 'gastos_categoria') {
      const rows: ExcelRowGastosCategoria[] = categoryExpenseReport.rows.map((row) => ({
        'Categoria': row.categoryName,
        'Qtd. Lançamentos': row.count,
        'Total Gasto': formatCurrency(row.total),
        'Pago': formatCurrency(row.paid),
        'Pendente': formatCurrency(row.pending),
        '% do Total': `${row.percent}%`,
      }))
      exportGastosCategoriaToExcel(rows, `relatorio-gastos-por-categoria-${today}.xlsx`)
    } else if (reportMode === 'detalhado') {
      const rows: ExcelRowDetalhado[] = transactions.map((t) => ({
        'Data Vencimento': formatDate(t.chargeDate),
        'Data Lançamento': formatDate(t.launchDate ?? ''),
        'Descrição': t.description,
        'Categoria': t.categoryName,
        'Tipo': getNature(t, catTypeMap) === 'income' ? 'Receita' : 'Despesa',
        'Status': t.status === 'paid' ? 'Pago' : 'Pendente',
        'Tipo Lançamento': t.type === 'normal' ? 'Normal' : t.type === 'fixed' ? 'Fixa' : 'Parcelada',
        'Valor (R$)': formatCurrency(t.value),
      }))
      exportDetalhadoToExcel(rows, `relatorio-financeiro-${today}.xlsx`)
    } else {
      const rows: ExcelRowResumido[] = grouped.map(([key, txs]) => {
        const [year, month] = key.split('-')
        let incTotal = 0, incPaid = 0, expTotal = 0, expPaid = 0
        for (const t of txs) {
          const n = getNature(t, catTypeMap)
          if (n === 'income') { incTotal += t.value; if (t.status === 'paid') incPaid += t.value }
          else { expTotal += t.value; if (t.status === 'paid') expPaid += t.value }
        }
        return {
          'Mês/Ano': `${month}/${year}`,
          'Total Receitas': formatCurrency(incTotal),
          'Total Despesas': formatCurrency(expTotal),
          'Saldo': formatCurrency(incTotal - expTotal),
          'Total Pago/Recebido': formatCurrency(incPaid + expPaid),
          'Total Pendente': formatCurrency((incTotal - incPaid) + (expTotal - expPaid)),
        }
      })
      exportResumidoToExcel(rows, `relatorio-financeiro-${today}.xlsx`)
    }
  }

  const handleExportPdf = async () => {
    if (!hasExportData) { toast.error('Não há dados para exportar.'); return }
    const { exportDetalhadoToPdf, exportGastosCategoriaToPdf, exportResumidoToPdf } = await import('../utils/exportPdf')
    const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
    if (reportMode === 'gastos_categoria') {
      const rows: PdfRowGastosCategoria[] = categoryExpenseReport.rows.map((row) => ({
        categoryName: row.categoryName,
        count: row.count,
        total: row.total,
        paid: row.paid,
        pending: row.pending,
        percent: row.percent,
      }))
      exportGastosCategoriaToPdf(
        rows,
        startDate,
        endDate,
        `relatorio-gastos-por-categoria-${today}.pdf`,
        selectedCategoryLabel
      )
    } else if (reportMode === 'detalhado') {
      const rows: PdfRowDetalhado[] = transactions.map((t) => ({
        chargeDate: t.chargeDate,
        launchDate: t.launchDate ?? '',
        description: t.description,
        categoryName: t.categoryName,
        nature: getNature(t, catTypeMap) === 'income' ? 'Receita' : 'Despesa',
        status: t.status === 'paid' ? 'Pago' : 'Pendente',
        type: t.type === 'normal' ? 'Normal' : t.type === 'fixed' ? 'Fixa' : 'Parcelada',
        value: t.value,
      }))
      exportDetalhadoToPdf(rows, startDate, endDate, `relatorio-financeiro-${today}.pdf`)
    } else {
      const rows: PdfRowResumido[] = grouped.map(([key, txs]) => {
        const [year, month] = key.split('-')
        let incTotal = 0, incPaid = 0, expTotal = 0, expPaid = 0
        for (const t of txs) {
          const n = getNature(t, catTypeMap)
          if (n === 'income') { incTotal += t.value; if (t.status === 'paid') incPaid += t.value }
          else { expTotal += t.value; if (t.status === 'paid') expPaid += t.value }
        }
        return {
          period: `${month}/${year}`,
          incTotal, expTotal, balance: incTotal - expTotal,
          paid: incPaid + expPaid, pending: (incTotal - incPaid) + (expTotal - expPaid),
        }
      })
      exportResumidoToPdf(rows, startDate, endDate, `relatorio-financeiro-${today}.pdf`)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Relatórios</h1>
      </div>

      {/* Banner offline */}
      {isOfflineData && searched && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3 text-sm">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Relatório offline — exibindo dados já sincronizados neste dispositivo. Reconecte-se para ver todos os lançamentos.</span>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data inicial"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Data final"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            {REPORT_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setReportMode(mode.id)}
                className={`px-2 py-2 text-[11px] sm:text-xs font-semibold transition-colors ${
                  reportMode === mode.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <Button onClick={handleSearch} loading={loading} className="w-full">
            Buscar
          </Button>
        </div>

        {reportMode === 'gastos_categoria' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Categorias do relatório</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sem marcar nenhuma, o relatório usa todas as categorias de despesa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategoryIds([])}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  selectedCategoryIds.length === 0
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Todas
              </button>
            </div>
            {expenseCategories.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Nenhuma categoria de despesa cadastrada.</p>
            ) : (
              <div className="max-h-44 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                {expenseCategories.map((category) => {
                  const selected = selectedCategoryIds.includes(category.id)
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className={`min-h-[40px] rounded-xl px-3 py-2 flex items-center gap-2 text-left text-xs font-medium transition-colors ${
                        selected
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700'
                          : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                      <span className="truncate">{category.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            icon={<FileSpreadsheet className="w-4 h-4" />}
            onClick={handleExportExcel}
            size="sm"
            disabled={!searched || !hasExportData}
            title="Exportar Excel"
          >
            Exportar Excel
          </Button>
          <Button
            variant="secondary"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportPdf}
            size="sm"
            disabled={!searched || !hasExportData}
            title="Exportar PDF"
          >
            Exportar PDF
          </Button>
        </div>
      </div>

      {loading && <PageLoader />}

      {!loading && searched && (
        <>
          {/* Resumo geral */}
          {reportMode !== 'gastos_categoria' && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Despesas</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { label: 'Total Despesas',    value: totals.expTotal,   bg: 'bg-indigo-50 dark:bg-indigo-900/20',  text: 'text-indigo-700 dark:text-indigo-300' },
                { label: 'Pago Despesas',     value: totals.expPaid,    bg: 'bg-rose-50 dark:bg-rose-900/20',      text: 'text-rose-700 dark:text-rose-300' },
                { label: 'Pendente Despesas', value: totals.expPending, bg: 'bg-amber-50 dark:bg-amber-900/20',    text: 'text-amber-700 dark:text-amber-300' },
              ] as const).map((item) => (
                <div key={item.label} className={`${item.bg} rounded-xl p-2.5 text-center`}>
                  <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight mb-0.5">{item.label}</p>
                  <p className={`text-xs sm:text-sm font-bold ${item.text} leading-tight`}>{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-1">Entradas</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { label: 'Total Entradas',     value: totals.incTotal,   bg: 'bg-emerald-50 dark:bg-emerald-900/20',  text: 'text-emerald-700 dark:text-emerald-300' },
                { label: 'Entradas Recebidas', value: totals.incPaid,    bg: 'bg-teal-50 dark:bg-teal-900/20',        text: 'text-teal-700 dark:text-teal-300' },
                { label: 'Entradas Pendentes', value: totals.incPending, bg: 'bg-lime-50 dark:bg-lime-900/20',        text: 'text-lime-700 dark:text-lime-300' },
              ] as const).map((item) => (
                <div key={item.label} className={`${item.bg} rounded-xl p-2.5 text-center`}>
                  <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight mb-0.5">{item.label}</p>
                  <p className={`text-xs sm:text-sm font-bold ${item.text} leading-tight`}>{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>
          </div>
          )}

          {reportMode === 'gastos_categoria' ? (
            categoryExpenseReport.rows.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8">Nenhum gasto encontrado para as categorias selecionadas.</p>
            ) : (
              <GastosCategoriaView
                rows={categoryExpenseReport.rows}
                total={categoryExpenseReport.total}
                paid={categoryExpenseReport.paid}
                pending={categoryExpenseReport.pending}
                categoryLabel={selectedCategoryLabel}
              />
            )
          ) : transactions.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">Nenhum lançamento no período.</p>
          ) : reportMode === 'resumido' ? (
            <ResumoView grouped={grouped} catTypeMap={catTypeMap} />
          ) : (
            <DetalhadoView grouped={grouped} catTypeMap={catTypeMap} />
          )}
        </>
      )}
    </div>
  )
}

// ─── Resumido: totais por mês ─────────────────────────────────────────────────
function GastosCategoriaView({
  rows,
  total,
  paid,
  pending,
  categoryLabel,
}: {
  rows: CategoryExpenseReportRow[]
  total: number
  paid: number
  pending: number
  categoryLabel: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Gastos por categoria</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Categorias: {categoryLabel}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { label: 'Total gasto', value: total, bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300' },
            { label: 'Pago', value: paid, bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-300' },
            { label: 'Pendente', value: pending, bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300' },
          ] as const).map((item) => (
            <div key={item.label} className={`${item.bg} rounded-xl p-2.5 text-center`}>
              <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight mb-0.5">{item.label}</p>
              <p className={`text-xs sm:text-sm font-bold ${item.text} leading-tight`}>{formatCurrency(item.value)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            {rows.length} categoria{rows.length !== 1 ? 's' : ''} encontrada{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {rows.map((row) => (
            <div key={row.categoryId || row.categoryName} className="px-4 py-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{row.categoryName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{row.count} lançamento{row.count !== 1 ? 's' : ''} · {row.percent}% do total</p>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 shrink-0">{formatCurrency(row.total)}</p>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(2, row.percent)}%` }} />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Pago: <strong className="text-rose-600 dark:text-rose-300">{formatCurrency(row.paid)}</strong></span>
                <span>Pendente: <strong className="text-amber-600 dark:text-amber-300">{formatCurrency(row.pending)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResumoView({ grouped, catTypeMap }: { grouped: [string, Transaction[]][]; catTypeMap: Map<string, string> }) {
  return (
    <div className="flex flex-col gap-3">
      {grouped.map(([key, txs]) => {
        const [year, month] = key.split('-')
        let expTotal = 0, expPaid = 0, incTotal = 0, incPaid = 0
        for (const t of txs) {
          const n = getNature(t, catTypeMap)
          if (n === 'income') {
            incTotal += t.value
            if (t.status === 'paid') incPaid += t.value
          } else {
            expTotal += t.value
            if (t.status === 'paid') expPaid += t.value
          }
        }
        const expPending = expTotal - expPaid
        const incPending = incTotal - incPaid
        return (
          <div key={key} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3">
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              {month}/{year} · {txs.length} lançamento{txs.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Despesas</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { label: 'Total Despesas',    value: expTotal,   bg: 'bg-indigo-50 dark:bg-indigo-900/20',  text: 'text-indigo-700 dark:text-indigo-300' },
                  { label: 'Pago Despesas',     value: expPaid,    bg: 'bg-rose-50 dark:bg-rose-900/20',      text: 'text-rose-700 dark:text-rose-300' },
                  { label: 'Pendente Despesas', value: expPending, bg: 'bg-amber-50 dark:bg-amber-900/20',    text: 'text-amber-700 dark:text-amber-300' },
                ] as const).map((item) => (
                  <div key={item.label} className={`${item.bg} rounded-xl p-2 text-center`}>
                    <p className="text-[8px] sm:text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-tight mb-0.5">{item.label}</p>
                    <p className={`text-[11px] sm:text-xs font-bold ${item.text} leading-tight`}>{formatCurrency(item.value)}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-0.5">Entradas</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { label: 'Total Entradas',     value: incTotal,   bg: 'bg-emerald-50 dark:bg-emerald-900/20',  text: 'text-emerald-700 dark:text-emerald-300' },
                  { label: 'Entradas Recebidas', value: incPaid,    bg: 'bg-teal-50 dark:bg-teal-900/20',        text: 'text-teal-700 dark:text-teal-300' },
                  { label: 'Entradas Pendentes', value: incPending, bg: 'bg-lime-50 dark:bg-lime-900/20',        text: 'text-lime-700 dark:text-lime-300' },
                ] as const).map((item) => (
                  <div key={item.label} className={`${item.bg} rounded-xl p-2 text-center`}>
                    <p className="text-[8px] sm:text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-tight mb-0.5">{item.label}</p>
                    <p className={`text-[11px] sm:text-xs font-bold ${item.text} leading-tight`}>{formatCurrency(item.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Detalhado: lista por mês ─────────────────────────────────────────────────
function DetalhadoView({ grouped, catTypeMap }: { grouped: [string, Transaction[]][]; catTypeMap: Map<string, string> }) {
  return (
    <div className="flex flex-col gap-4">
      {grouped.map(([key, txs]) => {
        const [year, month] = key.split('-')
        return (
          <div key={key} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{month}/{year} · {txs.length} lançamento{txs.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {txs.map((t) => {
                const n = getNature(t, catTypeMap)
                return (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-2.5">
                    <span className={`text-xs font-bold w-1.5 h-1.5 rounded-full shrink-0 ${n === 'income' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {t.categoryName} · {t.chargeDate.split('-').reverse().join('/')}
                        {t.status === 'paid' ? ' · Pago' : ' · Pendente'}
                      </p>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${n === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {n === 'income' ? '+' : ''}{formatCurrency(t.value)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
