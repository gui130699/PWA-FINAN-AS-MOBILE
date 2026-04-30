import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Captura beforeinstallprompt ANTES do React montar (evento dispara muito cedo)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let _installPrompt: BeforeInstallPromptEvent | null = null

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  _installPrompt = e as BeforeInstallPromptEvent
  // Dispara evento customizado para o contexto React capturar
  window.dispatchEvent(new Event('pwa-install-ready'))
})

export function getInstallPrompt() { return _installPrompt }
export function clearInstallPrompt() { _installPrompt = null }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
