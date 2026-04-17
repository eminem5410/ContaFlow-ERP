export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyExact(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateLong(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-AR').format(num)
}

export function getAccountTypeColor(type: string): string {
  const colors: Record<string, string> = {
    activo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    pasivo: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    patrimonio: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
    ingreso: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    egreso: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    costoVenta: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  }
  return colors[type] || 'bg-gray-100 text-gray-800'
}

export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    activo: 'Activo',
    pasivo: 'Pasivo',
    patrimonio: 'Patrimonio',
    ingreso: 'Ingreso',
    egreso: 'Egreso',
    costoVenta: 'Costo de Venta',
  }
  return labels[type] || type
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    borrador: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    confirmado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    anulado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    borrador: 'Borrador',
    confirmado: 'Confirmado',
    anulado: 'Anulado',
  }
  return labels[status] || status
}
