import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getFixedAccountsOfflineFirst,
  addFixedAccountOfflineFirst,
  updateFixedAccountOfflineFirst,
  deleteFixedAccountOfflineFirst,
  generateFixedAccountsForMonthOfflineFirst,
} from '../services/fixedAccountsRepository'
import type { FixedAccount } from '../types'

export function useFixedAccounts() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<FixedAccount[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getFixedAccountsOfflineFirst(user.uid)
      setAccounts(data)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const add = async (data: Omit<FixedAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return
    await addFixedAccountOfflineFirst(user.uid, data)
    await load()
  }

  const update = async (id: string, data: Partial<FixedAccount>) => {
    if (!user) return
    await updateFixedAccountOfflineFirst(user.uid, id, data)
    await load()
  }

  const remove = async (id: string) => {
    if (!user) return
    await deleteFixedAccountOfflineFirst(user.uid, id)
    await load()
  }

  const generate = async (month: number, year: number) => {
    if (!user) return { created: 0, skipped: 0 }
    return generateFixedAccountsForMonthOfflineFirst(user.uid, month, year)
  }

  return { accounts, loading, reload: load, add, update, remove, generate }
}

