import { useRegisterSW } from 'virtual:pwa-register/react'

// Verifica novas versões periodicamente.
// O reload automático é feito em main.tsx via evento 'controllerchange'.
export function PWAUpdateBanner() {
  useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Verifica atualização a cada 30s
        setInterval(() => {
          registration.update().catch(() => {})
        }, 30 * 1000)
      }
    },
  })

  return null
}
