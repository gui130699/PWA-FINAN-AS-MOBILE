import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  const styles = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-indigo-600 text-white',
  }
  const icons = {
    success: <CheckCircle className="w-5 h-5 shrink-0" />,
    error: <XCircle className="w-5 h-5 shrink-0" />,
    info: <Info className="w-5 h-5 shrink-0" />,
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg min-w-[280px] max-w-sm ${styles[type]}`}>
      {icons[type]}
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button onClick={onClose} className="p-1 hover:opacity-80">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Toast Container & Hook ──────────────────────────────────────────────────
let globalToast: ((msg: string, type: ToastType) => void) | null = null

export function ToastContainer() {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: ToastType }[]>([])

  useEffect(() => {
    globalToast = (message, type) => {
      const id = Date.now()
      setToasts((t) => [...t, { id, message, type }])
    }
    return () => { globalToast = null }
  }, [])

  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 sm:bottom-6 sm:right-6 sm:left-auto sm:translate-x-0 z-[100] flex flex-col gap-2 items-center sm:items-end">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
      ))}
    </div>
  )
}

export const toast = {
  success: (msg: string) => globalToast?.(msg, 'success'),
  error: (msg: string) => globalToast?.(msg, 'error'),
  info: (msg: string) => globalToast?.(msg, 'info'),
}
