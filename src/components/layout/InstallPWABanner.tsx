import { Download, X, TrendingDown } from 'lucide-react'
import { useInstallPWA } from '../../contexts/InstallPWAContext'

/**
 * Banner mobile: flutuante acima do BottomNav
 * Sidebar desktop: card no rodapé lateral
 */

export function InstallPWABannerMobile() {
  const { canInstall, install, dismiss } = useInstallPWA()

  if (!canInstall) return null

  return (
    <div className="lg:hidden fixed bottom-16 left-3 right-3 z-40 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-900/30 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <TrendingDown className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Instalar o app</p>
          <p className="text-indigo-200 text-xs">Acesso rápido na tela inicial</p>
        </div>
        <button
          onClick={install}
          className="flex items-center gap-1.5 bg-white text-indigo-600 font-semibold text-xs px-3 py-2 rounded-xl hover:bg-indigo-50 transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Instalar
        </button>
        <button
          onClick={dismiss}
          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function InstallPWABannerSidebar() {
  const { canInstall, install, dismiss } = useInstallPWA()

  if (!canInstall) return null

  return (
    <div className="mx-3 mb-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <TrendingDown className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Instalar o app</p>
            <p className="text-[10px] text-indigo-500 dark:text-indigo-400">Acesso rápido na tela inicial</p>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="p-0.5 rounded-md text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        onClick={install}
        className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Instalar agora
      </button>
    </div>
  )
}
