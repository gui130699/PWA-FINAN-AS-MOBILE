import { useState, useCallback } from 'react'
import { toast } from '../components/ui/Toast'

/**
 * Hook para ações manuais de atualização do PWA.
 * - checkForUpdate: chama registration.update() e informa o usuário
 * - clearAllCaches: apaga Cache Storage e recarrega a página
 *   (não apaga localStorage, Firebase Auth nem dados do Firestore)
 */
export function usePWAUpdate() {
  const [isChecking, setIsChecking] = useState(false)

  const checkForUpdate = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      toast.error('Service Worker não disponível neste navegador')
      return
    }
    setIsChecking(true)
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.update()
      // Aguarda para ver se um novo SW foi encontrado/instalado
      await new Promise<void>((res) => setTimeout(res, 1500))
      if (!reg.waiting && !reg.installing) {
        toast.success('App já está na versão mais recente!')
      }
      // Se reg.waiting ou reg.installing, o fluxo automático (main.tsx) assume
    } catch {
      toast.error('Erro ao verificar atualização')
    } finally {
      setIsChecking(false)
    }
  }, [])

  const clearAllCaches = useCallback(async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
      toast.success('Cache limpo! Recarregando...')
      setTimeout(() => window.location.reload(), 800)
    } catch {
      toast.error('Erro ao limpar cache')
    }
  }, [])

  return { isChecking, checkForUpdate, clearAllCaches }
}
