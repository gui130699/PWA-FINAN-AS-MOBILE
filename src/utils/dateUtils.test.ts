import { describe, it, expect } from 'vitest'
import {
  daysInMonth,
  clampDayToMonth,
  makeDateSafe,
  addMonthsSafe,
} from './dateUtils'

describe('daysInMonth', () => {
  it('retorna 28 para fevereiro em ano não bissexto', () => {
    expect(daysInMonth(2025, 2)).toBe(28)
  })

  it('retorna 29 para fevereiro em ano bissexto', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
  })

  it('retorna 31 para janeiro', () => {
    expect(daysInMonth(2025, 1)).toBe(31)
  })

  it('retorna 30 para abril', () => {
    expect(daysInMonth(2025, 4)).toBe(30)
  })

  it('retorna 31 para dezembro', () => {
    expect(daysInMonth(2025, 12)).toBe(31)
  })
})

describe('clampDayToMonth', () => {
  it('clamp dia 31 para fevereiro → 28', () => {
    expect(clampDayToMonth(2025, 2, 31)).toBe(28)
  })

  it('clamp dia 31 para abril → 30', () => {
    expect(clampDayToMonth(2025, 4, 31)).toBe(30)
  })

  it('não altera dia válido', () => {
    expect(clampDayToMonth(2025, 3, 15)).toBe(15)
  })

  it('não altera último dia válido', () => {
    expect(clampDayToMonth(2025, 1, 31)).toBe(31)
  })
})

describe('makeDateSafe', () => {
  it('gera YYYY-MM-DD corretamente', () => {
    expect(makeDateSafe(2025, 3, 15)).toBe('2025-03-15')
  })

  it('clamp dia 31 de fevereiro', () => {
    expect(makeDateSafe(2025, 2, 31)).toBe('2025-02-28')
  })

  it('padeia mês e dia com zero', () => {
    expect(makeDateSafe(2025, 1, 5)).toBe('2025-01-05')
  })

  it('funciona para ano bissexto', () => {
    expect(makeDateSafe(2024, 2, 29)).toBe('2024-02-29')
  })
})

describe('addMonthsSafe', () => {
  it('adiciona 1 mês normalmente', () => {
    expect(addMonthsSafe('2025-01-15', 1)).toBe('2025-02-15')
  })

  it('adiciona 1 mês do dia 31 de janeiro → fevereiro clampado', () => {
    expect(addMonthsSafe('2025-01-31', 1)).toBe('2025-02-28')
  })

  it('adiciona meses cruzando ano', () => {
    expect(addMonthsSafe('2025-11-15', 2)).toBe('2026-01-15')
  })

  it('subtrai meses corretamente', () => {
    expect(addMonthsSafe('2025-03-31', -1)).toBe('2025-02-28')
  })

  it('subtrai meses cruzando ano', () => {
    expect(addMonthsSafe('2025-01-15', -2)).toBe('2024-11-15')
  })

  it('adiciona 12 meses equivale a +1 ano', () => {
    expect(addMonthsSafe('2025-06-15', 12)).toBe('2026-06-15')
  })
})
