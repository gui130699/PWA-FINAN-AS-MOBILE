import React, { createContext, useContext, useState, useEffect } from 'react'
import { getInstallPrompt, clearInstallPrompt } from '../main'

interface InstallPWAContextValue {
  canInstall: boolean       // Chrome/Edge/Android — prompt nativo disponível
  isIOS: boolean            // iOS/Safari — precisa de instrução manual
  isInstalled: boolean      // já está rodando em standalone
  isDismissed: boolean
  install: () => Promise<void>
  dismiss: () => void
}

const InstallPWAContext = createContext<InstallPWAContextValue>({
  canInstall: false,
  isIOS: false,
  isInstalled: false,
  isDismissed: false,
  install: async () => {},
  dismiss: () => {},
})

function detectIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad Pro com iPadOS reporta como MacIntel mas tem touchpoints
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function InstallPWAProvider({ children }: { children: React.ReactNode }) {
  const [hasPrompt, setHasPrompt] = useState(!!getInstallPrompt())
  const [isInstalled, setIsInstalled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const isIOS = detectIOS()

  useEffect(() => {
    // Já instalado (modo standalone)?
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (standalone) { setIsInstalled(true); return }

    // O prompt pode já ter sido capturado antes do React montar
    if (getInstallPrompt()) setHasPrompt(true)

    // Caso o evento ainda não tenha disparado, aguarda via evento customizado
    const onReady = () => setHasPrompt(true)
    const onInstalled = () => { setIsInstalled(true); clearInstallPrompt(); setHasPrompt(false) }

    window.addEventListener('pwa-install-ready', onReady)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('pwa-install-ready', onReady)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    const prompt = getInstallPrompt()
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    clearInstallPrompt()
    setHasPrompt(false)
  }

  const dismiss = () => setIsDismissed(true)

  const canInstall = hasPrompt && !isInstalled && !isDismissed
  const showIOS = isIOS && !isInstalled && !isDismissed

  return (
    <InstallPWAContext.Provider value={{ canInstall, isIOS: showIOS, isInstalled, isDismissed, install, dismiss }}>
      {children}
    </InstallPWAContext.Provider>
  )
}

export function useInstallPWA() {
  return useContext(InstallPWAContext)
}
