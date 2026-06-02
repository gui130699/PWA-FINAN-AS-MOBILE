/**
 * quickEntryParser.ts — Interpreta frases em linguagem natural para extrair
 * dados de lançamentos financeiros.
 *
 * Funciona 100% offline, sem API externa.
 */

import type { Category, TransactionNature } from '../types'
import { todayISO } from './formatters'
import { makeDateSafe } from './dateUtils'

export interface ParsedQuickEntry {
  rawText: string
  parsedValue: number | null
  parsedPlace: string | null
  parsedDescription: string | null
  parsedDate: string | null
  transactionNature: TransactionNature
  suggestedCategoryId: string | null
  suggestedCategoryName: string | null
  confidence: number
  missingFields: string[]
}

// ─── Listas de palavras-chave ────────────────────────────────────────────────

const EXPENSE_KEYWORDS = [
  'gastei', 'gasto', 'gasta', 'paguei', 'pago', 'paga', 'comprei', 'compra',
  'deu', 'custou', 'anota', 'saiu', 'saída',
  'mercado', 'supermercado', 'farmácia', 'farmacia', 'uber', 'ifood',
  'iFood', 'posto', 'gasolina', 'combustível', 'combustivel', 'prestação',
  'prestacao', 'conta', 'boleto', 'aluguel',
]

const INCOME_KEYWORDS = [
  'recebi', 'recebido', 'ganhei', 'ganho', 'caiu', 'entrou', 'entrada',
  'salário', 'salario', 'comissão', 'comissao', 'pagamento recebido',
  'pix recebido', 'depósito', 'deposito', 'freelance', 'bonus', 'bônus',
  'reembolso',
]

// ─── Mapa de categorias sugeridas ────────────────────────────────────────────
// [keywords[], name parcial esperado (lowercase)]
const CATEGORY_KEYWORD_MAP: Array<{ keywords: string[]; match: string }> = [
  { keywords: ['mercado', 'supermercado', 'feira', 'hortifrutti', 'hortifruti'], match: 'mercado' },
  { keywords: ['ifood', 'rappi', 'lanche', 'pizza', 'hamburguer', 'hambúrguer', 'restaurante', 'almoço', 'almoco', 'jantar', 'refeição', 'refeicao', 'comida', 'pastel', 'sushi'], match: 'alimenta' },
  { keywords: ['uber', '99', 'taxi', 'táxi', 'ônibus', 'onibus', 'metrô', 'metro', 'transporte', 'combustível', 'combustivel', 'gasolina', 'posto'], match: 'transport' },
  { keywords: ['farmácia', 'farmacia', 'remédio', 'remedio', 'médico', 'medico', 'dentista', 'plano de saúde', 'hospital', 'exame'], match: 'saúde' },
  { keywords: ['internet', 'wifi', 'sky', 'claro', 'vivo', 'tim', 'net', 'telefone', 'celular', 'recarga'], match: 'telecom' },
  { keywords: ['luz', 'energia', 'água', 'agua', 'gás', 'gas', 'condomínio', 'condominio', 'conta de água', 'conta de luz'], match: 'utilidade' },
  { keywords: ['aluguel', 'iptu', 'moradia', 'imóvel', 'imovel'], match: 'moradia' },
  { keywords: ['netflix', 'spotify', 'amazon', 'disney', 'youtube', 'assinatura', 'streaming'], match: 'lazer' },
  { keywords: ['academia', 'pilates', 'musculação', 'musculacao', 'ginástica', 'ginastica'], match: 'saúde' },
  { keywords: ['escola', 'faculdade', 'curso', 'mensalidade', 'material escolar', 'livro'], match: 'educa' },
  { keywords: ['salário', 'salario', 'pagamento recebido', 'holerite'], match: 'salário' },
  { keywords: ['comissão', 'comissao', 'freelance', 'bico', 'renda extra', 'honorários', 'honorarios'], match: 'comis' },
]

// ─── Helpers internos ────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function extractValue(text: string): number | null {
  // Ex: "R$ 38,90", "38.90", "38,90", "25 reais", "R$120"
  const patterns = [
    /r\$\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
    /(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:reais|real|r\$)/i,
    /(\d{1,6}[.,]\d{2})(?!\d)/,
    /\b(\d{1,6})\b/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const raw = match[1].replace('.', '').replace(',', '.')
      const num = parseFloat(raw)
      if (!isNaN(num) && num > 0) return num
    }
  }
  return null
}

function detectNature(text: string): TransactionNature {
  const norm = normalize(text)
  for (const kw of INCOME_KEYWORDS) {
    if (norm.includes(normalize(kw))) return 'income'
  }
  for (const kw of EXPENSE_KEYWORDS) {
    if (norm.includes(normalize(kw))) return 'expense'
  }
  return 'expense'
}

function extractDate(text: string): { date: string | null; explicit: boolean } {
  const norm = normalize(text)
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  // "hoje"
  if (norm.includes('hoje')) return { date: todayISO(), explicit: true }

  // "ontem"
  if (norm.includes('ontem')) {
    const d = new Date(today)
    d.setDate(d.getDate() - 1)
    return {
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      explicit: true,
    }
  }

  // "amanha" / "amanhã"
  if (norm.includes('amanha')) {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    return {
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      explicit: true,
    }
  }

  // "dia 10"
  const diaMatch = norm.match(/\bdia\s+(\d{1,2})\b/)
  if (diaMatch) {
    const day = parseInt(diaMatch[1], 10)
    return { date: makeDateSafe(year, month, day), explicit: true }
  }

  // "10/06/2026" — DD/MM/YYYY
  const fullDateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
  if (fullDateMatch) {
    const d = parseInt(fullDateMatch[1], 10)
    const m = parseInt(fullDateMatch[2], 10)
    const y = parseInt(fullDateMatch[3], 10)
    return { date: makeDateSafe(y, m, d), explicit: true }
  }

  // "10/06" — DD/MM (ano atual)
  const shortDateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\b/)
  if (shortDateMatch) {
    const d = parseInt(shortDateMatch[1], 10)
    const m = parseInt(shortDateMatch[2], 10)
    return { date: makeDateSafe(year, m, d), explicit: true }
  }

  // Sem data explícita → hoje
  return { date: todayISO(), explicit: false }
}

function extractDescription(text: string): string | null {
  const norm = normalize(text)

  // Tentativa 1: após preposição "no", "na", "em", "de", "do", "da"
  const prepPatterns = [
    /\b(?:no|na|em|do|da)\s+([a-záàãâéèêíìîóòôõúùûç][a-záàãâéèêíìîóòôõúùûç\s]{1,30}?)(?:\s+(?:\d|hoje|ontem|amanhã?|dia|r\$|reais)|$)/i,
    /\b(?:de)\s+([a-záàãâéèêíìîóòôõúùûç][a-záàãâéèêíìîóòôõúùûç\s]{1,30}?)(?:\s+(?:\d|hoje|ontem|amanhã?|dia|r\$|reais)|$)/i,
  ]
  for (const p of prepPatterns) {
    const match = norm.match(p)
    if (match) {
      const desc = match[1].trim()
      if (desc.length > 1) return capitalize(desc)
    }
  }

  // Tentativa 2: palavras-chave conhecidas no texto
  const known = [
    'uber', 'ifood', 'mercado', 'supermercado', 'farmácia', 'farmacia',
    'internet', 'netflix', 'spotify', 'academia', 'aluguel', 'gasolina',
    'posto', 'restaurante', 'lanche',
  ]
  for (const kw of known) {
    if (norm.includes(normalize(kw))) return capitalize(kw)
  }

  // Tentativa 3: segunda palavra do texto (geralmente é o local)
  const words = text.trim().split(/\s+/)
  if (words.length >= 2) {
    const candidate = words[1]
    if (!/^\d/.test(candidate) && candidate.length > 2) return capitalize(candidate)
  }

  return null
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function suggestCategory(
  text: string,
  categories: Category[],
): { id: string | null; name: string | null } {
  if (!categories.length) return { id: null, name: null }
  const norm = normalize(text)

  for (const entry of CATEGORY_KEYWORD_MAP) {
    const hit = entry.keywords.some((kw) => norm.includes(normalize(kw)))
    if (hit) {
      // Procura por nome de categoria que contenha o match parcial
      const found = categories.find((c) =>
        normalize(c.name).includes(normalize(entry.match)),
      )
      if (found) return { id: found.id, name: found.name }
    }
  }
  return { id: null, name: null }
}

// ─── Função principal ────────────────────────────────────────────────────────

export function parseQuickEntryText(
  text: string,
  options?: {
    today?: string
    categories?: Category[]
  },
): ParsedQuickEntry {
  const rawText = text.trim()
  const categories = options?.categories ?? []

  const parsedValue = extractValue(rawText)
  const nature = detectNature(rawText)
  const { date: parsedDate, explicit: dateExplicit } = extractDate(rawText)
  const parsedDescription = extractDescription(rawText)
  const { id: suggestedCategoryId, name: suggestedCategoryName } = suggestCategory(
    rawText,
    categories,
  )

  // Extrair "place" como sinônimo de description neste contexto
  const parsedPlace = parsedDescription

  // Calcular confiança
  let confidence = 0.3
  if (parsedValue !== null) confidence += 0.3
  if (parsedDescription !== null) confidence += 0.2
  if (dateExplicit) confidence += 0.1
  if (suggestedCategoryId !== null) confidence += 0.1
  confidence = Math.min(1, confidence)

  // Campos faltantes
  const missingFields: string[] = []
  if (parsedValue === null) missingFields.push('value')
  if (parsedDescription === null) missingFields.push('description')
  if (suggestedCategoryId === null) missingFields.push('categoryId')

  return {
    rawText,
    parsedValue,
    parsedPlace,
    parsedDescription,
    parsedDate,
    transactionNature: nature,
    suggestedCategoryId,
    suggestedCategoryName,
    confidence,
    missingFields,
  }
}
