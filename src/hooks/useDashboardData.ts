/**
 * useDashboardData.ts
 * Hook que busca transações do mês atual, mês anterior e ano atual
 * para alimentar os blocos inteligentes da Dashboard.
 * Mantém compatibilidade offline-first usando getTransactionsByRange do firestore
 * apenas quando online; caso contrário usa dados já disponíveis.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useOnlineStatus } from './useOnlineStatus'
import { getTransactionsByRange } from '../services/firestore'
import type { Transaction } from '../types'

export interface DashboardPeriodData {
  yearTransactions: Transaction[]   // todo o ano selecionado
  prevMonthTransactions: Transaction[]  // mês anterior ao selecionado
  loadingExtra: boolean
  errorExtra: string | null
  reloadExtra: () => void
}

export function useDashboardData(month: number, year: number): DashboardPeriodData {
  const { user } = useAuth()
  const isOnline  = useOnlineStatus()

  const [yearTransactions, setYearTransactions] = useState<Transaction[]>([])
  const [prevMonthTransactions, setPrevMonthTransactions] = useState<Transaction[]>([])
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [errorExtra, setErrorExtra] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user || !isOnline) return

    setLoadingExtra(true)
    setErrorExtra(null)

    try {
      // Calcular período do ano
      const startOfYear = `${year}-01-01`
      const endOfYear   = `${year}-12-31`

      // Calcular mês anterior
      let prevMonth = month - 1
      let prevYear  = year
      if (prevMonth === 0) { prevMonth = 12; prevYear-- }
      const prevMonthStr = String(prevMonth).padStart(2, '0')
      const prevLastDay  = new Date(prevYear, prevMonth, 0).getDate()
      const startOfPrev  = `${prevYear}-${prevMonthStr}-01`
      const endOfPrev    = `${prevYear}-${prevMonthStr}-${String(prevLastDay).padStart(2, '0')}`

      const [yearTxs, prevTxs] = await Promise.all([
        getTransactionsByRange(user.uid, startOfYear, endOfYear),
        getTransactionsByRange(user.uid, startOfPrev, endOfPrev),
      ])

      setYearTransactions(yearTxs)
      setPrevMonthTransactions(prevTxs)
    } catch (e: unknown) {
      setErrorExtra(e instanceof Error ? e.message : 'Erro ao carregar dados extras')
    } finally {
      setLoadingExtra(false)
    }
  }, [user, month, year, isOnline])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  // Recarrega após sincronização
  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent<{ uid: string }>).detail
      if (detail?.uid === user?.uid) load()
    }
    window.addEventListener('financeSync', handleSync)
    return () => window.removeEventListener('financeSync', handleSync)
  }, [load, user])

  return { yearTransactions, prevMonthTransactions, loadingExtra, errorExtra, reloadExtra: load }
}
