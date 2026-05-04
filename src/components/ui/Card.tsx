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
    <div className={`rounded-2xl p-2.5 sm:p-3 text-white ${color} shadow-sm`}>
      <div className="flex items-start justify-between gap-1 mb-1 sm:mb-1.5">
        <span className="text-[10px] sm:text-xs font-medium opacity-90 leading-tight">{label}</span>
        <div className="p-1 sm:p-1.5 bg-white/20 rounded-lg shrink-0 mt-0.5">{icon}</div>
      </div>
      <p className="text-sm sm:text-base font-bold leading-tight truncate">{value}</p>
      {sub && <p className="text-[10px] opacity-80 mt-0.5">{sub}</p>}
    </div>
  )
}
