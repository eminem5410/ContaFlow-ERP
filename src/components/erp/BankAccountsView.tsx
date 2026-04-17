'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Landmark, Wallet, PiggyBank, Building2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { usePermission } from '@/hooks/use-permission'
import { formatCurrency } from '@/lib/formatters'
import { BankReconciliation } from './BankReconciliation'
import { useTranslation } from '@/i18n'

interface BankAccount {
  id: string
  name: string
  bank: string | null
  number: string | null
  type: string
  balance: number
  currency: string
}

const bankTypeIcons: Record<string, typeof Landmark> = {
  caja: Wallet,
  caja_ahorro: PiggyBank,
  cta_corriente: Landmark,
}

const bankTypeColors: Record<string, string> = {
  caja: 'from-emerald-500 to-emerald-600',
  caja_ahorro: 'from-sky-500 to-sky-600',
  cta_corriente: 'from-violet-500 to-violet-600',
}

const emptyForm = {
  name: '',
  bank: '',
  number: '',
  type: 'cta_corriente',
  currency: 'ARS',
}

export function BankAccountsView() {
  const { t } = useTranslation()
  const companyId = useAppStore((s) => s.user?.companyId)
  const { canCreate, canEdit, canDelete } = usePermission()
  const queryClient = useQueryClient()
  const [showDialog, setShowDialog] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null)
  const [reconcileAccount, setReconcileAccount] = useState<BankAccount | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data, isLoading } = useQuery<{ bankAccounts: BankAccount[] }>({
    queryKey: ['bank-accounts', companyId],
    queryFn: () => api.get('/api/bank-accounts', { companyId: companyId! }),
    enabled: !!companyId,
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/api/bank-accounts', { ...data, companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast.success(t('bankAccounts.created'))
      closeDialog()
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => api.put(`/api/bank-accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast.success(t('bankAccounts.updated'))
      closeDialog()
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/bank-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast.success(t('bankAccounts.deleted'))
      setDeletingAccount(null)
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const resetForm = () => setForm(emptyForm)
  const closeDialog = () => { setShowDialog(false); setEditingAccount(null); resetForm() }
  const openCreate = () => { resetForm(); setShowDialog(true) }

  const openEdit = (account: BankAccount) => {
    setEditingAccount(account)
    setForm({
      name: account.name,
      bank: account.bank || '',
      number: account.number || '',
      type: account.type,
      currency: account.currency,
    })
    setShowDialog(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error(t('bankAccounts.nameRequired'))
      return
    }
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const totalBalance = data?.bankAccounts?.reduce((sum, a) => sum + a.balance, 0) || 0

  return (
    <div className="space-y-6">
      {/* Main content - hidden during reconciliation */}
      {!reconcileAccount && (<>
      {/* Total Balance Card */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 uppercase tracking-wider font-medium">{t('bankAccounts.totalBalance')}</p>
              <p className="text-3xl font-bold text-white mt-1">{formatCurrency(totalBalance)}</p>
              <p className="text-sm text-slate-400 mt-1">{t('bankAccounts.accountsCount', { count: data?.bankAccounts?.length || 0 })}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <Landmark className="h-7 w-7 text-emerald-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex justify-end">
        {canCreate('bank-accounts') && (
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            {t('bankAccounts.newAccount')}
          </Button>
        )}
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-10 w-48 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.bankAccounts?.length === 0 ? (
        <div className="text-center py-12">
          <Landmark className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{t('bankAccounts.noAccounts')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.bankAccounts?.map((account) => {
            const IconComponent = bankTypeIcons[account.type] || Building2
            const gradient = bankTypeColors[account.type] || 'from-gray-500 to-gray-600'

            return (
              <Card key={account.id} className="overflow-hidden group">
                <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">{account.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {account.bank && `${account.bank}`}
                          {account.bank && account.number && ' • '}
                          {account.number}
                        </p>
                        <p className="text-xs text-slate-400">{t(`bankAccounts.types.${account.type}`)} • {account.currency}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50" onClick={function () { setReconcileAccount(account) }}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      {canEdit('bank-accounts') && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(account)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDelete('bank-accounts') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeletingAccount(account)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">{t('bankAccounts.availableBalance')}</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(account.balance)}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAccount ? t('bankAccounts.editAccount') : t('bankAccounts.newAccount')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('bankAccounts.name')} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('bankAccounts.namePlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('bankAccounts.bank')}</Label>
                <Input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder={t('bankAccounts.bankPlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label>{t('bankAccounts.accountNumber')}</Label>
                <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="000-12345-6" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('bankAccounts.type')}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caja">{t('bankAccounts.types.caja')}</SelectItem>
                    <SelectItem value="caja_ahorro">{t('bankAccounts.types.caja_ahorro')}</SelectItem>
                    <SelectItem value="cta_corriente">{t('bankAccounts.types.cta_corriente')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('bankAccounts.currency')}</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">{t('bankAccounts.currencies.ARS')}</SelectItem>
                    <SelectItem value="USD">{t('bankAccounts.currencies.USD')}</SelectItem>
                    <SelectItem value="EUR">{t('bankAccounts.currencies.EUR')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? t('bankAccounts.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </>)}

      {/* Reconciliation View */}
      {reconcileAccount && (
        <BankReconciliation
          bankAccountId={reconcileAccount.id}
          bankAccountName={reconcileAccount.name + (reconcileAccount.bank ? ' - ' + reconcileAccount.bank : '')}
          onBack={function () { setReconcileAccount(null) }}
        />
      )}

      <AlertDialog open={!!deletingAccount} onOpenChange={(open) => !open && setDeletingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('bankAccounts.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bankAccounts.deleteDescription', { name: deletingAccount?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingAccount && deleteMutation.mutate(deletingAccount.id)} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
