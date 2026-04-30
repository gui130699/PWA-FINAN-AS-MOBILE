export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className="flex items-center justify-center p-8">
      <svg className={`${s[size]} animate-spin text-indigo-600`} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60dvh]">
      <LoadingSpinner size="lg" />
    </div>
  )
}

export function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="text-slate-300 dark:text-slate-600">{icon}</div>
      <p className="text-slate-600 dark:text-slate-400 font-medium">{title}</p>
      {description && <p className="text-slate-400 dark:text-slate-500 text-sm max-w-xs">{description}</p>}
    </div>
  )
}

import React from 'react'
