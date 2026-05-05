import { useEffect, useCallback, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useOnlineStatus } from './useOnlineStatus'
import { syncPendingChanges, getPendingCount } from '../offline/syncService'

export function useAutoSync() {
  const { user } = useAuth()
  const { isOnline } = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const refreshCount = useCallback(async () => {
    if (!user) return
    const count = await getPendingCount(user.uid)
    setPendingCount(count)
  }, [user])

  const sync = useCallback(async () => {
    if (!user || !isOnline) return
    setIsSyncing(true)
    try {
      await syncPendingChanges(user.uid)
      // Notifica useTransactions para recarregar com dados atualizados
      window.dispatchEvent(new CustomEvent('financeSync', { detail: { uid: user.uid } }))
    } finally {
      setIsSyncing(false)
      await refreshCount()
    }
  }, [user, isOnline, refreshCount])

  // Sincroniza ao voltar online
  useEffect(() => {
    if (isOnline) {
      sync()
    } else {
      refreshCount()
    }
  }, [isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  // Verifica contagem inicial ao montar
  useEffect(() => {
    refreshCount()
  }, [refreshCount])

  return { isOnline, pendingCount, isSyncing, sync }
}
