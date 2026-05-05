import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getTransactionsOfflineFirst,
  addTransactionOfflineFirst,
  updateTransactionOfflineFirst,
  deleteTransactionOfflineFirst,
} from '../services/financeRepository'
import type { Transaction } from '../types'

export function useTransactions(month: number, year: number) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const data = await getTransactionsOfflineFirst(user.uid, month, year)
      setTransactions(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar transações')
    } finally {
      setLoading(false)
    }
  }, [user, month, year])

  useEffect(() => { load() }, [load])

  // Recarrega após sincronização bem-sucedida
  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent<{ uid: string }>).detail
      if (detail?.uid === user?.uid) load()
    }
    window.addEventListener('financeSync', handleSync)
    return () => window.removeEventListener('financeSync', handleSync)
  }, [load, user])

  const add = async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return
    await addTransactionOfflineFirst(user.uid, data)
    await load()
  }

  const update = async (id: string, data: Partial<Transaction>) => {
    if (!user) return
    await updateTransactionOfflineFirst(user.uid, id, data)
    await load()
  }

  const remove = async (id: string) => {
    if (!user) return
    await deleteTransactionOfflineFirst(user.uid, id)
    await load()
  }

  return { transactions, loading, error, reload: load, add, update, remove }
}
