import { WifiOff, RefreshCw } from 'lucide-react'

interface SyncStatusBannerProps {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
}

export function SyncStatusBanner({ isOnline, pendingCount, isSyncing }: SyncStatusBannerProps) {
  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 text-xs font-medium leading-tight">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        <span>
          Você está offline. Pode continuar lançando; os dados serão sincronizados quando a
          internet voltar.
        </span>
      </div>
    )
  }

  if (isSyncing || pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-medium leading-tight">
        <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>
          {isSyncing
            ? 'Sincronizando alterações pendentes...'
            : `${pendingCount} alteração(ões) pendente(s) de sincronização`}
        </span>
      </div>
    )
  }

  return null
}
