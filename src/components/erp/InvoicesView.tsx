'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, X, Receipt, FileDown, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { usePermission } from '@/hooks/use-permission'
import { exportInvoicesToExcel } from '@/lib/export-excel'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { useTranslation } from '@/i18n'

// ── Types ────────────────────────────────────────────────────────────────────

interface InvoiceItem {
  id?: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  subtotal: number
  taxAmount: number
}

interface Invoice {
  id: string
  number: string
  type: string
  date: string
  dueDate: string | null
  total: number
  tax: number
  netTotal: number
  amountPaid: number
  status: string
  notes: string | null
  clientId: string | null
  client?: { id: string; name: string } | null
}

interface ClientOption {
  id: string
  name: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const INVOICE_TYPE_VALUES = ['A', 'B', 'C', 'NC', 'ND'] as const

const TYPE_FILTER_OPTIONS = ['A', 'B', 'C'] as const

const TAX_RATE_OPTIONS = [0, 10.5, 21, 27] as const

const createEmptyItem = (): InvoiceItem => ({
  description: '',
  quantity: 1,
  unitPrice: 0,
  taxRate: 21,
  subtotal: 0,
  taxAmount: 0,
})

const emptyForm = {
  type: 'A' as string,
  date: new Date().toISOString().split('T')[0],
  dueDate: '',
  clientId: '',
  notes: '',
  items: [createEmptyItem()],
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function recalcItem(item: InvoiceItem): InvoiceItem {
  const subtotal = Math.round(item.quantity * item.unitPrice * 100) / 100
  const taxAmount = Math.round(subtotal * (item.taxRate / 100) * 100) / 100
  return { ...item, subtotal, taxAmount }
}

function typeBadge(type: string) {
  switch (type) {
    case 'A':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 font-semibold">A</Badge>
    case 'B':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 font-semibold">B</Badge>
    case 'C':
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200 font-semibold">C</Badge>
    case 'NC':
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200 font-semibold">NC</Badge>
    case 'ND':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 font-semibold">ND</Badge>
    default:
      return <Badge variant="secondary">{type}</Badge>
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function InvoicesView() {
  const companyId = useAppStore((s) => s.user?.companyId)
  const { canCreate, canEdit, canDelete, canExport } = usePermission()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showDialog, setShowDialog] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null)
  const [authorizingInvoice, setAuthorizingInvoice] = useState<Invoice | null>(null)
  const [afipResult, setAfipResult] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)

  // ── Invoice types & status options (translated) ──────────────────────────

  const INVOICE_TYPES = useMemo(() => INVOICE_TYPE_VALUES.map(v => ({ value: v, label: t(`invoices.types.${v}`) })), [t])

  const TYPE_FILTER_OPTIONS_T = useMemo(() => TYPE_FILTER_OPTIONS.map(v => ({ value: v, label: t(`invoices.types.${v}`) })), [t])

  const STATUS_OPTIONS = useMemo(() => [
    { value: 'pendiente', label: t('invoices.statuses.pendiente') },
    { value: 'pagada_parcial', label: t('invoices.statuses.pagada_parcial') },
    { value: 'pagada', label: t('invoices.statuses.pagada') },
    { value: 'vencida', label: t('invoices.statuses.vencida') },
    { value: 'anulada', label: t('invoices.statuses.anulada') },
  ], [t])

  // ── Status badge helper (uses t) ─────────────────────────────────────────

  function statusBadge(status: string) {
    switch (status) {
      case 'pendiente':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">{t('invoices.statuses.pendiente')}</Badge>
      case 'pagada_parcial':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">{t('invoices.statuses.pagada_parcial')}</Badge>
      case 'pagada':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">{t('invoices.statuses.pagada')}</Badge>
      case 'vencida':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">{t('invoices.statuses.vencida')}</Badge>
      case 'anulada':
        return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-slate-200">{t('invoices.statuses.anulada')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery<{ invoices: Invoice[]; pagination: { total: number } }>({
    queryKey: ['invoices', companyId, search, statusFilter, typeFilter],
    queryFn: () => api.get('/api/invoices', { companyId: companyId!, search: search || undefined, status: statusFilter !== 'all' ? statusFilter : undefined, type: typeFilter !== 'all' ? typeFilter : undefined }),
    enabled: !!companyId,
  })

  const { data: clientsData } = useQuery<{ clients: ClientOption[] }>({
    queryKey: ['clients-list', companyId],
    queryFn: () => api.get('/api/clients', { companyId: companyId!, limit: 100 }),
    enabled: !!companyId && showDialog,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (payload: {
      type: string
      date: string
      dueDate: string | null
      notes: string
      clientId: string | null
      items: InvoiceItem[]
    }) => {
      return api.post('/api/invoices', { ...payload, companyId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(t('invoices.created'))
      closeDialog()
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: {
        type: string
        date: string
        dueDate: string | null
        notes: string
        clientId: string | null
        status: string
        items?: InvoiceItem[]
      }
    }) => {
      return api.put(`/api/invoices/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(t('invoices.updated'))
      closeDialog()
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(t('invoices.deleted'))
      setDeletingInvoice(null)
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const afipMutation = useMutation({
    mutationFn: function (invoiceId: string) {
      return api.post("/api/invoices/" + invoiceId + "/authorize", { companyId: companyId })
    },
    onSuccess: function (res: any) {
      setAfipResult(res)
      toast.success("CAE obtenido: " + res.authorization.cae)
    },
    onError: function (error: Error) {
      toast.error("Error AFIP", { description: error.message })
    },
  })

  // ── Form helpers ───────────────────────────────────────────────────────────

  const resetForm = () => setForm(emptyForm)
  const closeDialog = () => {
    setShowDialog(false)
    setEditingInvoice(null)
    resetForm()
  }

  const openCreate = () => {
    resetForm()
    setShowDialog(true)
  }

  const openEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setForm({
      type: invoice.type,
      date: invoice.date ? invoice.date.split('T')[0] : '',
      dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
      clientId: invoice.clientId || '',
      notes: invoice.notes || '',
      items: [createEmptyItem()],
    })
    setShowDialog(true)
  }

  // ── Item manipulation ──────────────────────────────────────────────────────

  const updateItem = useCallback((index: number, patch: Partial<InvoiceItem>) => {
    setForm((prev) => {
      const items = [...prev.items]
      items[index] = recalcItem({ ...items[index], ...patch })
      return { ...prev, items }
    })
  }, [])

  const addItem = useCallback(() => {
    setForm((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }))
  }, [])

  const removeItem = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }, [])

  // ── Totals (memoized) ─────────────────────────────────────────────────────

  const totals = useMemo(() => {
    const netTotal = form.items.reduce((sum, item) => sum + item.subtotal, 0)
    const tax = form.items.reduce((sum, item) => sum + item.taxAmount, 0)
    const total = Math.round((netTotal + tax) * 100) / 100
    return { netTotal: Math.round(netTotal * 100) / 100, tax: Math.round(tax * 100) / 100, total }
  }, [form.items])

  // ── Save handler ───────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!form.type) {
      toast.error(t('invoices.typeRequired'))
      return
    }
    if (!form.date) {
      toast.error(t('invoices.dateRequired'))
      return
    }
    const hasValidItem = form.items.some(
      (item) => item.description.trim() !== '' && item.quantity > 0 && item.unitPrice > 0,
    )
    if (!hasValidItem) {
      toast.error(t('invoices.itemRequired'))
      return
    }

    const payload = {
      type: form.type,
      date: form.date,
      dueDate: form.dueDate || null,
      notes: form.notes,
      clientId: form.clientId || null,
      items: form.items
        .filter((item) => item.description.trim() !== '')
        .map(recalcItem),
    }

    if (editingInvoice) {
      updateMutation.mutate({
        id: editingInvoice.id,
        data: { ...payload, status: editingInvoice.status },
      })
    } else {
      createMutation.mutate(payload)
    }
  }

  // ── Clear filters ──────────────────────────────────────────────────────────

  const hasActiveFilters = search !== '' || statusFilter !== 'all' || typeFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setTypeFilter('all')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('invoices.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('invoices.allStatuses')}</SelectItem>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder={t('invoices.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {TYPE_FILTER_OPTIONS_T.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="icon" className="shrink-0" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canExport('invoices') && data?.invoices && (
            <Button
              variant="outline"
              onClick={() => exportInvoicesToExcel(
                data.invoices.map(inv => ({
                  number: inv.number,
                  date: inv.date,
                  clientName: inv.client?.name || '-',
                  total: inv.total,
                  status: inv.status,
                }))
              )}
              disabled={data.invoices.length === 0}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {t('common.exportExcel')}
            </Button>
          )}
          {canCreate('invoices') && (
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              {t('invoices.newInvoice')}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('invoices.number')}</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('invoices.type')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('common.date')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('invoices.client')}</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('invoices.netAmount')}</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('invoices.tax')}</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('common.total')}</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('invoices.paid')}</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('common.status')}</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data?.invoices?.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400 text-sm">
                      <Receipt className="mx-auto h-10 w-10 mb-3 text-slate-300" />
                      {t('common.noResults')}
                    </td>
                  </tr>
                ) : (
                  data?.invoices?.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-4 py-3 text-sm font-mono font-medium text-slate-800">
                        {invoice.number}
                      </td>
                      <td className="px-4 py-3 text-center">{typeBadge(invoice.type)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {invoice.date ? formatDate(invoice.date) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                        {invoice.client?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-slate-600">
                        {formatCurrency(invoice.netTotal)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-slate-600">
                        {formatCurrency(invoice.tax)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-slate-600">
                        {formatCurrency(invoice.amountPaid)}
                      </td>
                      <td className="px-4 py-3 text-center">{statusBadge(invoice.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={function () { setAuthorizingInvoice(invoice); setAfipResult(null) }}
                            title="Autorizar AFIP"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </Button>
                          {canEdit('invoices') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(invoice)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete('invoices') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeletingInvoice(invoice)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? t('invoices.editInvoice') : t('invoices.newInvoice')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Top fields row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Type */}
              <div className="space-y-2">
                <Label>{t('invoices.receiptType')} *</Label>
                <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('invoices.type')} />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_TYPES.map((invType) => (
                      <SelectItem key={invType.value} value={invType.value}>
                        {invType.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>{t('common.date')} *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>

              {/* Due date */}
              <div className="space-y-2">
                <Label>{t('invoices.dueDate')}</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>

              {/* Client */}
              <div className="space-y-2">
                <Label>{t('invoices.client')}</Label>
                <Select value={form.clientId} onValueChange={(val) => setForm({ ...form, clientId: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('invoices.selectClient')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsData?.clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-700">{t('invoices.items')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={addItem}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {t('invoices.addItem')}
                </Button>
              </div>

              <div className="rounded-lg border border-slate-200 overflow-hidden">
                {/* Items header */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_100px_130px_110px_110px_40px] gap-2 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <span>{t('invoices.description')}</span>
                  <span className="text-center">{t('invoices.quantity')}</span>
                  <span className="text-right">{t('invoices.unitPrice')}</span>
                  <span className="text-center">{t('invoices.taxRate')}</span>
                  <span className="text-right">{t('invoices.subtotal')}</span>
                  <span />
                </div>

                {form.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_100px_130px_110px_110px_40px] gap-2 border-t border-slate-100 px-3 py-3 items-center"
                  >
                    {/* Description */}
                    <Input
                      placeholder={t('invoices.itemDescriptionPlaceholder')}
                      value={item.description}
                      onChange={(e) => updateItem(index, { description: e.target.value })}
                      className="h-9 text-sm"
                    />

                    {/* Quantity */}
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="1"
                      value={item.quantity || ''}
                      onChange={(e) =>
                        updateItem(index, { quantity: parseFloat(e.target.value) || 0 })
                      }
                      className="h-9 text-sm text-center"
                    />

                    {/* Unit price */}
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={item.unitPrice || ''}
                      onChange={(e) =>
                        updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="h-9 text-sm text-right font-mono"
                    />

                    {/* Tax rate */}
                    <Select
                      value={String(item.taxRate)}
                      onValueChange={(val) => updateItem(index, { taxRate: parseFloat(val) })}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TAX_RATE_OPTIONS.map((rate) => (
                          <SelectItem key={rate} value={String(rate)}>
                            {rate}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Subtotal (read-only) */}
                    <div className="text-sm font-mono font-medium text-slate-700 text-right">
                      {formatCurrency(item.subtotal)}
                    </div>

                    {/* Remove */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeItem(index)}
                      disabled={form.items.length <= 1}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals summary */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>{t('invoices.netTaxable')}</span>
                <span className="font-mono">{formatCurrency(totals.netTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>{t('invoices.tax')}</span>
                <span className="font-mono">{formatCurrency(totals.tax)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-semibold text-slate-800">
                <span>{t('common.total')}</span>
                <span className="font-mono">{formatCurrency(totals.total)}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t('invoices.notes')}</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t('invoices.notesPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingInvoice} onOpenChange={(open) => !open && setDeletingInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('invoices.deleteInvoice')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('invoices.confirmDeleteDesc', { number: deletingInvoice?.number || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingInvoice && deleteMutation.mutate(deletingInvoice.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AFIP Authorization Dialog */}
      <Dialog open={!!authorizingInvoice} onOpenChange={function (open) { if (!open) setAuthorizingInvoice(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Autorizar Factura AFIP
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!afipResult ? (
              <div className="text-center space-y-4 py-6">
                <p className="text-slate-600">
                  Factura: <span className="font-mono font-bold">{authorizingInvoice?.number}</span>
                </p>
                <p className="text-sm text-slate-500">
                  Se solicitara un CAE (Codigo de Autorizacion Electronico) a AFIP.
                </p>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  MODO DEMO - CAE Simulado
                </Badge>
                <div>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={function () {
                      if (authorizingInvoice) afipMutation.mutate(authorizingInvoice.id)
                    }}
                    disabled={afipMutation.isPending}
                  >
                    {afipMutation.isPending ? "Autorizando..." : "Obtener CAE"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
                  <p className="text-sm text-emerald-600 font-medium mb-1">CAE Generado</p>
                  <p className="text-2xl font-mono font-bold text-emerald-700">{afipResult.authorization.cae}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Comprobante:</span>
                    <span className="font-mono text-slate-800">{afipResult.authorization.numeroComprobante}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vencimiento CAE:</span>
                    <span className="font-mono text-slate-800">{afipResult.authorization.caeVencimiento}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Resultado:</span>
                    <Badge className="bg-emerald-100 text-emerald-800">Aprobado</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Modo:</span>
                    <Badge className="bg-amber-100 text-amber-800">{afipResult.authorization.modo}</Badge>
                  </div>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs text-amber-700">
                    CAE simulado. Para obtener un CAE real, configure certificado digital AFIP y modo production.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={function () { setAuthorizingInvoice(null); setAfipResult(null) }}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
