import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Zap, Save, Eye, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import { PageLoader, EmptyState } from '../components/ui/Loading'
import { toast } from '../components/ui/Toast'
import { useQuickEntryDrafts } from '../hooks/useQuickEntryDrafts'
import { useCategories } from '../hooks/useCategories'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, todayISO } from '../utils/formatters'
import { parseQuickEntryText } from '../utils/quickEntryParser'
import type { ParsedQuickEntry } from '../utils/quickEntryParser'
import type { QuickEntryDraft, TransactionNature, TransactionStatus } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function confidenceBadge(confidence: number) {
  if (confidence >= 0.8) return { label: 'Alta', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
  if (confidence >= 0.5) return { label: 'Média', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' }
  return { label: 'Baixa', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
}

const hasSpeechSupport = !!(window.SpeechRecognition ?? window.webkitSpeechRecognition)

// ─── Modal de confirmação/conclusão ──────────────────────────────────────────

interface CompleteDraftModalProps {
  open: boolean
  draft: QuickEntryDraft | null
  onClose: () => void
  onConfirm: (data: CompleteDraftFormData) => Promise<void>
  categories: ReturnType<typeof useCategories>['categories']
}

interface CompleteDraftFormData {
  description: string
  valueStr: string
  categoryId: string
  categoryName: string
  transactionNature: TransactionNature
  launchDate: string
  chargeDate: string
  status: TransactionStatus
}

function CompleteDraftModal({ open, draft, onClose, onConfirm, categories }: CompleteDraftModalProps) {
  const [form, setForm] = useState<CompleteDraftFormData>(() => buildInitialForm(draft, categories))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Reinicia form quando o draft muda ou o modal é aberto
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(buildInitialForm(draft, categories))
      setFormError(null)
    }
  // categories intencionalmente omitido — só recarrega quando o draft/modal muda
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft?.id])

  const filteredCats = categories.filter(
    (c) => c.type === form.transactionNature || c.type === 'both',
  )

  function set<K extends keyof CompleteDraftFormData>(key: K, value: CompleteDraftFormData[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // Ao mudar categoria, ajusta nome e natureza (se cat é expense/income)
      if (key === 'categoryId') {
        const cat = categories.find((c) => c.id === value)
        if (cat) {
          next.categoryName = cat.name
          if (cat.type === 'expense' || cat.type === 'income') {
            next.transactionNature = cat.type as TransactionNature
          }
        }
      }
      return next
    })
  }

  async function handleSubmit() {
    const value = parseCurrencyInput(form.valueStr)
    if (!form.description.trim()) { setFormError('Descrição obrigatória.'); return }
    if (!value || value <= 0) { setFormError('Valor deve ser maior que zero.'); return }
    if (!form.categoryId) { setFormError('Selecione uma categoria.'); return }
    if (!form.launchDate) { setFormError('Data de lançamento obrigatória.'); return }
    if (!form.chargeDate) { setFormError('Data de vencimento obrigatória.'); return }
    setSaving(true)
    setFormError(null)
    try {
      await onConfirm(form)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Completar Lançamento"
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={saving}>Confirmar</Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {formError && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
            {formError}
          </div>
        )}

        {/* Texto original */}
        {draft?.rawText && (
          <div className="text-xs text-slate-500 dark:text-slate-400 italic truncate">
            "{draft.rawText}"
          </div>
        )}

        {/* Natureza */}
        <Select
          label="Tipo"
          value={form.transactionNature}
          onChange={(e) => set('transactionNature', e.target.value as TransactionNature)}
        >
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </Select>

        {/* Categoria */}
        <Select
          label="Categoria *"
          value={form.categoryId}
          onChange={(e) => set('categoryId', e.target.value)}
          required
        >
          <option value="">Selecione...</option>
          {filteredCats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        {/* Descrição */}
        <Input
          label="Descrição *"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          required
          maxLength={120}
          placeholder="Ex: Mercado, Uber, Salário..."
        />

        {/* Valor */}
        <Input
          label="Valor (R$) *"
          value={form.valueStr}
          onChange={(e) => set('valueStr', formatCurrencyInput(e.target.value))}
          inputMode="decimal"
          required
          placeholder="0,00"
        />

        {/* Status */}
        <Select
          label="Situação"
          value={form.status}
          onChange={(e) => set('status', e.target.value as TransactionStatus)}
        >
          <option value="pending">Pendente</option>
          <option value="paid">Pago / Recebido</option>
        </Select>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data de lançamento"
            type="date"
            value={form.launchDate}
            onChange={(e) => set('launchDate', e.target.value)}
            required
          />
          <Input
            label="Data de vencimento"
            type="date"
            value={form.chargeDate}
            onChange={(e) => set('chargeDate', e.target.value)}
            required
          />
        </div>
      </div>
    </Modal>
  )
}

function buildInitialForm(
  draft: QuickEntryDraft | null,
  categories: ReturnType<typeof useCategories>['categories'],
): CompleteDraftFormData {
  const today = todayISO()
  const suggestedCat = draft?.suggestedCategoryId
    ? categories.find((c) => c.id === draft.suggestedCategoryId)
    : null
  const nature: TransactionNature =
    (suggestedCat?.type === 'expense' || suggestedCat?.type === 'income')
      ? suggestedCat.type
      : (draft?.transactionNature ?? 'expense')

  return {
    description: draft?.parsedDescription ?? draft?.parsedPlace ?? '',
    valueStr: draft?.parsedValue ? formatCurrencyInput(String(draft.parsedValue)) : '',
    categoryId: suggestedCat?.id ?? '',
    categoryName: suggestedCat?.name ?? '',
    transactionNature: nature,
    launchDate: draft?.parsedDate ?? today,
    chargeDate: draft?.parsedDate ?? today,
    status: 'pending',
  }
}

// ─── Draft Card ───────────────────────────────────────────────────────────────

interface DraftCardProps {
  draft: QuickEntryDraft
  onComplete: (draft: QuickEntryDraft) => void
  onIgnore: (draft: QuickEntryDraft) => void
}

function DraftCard({ draft, onComplete, onIgnore }: DraftCardProps) {
  const badge = confidenceBadge(draft.confidence)
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
          {draft.rawText}
        </p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        {draft.parsedValue != null && (
          <span>Valor: <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(draft.parsedValue)}</strong></span>
        )}
        {draft.parsedDescription && (
          <span>Desc: <strong className="text-slate-700 dark:text-slate-200">{draft.parsedDescription}</strong></span>
        )}
        {draft.parsedDate && (
          <span>Data: <strong className="text-slate-700 dark:text-slate-200">{formatDate(draft.parsedDate)}</strong></span>
        )}
        {draft.suggestedCategoryName && (
          <span>Cat: <strong className="text-slate-700 dark:text-slate-200">{draft.suggestedCategoryName}</strong></span>
        )}
        <span className={draft.transactionNature === 'income' ? 'text-emerald-600' : 'text-red-500'}>
          {draft.transactionNature === 'income' ? '↑ Receita' : '↓ Despesa'}
        </span>
      </div>

      {draft.missingFields.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Faltando: {draft.missingFields.join(', ')}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => onComplete(draft)} className="flex-1">
          <CheckCircle className="w-4 h-4 mr-1" />
          Completar lançamento
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onIgnore(draft)} className="text-slate-500">
          <XCircle className="w-4 h-4 mr-1" />
          Ignorar
        </Button>
      </div>
    </div>
  )
}

// ─── Parsed Preview Card ──────────────────────────────────────────────────────

interface ParsedPreviewProps {
  text: string
  parsedValue: number | null
  parsedDescription: string | null
  parsedDate: string | null
  transactionNature: TransactionNature
  suggestedCategoryName: string | null
  confidence: number
  missingFields: string[]
}

function ParsedPreview({
  text, parsedValue, parsedDescription, parsedDate, transactionNature,
  suggestedCategoryName, confidence, missingFields,
}: ParsedPreviewProps) {
  const badge = confidenceBadge(confidence)
  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex-1">Pré-visualização da interpretação</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
          Confiança {badge.label}
        </span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 italic">"{text}"</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        {parsedValue != null
          ? <span>Valor: <strong>{formatCurrency(parsedValue)}</strong></span>
          : <span className="text-amber-600">Valor: não identificado</span>}
        {parsedDescription
          ? <span>Desc: <strong>{parsedDescription}</strong></span>
          : <span className="text-amber-600">Descrição: não identificada</span>}
        {parsedDate
          ? <span>Data: <strong>{formatDate(parsedDate)}</strong></span>
          : <span>Data: <strong>hoje</strong></span>}
        {suggestedCategoryName
          ? <span>Cat: <strong>{suggestedCategoryName}</strong></span>
          : <span className="text-amber-600">Categoria: não identificada</span>}
        <span className={transactionNature === 'income' ? 'text-emerald-600' : 'text-red-500'}>
          {transactionNature === 'income' ? '↑ Receita' : '↓ Despesa'}
        </span>
      </div>
      {missingFields.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Campos faltando: {missingFields.join(', ')}
        </p>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function QuickEntryPage() {
  const { categories } = useCategories()
  const {
    pendingDrafts,
    loading,
    error,
    reload,
    parseAndAddDraft,
    ignoreDraft,
    convertDraft,
  } = useQuickEntryDrafts()

  // Entrada
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // Pré-visualização (após "Interpretar")
  const [preview, setPreview] = useState<ParsedPreviewProps | null>(null)
  const [, setPreviewParsed] = useState<ParsedQuickEntry | null>(null)

  // Modal de completar
  const [completingDraft, setCompletingDraft] = useState<QuickEntryDraft | null>(null)

  // Ignorar
  const [ignoringDraft, setIgnoringDraft] = useState<QuickEntryDraft | null>(null)
  const [ignoreLoading, setIgnoreLoading] = useState(false)

  // Estado de ação
  const [saving, setSaving] = useState(false)

  // ─── Voz ─────────────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    const SpeechRec = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRec) return
    const rec = new SpeechRec()
    rec.lang = 'pt-BR'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? ''
      setTranscript(text)
      setInputText(text)
    }
    rec.onerror = () => {
      setIsListening(false)
      toast.error('Erro ao capturar voz. Tente novamente.')
    }
    rec.onend = () => setIsListening(false)
    rec.start()
    recognitionRef.current = rec
    setIsListening(true)
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  // ─── Interpretar ─────────────────────────────────────────────────────────

  function handleInterpret() {
    const text = inputText.trim()
    if (!text) { toast.error('Digite ou fale algo para interpretar.'); return }
    const parsed = parseQuickEntryText(text, { categories })
    setPreviewParsed(parsed)
    setPreview({
      text,
      parsedValue: parsed.parsedValue,
      parsedDescription: parsed.parsedDescription ?? null,
      parsedDate: parsed.parsedDate ?? null,
      transactionNature: parsed.transactionNature,
      suggestedCategoryName: parsed.suggestedCategoryName ?? null,
      confidence: parsed.confidence,
      missingFields: parsed.missingFields,
    })
  }

  // ─── Salvar como pendência ───────────────────────────────────────────────

  async function handleSave() {
    const text = inputText.trim()
    if (!text) { toast.error('Digite ou fale algo para salvar.'); return }
    setSaving(true)
    try {
      const source = transcript && transcript === text ? 'web_speech' : 'manual'
      const msgType = source === 'web_speech' ? 'speech' : 'text'
      await parseAndAddDraft(text, categories, {
        source,
        messageType: msgType,
        transcript: source === 'web_speech' ? transcript : undefined,
      })
      setInputText('')
      setTranscript('')
      setPreview(null)
      setPreviewParsed(null)
      toast.success('Entrada salva como pendência!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  // ─── Completar lançamento ─────────────────────────────────────────────────

  async function handleConfirmComplete(data: CompleteDraftFormData) {
    if (!completingDraft) return
    const value = parseCurrencyInput(data.valueStr)
    if (!value || value <= 0) throw new Error('Valor inválido.')
    const cat = categories.find((c) => c.id === data.categoryId)
    const chargeDate = data.chargeDate
    const [y, m] = chargeDate.split('-').map(Number)
    await convertDraft(completingDraft.id, {
      description: data.description.trim(),
      value,
      categoryId: data.categoryId,
      categoryName: cat?.name ?? data.categoryName,
      launchDate: data.launchDate,
      chargeDate,
      month: m,
      year: y,
      status: data.status,
      type: 'normal',
      transactionNature: data.transactionNature,
    })
    setCompletingDraft(null)
    toast.success('Lançamento criado com sucesso!')
  }

  // ─── Ignorar ─────────────────────────────────────────────────────────────

  async function handleConfirmIgnore() {
    if (!ignoringDraft) return
    setIgnoreLoading(true)
    try {
      await ignoreDraft(ignoringDraft.id)
      toast.info('Entrada ignorada.')
    } catch {
      toast.error('Erro ao ignorar.')
    } finally {
      setIgnoreLoading(false)
      setIgnoringDraft(null)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 pb-32 pt-4 space-y-6">

      {/* Caixa de entrada */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-indigo-500 shrink-0" />
          <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">Entrada Rápida</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Digite ou fale um gasto/receita em linguagem natural. O sistema extrai os dados automaticamente.
        </p>

        {/* Textarea */}
        <textarea
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ex: gastei 38,90 no mercado hoje&#10;Ex: recebi 1200 de salário&#10;Ex: paguei 80 da farmácia ontem"
        />

        {/* Botões de ação */}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={handleInterpret} disabled={!inputText.trim()}>
            <Eye className="w-4 h-4 mr-1" />
            Interpretar
          </Button>
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!inputText.trim()}>
            <Save className="w-4 h-4 mr-1" />
            Salvar como pendência
          </Button>
          {hasSpeechSupport && (
            <Button
              variant={isListening ? 'danger' : 'secondary'}
              size="sm"
              onClick={isListening ? stopListening : startListening}
            >
              {isListening
                ? <><MicOff className="w-4 h-4 mr-1" /> Parar</>
                : <><Mic className="w-4 h-4 mr-1" /> Falar</>}
            </Button>
          )}
        </div>

        {/* Aviso de escuta */}
        {isListening && (
          <p className="text-xs text-indigo-600 dark:text-indigo-400 animate-pulse">
            🎙 Ouvindo... Fale agora.
          </p>
        )}
      </div>

      {/* Pré-visualização */}
      {preview && (
        <ParsedPreview {...preview} />
      )}

      {/* Lista de pendências */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            Pendências ({pendingDrafts.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={() => void reload()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {loading && <PageLoader />}

        {!loading && error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
            {error}
          </div>
        )}

        {!loading && !error && pendingDrafts.length === 0 && (
          <EmptyState
            icon={<Zap className="w-10 h-10" />}
            title="Nenhuma pendência"
            description="Salve uma entrada rápida acima para revisar aqui."
          />
        )}

        {pendingDrafts.map((draft) => (
          <DraftCard
            key={draft.id}
            draft={draft}
            onComplete={(d) => setCompletingDraft(d)}
            onIgnore={(d) => setIgnoringDraft(d)}
          />
        ))}
      </div>

      {/* Modal de completar */}
      <CompleteDraftModal
        open={!!completingDraft}
        draft={completingDraft}
        onClose={() => setCompletingDraft(null)}
        onConfirm={handleConfirmComplete}
        categories={categories}
      />

      {/* Confirm ignorar */}
      <ConfirmDialog
        open={!!ignoringDraft}
        title="Ignorar entrada?"
        message={`"${ignoringDraft?.rawText ?? ''}" será marcada como ignorada e não aparecerá mais nas pendências.`}
        onConfirm={() => void handleConfirmIgnore()}
        onCancel={() => setIgnoringDraft(null)}
        loading={ignoreLoading}
      />
    </div>
  )
}
