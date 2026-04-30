import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'

export function PWAUpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Verifica atualização a cada 60s quando o app está aberto
      if (registration) {
        setInterval(() => {
          registration.update().catch(() => {})
        }, 60 * 1000)
      }
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-60 flex justify-center p-3 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 bg-indigo-600 text-white px-4 py-3 rounded-2xl shadow-xl shadow-indigo-900/40 max-w-sm w-full">
        <RefreshCw className="w-5 h-5 shrink-0 animate-spin" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Nova versão disponível</p>
          <p className="text-xs text-indigo-200 leading-tight">Atualize para ter as melhorias</p>
        </div>
        <button
          onClick={async () => {
            await updateServiceWorker(true)
            window.location.reload()
          }}
          className="shrink-0 bg-white text-indigo-600 font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          Atualizar
        </button>
      </div>
    </div>
  )
}
