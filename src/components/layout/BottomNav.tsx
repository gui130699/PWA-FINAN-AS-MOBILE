import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Receipt, RefreshCw, CreditCard, Tag } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Início' },
  { to: '/transactions', icon: Receipt, label: 'Lançar' },
  { to: '/fixed', icon: RefreshCw, label: 'Fixas' },
  { to: '/installments', icon: CreditCard, label: 'Parcelas' },
  { to: '/categories', icon: Tag, label: 'Categorias' },
]

export function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe">
      <div className="flex items-stretch">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-500'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
