import * as XLSX from 'xlsx'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateString(): string {
  return new Date().toISOString().split('T')[0]
}

function getGenerationDateTime(): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
}

function formatCurrencyARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDateAR(date: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

// ---------------------------------------------------------------------------
// Label mappers (Spanish)
// ---------------------------------------------------------------------------

const accountTypeLabels: Record<string, string> = {
  activo: 'Activo',
  pasivo: 'Pasivo',
  patrimonio: 'Patrimonio',
  ingreso: 'Ingreso',
  egreso: 'Egreso',
  costoVenta: 'Costo de Venta',
}

const statusLabels: Record<string, string> = {
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  anulado: 'Anulado',
  pendiente: 'Pendiente',
  pagada_parcial: 'Pagada Parcial',
  pagada: 'Pagada',
  vencida: 'Vencida',
}

const paymentMethodLabels: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque: 'Cheque',
  tarjeta: 'Tarjeta',
}

const paymentTypeLabels: Record<string, string> = {
  cobro: 'Cobro',
  pago: 'Pago',
}

function label(key: string, map: Record<string, string>): string {
  return map[key] || key
}

// ---------------------------------------------------------------------------
// Cell styles
// NOTE: The community edition of SheetJS (`xlsx`) strips styles on write.
// To render styles in the output file, replace the package with the
// drop-in `xlsx-js-style` fork.  The code below is fully compatible with
// both packages.
// ---------------------------------------------------------------------------

interface CellStyle {
  font?: Record<string, unknown>
  fill?: Record<string, unknown>
  alignment?: Record<string, unknown>
}

const TITLE_STYLE: CellStyle = {
  font: { bold: true, sz: 16 },
}

const DATE_STYLE: CellStyle = {
  font: { italic: true, sz: 10, color: { rgb: '666666' } },
}

const HEADER_STYLE: CellStyle = {
  font: { bold: true, sz: 11 },
  fill: { fgColor: { rgb: 'E8F5E9' } },
  alignment: { horizontal: 'center', vertical: 'center' },
}

// ---------------------------------------------------------------------------
// Core workbook builder
// ---------------------------------------------------------------------------

function buildAndDownload(
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
  fileNamePrefix: string,
  currencyColumns?: number[],   // 0-based column indices that hold currency values
) {
  const wb = XLSX.utils.book_new()
  const dateStr = getDateString()

  // Build array-of-arrays
  const aoa: (string | number | null)[][] = []

  // Row 0 – Company title
  aoa.push(['ContaFlow ERP'])

  // Row 1 – Generation date
  aoa.push([`Fecha de generacion: ${getGenerationDateTime()}`])

  // Row 2 – Empty separator
  aoa.push([])

  // Row 3 – Headers
  aoa.push(headers)

  // Data rows
  rows.forEach((row) => aoa.push(row))

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // -----------------------------------------------------------------------
  // Auto-fit column widths
  // -----------------------------------------------------------------------
  const colWidths = headers.map((header, colIdx) => {
    let max = String(header).length
    rows.forEach((row) => {
      const val = String(row[colIdx] ?? '')
      max = Math.max(max, val.length)
    })
    // Add padding; clamp between 12 and 45
    return { wch: Math.min(Math.max(max + 3, 12), 45) }
  })

  // Ensure title column is wide enough
  colWidths[0] = { wch: Math.max(colWidths[0].wch, 35) }

  ws['!cols'] = colWidths

  // -----------------------------------------------------------------------
  // Freeze panes – freeze everything above the header row (row index 3)
  // so the header stays visible while scrolling
  // -----------------------------------------------------------------------
  ws['!freeze'] = { xSplit: 0, ySplit: 4 }

  // -----------------------------------------------------------------------
  // Apply cell styles
  // -----------------------------------------------------------------------
  applyStyle(ws, 0, 0, TITLE_STYLE)

  // Date row
  applyStyle(ws, 1, 0, DATE_STYLE)

  // Header row (row 3)
  headers.forEach((_, idx) => {
    applyStyle(ws, 3, idx, HEADER_STYLE)
  })

  // -----------------------------------------------------------------------
  // Number format for currency columns
  // -----------------------------------------------------------------------
  if (currencyColumns) {
    currencyColumns.forEach((colIdx) => {
      for (let r = 4; r < rows.length + 4; r++) {
        const ref = XLSX.utils.encode_cell({ r, c: colIdx })
        const cell = ws[ref]
        if (cell && typeof cell.v === 'number') {
          cell.z = '#,##0.00'
        }
      }
    })
  }

  // -----------------------------------------------------------------------
  // Add sheet and write file
  // -----------------------------------------------------------------------
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${fileNamePrefix}_${dateStr}.xlsx`)
}

/** Safely apply a style object to a cell. */
function applyStyle(
  ws: XLSX.WorkSheet,
  r: number,
  c: number,
  style: CellStyle,
) {
  const ref = XLSX.utils.encode_cell({ r, c })
  if (ws[ref]) {
    ws[ref].s = style
  }
}

// ===========================================================================
// Export functions – one per entity type
// ===========================================================================

// ---------------------------------------------------------------------------
// Accounts  →  "Plan de Cuentas"
// ---------------------------------------------------------------------------

export function exportAccountsToExcel(
  accounts: Array<{
    code: string
    name: string
    type: string
    subtype: string | null
    balance: number
  }>,
) {
  const headers = ['Codigo', 'Nombre', 'Tipo', 'Subtipo', 'Saldo']

  const rows = accounts.map((a) => [
    a.code,
    a.name,
    label(a.type, accountTypeLabels),
    a.subtype ?? '',
    formatCurrencyARS(a.balance),
  ])

  buildAndDownload(
    'Plan de Cuentas',
    headers,
    rows,
    'plan_cuentas',
  )
}

// ---------------------------------------------------------------------------
// Journal Entries  →  "Asientos Contables"
// ---------------------------------------------------------------------------

export function exportJournalEntriesToExcel(
  entries: Array<{
    number: number
    date: string
    description: string
    status: string
    totalDebit: number
    totalCredit: number
  }>,
) {
  const headers = [
    'Nro Asiento',
    'Fecha',
    'Descripcion',
    'Estado',
    'Total Debitos',
    'Total Creditos',
  ]

  const rows = entries.map((e) => [
    e.number,
    formatDateAR(e.date),
    e.description,
    label(e.status, statusLabels),
    formatCurrencyARS(e.totalDebit),
    formatCurrencyARS(e.totalCredit),
  ])

  buildAndDownload(
    'Asientos Contables',
    headers,
    rows,
    'asientos_contables',
  )
}

// ---------------------------------------------------------------------------
// Invoices  →  "Facturas"
// ---------------------------------------------------------------------------

export function exportInvoicesToExcel(
  invoices: Array<{
    number: string
    date: string
    clientName: string
    total: number
    status: string
  }>,
) {
  const headers = [
    'Nro Factura',
    'Fecha',
    'Cliente',
    'Total',
    'Estado',
  ]

  const rows = invoices.map((inv) => [
    inv.number,
    formatDateAR(inv.date),
    inv.clientName,
    formatCurrencyARS(inv.total),
    label(inv.status, statusLabels),
  ])

  buildAndDownload(
    'Facturas',
    headers,
    rows,
    'facturas',
  )
}

// ---------------------------------------------------------------------------
// Payments  →  "Pagos y Cobros"
// ---------------------------------------------------------------------------

export function exportPaymentsToExcel(
  payments: Array<{
    date: string
    type: string
    amount: number
    method: string
    reference: string | null
    status: string
  }>,
) {
  const headers = [
    'Fecha',
    'Tipo',
    'Monto',
    'Metodo',
    'Referencia',
    'Estado',
  ]

  const rows = payments.map((p) => [
    formatDateAR(p.date),
    label(p.type, paymentTypeLabels),
    formatCurrencyARS(p.amount),
    label(p.method, paymentMethodLabels),
    p.reference ?? '',
    label(p.status, statusLabels),
  ])

  buildAndDownload(
    'Pagos y Cobros',
    headers,
    rows,
    'pagos_cobros',
  )
}

// ---------------------------------------------------------------------------
// Clients  →  "Clientes"
// ---------------------------------------------------------------------------

export function exportClientsToExcel(
  clients: Array<{
    name: string
    cuit: string | null
    email: string | null
    phone: string | null
    balance: number
  }>,
) {
  const headers = [
    'Nombre',
    'CUIT',
    'Email',
    'Telefono',
    'Saldo',
  ]

  const rows = clients.map((c) => [
    c.name,
    c.cuit ?? '',
    c.email ?? '',
    c.phone ?? '',
    formatCurrencyARS(c.balance),
  ])

  buildAndDownload(
    'Clientes',
    headers,
    rows,
    'clientes',
  )
}

// ---------------------------------------------------------------------------
// Providers  →  "Proveedores"
// ---------------------------------------------------------------------------

export function exportProvidersToExcel(
  providers: Array<{
    name: string
    cuit: string | null
    email: string | null
    phone: string | null
    balance: number
  }>,
) {
  const headers = [
    'Nombre',
    'CUIT',
    'Email',
    'Telefono',
    'Saldo',
  ]

  const rows = providers.map((p) => [
    p.name,
    p.cuit ?? '',
    p.email ?? '',
    p.phone ?? '',
    formatCurrencyARS(p.balance),
  ])

  buildAndDownload(
    'Proveedores',
    headers,
    rows,
    'proveedores',
  )
}

// ---------------------------------------------------------------------------
// Audit Logs  →  "Registro de Auditoria"
// ---------------------------------------------------------------------------

const auditActionLabelsExcel: Record<string, string> = {
  create: 'Crear',
  update: 'Editar',
  delete: 'Eliminar',
  confirm: 'Confirmar',
  login: 'Login',
}

const auditEntityLabelsExcel: Record<string, string> = {
  journal_entry: 'Asiento',
  invoice: 'Factura',
  payment: 'Pago/Cobro',
  account: 'Cuenta',
  client: 'Cliente',
  provider: 'Proveedor',
}

export function exportAuditLogToExcel(
  entries: Array<{
    createdAt: string
    userName: string
    userEmail: string
    action: string
    entity: string
    entityId: string | null
    details: string | null
  }>,
) {
  const headers = [
    'Fecha / Hora',
    'Usuario',
    'Email',
    'Accion',
    'Entidad',
    'ID Entidad',
    'Detalles',
  ]

  const rows = entries.map((e) => [
    new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(e.createdAt)),
    e.userName,
    e.userEmail || '',
    auditActionLabelsExcel[e.action] || e.action,
    auditEntityLabelsExcel[e.entity] || e.entity,
    e.entityId || '',
    e.details || '',
  ])

  buildAndDownload(
    'Registro de Auditoria',
    headers,
    rows,
    'registro_auditoria',
  )
}
