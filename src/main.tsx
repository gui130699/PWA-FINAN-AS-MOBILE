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
  // Dispara evento customizado para o contexto React capturar (se já montado)
  // Se React ainda não montou, o contexto vai checar getInstallPrompt() no useEffect
  window.dispatchEvent(new Event('pwa-install-ready'))
})

export function getInstallPrompt() { return _installPrompt }
export function clearInstallPrompt() { _installPrompt = null }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Quando novo service worker assumir o controle, exibe overlay e recarrega a página
if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    // Proteção contra loop: só recarrega se o último reload foi há mais de 3s
    const last = Number(sessionStorage.getItem('pwa-last-update') ?? 0)
    if (Date.now() - last < 3000) return
    refreshing = true
    sessionStorage.setItem('pwa-last-update', String(Date.now()))

    // Mostra overlay "Atualizando app..." antes de recarregar
    const style = document.createElement('style')
    style.textContent = '@keyframes _pwa_spin{to{transform:rotate(360deg)}}'
    document.head.appendChild(style)

    const overlay = document.createElement('div')
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(15,23,42,0.92);display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;z-index:9999;gap:14px;'
    overlay.innerHTML =
      '<div style="width:38px;height:38px;border:3px solid #6366f1;border-top-color:transparent;' +
      'border-radius:50%;animation:_pwa_spin 0.75s linear infinite"></div>' +
      '<p style="color:#a5b4fc;font-family:system-ui,sans-serif;font-size:15px;font-weight:500;margin:0">' +
      'Atualizando app...</p>'
    document.body.appendChild(overlay)

    // Pequeno delay para o overlay ser visível antes do reload
    setTimeout(() => window.location.reload(), 900)
  })
}
