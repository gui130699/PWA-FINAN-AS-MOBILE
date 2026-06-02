import { describe, it, expect } from 'vitest'
import { parseQuickEntryText, parsePortugueseNumberWordsToNumber } from './quickEntryParser'

// Categorias mockadas para sugestão
const mockCategories = [
  { id: 'cat1', name: 'Alimentação', color: '#f59e0b', type: 'expense' as const, createdAt: null as never, updatedAt: null as never },
  { id: 'cat2', name: 'Mercado', color: '#10b981', type: 'expense' as const, createdAt: null as never, updatedAt: null as never },
  { id: 'cat3', name: 'Transporte', color: '#3b82f6', type: 'expense' as const, createdAt: null as never, updatedAt: null as never },
  { id: 'cat4', name: 'Saúde', color: '#ef4444', type: 'expense' as const, createdAt: null as never, updatedAt: null as never },
  { id: 'cat5', name: 'Salário', color: '#22c55e', type: 'income' as const, createdAt: null as never, updatedAt: null as never },
  { id: 'cat6', name: 'Comissão / Freelance', color: '#a78bfa', type: 'income' as const, createdAt: null as never, updatedAt: null as never },
]

describe('parseQuickEntryText', () => {
  it('gastei 38,90 no mercado hoje', () => {
    const result = parseQuickEntryText('gastei 38,90 no mercado hoje', { categories: mockCategories })
    expect(result.parsedValue).toBe(38.90)
    expect(result.transactionNature).toBe('expense')
    expect(result.parsedDescription).toBeTruthy()
    expect(result.parsedDate).toBeTruthy()
    expect(result.confidence).toBeGreaterThanOrEqual(0.6)
    expect(result.missingFields).not.toContain('value')
  })

  it('paguei 120 de internet', () => {
    const result = parseQuickEntryText('paguei 120 de internet', { categories: mockCategories })
    expect(result.parsedValue).toBe(120)
    expect(result.transactionNature).toBe('expense')
    expect(result.parsedDescription).toBe('Internet')
  })

  it('uber deu 22 reais', () => {
    const result = parseQuickEntryText('uber deu 22 reais', { categories: mockCategories })
    expect(result.parsedValue).toBe(22)
    expect(result.transactionNature).toBe('expense')
    expect(result.suggestedCategoryId).toBe('cat3') // Transporte
  })

  it('comprei lanche no ifood 42,50', () => {
    const result = parseQuickEntryText('comprei lanche no ifood 42,50', { categories: mockCategories })
    expect(result.parsedValue).toBe(42.50)
    expect(result.transactionNature).toBe('expense')
    expect(result.suggestedCategoryId).toBe('cat1') // Alimentação
  })

  it('recebi 500 de comissão', () => {
    const result = parseQuickEntryText('recebi 500 de comissão', { categories: mockCategories })
    expect(result.parsedValue).toBe(500)
    expect(result.transactionNature).toBe('income')
    expect(result.confidence).toBeGreaterThanOrEqual(0.6)
  })

  it('anota 80 da farmácia ontem', () => {
    const result = parseQuickEntryText('anota 80 da farmácia ontem', { categories: mockCategories })
    expect(result.parsedValue).toBe(80)
    expect(result.transactionNature).toBe('expense')
    expect(result.parsedDate).toBeTruthy()
    // data deve ser ontem
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const expectedDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    expect(result.parsedDate).toBe(expectedDate)
    expect(result.suggestedCategoryId).toBe('cat4') // Saúde
  })

  it('texto vazio não extrai valor', () => {
    const result = parseQuickEntryText('comprei uma coisa', { categories: mockCategories })
    expect(result.parsedValue).toBeNull()
    expect(result.missingFields).toContain('value')
  })

  it('confiança mínima sem valor nem descrição', () => {
    const result = parseQuickEntryText('comprei', { categories: mockCategories })
    expect(result.confidence).toBe(0.3)
  })

  it('confiança máxima com todos os campos', () => {
    const result = parseQuickEntryText('gastei 50 no mercado hoje', { categories: mockCategories })
    // valor + descrição + data + categoria = 0.3+0.3+0.2+0.1+0.1 = 1.0
    expect(result.confidence).toBe(1.0)
  })

  it('extrai data no formato DD/MM', () => {
    const result = parseQuickEntryText('paguei 100 em 10/06')
    expect(result.parsedDate).toMatch(/^\d{4}-06-10$/)
  })

  it('extrai data no formato DD/MM/YYYY', () => {
    const result = parseQuickEntryText('paguei 100 em 10/06/2026')
    expect(result.parsedDate).toBe('2026-06-10')
  })

  it('extrai "dia 15"', () => {
    const result = parseQuickEntryText('paguei boleto dia 15')
    expect(result.parsedDate).toMatch(/-15$/)
  })

  it('detecta receita', () => {
    const result = parseQuickEntryText('recebi 1500 de salário')
    expect(result.transactionNature).toBe('income')
  })

  it('padrão é despesa', () => {
    const result = parseQuickEntryText('lanche 25')
    expect(result.transactionNature).toBe('expense')
  })
})

// ─── Testes: parsePortugueseNumberWordsToNumber ───────────────────────────────

describe('parsePortugueseNumberWordsToNumber — função isolada', () => {
  it('zero', () => expect(parsePortugueseNumberWordsToNumber('zero')).toBe(0))
  it('vinte', () => expect(parsePortugueseNumberWordsToNumber('vinte')).toBe(20))
  it('trinta e oito', () => expect(parsePortugueseNumberWordsToNumber('trinta e oito')).toBe(38))
  it('cento e vinte', () => expect(parsePortugueseNumberWordsToNumber('cento e vinte')).toBe(120))
  it('mil e duzentos', () => expect(parsePortugueseNumberWordsToNumber('mil e duzentos')).toBe(1200))
  it('dois mil e trezentos e vinte e dois', () =>
    expect(parsePortugueseNumberWordsToNumber('dois mil e trezentos e vinte e dois')).toBe(2322))
  it('trinta e oito vírgula noventa', () =>
    expect(parsePortugueseNumberWordsToNumber('trinta e oito vírgula noventa')).toBe(38.90))
  it('vinte e cinco virgula cinquenta', () =>
    expect(parsePortugueseNumberWordsToNumber('vinte e cinco virgula cinquenta')).toBe(25.50))
  it('quarenta e dois com cinquenta', () =>
    expect(parsePortugueseNumberWordsToNumber('quarenta e dois com cinquenta')).toBe(42.50))
  it('cinquenta centavos', () =>
    expect(parsePortugueseNumberWordsToNumber('cinquenta centavos')).toBe(0.50))
  it('trinta reais e cinquenta centavos', () =>
    expect(parsePortugueseNumberWordsToNumber('trinta reais e cinquenta centavos')).toBe(30.50))
  it('quarenta e dois reais e cinquenta centavos', () =>
    expect(parsePortugueseNumberWordsToNumber('quarenta e dois reais e cinquenta centavos')).toBe(42.50))
  it('dia vinte e cinco paguei trinta → 30', () =>
    expect(parsePortugueseNumberWordsToNumber('dia vinte e cinco paguei trinta')).toBe(30))
  it('um isolado retorna null (artigo)', () =>
    expect(parsePortugueseNumberWordsToNumber('comprei uma coisa')).toBeNull())
  it('sem número retorna null', () =>
    expect(parsePortugueseNumberWordsToNumber('fui ao mercado hoje')).toBeNull())
})

// ─── Testes: números por extenso integrados ao parseQuickEntryText ───────────

describe('parseQuickEntryText — números por extenso', () => {
  it('gastei vinte reais no mercado', () => {
    const result = parseQuickEntryText('gastei vinte reais no mercado', { categories: mockCategories })
    expect(result.parsedValue).toBe(20)
    expect(result.transactionNature).toBe('expense')
    expect(result.missingFields).not.toContain('value')
    expect(result.confidence).toBeGreaterThanOrEqual(0.6)
  })

  it('gastei trinta e oito reais no mercado', () => {
    const result = parseQuickEntryText('gastei trinta e oito reais no mercado', { categories: mockCategories })
    expect(result.parsedValue).toBe(38)
    expect(result.transactionNature).toBe('expense')
    expect(result.missingFields).not.toContain('value')
  })

  it('paguei cento e vinte de internet', () => {
    const result = parseQuickEntryText('paguei cento e vinte de internet', { categories: mockCategories })
    expect(result.parsedValue).toBe(120)
    expect(result.transactionNature).toBe('expense')
  })

  it('uber deu vinte e dois reais', () => {
    const result = parseQuickEntryText('uber deu vinte e dois reais', { categories: mockCategories })
    expect(result.parsedValue).toBe(22)
    expect(result.transactionNature).toBe('expense')
    expect(result.suggestedCategoryId).toBe('cat3') // Transporte
  })

  it('comprei lanche no ifood por quarenta e dois reais e cinquenta centavos', () => {
    const result = parseQuickEntryText(
      'comprei lanche no ifood por quarenta e dois reais e cinquenta centavos',
      { categories: mockCategories },
    )
    expect(result.parsedValue).toBe(42.50)
    expect(result.transactionNature).toBe('expense')
  })

  it('gastei trinta e oito vírgula noventa no mercado', () => {
    const result = parseQuickEntryText('gastei trinta e oito vírgula noventa no mercado', { categories: mockCategories })
    expect(result.parsedValue).toBe(38.90)
    expect(result.transactionNature).toBe('expense')
  })

  it('recebi mil e duzentos reais de comissão', () => {
    const result = parseQuickEntryText('recebi mil e duzentos reais de comissão', { categories: mockCategories })
    expect(result.parsedValue).toBe(1200)
    expect(result.transactionNature).toBe('income')
  })

  it('gastei onze e noventa e nove no mercado hoje', () => {
    const result = parseQuickEntryText('gastei onze e noventa e nove no mercado hoje', { categories: mockCategories })
    expect(result.parsedValue).toBe(11.99)
    expect(result.transactionNature).toBe('expense')
    expect(result.missingFields).not.toContain('value')
  })

  it('anota oitenta da farmácia ontem — por extenso', () => {
    const result = parseQuickEntryText('anota oitenta da farmácia ontem', { categories: mockCategories })
    expect(result.parsedValue).toBe(80)
    expect(result.transactionNature).toBe('expense')
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const expectedDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    expect(result.parsedDate).toBe(expectedDate)
    expect(result.suggestedCategoryId).toBe('cat4') // Saúde
  })

  it('dia vinte e cinco paguei trinta reais — não confunde dia com valor', () => {
    const result = parseQuickEntryText('dia vinte e cinco paguei trinta reais no mercado')
    expect(result.parsedValue).toBe(30)
  })
})
