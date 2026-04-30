import { monthName } from '../../utils/formatters'

interface MonthSelectorProps {
  month: number
  year: number
  onChange: (month: number, year: number) => void
}

export function MonthSelector({ month, year, onChange }: MonthSelectorProps) {
  const prev = () => {
    if (month === 1) onChange(12, year - 1)
    else onChange(month - 1, year)
  }
  const next = () => {
    if (month === 12) onChange(1, year + 1)
    else onChange(month + 1, year)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={prev}
        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
      >
        ‹
      </button>
      <span className="font-semibold text-slate-800 dark:text-slate-200 min-w-[140px] text-center capitalize">
        {monthName(month)} {year}
      </span>
      <button
        onClick={next}
        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
      >
        ›
      </button>
    </div>
  )
}
