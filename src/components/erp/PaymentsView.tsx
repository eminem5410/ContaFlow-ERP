'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, ArrowDownCircle, ArrowUpCircle, FileDown } from 'lucide-react'
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
import { exportPaymentsToExcel } from '@/lib/export-excel'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { useTranslation } from '@/i18n'

interface Payment {
  id: string
  number: string
  date: string
  amount: number
  method: string
  reference: string | null
  type: string
  notes: string | null
  invoiceId: string | null
  clientId: string | null
  providerId: string | null
  bankAccountId: string | null
  client?: { id: string; name: string } | null
  provider?: { id: string; name: string } | null
  invoice?: { id: string; number: string } | null
  bankAccount?: { id: string; name: string } | null
}

interface ClientOption {
  id: string
  name: string
}

interface ProviderOption {
  id: string
  name: string
}

interface InvoiceOption {
  id: string
  number: string
  clientId?: string | null
  providerId?: string | null
}

interface BankAccountOption {
  id: string
  name: string
}

const emptyForm = {
  type: 'cobro' as string,
  date: new Date().toISOString().split('T')[0],
  amount: '',
  method: '',
  reference: '',
  notes: '',
  clientId: '',
  providerId: '',
  invoiceId: '',
  bankAccountId: '',
}

export function PaymentsView() {
  const companyId = useAppStore((s) => s.user?.companyId)
  const { canCreate, canEdit, canDelete, canExport } = usePermission()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [methodFilter, setMethodFilter] = useState<string>('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null)
  const [form, setForm] = useState(emptyForm)

  // ── Badge style maps (className only; labels use t()) ────────────────────

  const typeBadgeStyles: Record<string, string> = {
    cobro: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    pago: 'bg-red-100 text-red-700 hover:bg-red-100',
  }

  const methodBadgeStyles: Record<string, string> = {
    efectivo: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
    transferencia: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    cheque: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
    tarjeta: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  }

  // Main payments query
  const { data, isLoading } = useQuery<{ payments: Payment[]; pagination: { total: number } }>({
    queryKey: ['payments', companyId, search, typeFilter, methodFilter],
    queryFn: () => api.get('/api/payments', { companyId: companyId!, search: search || undefined, type: typeFilter || undefined, method: methodFilter || undefined }),
    enabled: !!companyId,
  })

  // Related entities for the dialog (only loaded when dialog is open)
  const { data: clientsData } = useQuery<{ clients: ClientOption[] }>({
    queryKey: ['clients-list', companyId],
    queryFn: () => api.get('/api/clients', { companyId: companyId!, limit: 100 }),
    enabled: !!companyId && showDialog,
  })

  const { data: providersData } = useQuery<{ providers: ProviderOption[] }>({
    queryKey: ['providers-list', companyId],
    queryFn: () => api.get('/api/providers', { companyId: companyId!, limit: 100 }),
    enabled: !!companyId && showDialog,
  })

  const { data: invoicesData } = useQuery<{ invoices: InvoiceOption[] }>({
    queryKey: ['invoices-list', companyId],
    queryFn: () => api.get('/api/invoices', { companyId: companyId!, limit: 100 }),
    enabled: !!companyId && showDialog,
  })

  const { data: bankAccountsData } = useQuery<{ bankAccounts: BankAccountOption[] }>({
    queryKey: ['bank-accounts-list', companyId],
    queryFn: () => api.get('/api/bank-accounts', { companyId: companyId!, limit: 50 }),
    enabled: !!companyId && showDialog,
  })

  // Filter invoices based on selected client or provider
  const filteredInvoices = invoicesData?.invoices?.filter((inv) => {
    if (form.type === 'cobro' && form.clientId) {
      return inv.clientId === form.clientId
    }
    if (form.type === 'pago' && form.providerId) {
      return inv.providerId === form.providerId
    }
    return true
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => api.post('/api/payments', {
        amount: parseFloat(data.amount) || 0,
        method: data.method,
        reference: data.reference || null,
        type: data.type,
        notes: data.notes || null,
        invoiceId: data.invoiceId || null,
        clientId: data.type === 'cobro' ? (data.clientId || null) : null,
        providerId: data.type === 'pago' ? (data.providerId || null) : null,
        bankAccountId: data.bankAccountId || null,
        companyId,
        date: data.date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(t('payments.created'))
      closeDialog()
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof emptyForm }) => api.put(`/api/payments/${id}`, {
        date: data.date,
        amount: parseFloat(data.amount) || 0,
        method: data.method,
        reference: data.reference || null,
        type: data.type,
        notes: data.notes || null,
        invoiceId: data.invoiceId || null,
        clientId: data.type === 'cobro' ? (data.clientId || null) : null,
        providerId: data.type === 'pago' ? (data.providerId || null) : null,
        bankAccountId: data.bankAccountId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(t('payments.updated'))
      closeDialog()
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(t('payments.deleted'))
      setDeletingPayment(null)
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const resetForm = () => {
    setForm({
      ...emptyForm,
      date: new Date().toISOString().split('T')[0],
    })
  }
  const closeDialog = () => { setShowDialog(false); setEditingPayment(null); resetForm() }

  const openCreate = () => { resetForm(); setShowDialog(true) }

  const openEdit = (payment: Payment) => {
    setEditingPayment(payment)
    setForm({
      type: payment.type,
      date: payment.date ? payment.date.split('T')[0] : '',
      amount: String(payment.amount),
      method: payment.method,
      reference: payment.reference || '',
      notes: payment.notes || '',
      clientId: payment.clientId || '',
      providerId: payment.providerId || '',
      invoiceId: payment.invoiceId || '',
      bankAccountId: payment.bankAccountId || '',
    })
    setShowDialog(true)
  }

  const handleTypeChange = (newType: string) => {
    setForm({
      ...form,
      type: newType,
      clientId: '',
      providerId: '',
      invoiceId: '',
    })
  }

  const handleSave = () => {
    if (!form.type) {
      toast.error(t('payments.typeRequired'))
      return
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error(t('payments.amountRequired'))
      return
    }
    if (!form.method) {
      toast.error(t('payments.methodRequired'))
      return
    }
    if (!form.date) {
      toast.error(t('payments.dateRequired'))
      return
    }
    if (editingPayment) {
      updateMutation.mutate({ id: editingPayment.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t('payments.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canExport('payments') && data?.payments && (
            <Button
              variant="outline"
              onClick={() => exportPaymentsToExcel(
                data.payments.map(p => ({
                  date: p.date,
                  type: p.type,
                  amount: p.amount,
                  method: p.method,
                  reference: p.reference,
                  status: '',
                }))
              )}
              disabled={data.payments.length === 0}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {t('common.exportExcel')}
            </Button>
          )}
          {canCreate('payments') && (
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              {t('payments.newPayment')}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('payments.type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('payments.allTypes')}</SelectItem>
            <SelectItem value="cobro">{t('payments.types.cobro')}</SelectItem>
            <SelectItem value="pago">{t('payments.types.pago')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={methodFilter || 'all'} onValueChange={(v) => setMethodFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t('payments.method')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('payments.allMethods')}</SelectItem>
            <SelectItem value="efectivo">{t('payments.methods.efectivo')}</SelectItem>
            <SelectItem value="transferencia">{t('payments.methods.transferencia')}</SelectItem>
            <SelectItem value="cheque">{t('payments.methods.cheque')}</SelectItem>
            <SelectItem value="tarjeta">{t('payments.methods.tarjeta')}</SelectItem>
          </SelectContent>
        </Select>
        {(typeFilter || methodFilter) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-slate-700"
            onClick={() => { setTypeFilter(''); setMethodFilter('') }}
          >
            {t('payments.clearFilters')}
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Nro</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payments.type')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('common.date')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payments.clientProvider')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payments.invoice')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payments.method')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payments.reference')}</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payments.amount')}</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : data?.payments?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400 text-sm">
                      {t('payments.noResults')}
                    </td>
                  </tr>
                ) : (
                  data?.payments?.map((payment) => {
                    const tStyle = typeBadgeStyles[payment.type]
                    const mStyle = methodBadgeStyles[payment.method]
                    return (
                      <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-3 text-sm font-mono text-slate-500">{payment.number}</td>
                        <td className="px-4 py-3 text-sm">
                          {tStyle ? (
                            <Badge variant="secondary" className={tStyle}>
                              <span className="flex items-center gap-1">
                                {payment.type === 'cobro' ? <ArrowDownCircle className="h-3 w-3" /> : <ArrowUpCircle className="h-3 w-3" />}
                                {t(`payments.types.${payment.type}`)}
                              </span>
                            </Badge>
                          ) : (
                            <span className="text-slate-500 capitalize">{payment.type}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{payment.date ? formatDate(payment.date) : '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">
                          {payment.client?.name || payment.provider?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{payment.invoice?.number || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {mStyle ? (
                            <Badge variant="secondary" className={mStyle}>
                              {t(`payments.methods.${payment.method}`)}
                            </Badge>
                          ) : (
                            <span className="text-slate-500 capitalize">{payment.method}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{payment.reference || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono font-medium text-slate-700">
                          {payment.type === 'cobro' ? (
                            <span className="text-emerald-600">+{formatCurrency(payment.amount)}</span>
                          ) : (
                            <span className="text-red-600">-{formatCurrency(payment.amount)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            {canEdit('payments') && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(payment)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete('payments') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeletingPayment(payment)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPayment ? t('payments.editPayment') : t('payments.newPayment')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Type */}
            <div className="space-y-2">
              <Label>{t('payments.type')} *</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={form.type === 'cobro' ? 'default' : 'outline'}
                  className={
                    form.type === 'cobro'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                  }
                  onClick={() => handleTypeChange('cobro')}
                >
                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                  {t('payments.types.cobro')}
                </Button>
                <Button
                  type="button"
                  variant={form.type === 'pago' ? 'default' : 'outline'}
                  className={
                    form.type === 'pago'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'border-red-200 text-red-700 hover:bg-red-50'
                  }
                  onClick={() => handleTypeChange('pago')}
                >
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  {t('payments.types.pago')}
                </Button>
              </div>
            </div>

            {/* Date & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.date')} *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('payments.amount')} *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Method & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('payments.method')} *</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('payments.selectMethod')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">{t('payments.methods.efectivo')}</SelectItem>
                    <SelectItem value="transferencia">{t('payments.methods.transferencia')}</SelectItem>
                    <SelectItem value="cheque">{t('payments.methods.cheque')}</SelectItem>
                    <SelectItem value="tarjeta">{t('payments.methods.tarjeta')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('payments.reference')}</Label>
                <Input
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder={t('payments.referencePlaceholder')}
                />
              </div>
            </div>

            {/* Client/Provider select */}
            {form.type === 'cobro' && (
              <div className="space-y-2">
                <Label>{t('payments.client')}</Label>
                <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v, invoiceId: '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('payments.selectClient')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsData?.clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.type === 'pago' && (
              <div className="space-y-2">
                <Label>{t('payments.provider')}</Label>
                <Select value={form.providerId} onValueChange={(v) => setForm({ ...form, providerId: v, invoiceId: '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('payments.selectProvider')} />
                  </SelectTrigger>
                  <SelectContent>
                    {providersData?.providers?.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Invoice select (filtered by selected client/provider) */}
            <div className="space-y-2">
              <Label>{t('payments.optionalInvoice')}</Label>
              <Select value={form.invoiceId} onValueChange={(v) => setForm({ ...form, invoiceId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    (form.type === 'cobro' && !form.clientId) || (form.type === 'pago' && !form.providerId)
                      ? t('payments.selectEntityFirst')
                      : t('payments.selectInvoice')
                  } />
                </SelectTrigger>
                <SelectContent>
                  {filteredInvoices?.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>{inv.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bank Account */}
            <div className="space-y-2">
              <Label>{t('payments.bankAccount')}</Label>
              <Select value={form.bankAccountId} onValueChange={(v) => setForm({ ...form, bankAccountId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('payments.selectBankAccount')} />
                </SelectTrigger>
                <SelectContent>
                  {bankAccountsData?.bankAccounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t('payments.notes')}</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t('payments.notesPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('common.cancel')}</Button>
            <Button
              onClick={handleSave}
              className={
                form.type === 'cobro'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPayment} onOpenChange={(open) => !open && setDeletingPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('payments.confirmDelete', { type: deletingPayment?.type === 'cobro' ? t('payments.types.cobro') : t('payments.types.pago') })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('payments.confirmDeleteDesc', {
                type: deletingPayment?.type === 'cobro' ? t('payments.types.cobro') : t('payments.types.pago'),
                number: deletingPayment?.number || '',
                amount: deletingPayment ? formatCurrency(deletingPayment.amount) : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingPayment && deleteMutation.mutate(deletingPayment.id)} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
