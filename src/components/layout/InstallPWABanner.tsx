import { Download, X, TrendingDown, Share, Monitor } from 'lucide-react'
import { useInstallPWA } from '../../contexts/InstallPWAContext'

// Conteúdo do banner conforme plataforma
function BannerContent({ onInstall, onDismiss, canPrompt, platform }: {
  onInstall: () => void
  onDismiss: () => void
  canPrompt: boolean
  platform: string
}) {
  if (platform === 'ios') {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 text-white" />
            </div>
            <p className="text-white font-semibold text-sm">Instalar no iPhone/iPad</p>
          </div>
          <button onClick={onDismiss} className="p-1 text-slate-400 hover:text-white shrink-0" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
            <span>Toque em <Share className="w-3.5 h-3.5 inline text-indigo-400" /> <strong className="text-white">Compartilhar</strong> no Safari</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
            <span>Selecione <strong className="text-white">"Adicionar à Tela de Início"</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
            <span>Toque em <strong className="text-white">Adicionar</strong></span>
          </div>
        </div>
      </div>
    )
  }

  if (canPrompt) {
    return (
      <div className="bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-900/30 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <TrendingDown className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Instalar o app</p>
          <p className="text-indigo-200 text-xs">Acesso rápido na tela inicial</p>
        </div>
        <button
          onClick={onInstall}
          className="flex items-center gap-1.5 bg-white text-indigo-600 font-semibold text-xs px-3 py-2 rounded-xl hover:bg-indigo-50 transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Instalar
        </button>
        <button onClick={onDismiss} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0" aria-label="Fechar">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // Desktop ou Android sem prompt nativo — instrução genérica
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
        <Monitor className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm">Instalar como app</p>
        <p className="text-slate-400 text-xs">No Chrome: menu ⋮ → "Instalar aplicativo"</p>
      </div>
      <button onClick={onDismiss} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0" aria-label="Fechar">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function InstallPWABannerMobile() {
  const { showInstallUI, canPrompt, platform, install, dismiss } = useInstallPWA()

  if (!showInstallUI) return null

  return (
    <div className="lg:hidden fixed bottom-16 left-3 right-3 z-40">
      <BannerContent onInstall={install} onDismiss={dismiss} canPrompt={canPrompt} platform={platform} />
    </div>
  )
}

export function InstallPWABannerSidebar() {
  const { showInstallUI, canPrompt, platform, install, dismiss } = useInstallPWA()

  if (!showInstallUI) return null

  if (platform === 'ios') {
    return (
      <div className="mx-3 mb-2 p-3 rounded-xl bg-slate-800 border border-slate-700">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-xs font-semibold text-white">Instalar no iPhone/iPad</p>
          <button onClick={dismiss} className="p-0.5 text-slate-400 hover:text-white" aria-label="Fechar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex flex-col gap-1.5 text-[10px] text-slate-400">
          <span>1. Toque em <Share className="w-3 h-3 inline text-indigo-400" /> Compartilhar</span>
          <span>2. "Adicionar à Tela de Início"</span>
          <span>3. Toque em Adicionar</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-3 mb-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <TrendingDown className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Instalar o app</p>
            <p className="text-[10px] text-indigo-500 dark:text-indigo-400">
              {canPrompt ? 'Acesso rápido na tela inicial' : 'Menu ⋮ → Instalar aplicativo'}
            </p>
          </div>
        </div>
        <button onClick={dismiss} className="p-0.5 rounded-md text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors" aria-label="Fechar">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {canPrompt && (
        <button
          onClick={install}
          className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Instalar agora
        </button>
      )}
    </div>
  )
}
