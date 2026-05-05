import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from './formatters'

export interface PdfRowDetalhado {
  chargeDate: string
  launchDate: string
  description: string
  categoryName: string
  nature: string
  status: string
  type: string
  value: number
}

export interface PdfRowResumido {
  period: string
  incTotal: number
  expTotal: number
  balance: number
  paid: number
  pending: number
}

function todayBR(): string {
  return new Date().toLocaleDateString('pt-BR')
}

export function exportDetalhadoToPdf(
  rows: PdfRowDetalhado[],
  startDate: string,
  endDate: string,
  filename: string
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatório Financeiro — Detalhado', 14, 18)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Período: ${formatDate(startDate)} a ${formatDate(endDate)}    Emitido em: ${todayBR()}`,
    14,
    25
  )

  const totalInc = rows.filter((r) => r.nature === 'Receita').reduce((s, r) => s + r.value, 0)
  const totalExp = rows.filter((r) => r.nature === 'Despesa').reduce((s, r) => s + r.value, 0)
  const saldo = totalInc - totalExp

  autoTable(doc, {
    startY: 30,
    head: [['Vencimento', 'Lançamento', 'Descrição', 'Categoria', 'Tipo', 'Status', 'Modalidade', 'Valor']],
    body: rows.map((r) => [
      formatDate(r.chargeDate),
      formatDate(r.launchDate),
      r.description,
      r.categoryName,
      r.nature,
      r.status,
      r.type,
      formatCurrency(r.value),
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: { 7: { halign: 'right' } },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo:', 14, finalY)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total Receitas: ${formatCurrency(totalInc)}`, 14, finalY + 5)
  doc.text(`Total Despesas: ${formatCurrency(totalExp)}`, 14, finalY + 10)
  doc.text(`Saldo Final: ${formatCurrency(saldo)}`, 14, finalY + 15)

  doc.save(filename)
}

export function exportResumidoToPdf(
  rows: PdfRowResumido[],
  startDate: string,
  endDate: string,
  filename: string
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatório Financeiro — Resumido', 14, 18)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Período: ${formatDate(startDate)} a ${formatDate(endDate)}    Emitido em: ${todayBR()}`,
    14,
    25
  )

  autoTable(doc, {
    startY: 30,
    head: [['Mês/Ano', 'Receitas', 'Despesas', 'Saldo', 'Pago/Recebido', 'Pendente']],
    body: rows.map((r) => [
      r.period,
      formatCurrency(r.incTotal),
      formatCurrency(r.expTotal),
      formatCurrency(r.balance),
      formatCurrency(r.paid),
      formatCurrency(r.pending),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
  })

  const totalInc = rows.reduce((s, r) => s + r.incTotal, 0)
  const totalExp = rows.reduce((s, r) => s + r.expTotal, 0)
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Totais do período:', 14, finalY)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total Receitas: ${formatCurrency(totalInc)}`, 14, finalY + 5)
  doc.text(`Total Despesas: ${formatCurrency(totalExp)}`, 14, finalY + 10)
  doc.text(`Saldo Final: ${formatCurrency(totalInc - totalExp)}`, 14, finalY + 15)

  doc.save(filename)
}
