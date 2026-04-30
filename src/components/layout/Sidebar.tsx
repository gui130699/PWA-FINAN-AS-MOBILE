import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Receipt,
  RefreshCw,
  CreditCard,
  Tag,
  LogOut,
  Sun,
  Moon,
  TrendingDown,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { InstallPWABannerSidebar } from './InstallPWABanner'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: Receipt, label: 'Lançamentos' },
  { to: '/fixed', icon: RefreshCw, label: 'Contas Fixas' },
  { to: '/installments', icon: CreditCard, label: 'Parceladas' },
  { to: '/categories', icon: Tag, label: 'Categorias' },
]

export function Sidebar() {
  const { logout, user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed left-0 top-0 bottom-0 z-30">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-sm">Controle</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Financeiro</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <InstallPWABannerSidebar />

      <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1">
        <div className="px-4 py-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
        </div>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  )
}
