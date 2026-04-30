import React, { createContext, useContext, useState, useEffect } from 'react'
import { getInstallPrompt, clearInstallPrompt } from '../main'

type Platform = 'android' | 'ios' | 'desktop' | 'installed'

interface InstallPWAContextValue {
  showInstallUI: boolean   // true = exibir banner (não instalado e não dispensado)
  canPrompt: boolean       // prompt nativo disponível (Chrome/Edge/Android)
  platform: Platform
  isDismissed: boolean
  install: () => Promise<boolean>  // true = prompt foi mostrado, false = não disponível
  dismiss: () => void
}

const InstallPWAContext = createContext<InstallPWAContextValue>({
  showInstallUI: false,
  canPrompt: false,
  platform: 'android',
  isDismissed: false,
  install: async () => false,
  dismiss: () => {},
})

const DISMISS_KEY = 'pwa-install-dismissed'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  if (standalone) return 'installed'
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
    return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

export function InstallPWAProvider({ children }: { children: React.ReactNode }) {
  const [platform] = useState<Platform>(detectPlatform)
  const [isDismissed, setIsDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [hasPrompt, setHasPrompt] = useState(!!getInstallPrompt())

  useEffect(() => {
    if (platform === 'installed') return

    // Prompt já pode estar capturado de antes do React montar
    if (getInstallPrompt()) setHasPrompt(true)

    const onReady = () => setHasPrompt(true)
    const onInstalled = () => {
      clearInstallPrompt()
      setHasPrompt(false)
      localStorage.removeItem(DISMISS_KEY)
    }

    window.addEventListener('pwa-install-ready', onReady)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('pwa-install-ready', onReady)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [platform])

  const install = async (): Promise<boolean> => {
    const prompt = getInstallPrompt()
    if (!prompt) return false
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      clearInstallPrompt()
      setHasPrompt(false)
    }
    return true
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setIsDismissed(true)
  }

  const showInstallUI = platform !== 'installed' && !isDismissed
  const canPrompt = hasPrompt && platform !== 'installed'

  return (
    <InstallPWAContext.Provider value={{ showInstallUI, canPrompt, platform, isDismissed, install, dismiss }}>
      {children}
    </InstallPWAContext.Provider>
  )
}

export function useInstallPWA() {
  return useContext(InstallPWAContext)
}
