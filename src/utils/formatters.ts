export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

export function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  const num = parseInt(digits, 10) / 100
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function parseDateInput(ddmmyyyy: string): string {
  const digits = ddmmyyyy.replace(/\D/g, '')
  if (digits.length < 8) return ''
  return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`
}

export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('pt-BR', { month: 'long' })
}

export function currentMonthYear(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

export function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1 + months, d)
  const yr = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const dy = String(date.getDate()).padStart(2, '0')
  return `${yr}-${mo}-${dy}`
}

export function getMonthYear(dateStr: string): { month: number; year: number } {
  const [y, m] = dateStr.split('-').map(Number)
  return { month: m, year: y }
}
