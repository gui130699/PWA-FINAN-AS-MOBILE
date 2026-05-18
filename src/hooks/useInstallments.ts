import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getInstallmentGroupsOfflineFirst,
  createInstallmentGroupOfflineFirst,
  deleteInstallmentGroupOfflineFirst,
  getInstallmentTransactionsOfflineFirst,
} from '../services/installmentsRepository'
import { updateTransaction } from '../services/firestore'
import type { InstallmentGroup, Transaction } from '../types'

export function useInstallments() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<InstallmentGroup[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getInstallmentGroupsOfflineFirst(user.uid)
      setGroups(data)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const create = async (data: Parameters<typeof createInstallmentGroupOfflineFirst>[1]) => {
    if (!user) return
    await createInstallmentGroupOfflineFirst(user.uid, data)
    await load()
  }

  const remove = async (groupId: string) => {
    if (!user) return
    await deleteInstallmentGroupOfflineFirst(user.uid, groupId)
    await load()
  }

  const getTransactions = async (groupId: string): Promise<Transaction[]> => {
    if (!user) return []
    return getInstallmentTransactionsOfflineFirst(user.uid, groupId)
  }

  const payInstallment = async (transactionId: string) => {
    if (!user) return
    await updateTransaction(user.uid, transactionId, { status: 'paid' })
    await load()
  }

  return { groups, loading, reload: load, create, remove, getTransactions, payInstallment }
}

