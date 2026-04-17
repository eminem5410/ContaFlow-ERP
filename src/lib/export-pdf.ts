import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrencyExact } from '@/lib/formatters'
import type { UserOptions, CellHookData, RowInput, CellInput } from 'jspdf-autotable'

// ── Shared types (mirrored from ReportsView.tsx) ───────────────────────

interface AccountEntry {
  code: string
  name: string
  balance: number
}

interface BalanceSheetData {
  asOf: string
  activos: AccountEntry[]
  pasivos: AccountEntry[]
  patrimonio: AccountEntry[]
  totalActivo: number
  totalPasivo: number
  totalPatrimonio: number
  totalPasivoPatrimonio: number
  balanced: boolean
}

interface IncomeStatementData {
  ingresos: AccountEntry[]
  costoVentas: AccountEntry[]
  egresos: AccountEntry[]
  totalIngresos: number
  totalCostoVentas: number
  totalEgresos: number
  resultadoNeto: number
}

interface JournalReportData {
  journalEntries: Array<{
    id: string
    number: number
    date: string
    description: string
    lines: Array<{
      id: string
      account: { code: string; name: string }
      debit: number
      credit: number
    }>
  }>
  period: { from: string | null; to: string | null }
}

interface LedgerData {
  account: { id: string; code: string; name: string; type: string }
  period: { from: string | null; to: string | null }
  lines: Array<{
    id: string
    date: string
    entryNumber: number
    entryDescription: string
    debit: number
    credit: number
    balance: number
  }>
  totalDebit: number
  totalCredit: number
  finalBalance: number
}

interface IVAEntry {
  date: string
  number: number
  description: string
  client: string | null
  netAmount: number
  taxAmount: number
  taxRate: number
  total: number
}

interface IVATotals {
  gravado21: number
  iva21: number
  gravado105: number
  iva105: number
  gravado27: number
  iva27: number
  exento: number
  noGravado: number
  total: number
}

interface IVAReportData {
  entries: IVAEntry[]
  totals: IVATotals
}

interface AuditLogExportEntry {
  createdAt: string
  userName: string
  userEmail: string
  action: string
  entity: string
  entityId: string | null
  details: string | null
}

// ── Color palette ──────────────────────────────────────────────────────

const C = {
  primary: [41, 55, 71] as const,
  accent: [15, 118, 110] as const,
  green: [4, 120, 87] as const,
  red: [185, 28, 28] as const,
  headerBg: [241, 245, 249] as const,
  border: [203, 213, 225] as const,
  textDark: [15, 23, 42] as const,
  textMid: [71, 85, 105] as const,
  white: [255, 255, 255] as const,
  lightGreen: [236, 253, 245] as const,
  lightRed: [254, 242, 242] as const,
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatDateEs(date: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

function todayFormatted(): string {
  return formatDateEs(new Date().toISOString())
}

function fmt(amount: number): string {
  return formatCurrencyExact(amount)
}

function addHeader(doc: jsPDF, title: string, subtitle?: string): void {
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.primary)
  doc.text('ContaFlow ERP', 40, 30)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.accent)
  doc.text(title, pageWidth - 40, 30, { align: 'right' })

  if (subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(...C.textMid)
    doc.text(subtitle, pageWidth - 40, 38, { align: 'right' })
  }

  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.5)
  doc.line(40, 44, pageWidth - 40, 44)

  doc.setFontSize(8)
  doc.setTextColor(...C.textMid)
  doc.text(`Generado: ${todayFormatted()}`, pageWidth - 40, 50, { align: 'right' })
}

function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...C.textMid)
    doc.text(
      `ContaFlow ERP  |  Pagina ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 20,
      { align: 'center' },
    )
  }
}

function makeTableOptions(): UserOptions {
  return {
    startY: 58,
    margin: { left: 40, right: 40 },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.25,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
  }
}

function getLastAutoTableFinalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 700
}

// ── Balance General ────────────────────────────────────────────────────

export function exportBalanceSheetToPDF(data: BalanceSheetData): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  addHeader(doc, 'Balance General', `Al ${formatDateEs(data.asOf)}`)

  const maxRows = Math.max(
    data.activos.length,
    data.pasivos.length + data.patrimonio.length,
  )

  const body: RowInput[] = []
  for (let i = 0; i < maxRows; i++) {
    const a = data.activos[i]
    const p = data.pasivos[i]
    const pat =
      i >= data.pasivos.length
        ? data.patrimonio[i - data.pasivos.length]
        : undefined

    body.push([
      a ? `${a.code} - ${a.name}` : '',
      a ? fmt(a.balance) : '',
      p ? `${p.code} - ${p.name}` : pat ? `${pat.code} - ${pat.name}` : '',
      p ? fmt(p.balance) : pat ? fmt(pat.balance) : '',
    ] as CellInput[])
  }

  body.push([
    'Total Activos',
    fmt(data.totalActivo),
    'Total Pas. + Patrim.',
    fmt(data.totalPasivoPatrimonio),
  ] as CellInput[])

  const totalIdx = body.length - 1

  autoTable(doc, {
    ...makeTableOptions(),
    head: [['ACTIVOS', '', 'PASIVOS Y PATRIMONIO', '']] as RowInput[],
    body,
    columnStyles: {
      0: { cellWidth: 160 },
      1: { cellWidth: 100, halign: 'right' },
      2: { cellWidth: 160 },
      3: { cellWidth: 100, halign: 'right' },
    },
    didParseCell: (hookData: CellHookData) => {
      if (hookData.row.index === totalIdx) {
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.textColor = [41, 55, 71]
      }
    },
    didDrawCell: (hookData: CellHookData) => {
      if (hookData.row.index === totalIdx) {
        const { x, y, width } = hookData.cell
        doc.setDrawColor(...C.primary)
        doc.setLineWidth(0.8)
        doc.line(x, y, x + width, y)
      }
    },
  })

  const finalY = getLastAutoTableFinalY(doc)
  const pageWidth = doc.internal.pageSize.getWidth()

  if (data.balanced) {
    doc.setFillColor(...C.lightGreen)
    doc.setDrawColor(...C.green)
    doc.roundedRect(40, finalY + 10, pageWidth - 80, 30, 4, 4, 'FD')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.green)
    doc.text(
      'Balance verificado: Activos = Pasivos + Patrimonio',
      pageWidth / 2,
      finalY + 30,
      { align: 'center' },
    )
  } else {
    doc.setFillColor(...C.lightRed)
    doc.setDrawColor(...C.red)
    doc.roundedRect(40, finalY + 10, pageWidth - 80, 30, 4, 4, 'FD')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.red)
    doc.text(
      'El balance no cuadra. Revisar los asientos.',
      pageWidth / 2,
      finalY + 30,
      { align: 'center' },
    )
  }

  addFooter(doc)
  doc.save('balance-general.pdf')
}

// ── Estado de Resultados ───────────────────────────────────────────────

export function exportIncomeStatementToPDF(data: IncomeStatementData): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  addHeader(doc, 'Estado de Resultados', 'Periodo actual')

  const costoVentas = data.totalCostoVentas || 0
  const gastos = data.totalEgresos || 0
  const resultadoBruto = data.totalIngresos - costoVentas

  // Build flat body: [label, amount]
  // Track row indices for styling via didParseCell
  const body: RowInput[] = []
  const sectionHeaders: number[] = []
  const incomeRows: number[] = []
  const expenseRows: number[] = []
  const totalRows: number[] = []
  const resultRows: number[] = []

  let pushRow = (label: string, amount: string, style: string) => {
    const idx = body.length
    if (style === 'section-green') sectionHeaders.push(idx)
    if (style === 'section-red') sectionHeaders.push(idx)
    if (style === 'income') incomeRows.push(idx)
    if (style === 'expense') expenseRows.push(idx)
    if (style === 'total') totalRows.push(idx)
    if (style === 'result') resultRows.push(idx)
    body.push([label, amount] as CellInput[])
  }

  // Ingresos
  pushRow('(+) Ingresos', '', 'section-green')
  for (const e of data.ingresos ?? []) {
    pushRow(`${e.code} - ${e.name}`, fmt(e.balance), 'income')
  }
  pushRow('Total Ingresos', fmt(data.totalIngresos), 'total')

  // Costo de ventas
  if (costoVentas > 0) {
    pushRow('(-) Costo de Ventas', '', 'section-red')
    for (const e of data.costoVentas ?? []) {
      pushRow(`${e.code} - ${e.name}`, fmt(e.balance), 'expense')
    }
    pushRow('Total Costo de Ventas', fmt(costoVentas), 'total')
  }

  // Resultado bruto
  pushRow('= Resultado Bruto', fmt(resultadoBruto), 'result')

  // Gastos
  if (gastos > 0) {
    pushRow('(-) Gastos', '', 'section-red')
    for (const e of data.egresos ?? []) {
      pushRow(`${e.code} - ${e.name}`, fmt(e.balance), 'expense')
    }
    pushRow('Total Gastos', fmt(gastos), 'total')
  }

  // Resultado neto
  pushRow('= Resultado Neto', fmt(data.resultadoNeto), 'result')
  const descLabel =
    data.resultadoNeto >= 0
      ? 'Ganancia del periodo'
      : 'Perdida del periodo'
  pushRow(descLabel, '', 'result')

  autoTable(doc, {
    ...makeTableOptions(),
    head: [['Cuenta', 'Importe']] as RowInput[],
    body,
    columnStyles: {
      0: { cellWidth: 320 },
      1: { cellWidth: 140, halign: 'right' },
    },
    didParseCell: (hookData: CellHookData) => {
      const idx = hookData.row.index
      const s = hookData.cell.styles

      if (sectionHeaders.includes(idx)) {
        const isGreen = hookData.row.raw[0] === '(+) Ingresos'
        s.fillColor = isGreen ? [...C.green] : [...C.red]
        s.textColor = [...C.white]
        s.fontStyle = 'bold'
        s.fontSize = 9
      }
      if (incomeRows.includes(idx)) {
        s.textColor = [...C.green]
      }
      if (expenseRows.includes(idx)) {
        s.textColor = [...C.red]
      }
      if (totalRows.includes(idx)) {
        s.fontStyle = 'bold'
        // Color the amount column based on context
        if (hookData.column.index === 1) {
          const rowText = (hookData.row.raw[0] as string) ?? ''
          if (rowText.includes('Ingresos')) s.textColor = [...C.green]
          else s.textColor = [...C.red]
        }
      }
      if (resultRows.includes(idx)) {
        s.fontStyle = 'bold'
        s.fontSize = 10
        const amount = hookData.row.raw[1] as string
        const numVal = parseFloat(amount?.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.') ?? '0')
        if (numVal >= 0) {
          s.fillColor = [...C.lightGreen]
          s.textColor = [...C.green]
        } else {
          s.fillColor = [...C.lightRed]
          s.textColor = [...C.red]
        }
      }
    },
  })

  addFooter(doc)
  doc.save('estado-de-resultados.pdf')
}

// ── Libro Diario ───────────────────────────────────────────────────────

export function exportJournalToPDF(
  data: JournalReportData,
  from?: string,
  to?: string,
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  let subtitle = ''
  if (from && to) subtitle = `Del ${formatDateEs(from)} al ${formatDateEs(to)}`
  else if (from) subtitle = `Desde ${formatDateEs(from)}`
  else if (to) subtitle = `Hasta ${formatDateEs(to)}`

  addHeader(doc, 'Libro Diario', subtitle)

  const body: RowInput[] = []
  const headerRowIndices: number[] = []

  for (const entry of data.journalEntries) {
    const headerIdx = body.length
    headerRowIndices.push(headerIdx)

    body.push([
      { content: `Asiento #${entry.number}  |  ${formatDateEs(entry.date)}  |  ${entry.description}`, styles: { fontStyle: 'bold', fontSize: 9 } },
      '',
      '',
      '',
    ] as CellInput[])

    for (const line of entry.lines) {
      body.push([
        '',
        `${line.account.code} - ${line.account.name}`,
        line.debit > 0 ? fmt(line.debit) : '',
        line.credit > 0 ? fmt(line.credit) : '',
      ] as CellInput[])
    }

    const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0)
    body.push([
      '',
      { content: 'Totales', styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt(totalDebit), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt(totalCredit), styles: { fontStyle: 'bold', halign: 'right' } },
    ] as CellInput[])
  }

  if (body.length === 0) {
    body.push([
      { content: 'No hay asientos en el periodo seleccionado', styles: { fontStyle: 'italic', halign: 'center' } },
      '',
      '',
      '',
    ] as CellInput[])
  }

  autoTable(doc, {
    ...makeTableOptions(),
    head: [['Fecha', 'Cuenta', 'Debe', 'Haber']] as RowInput[],
    body,
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 240 },
      2: { cellWidth: 80, halign: 'right' },
      3: { cellWidth: 80, halign: 'right' },
    },
    didParseCell: (hookData: CellHookData) => {
      if (headerRowIndices.includes(hookData.row.index)) {
        hookData.cell.styles.fillColor = [...C.headerBg]
        hookData.cell.styles.textColor = [...C.primary]
      }
    },
  })

  addFooter(doc)
  doc.save('libro-diario.pdf')
}

// ── Libro Mayor ────────────────────────────────────────────────────────

export function exportLedgerToPDF(data: LedgerData): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  const subtitle = `${data.account.code} - ${data.account.name}`
  addHeader(doc, 'Libro Mayor', subtitle)

  doc.setFontSize(10)
  doc.setTextColor(...C.textMid)
  doc.text(`Tipo de cuenta: ${data.account.type}`, 40, 56)

  const body: RowInput[] = []

  for (const line of data.lines) {
    body.push([
      formatDateEs(line.date),
      String(line.entryNumber),
      line.entryDescription,
      line.debit > 0 ? fmt(line.debit) : '',
      line.credit > 0 ? fmt(line.credit) : '',
      fmt(line.balance),
    ] as CellInput[])
  }

  if (body.length === 0) {
    body.push([
      'No hay movimientos en el periodo seleccionado',
      '',
      '',
      '',
      '',
      '',
    ] as CellInput[])
  }

  // Totals row
  body.push([
    '',
    '',
    { content: 'TOTALES', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: fmt(data.totalDebit), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: fmt(data.totalCredit), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: fmt(data.finalBalance), styles: { fontStyle: 'bold', halign: 'right', textColor: [...C.green] } },
  ] as CellInput[])

  const totalIdx = body.length - 1

  autoTable(doc, {
    ...makeTableOptions(),
    startY: 64,
    head: [['Fecha', '#', 'Concepto', 'Debe', 'Haber', 'Saldo']] as RowInput[],
    body,
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 40 },
      2: { cellWidth: 180 },
      3: { cellWidth: 80, halign: 'right' },
      4: { cellWidth: 80, halign: 'right' },
      5: { cellWidth: 100, halign: 'right' },
    },
    didParseCell: (hookData: CellHookData) => {
      if (hookData.row.index === totalIdx) {
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.fillColor = [...C.headerBg]
      }
    },
    didDrawCell: (hookData: CellHookData) => {
      if (hookData.row.index === totalIdx) {
        const { x, y, width } = hookData.cell
        doc.setDrawColor(...C.primary)
        doc.setLineWidth(0.8)
        doc.line(x, y, x + width, y)
      }
    },
  })

  addFooter(doc)
  doc.save(`libro-mayor-${data.account.code}.pdf`)
}

// ── Libro IVA Ventas ───────────────────────────────────────────────────

export function exportIVASalesToPDF(
  data: IVAReportData,
  from?: string,
  to?: string,
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  let subtitle = 'Registro de ventas gravadas con IVA'
  if (from && to) subtitle += ` | Del ${formatDateEs(from)} al ${formatDateEs(to)}`

  addHeader(doc, 'Libro IVA Ventas', subtitle)

  const body: RowInput[] = []

  for (const entry of data.entries) {
    body.push([
      formatDateEs(entry.date),
      String(entry.number),
      entry.description,
      entry.client || '-',
      fmt(entry.netAmount),
      `${entry.taxRate}%`,
      fmt(entry.taxAmount),
      fmt(entry.total),
    ] as CellInput[])
  }

  if (body.length === 0) {
    body.push([
      { content: 'No hay ventas gravadas en el periodo seleccionado', styles: { fontStyle: 'italic', halign: 'center' } },
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ] as CellInput[])
  }

  autoTable(doc, {
    ...makeTableOptions(),
    head: [['Fecha', '#', 'Descripcion', 'Cliente', 'Neto', 'Alic.', 'IVA', 'Total']] as RowInput[],
    body,
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 40 },
      2: { cellWidth: 130 },
      3: { cellWidth: 100 },
      4: { cellWidth: 80, halign: 'right' },
      5: { cellWidth: 40, halign: 'center' },
      6: { cellWidth: 80, halign: 'right' },
      7: { cellWidth: 80, halign: 'right' },
    },
  })

  addIVASummary(doc, data.totals, 'Total IVA Ventas')

  addFooter(doc)
  doc.save('libro-iva-ventas.pdf')
}

// ── Libro IVA Compras ──────────────────────────────────────────────────

export function exportIVAPurchasesToPDF(
  data: IVAReportData,
  from?: string,
  to?: string,
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  let subtitle = 'Registro de compras con credito fiscal IVA'
  if (from && to) subtitle += ` | Del ${formatDateEs(from)} al ${formatDateEs(to)}`

  addHeader(doc, 'Libro IVA Compras', subtitle)

  const body: RowInput[] = []

  for (const entry of data.entries) {
    body.push([
      formatDateEs(entry.date),
      String(entry.number),
      entry.description,
      entry.client || '-',
      fmt(entry.netAmount),
      `${entry.taxRate}%`,
      fmt(entry.taxAmount),
      fmt(entry.total),
    ] as CellInput[])
  }

  if (body.length === 0) {
    body.push([
      { content: 'No hay compras con IVA en el periodo seleccionado', styles: { fontStyle: 'italic', halign: 'center' } },
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ] as CellInput[])
  }

  autoTable(doc, {
    ...makeTableOptions(),
    head: [['Fecha', '#', 'Descripcion', 'Proveedor', 'Neto', 'Alic.', 'IVA', 'Total']] as RowInput[],
    body,
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 40 },
      2: { cellWidth: 130 },
      3: { cellWidth: 100 },
      4: { cellWidth: 80, halign: 'right' },
      5: { cellWidth: 40, halign: 'center' },
      6: { cellWidth: 80, halign: 'right' },
      7: { cellWidth: 80, halign: 'right' },
    },
  })

  addIVASummary(doc, data.totals, 'Total IVA Compras')

  addFooter(doc)
  doc.save('libro-iva-compras.pdf')
}

// ── IVA Summary helper ─────────────────────────────────────────────────

function addIVASummary(doc: jsPDF, totals: IVATotals, totalLabel: string): void {
  const finalY = getLastAutoTableFinalY(doc)
  const startY = finalY + 20
  const pageWidth = doc.internal.pageSize.getWidth()
  const leftMargin = 40

  doc.setFillColor(...C.headerBg)
  doc.setDrawColor(...C.border)
  doc.roundedRect(leftMargin, startY, pageWidth - 80, 160, 4, 4, 'FD')

  let y = startY + 18

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.primary)
  doc.text('Resumen de Totales', leftMargin + 12, y)

  y += 22
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  const col1X = leftMargin + 12
  const col2X = leftMargin + 200

  // Col 1
  doc.setTextColor(...C.textDark)
  doc.text('Neto Gravado 21%', col1X, y)
  doc.text(fmt(totals.gravado21), col1X + 140, y, { align: 'right' })
  y += 16
  doc.setTextColor(...C.red)
  doc.text('IVA 21%', col1X, y)
  doc.text(fmt(totals.iva21), col1X + 140, y, { align: 'right' })

  y += 20
  doc.setTextColor(...C.textDark)
  doc.text('Neto Gravado 10,5%', col1X, y)
  doc.text(fmt(totals.gravado105), col1X + 140, y, { align: 'right' })
  y += 16
  doc.setTextColor(...C.red)
  doc.text('IVA 10,5%', col1X, y)
  doc.text(fmt(totals.iva105), col1X + 140, y, { align: 'right' })

  // Col 2
  y = startY + 40
  doc.setTextColor(...C.textDark)
  doc.text('Neto Gravado 27%', col2X, y)
  doc.text(fmt(totals.gravado27), col2X + 140, y, { align: 'right' })
  y += 16
  doc.setTextColor(...C.red)
  doc.text('IVA 27%', col2X, y)
  doc.text(fmt(totals.iva27), col2X + 140, y, { align: 'right' })

  y += 20
  doc.setTextColor(...C.textDark)
  doc.text('Exento', col2X, y)
  doc.text(fmt(totals.exento), col2X + 140, y, { align: 'right' })
  y += 16
  doc.text('No Gravado', col2X, y)
  doc.text(fmt(totals.noGravado), col2X + 140, y, { align: 'right' })

  // Grand total
  y = startY + 135
  doc.setDrawColor(...C.primary)
  doc.setLineWidth(0.5)
  doc.line(leftMargin + 12, y - 6, pageWidth - leftMargin - 12, y - 6)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.green)
  doc.text(totalLabel, col1X, y)
  doc.text(fmt(totals.total), col2X + 140, y, { align: 'right' })
}


// -- Cheques -- 

interface ChequeExportEntry {
  number: string
  bank: string
  branch: string | null
  chequeType: string
  issuerName: string | null
  issuerCuit: string | null
  amount: number
  currency: string
  issueDate: string
  paymentDate: string | null
  depositDate: string | null
  clearanceDate: string | null
  status: string
  notes: string | null
}

const chequeStatusLabelsPDF: Record<string, string> = {
  en_cartera: 'En Cartera',
  depositado: 'Depositado',
  cobrado: 'Cobrado',
  rechazado: 'Rechazado',
  endosado: 'Endosado',
  anulado: 'Anulado',
  emitido: 'Emitido',
}

const chequeTypeLabelsPDF: Record<string, string> = {
  propio: 'Propio',
  tercero: 'Tercero',
}

export function exportChequesToPDF(cheques: ChequeExportEntry[]): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  addHeader(doc, 'Reporte de Cheques', 'Total: ' + cheques.length + ' cheques')

  const totalAmount = cheques.reduce(function (s, c) { return s + c.amount; }, 0)

  const body: RowInput[] = []

  for (const c of cheques) {
    body.push([
      c.number,
      c.bank,
      chequeTypeLabelsPDF[c.chequeType] || c.chequeType,
      c.issuerName || '-',
      c.issuerCuit || '-',
      fmt(c.amount),
      formatDateEs(c.issueDate),
      c.paymentDate ? formatDateEs(c.paymentDate) : '-',
      chequeStatusLabelsPDF[c.status] || c.status,
    ] as CellInput[])
  }

  if (body.length === 0) {
    body.push([
      { content: 'No hay cheques para mostrar', styles: { fontStyle: 'italic', halign: 'center' } },
      '', '', '', '', '', '', '', '',
    ] as CellInput[])
  }

  body.push([
    { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
    '', '', '', '',
    { content: fmt(totalAmount), styles: { fontStyle: 'bold', halign: 'right' } },
    '', '', '',
  ] as CellInput[])

  const totalIdx = body.length - 1

  autoTable(doc, {
    ...makeTableOptions(),
    head: [['Nro', 'Banco', 'Tipo', 'Emisor', 'CUIT', 'Monto', 'Emision', 'Vto.', 'Estado']] as RowInput[],
    body,
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 80 },
      2: { cellWidth: 45 },
      3: { cellWidth: 75 },
      4: { cellWidth: 65 },
      5: { cellWidth: 65, halign: 'right' },
      6: { cellWidth: 60 },
      7: { cellWidth: 60 },
      8: { cellWidth: 60 },
    },
    didParseCell: function (hookData: CellHookData) {
      if (hookData.row.index === totalIdx) {
        hookData.cell.styles.fillColor = [...C.headerBg]
        hookData.cell.styles.fontStyle = 'bold'
      }
      if (hookData.column.index === 8 && hookData.row.index < totalIdx) {
        const val = String(hookData.cell.raw)
        if (val === 'Cobrado') {
          hookData.cell.styles.textColor = [...C.green]
          hookData.cell.styles.fontStyle = 'bold'
        } else if (val === 'Rechazado') {
          hookData.cell.styles.textColor = [...C.red]
          hookData.cell.styles.fontStyle = 'bold'
        } else if (val === 'En Cartera') {
          hookData.cell.styles.textColor = [...C.accent]
          hookData.cell.styles.fontStyle = 'bold'
        }
      }
    },
    didDrawCell: function (hookData: CellHookData) {
      if (hookData.row.index === totalIdx) {
        const cellInfo = hookData.cell
        doc.setDrawColor(...C.primary)
        doc.setLineWidth(0.8)
        doc.line(cellInfo.x, cellInfo.y, cellInfo.x + cellInfo.width, cellInfo.y)
      }
    },
  })

  addFooter(doc)
  doc.save('cheques.pdf')
}


// ── Registro de Auditoria ──────────────────────────────────────────────

function formatDateTimeEs(dateStr: string): string {
  const d = new Date(dateStr)
  const date = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
  const time = d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  return `${date} ${time}`
}

const auditActionLabels: Record<string, string> = {
  create: 'Crear',
  update: 'Editar',
  delete: 'Eliminar',
  confirm: 'Confirmar',
  login: 'Login',
}

const auditEntityLabels: Record<string, string> = {
  journal_entry: 'Asiento',
  invoice: 'Factura',
  payment: 'Pago/Cobro',
  account: 'Cuenta',
  client: 'Cliente',
  provider: 'Proveedor',
}

export function exportAuditLogToPDF(
  entries: AuditLogExportEntry[],
  filters?: { from?: string; to?: string },
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  let subtitle = `${entries.length} registro${entries.length !== 1 ? 's' : ''}`
  if (filters?.from && filters?.to) {
    subtitle += ` | Del ${formatDateEs(filters.from)} al ${formatDateEs(filters.to)}`
  } else if (filters?.from) {
    subtitle += ` | Desde ${formatDateEs(filters.from)}`
  } else if (filters?.to) {
    subtitle += ` | Hasta ${formatDateEs(filters.to)}`
  }

  addHeader(doc, 'Registro de Auditoria', subtitle)

  if (entries.length === 0) {
    autoTable(doc, {
      ...makeTableOptions(),
      head: [['Fecha / Hora', 'Usuario', 'Accion', 'Entidad', 'ID', 'Detalles']] as RowInput[],
      body: [
        [{ content: 'No hay registros para los filtros seleccionados', styles: { fontStyle: 'italic', halign: 'center' } }, '', '', '', '', ''] as CellInput[],
      ],
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 120 },
        2: { cellWidth: 60, halign: 'center' },
        3: { cellWidth: 70, halign: 'center' },
        4: { cellWidth: 70 },
        5: { cellWidth: 160 },
      },
    })
    addFooter(doc)
    doc.save('registro-auditoria.pdf')
    return
  }

  const body: RowInput[] = entries.map((e) => [
    formatDateTimeEs(e.createdAt),
    `${e.userName}${e.userEmail ? ` (${e.userEmail})` : ''}`,
    auditActionLabels[e.action] || e.action,
    auditEntityLabels[e.entity] || e.entity,
    e.entityId ? `${e.entityId.substring(0, 12)}...` : '-',
    e.details || '-',
  ] as CellInput[])

  autoTable(doc, {
    ...makeTableOptions(),
    head: [['Fecha / Hora', 'Usuario', 'Accion', 'Entidad', 'ID', 'Detalles']] as RowInput[],
    body,
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 120 },
      2: { cellWidth: 60, halign: 'center' },
      3: { cellWidth: 70, halign: 'center' },
      4: { cellWidth: 70 },
      5: { cellWidth: 160 },
    },
    didParseCell: (hookData: CellHookData) => {
      // Color-code action column
      if (hookData.column.index === 2) {
        const val = String(hookData.cell.raw)
        if (val === 'Eliminar') {
          hookData.cell.styles.textColor = [185, 28, 28]
          hookData.cell.styles.fontStyle = 'bold'
        } else if (val === 'Crear') {
          hookData.cell.styles.textColor = [4, 120, 87]
          hookData.cell.styles.fontStyle = 'bold'
        } else if (val === 'Editar') {
          hookData.cell.styles.textColor = [37, 99, 235]
          hookData.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  addFooter(doc)
  doc.save('registro-auditoria.pdf')
}
