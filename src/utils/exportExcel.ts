import * as XLSX from 'xlsx'
import { formatCurrency, formatDate } from './formatters'

export interface ExcelRowDetalhado {
  'Data Vencimento': string
  'Data Lançamento': string
  Descrição: string
  Categoria: string
  Tipo: string
  Status: string
  'Tipo Lançamento': string
  'Valor (R$)': string
}

export interface ExcelRowResumido {
  'Mês/Ano': string
  'Total Receitas': string
  'Total Despesas': string
  Saldo: string
  'Total Pago/Recebido': string
  'Total Pendente': string
}

export function exportDetalhadoToExcel(
  rows: ExcelRowDetalhado[],
  filename: string
): void {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Detalhado')
  XLSX.writeFile(wb, filename)
}

export function exportResumidoToExcel(
  rows: ExcelRowResumido[],
  filename: string
): void {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Resumido')
  XLSX.writeFile(wb, filename)
}

export { formatCurrency, formatDate }
