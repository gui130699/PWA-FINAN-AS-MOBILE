import { describe, it, expect } from 'vitest'
import { buildCatTypeMap, getTransactionNature, getMonthSummary } from './dashboardInsights'
import type { Transaction, Category } from '../types'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const catIncome: Category = {
  id: 'cat-income',
  name: 'Salário',
  type: 'income',
  color: '#22c55e',
  createdAt: null as unknown as import('firebase/firestore').Timestamp,
  updatedAt: null as unknown as import('firebase/firestore').Timestamp,
}

const catExpense: Category = {
  id: 'cat-expense',
  name: 'Alimentação',
  type: 'expense',
  color: '#ef4444',
  createdAt: null as unknown as import('firebase/firestore').Timestamp,
  updatedAt: null as unknown as import('firebase/firestore').Timestamp,
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx1',
    uid: 'user1',
    description: 'Test',
    value: 100,
    chargeDate: '2025-06-15',
    status: 'pending',
    type: 'normal',
    categoryId: 'cat-expense',
    categoryName: 'Alimentação',
    launchDate: '2025-06-01',
    ...overrides,
  } as Transaction
}

// ─── buildCatTypeMap ──────────────────────────────────────────────────────────

describe('buildCatTypeMap', () => {
  it('cria mapa de id → type corretamente', () => {
    const map = buildCatTypeMap([catIncome, catExpense])
    expect(map.get('cat-income')).toBe('income')
    expect(map.get('cat-expense')).toBe('expense')
  })

  it('retorna mapa vazio para lista vazia', () => {
    expect(buildCatTypeMap([]).size).toBe(0)
  })
})

// ─── getTransactionNature ─────────────────────────────────────────────────────

describe('getTransactionNature', () => {
  const catMap = buildCatTypeMap([catIncome, catExpense])

  it('usa transactionNature explícito se presente', () => {
    const tx = makeTx({ transactionNature: 'income' })
    expect(getTransactionNature(tx, catMap)).toBe('income')
  })

  it('infere income via catTypeMap', () => {
    const tx = makeTx({ categoryId: 'cat-income', transactionNature: undefined })
    expect(getTransactionNature(tx, catMap)).toBe('income')
  })

  it('infere expense via catTypeMap', () => {
    const tx = makeTx({ categoryId: 'cat-expense', transactionNature: undefined })
    expect(getTransactionNature(tx, catMap)).toBe('expense')
  })

  it('retorna expense para categoria desconhecida', () => {
    const tx = makeTx({ categoryId: 'unknown', transactionNature: undefined })
    expect(getTransactionNature(tx, catMap)).toBe('expense')
  })
})

// ─── getMonthSummary ──────────────────────────────────────────────────────────

describe('getMonthSummary', () => {
  const catMap = buildCatTypeMap([catIncome, catExpense])

  it('calcula totais corretamente', () => {
    const txs: Transaction[] = [
      makeTx({ id: '1', categoryId: 'cat-income', value: 3000, status: 'paid' }),
      makeTx({ id: '2', categoryId: 'cat-expense', value: 1000, status: 'paid' }),
      makeTx({ id: '3', categoryId: 'cat-expense', value: 500, status: 'pending' }),
    ]
    const s = getMonthSummary(txs, catMap)

    expect(s.incTotal).toBe(3000)
    expect(s.incPaid).toBe(3000)
    expect(s.expTotal).toBe(1500)
    expect(s.expPaid).toBe(1000)
    expect(s.expPending).toBe(500)
    expect(s.saldoAtual).toBe(2000)   // incPaid - expPaid
    expect(s.saldoPrevisto).toBe(1500) // incTotal - expTotal
  })

  it('percentCompromised é 0 quando sem receitas', () => {
    const txs = [makeTx({ categoryId: 'cat-expense', value: 100 })]
    const s = getMonthSummary(txs, catMap)
    expect(s.percentCompromised).toBe(0)
  })

  it('calcula percentCompromised arredondado', () => {
    const txs = [
      makeTx({ id: '1', categoryId: 'cat-income', value: 1000, status: 'paid' }),
      makeTx({ id: '2', categoryId: 'cat-expense', value: 333, status: 'pending' }),
    ]
    const s = getMonthSummary(txs, catMap)
    expect(s.percentCompromised).toBe(33) // 333/1000 = 33.3% → 33
  })

  it('lista vazia retorna todos zeros', () => {
    const s = getMonthSummary([], catMap)
    expect(s.incTotal).toBe(0)
    expect(s.expTotal).toBe(0)
    expect(s.saldoAtual).toBe(0)
  })

  it('separa fixas e parceladas corretamente', () => {
    const txs = [
      makeTx({ id: '1', categoryId: 'cat-expense', value: 200, type: 'fixed' }),
      makeTx({ id: '2', categoryId: 'cat-expense', value: 150, type: 'installment' }),
      makeTx({ id: '3', categoryId: 'cat-expense', value: 100, type: 'normal' }),
    ]
    const s = getMonthSummary(txs, catMap)
    expect(s.expFixed).toBe(200)
    expect(s.expInst).toBe(150)
  })
})
