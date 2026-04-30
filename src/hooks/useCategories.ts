import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getCategories, addCategory, updateCategory, deleteCategory } from '../services/firestore'
import type { Category } from '../types'

export function useCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getCategories(user.uid)
      setCategories(data)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const add = async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return
    await addCategory(user.uid, data)
    await load()
  }

  const update = async (id: string, data: Partial<Category>) => {
    if (!user) return
    await updateCategory(user.uid, id, data)
    await load()
  }

  const remove = async (id: string) => {
    if (!user) return
    await deleteCategory(user.uid, id)
    await load()
  }

  return { categories, loading, reload: load, add, update, remove }
}
