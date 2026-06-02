import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { QuickEntryDraft, Transaction, Category } from '../types'
import type { ParsedQuickEntry } from '../utils/quickEntryParser'
import { parseQuickEntryText } from '../utils/quickEntryParser'
import {
  getQuickEntryDraftsOfflineFirst,
  getPendingQuickEntryDraftsOfflineFirst,
  addQuickEntryDraftOfflineFirst,
  updateQuickEntryDraftOfflineFirst,
  ignoreQuickEntryDraftOfflineFirst,
  convertQuickEntryDraftToTransactionOfflineFirst,
} from '../services/quickEntryRepository'

export interface UseQuickEntryDraftsReturn {
  drafts: QuickEntryDraft[]
  pendingDrafts: QuickEntryDraft[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  addDraft: (data: Omit<QuickEntryDraft, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateDraft: (id: string, data: Partial<QuickEntryDraft>) => Promise<void>
  ignoreDraft: (id: string) => Promise<void>
  convertDraft: (
    draftId: string,
    transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<string>
  parseAndAddDraft: (
    text: string,
    categories?: Category[],
    options?: { source?: QuickEntryDraft['source']; messageType?: QuickEntryDraft['messageType']; transcript?: string },
  ) => Promise<{ id: string; parsed: ParsedQuickEntry }>
}

export function useQuickEntryDrafts(): UseQuickEntryDraftsReturn {
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const [drafts, setDrafts] = useState<QuickEntryDraft[]>([])
  const [pendingDrafts, setPendingDrafts] = useState<QuickEntryDraft[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    setError(null)
    try {
      const [all, pending] = await Promise.all([
        getQuickEntryDraftsOfflineFirst(uid),
        getPendingQuickEntryDraftsOfflineFirst(uid),
      ])
      setDrafts(all)
      setPendingDrafts(pending)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar rascunhos.')
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
  }, [reload])

  useEffect(() => {
    const handler = () => { void reload() }
    window.addEventListener('financeSync', handler)
    return () => window.removeEventListener('financeSync', handler)
  }, [reload])

  const addDraft = useCallback(
    async (data: Omit<QuickEntryDraft, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = await addQuickEntryDraftOfflineFirst(uid, data)
      await reload()
      return id
    },
    [uid, reload],
  )

  const updateDraft = useCallback(
    async (id: string, data: Partial<QuickEntryDraft>) => {
      await updateQuickEntryDraftOfflineFirst(uid, id, data)
      await reload()
    },
    [uid, reload],
  )

  const ignoreDraft = useCallback(
    async (id: string) => {
      await ignoreQuickEntryDraftOfflineFirst(uid, id)
      await reload()
    },
    [uid, reload],
  )

  const convertDraft = useCallback(
    async (
      draftId: string,
      transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
    ) => {
      const transactionId = await convertQuickEntryDraftToTransactionOfflineFirst(
        uid,
        draftId,
        transactionData,
      )
      await reload()
      return transactionId
    },
    [uid, reload],
  )

  const parseAndAddDraft = useCallback(
    async (
      text: string,
      categories?: Category[],
      options?: {
        source?: QuickEntryDraft['source']
        messageType?: QuickEntryDraft['messageType']
        transcript?: string
      },
    ): Promise<{ id: string; parsed: ParsedQuickEntry }> => {
      const parsed = parseQuickEntryText(text, {
        categories,
        today: new Date().toISOString().slice(0, 10),
      })

      const id = await addQuickEntryDraftOfflineFirst(uid, {
        source: options?.source ?? 'manual',
        messageType: options?.messageType ?? 'text',
        rawText: text,
        transcript: options?.transcript ?? null,
        parsedValue: parsed.parsedValue,
        parsedPlace: parsed.parsedPlace ?? null,
        parsedDescription: parsed.parsedDescription ?? null,
        parsedDate: parsed.parsedDate ?? null,
        suggestedCategoryId: parsed.suggestedCategoryId ?? null,
        suggestedCategoryName: parsed.suggestedCategoryName ?? null,
        transactionNature: parsed.transactionNature,
        status: 'pending_review',
        confidence: parsed.confidence,
        missingFields: parsed.missingFields,
        transactionId: null,
        errorMessage: null,
      })
      await reload()
      return { id, parsed }
    },
    [uid, reload],
  )

  return {
    drafts,
    pendingDrafts,
    loading,
    error,
    reload,
    addDraft,
    updateDraft,
    ignoreDraft,
    convertDraft,
    parseAndAddDraft,
  }
}
