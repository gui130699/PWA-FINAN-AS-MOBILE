import { useRegisterSW } from 'virtual:pwa-register/react'

// Atualização automática silenciosa: quando nova versão disponível, recarrega a página sozinho.
export function PWAUpdateBanner() {
  useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Verifica atualização a cada 60s
        setInterval(() => {
          registration.update().catch(() => {})
        }, 60 * 1000)
      }
    },
    onNeedRefresh() {
      // Nova versão disponível: recarrega silenciosamente
      window.location.reload()
    },
  })

  return null
}
