import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from '../services/firestore'
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
      const data = await getTransactions(user.uid, month, year)
      setTransactions(data)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar transações')
    } finally {
      setLoading(false)
    }
  }, [user, month, year])

  useEffect(() => { load() }, [load])

  const add = async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return
    await addTransaction(user.uid, data)
    await load()
  }

  const update = async (id: string, data: Partial<Transaction>) => {
    if (!user) return
    await updateTransaction(user.uid, id, data)
    await load()
  }

  const remove = async (id: string) => {
    if (!user) return
    await deleteTransaction(user.uid, id)
    await load()
  }

  return { transactions, loading, error, reload: load, add, update, remove }
}
