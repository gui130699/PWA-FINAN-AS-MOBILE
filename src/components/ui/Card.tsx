import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  sub?: string
}

export function StatCard({ label, value, icon, color, sub }: StatCardProps) {
  return (
    <div className={`rounded-2xl p-3 sm:p-4 text-white ${color} shadow-sm`}>
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <span className="text-xs sm:text-sm font-medium opacity-90 leading-tight">{label}</span>
        <div className="p-1.5 sm:p-2 bg-white/20 rounded-xl shrink-0">{icon}</div>
      </div>
      <p className="text-lg sm:text-2xl font-bold leading-tight truncate">{value}</p>
      {sub && <p className="text-xs opacity-80 mt-1">{sub}</p>}
    </div>
  )
}
