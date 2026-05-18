import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, currentMonthYear } from './formatters'

describe('formatCurrency', () => {
  it('formata valor positivo', () => {
    expect(formatCurrency(1500)).toBe('R$\u00a01.500,00')
  })

  it('formata zero', () => {
    expect(formatCurrency(0)).toBe('R$\u00a00,00')
  })

  it('formata valor negativo', () => {
    const result = formatCurrency(-200)
    expect(result).toMatch(/-/)
  })
})

describe('formatDate', () => {
  it('formata data ISO para DD/MM/YYYY', () => {
    expect(formatDate('2025-06-15')).toBe('15/06/2025')
  })

  it('retorna string vazia para input vazio', () => {
    const result = formatDate('')
    expect(result).toBe('')
  })
})

describe('currentMonthYear', () => {
  it('retorna mês e ano atuais', () => {
    const now = new Date()
    const { month, year } = currentMonthYear()
    expect(month).toBe(now.getMonth() + 1)
    expect(year).toBe(now.getFullYear())
  })
})
