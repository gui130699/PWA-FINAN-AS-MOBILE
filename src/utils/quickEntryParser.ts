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

// ─── Número por extenso (pt-BR) ─────────────────────────────────────────────

/** Mapeamento palavra normalizada → valor numérico. */
const PT_WORDS: Record<string, number> = {
  zero: 0,
  um: 1, uma: 1,
  dois: 2, duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14, catorze: 14,
  quinze: 15,
  dezesseis: 16, dezasseis: 16,
  dezessete: 17, dezassete: 17,
  dezoito: 18,
  dezenove: 19, dezanove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100, cento: 100,
  duzentos: 200, duzentas: 200,
  trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400,
  quinhentos: 500, quinhentas: 500,
  seiscentos: 600, seiscentas: 600,
  setecentos: 700, setecentas: 700,
  oitocentos: 800, oitocentas: 800,
  novecentos: 900, novecentas: 900,
  mil: 1000,
}

/** Retorna true se o token for uma palavra numérica reconhecida. */
function isNumberWord(tok: string): boolean {
  return Object.prototype.hasOwnProperty.call(PT_WORDS, tok)
}

/**
 * Converte uma lista de tokens numéricos (+ conectores "e") em número.
 * Ex: ['vinte', 'e', 'dois'] → 22
 * Ex: ['mil', 'e', 'duzentos'] → 1200
 * 'mil' é tratado multiplicativamente: acumula o chunk anterior × 1000.
 */
function tokensToNumber(toks: string[]): number {
  let total = 0
  let chunk = 0
  for (const tok of toks) {
    if (tok === 'e') continue
    if (tok === 'mil') {
      total += (chunk || 1) * 1000
      chunk = 0
    } else if (isNumberWord(tok)) {
      chunk += PT_WORDS[tok]
    }
  }
  return total + chunk
}

/**
 * Encontra todas as sequências de palavras numéricas em um array de tokens.
 * Ignora tokens cujos índices estejam em dateIndices (contexto de data).
 * Uma sequência cresce enquanto há palavras numéricas diretamente consecutivas
 * ou conectadas por "e".
 */
function findNumberWordSequences(
  tokens: string[],
  dateIndices: Set<number>,
): Array<{ tokens: string[]; startIdx: number; endIdx: number }> {
  const sequences: Array<{ tokens: string[]; startIdx: number; endIdx: number }> = []
  let i = 0
  while (i < tokens.length) {
    if (!dateIndices.has(i) && isNumberWord(tokens[i])) {
      const startIdx = i
      const seqTokens: string[] = [tokens[i]]
      let j = i + 1
      while (j < tokens.length) {
        const tok = tokens[j]
        // "e" seguido de palavra numérica → continua
        if (
          tok === 'e' &&
          j + 1 < tokens.length &&
          !dateIndices.has(j + 1) &&
          isNumberWord(tokens[j + 1])
        ) {
          seqTokens.push('e')
          seqTokens.push(tokens[j + 1])
          j += 2
        } else if (!dateIndices.has(j) && isNumberWord(tok)) {
          // Palavra numérica diretamente consecutiva (ex: "dois mil")
          seqTokens.push(tok)
          j++
        } else {
          break
        }
      }
      sequences.push({ tokens: seqTokens, startIdx, endIdx: j - 1 })
      i = j
    } else {
      i++
    }
  }
  return sequences
}

/**
 * Interpreta números escritos por extenso em português brasileiro.
 *
 * Suporta:
 * - Inteiros: "vinte e dois" → 22, "cento e vinte" → 120
 * - Milhares: "dois mil e trezentos" → 2300
 * - Decimais via vírgula: "trinta e oito vírgula noventa" → 38.90
 * - Decimais via centavos: "quarenta e dois reais e cinquenta centavos" → 42.50
 * - Decimais via "com": "quarenta e dois com cinquenta" → 42.50
 * - Evita confundir "dia vinte e cinco" com valor monetário
 *
 * Retorna null se nenhum número por extenso for encontrado.
 */
export function parsePortugueseNumberWordsToNumber(text: string): number | null {
  const norm = normalize(text)
  const tokens = norm.split(/\s+/).filter(Boolean)

  // Marcar índices pertencentes a contextos de data (após "dia")
  const dateIndices = new Set<number>()
  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i] === 'dia') {
      let j = i + 1
      while (j < tokens.length && (isNumberWord(tokens[j]) || tokens[j] === 'e')) {
        dateIndices.add(j)
        j++
      }
    }
  }

  const sequences = findNumberWordSequences(tokens, dateIndices)
  if (!sequences.length) return null

  // Ignorar "um/uma" isolado — na maioria dos contextos é artigo indefinido
  if (
    sequences.length === 1 &&
    sequences[0].tokens.length === 1 &&
    (sequences[0].tokens[0] === 'um' || sequences[0].tokens[0] === 'uma')
  ) {
    return null
  }

  // Caso: apenas uma sequência → verificar centavos isolados
  if (sequences.length === 1) {
    const toksAfter = tokens.slice(sequences[0].endIdx + 1)
    if (toksAfter.length > 0 && (toksAfter[0] === 'centavos' || toksAfter[0] === 'centavo')) {
      // Valor inteiramente em centavos (ex: "cinquenta centavos" = 0.50)
      return parseFloat((tokensToNumber(sequences[0].tokens) / 100).toFixed(2))
    }
    return tokensToNumber(sequences[0].tokens)
  }

  // Caso: duas ou mais sequências → detectar separador decimal entre as duas primeiras
  const toksBetween = tokens.slice(sequences[0].endIdx + 1, sequences[1].startIdx)
  const toksAfterSecond = tokens.slice(sequences[1].endIdx + 1)

  // "vírgula/virgula" como único token entre as sequências
  const isVirgula = toksBetween.length === 1 && toksBetween[0] === 'virgula'
  // "com" como único token entre as sequências
  const isCom = toksBetween.length === 1 && toksBetween[0] === 'com'
  // "centavos/centavo" logo após a segunda sequência
  const isCentavos =
    toksAfterSecond.length > 0 &&
    (toksAfterSecond[0] === 'centavos' || toksAfterSecond[0] === 'centavo')

  if (isVirgula || isCom || isCentavos) {
    const intPart = tokensToNumber(sequences[0].tokens)
    const decRaw = tokensToNumber(sequences[1].tokens)
    // Para centavos: sempre /100 | Para vírgula/com: 1-9 → /10; 10-99 → /100
    const decPart = isCentavos || decRaw >= 10 ? decRaw / 100 : decRaw / 10
    return parseFloat((intPart + decPart).toFixed(2))
  }

  // Sem separador decimal → retorna o valor da primeira sequência não-data
  return tokensToNumber(sequences[0].tokens)
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

  // Tenta valor numérico primeiro; se não encontrar, tenta número por extenso
  const parsedValue = extractValue(rawText) ?? parsePortugueseNumberWordsToNumber(rawText)
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
