import { Sun, Moon, TrendingDown } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useLocation } from 'react-router-dom'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Lançamentos',
  '/fixed': 'Contas Fixas',
  '/installments': 'Parceladas',
  '/categories': 'Categorias',
}

export function TopBar() {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const title = titles[location.pathname] ?? 'Controle Financeiro'

  return (
    <header className="lg:hidden sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
          <TrendingDown className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-slate-900 dark:text-white text-sm">{title}</span>
      </div>
      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5 text-slate-600 dark:text-slate-300" /> : <Moon className="w-5 h-5 text-slate-600" />}
      </button>
    </header>
  )
}
