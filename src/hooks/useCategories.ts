import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getCategoriesOfflineFirst,
  addCategoryOfflineFirst,
  updateCategoryOfflineFirst,
  deleteCategoryOfflineFirst,
} from '../services/categoriesRepository'
import { getCategoryUsage } from '../services/firestore'
import type { Category } from '../types'

export function useCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getCategoriesOfflineFirst(user.uid)
      setCategories(data)
    } finally {
      setLoading(false)
    }
  }, [user])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const add = async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return
    await addCategoryOfflineFirst(user.uid, data)
    await load()
  }

  const update = async (id: string, data: Partial<Category>) => {
    if (!user) return
    await updateCategoryOfflineFirst(user.uid, id, data)
    await load()
  }

  const remove = async (id: string) => {
    if (!user) return
    await deleteCategoryOfflineFirst(user.uid, id)
    await load()
  }

  const getUsage = async (id: string) => {
    if (!user) return { transactions: 0, fixedAccounts: 0, installmentGroups: 0 }
    return getCategoryUsage(user.uid, id)
  }

  return { categories, loading, reload: load, add, update, remove, getUsage }
}

