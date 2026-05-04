import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from './Toast'

// Detecta novas versões do SW e força atualização automaticamente.
// O reload é disparado em main.tsx via evento 'controllerchange'.
export function PWAUpdateBanner() {
  const { updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // Verifica atualização a cada 60s
      setInterval(() => {
        registration.update().catch(() => {})
      }, 60_000)
    },
    onNeedRefresh() {
      toast.info('Nova versão disponível. Aplicando atualização...')
      updateServiceWorker(true)
    },
  })

  // Verifica atualização quando o usuário retorna à aba
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.ready
          .then((r) => r.update())
          .catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return null
}
